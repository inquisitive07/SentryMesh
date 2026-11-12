"""FastAPI backend: MQTT ingest (alerts, heartbeats, node status) -> SQLite -> REST + WebSocket.

Run:  uvicorn app:app --reload

MQTT topics (all QoS 1):
  sentrymesh/<node_id>/alert      alert JSON (see schema.Alert)
  sentrymesh/<node_id>/heartbeat  optional JSON metadata, or an empty payload
  sentrymesh/<node_id>/status     'online' / 'offline' (retained; 'offline' is also the Last Will)

Environment variables:
  MQTT_HOST, MQTT_PORT           broker address (default localhost:1883)
  CORS_ORIGINS                   comma-separated allowed origins (default: Vite dev server)
  HEARTBEAT_TIMEOUT              seconds without contact before an online node is marked offline (default 30)
  OFFLINE_CHECK_INTERVAL         seconds between offline sweeps (default 5)
  SENTRYMESH_DB                  path to the SQLite file (default: next to db.py)
"""
import asyncio
import json
import os
import threading
from contextlib import asynccontextmanager, suppress
from datetime import timedelta
from typing import Literal

import paho.mqtt.client as mqtt
from fastapi import FastAPI, HTTPException, Query, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

import db
from schema import Alert, Heartbeat, IntrusionClass, parse_status

BROKER_HOST = os.getenv("MQTT_HOST", "localhost")
BROKER_PORT = int(os.getenv("MQTT_PORT", "1883"))
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
HEARTBEAT_TIMEOUT = float(os.getenv("HEARTBEAT_TIMEOUT", "30"))
OFFLINE_CHECK_INTERVAL = float(os.getenv("OFFLINE_CHECK_INTERVAL", "5"))

ALERT_TOPIC = "sentrymesh/+/alert"
HEARTBEAT_TOPIC = "sentrymesh/+/heartbeat"
STATUS_TOPIC = "sentrymesh/+/status"

conn = db.connect()
db.init(conn)
lock = threading.Lock()  # sqlite connection is shared by the MQTT thread, HTTP handlers and the offline sweep
stats = {"received": 0, "stored": 0, "rejected": 0,           # alert messages (unchanged from the baseline)
         "heartbeats": 0, "status_messages": 0, "rejected_other": 0}
mqtt_state = {"connected": False}


# ------------------------------------------------------------------ WebSocket fan-out
class ConnectionManager:
    """Tracks WebSocket clients and broadcasts JSON messages to all of them (runs on the asyncio loop)."""

    def __init__(self):
        self.clients: set[WebSocket] = set()
        self._send_lock = asyncio.Lock()  # one broadcast at a time, so frames never interleave on a socket

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.clients.add(ws)

    def disconnect(self, ws: WebSocket):
        self.clients.discard(ws)

    async def broadcast(self, message: dict):
        text = json.dumps(message)
        async with self._send_lock:
            dead = []
            for ws in list(self.clients):
                try:
                    await asyncio.wait_for(ws.send_text(text), timeout=5)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(ws)


manager = ConnectionManager()
loop: asyncio.AbstractEventLoop | None = None  # set in lifespan; used by the MQTT thread


def broadcast_threadsafe(message: dict):
    """Called from the Paho thread: hand the broadcast to the FastAPI event loop."""
    if loop is not None and loop.is_running():
        asyncio.run_coroutine_threadsafe(manager.broadcast(message), loop)


# ------------------------------------------------------------------ node tracking
def register_seen(node_id, status="online", firmware_version=None, ip=None, touch=True):
    with lock:
        node, changed = db.set_node(conn, node_id, db.utc_now_str(), status, firmware_version, ip, touch)
    if changed:
        broadcast_threadsafe({"type": "node_status", "data": node})
    return node


def sweep_stale():
    cutoff = (db.utc_now() - timedelta(seconds=HEARTBEAT_TIMEOUT)).strftime(db.TS_FMT)
    with lock:
        return db.mark_stale_offline(conn, cutoff)


async def offline_watcher():
    """Backstop for nodes that vanish without a Last Will (for example a broker restart or a hung node)."""
    while True:
        await asyncio.sleep(OFFLINE_CHECK_INTERVAL)
        try:
            for node in await asyncio.to_thread(sweep_stale):
                print(f"[nodes] {node['node_id']} marked offline (no contact for {HEARTBEAT_TIMEOUT:g}s)")
                await manager.broadcast({"type": "node_status", "data": node})
        except Exception as e:  # keep the watcher alive no matter what
            print(f"[nodes] offline sweep failed: {e}")


# ------------------------------------------------------------------ MQTT handlers
def handle_alert(msg):
    stats["received"] += 1
    try:
        alert = Alert.model_validate(json.loads(msg.payload))
    except (json.JSONDecodeError, ValidationError) as e:
        stats["rejected"] += 1
        print(f"[mqtt] rejected message on {msg.topic}: {e}")
        return
    with lock:
        event_id = db.insert_event(conn, alert.node_id, alert.timestamp.isoformat(),
                                   alert.cls.value, alert.confidence, alert.verified)
        row = db.get_event(conn, event_id)
    stats["stored"] += 1
    print(f"[mqtt] stored {alert.node_id} {alert.cls.value} {alert.confidence:.2f} verified={alert.verified}")
    register_seen(alert.node_id, "online")                      # an alert proves the node is alive
    broadcast_threadsafe({"type": "alert", "data": row})


def handle_heartbeat(node_id, msg):
    try:
        raw = msg.payload.decode("utf-8").strip()
        hb = Heartbeat.model_validate(json.loads(raw)) if raw else Heartbeat()
    except (UnicodeDecodeError, json.JSONDecodeError, ValidationError) as e:
        stats["rejected_other"] += 1
        print(f"[mqtt] rejected heartbeat on {msg.topic}: {e}")
        return
    stats["heartbeats"] += 1
    register_seen(node_id, "online", hb.firmware_version, hb.ip)


def handle_status(node_id, msg):
    stats["status_messages"] += 1
    status = parse_status(msg.payload)
    if status is None:
        stats["rejected_other"] += 1
        print(f"[mqtt] rejected status on {msg.topic}: {msg.payload!r}")
        return
    if msg.retain and status == "online":
        # A retained 'online' may be stale (the node could have died while we were down), so only register
        # unknown nodes (as offline). A live heartbeat or alert will flip the node online.
        with lock:
            created = db.ensure_node(conn, node_id, db.utc_now_str())
            node = db.get_node(conn, node_id) if created else None
        if node:
            broadcast_threadsafe({"type": "node_status", "data": node})
        return
    # Live 'online' refreshes last_seen. 'offline' (including the Last Will) keeps the previous last_seen.
    register_seen(node_id, status, touch=(status == "online"))
    print(f"[mqtt] {node_id} reported {status}")


def on_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code.is_failure:
        print(f"[mqtt] connection refused: {reason_code}")
        return
    mqtt_state["connected"] = True
    print(f"[mqtt] connected ({reason_code}); subscribing to alert, heartbeat and status topics")
    client.subscribe([(ALERT_TOPIC, 1), (HEARTBEAT_TOPIC, 1), (STATUS_TOPIC, 1)])


def on_disconnect(client, userdata, flags, reason_code, properties=None):
    mqtt_state["connected"] = False
    print(f"[mqtt] disconnected ({reason_code}); the client will keep retrying")


def on_connect_fail(client, userdata):
    print(f"[mqtt] could not reach the broker at {BROKER_HOST}:{BROKER_PORT}; retrying")


def on_message(client, userdata, msg):
    parts = msg.topic.split("/")
    if len(parts) != 3 or parts[0] != "sentrymesh":
        return
    node_id, kind = parts[1], parts[2]
    try:
        if kind == "alert":
            handle_alert(msg)
        elif kind == "heartbeat":
            handle_heartbeat(node_id, msg)
        elif kind == "status":
            handle_status(node_id, msg)
    except Exception as e:  # one bad message must never kill the MQTT thread
        print(f"[mqtt] error handling {msg.topic}: {e!r}")


# ------------------------------------------------------------------ app
@asynccontextmanager
async def lifespan(app: FastAPI):
    global loop
    loop = asyncio.get_running_loop()
    with lock:
        reset = db.mark_all_offline(conn)  # a live node flips back to online on its next heartbeat or alert
    if reset:
        print(f"[nodes] startup: {reset} node(s) reset to offline until they are heard from again")
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_connect_fail = on_connect_fail
    client.on_message = on_message
    client.reconnect_delay_set(min_delay=1, max_delay=30)
    client.connect_async(BROKER_HOST, BROKER_PORT)  # the API starts even if the broker is down, and keeps retrying
    client.loop_start()
    watcher = asyncio.create_task(offline_watcher())
    yield
    watcher.cancel()
    with suppress(asyncio.CancelledError):
        await watcher
    client.disconnect()
    client.loop_stop()
    loop = None


app = FastAPI(title="SentryMesh backend", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)


@app.get("/health")
def health():
    with lock:
        nodes = db.count_nodes(conn)
    return {
        "status": "ok",
        **stats,
        "mqtt_connected": mqtt_state["connected"],
        "ws_clients": len(manager.clients),
        "nodes_total": nodes["total"],
        "nodes_online": nodes["online"],
        "heartbeat_timeout_s": HEARTBEAT_TIMEOUT,
    }


@app.get("/events")
def events(
    response: Response,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    node_id: str | None = None,
    cls: str | None = Query(None, alias="class"),
):
    with lock:
        rows = db.list_events(conn, limit=limit, node_id=node_id, cls=cls, offset=offset)
        total = db.count_events(conn, node_id=node_id, cls=cls)
    response.headers["X-Total-Count"] = str(total)  # for pagination in the dashboard
    return rows


@app.get("/nodes")
def nodes():
    with lock:
        return db.list_nodes(conn)


@app.get("/analytics/summary")
def analytics_summary(
    hours: int | None = Query(None, ge=1, le=24 * 365, description="look-back window; omit for all time"),
    node_id: str | None = None,
):
    with lock:
        data = db.summary(conn, hours=hours, node_id=node_id)
    data["by_class"] = {c.value: data["by_class"].get(c.value, 0) for c in IntrusionClass}  # zero-fill for charts
    return data


@app.get("/analytics/timeseries")
def analytics_timeseries(
    hours: int = Query(24, ge=1, le=24 * 365),
    bucket: Literal["minute", "hour", "day"] = "hour",
    node_id: str | None = None,
    cls: str | None = Query(None, alias="class"),
):
    if db.bucket_count(hours, bucket) > 2000:
        raise HTTPException(status_code=400, detail="Too many buckets for this window; use a larger bucket or a shorter window.")
    with lock:
        points = db.timeseries(conn, hours=hours, bucket=bucket, node_id=node_id, cls=cls)
    for p in points:
        p["by_class"] = {c.value: p["by_class"].get(c.value, 0) for c in IntrusionClass}
    return {"hours": hours, "bucket": bucket, "points": points}


@app.websocket("/ws/alerts")
async def ws_alerts(ws: WebSocket):
    """Pushes {"type": "alert", "data": <event row>} and {"type": "node_status", "data": <node>} as they happen.

    On connect the client first receives {"type": "snapshot", "data": {"nodes": [...]}}.
    Send the text "ping" to receive "pong" (keep-alive).
    """
    await manager.connect(ws)
    try:
        with lock:
            snapshot = db.list_nodes(conn)
        await ws.send_text(json.dumps({"type": "snapshot", "data": {"nodes": snapshot}}))
        while True:
            text = await ws.receive_text()
            if text == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(ws)
