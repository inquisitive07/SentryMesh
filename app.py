"""FastAPI backend: subscribes to MQTT alerts, validates, stores in SQLite, serves them over HTTP.

Run:  uvicorn app:app --reload
"""
import json
import os
import threading
from contextlib import asynccontextmanager

import paho.mqtt.client as mqtt
from fastapi import FastAPI, Query
from pydantic import ValidationError

import db
from schema import Alert

BROKER_HOST = os.getenv("MQTT_HOST", "localhost")
BROKER_PORT = int(os.getenv("MQTT_PORT", "1883"))
ALERT_TOPIC = "sentrymesh/+/alert"

conn = db.connect()
db.init(conn)
lock = threading.Lock()  # sqlite connection is shared with the MQTT thread
stats = {"received": 0, "stored": 0, "rejected": 0}


def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f"[mqtt] connected ({reason_code}); subscribing to {ALERT_TOPIC}")
    client.subscribe(ALERT_TOPIC)


def on_message(client, userdata, msg):
    stats["received"] += 1
    try:
        alert = Alert.model_validate(json.loads(msg.payload))
    except (json.JSONDecodeError, ValidationError) as e:
        stats["rejected"] += 1
        print(f"[mqtt] rejected message on {msg.topic}: {e}")
        return
    with lock:
        db.insert_event(conn, alert.node_id, alert.timestamp.isoformat(),
                        alert.cls.value, alert.confidence, alert.verified)
    stats["stored"] += 1
    print(f"[mqtt] stored {alert.node_id} {alert.cls.value} {alert.confidence:.2f} verified={alert.verified}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER_HOST, BROKER_PORT)
    client.loop_start()
    yield
    client.loop_stop()
    client.disconnect()


app = FastAPI(title="SentryMesh backend", lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok", **stats}


@app.get("/events")
def events(limit: int = Query(50, ge=1, le=500), node_id: str | None = None, cls: str | None = Query(None, alias="class")):
    with lock:
        return db.list_events(conn, limit=limit, node_id=node_id, cls=cls)
