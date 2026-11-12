# SentryMesh backend (Phase 1): MQTT ingest, REST, WebSocket, node status, analytics

A fake node (later the ESP32) publishes alerts, heartbeats and online/offline status over MQTT. The backend validates and stores everything in SQLite, tracks which nodes are online, pushes live updates over a WebSocket, and serves history and analytics over REST for the React dashboard.

Tested end to end with Mosquitto, including: upgrade of an existing database, live WebSocket push, heartbeat, Last Will after a crash, heartbeat timeout, clean exit, analytics, CORS, bad payloads, restart behaviour, and starting while the broker is down.

## Files

| File | What it does |
|---|---|
| `schema.py` | Alert, Heartbeat models and the status parser |
| `db.py` | SQLite: events, nodes, analytics queries (upgrades old databases in place) |
| `app.py` | FastAPI app: MQTT thread, REST, WebSocket, offline watcher, CORS |
| `fake_node.py` | Pretend ESP32 with alerts, heartbeats, Last Will and failure simulation |
| `ws_listen.py` | Prints the WebSocket stream (to check it before building the dashboard) |
| `subscriber_print.py` | Prints every MQTT message (unchanged) |

## Run it

```
pip install -r requirements.txt      # note: uvicorn[standard] is needed for WebSockets
mosquitto -v                         # own terminal
uvicorn app:app --reload             # own terminal
python ws_listen.py                  # own terminal (optional)
python fake_node.py --count 5 --interval 1 --stay-online
```

Open http://localhost:8000/docs for the interactive API page.

## MQTT topics (all QoS 1)

| Topic | Payload | Notes |
|---|---|---|
| `sentrymesh/<node_id>/alert` | Alert JSON (unchanged) | Also proves the node is alive |
| `sentrymesh/<node_id>/heartbeat` | Optional JSON `{"firmware_version", "ip", "uptime_s", "timestamp"}` or an empty payload | Refreshes `last_seen`; metadata is stored on the node |
| `sentrymesh/<node_id>/status` | Plain text `online` or `offline` (JSON `{"status": "online"}` also accepted) | Publish `online` retained on connect. Set `offline` retained as the MQTT Last Will |

Node ID for heartbeat and status comes from the topic. Alerts still carry `node_id` in the payload, as before.

### How online/offline is decided
1. A live `online` status, a heartbeat or an alert marks the node online and refreshes `last_seen`.
2. A live `offline` status (including the Last Will after a crash) marks it offline immediately and keeps the old `last_seen`.
3. If an online node is not heard from for `HEARTBEAT_TIMEOUT` seconds (default 30), a background sweep marks it offline. Keep your heartbeat interval well below this (the fake node sends one every 10 s).
4. A retained `online` message delivered at startup is not trusted (the node may have died while the backend was down). It only registers an unknown node, as offline. A live heartbeat or alert flips it online.
5. At startup every node is reset to offline until it is heard from again.

## REST endpoints

| Endpoint | Returns |
|---|---|
| `GET /health` | `status, received, stored, rejected` (alerts, as before) plus `heartbeats, status_messages, rejected_other, mqtt_connected, ws_clients, nodes_total, nodes_online, heartbeat_timeout_s` |
| `GET /events?limit=&offset=&node_id=&class=` | Event rows, newest first (list, as before). New `offset` param and an `X-Total-Count` header for pagination. `verified` is 0/1 |
| `GET /nodes` | Per node: `node_id, status, last_seen, first_seen, firmware_version, ip, alert_count, last_alert_at` |
| `GET /analytics/summary?hours=&node_id=` | `total, by_class` (all five classes, zero-filled), `by_node, verified, unverified, verified_ratio, window_hours`. Omit `hours` for all time |
| `GET /analytics/timeseries?hours=24&bucket=hour&node_id=&class=` | Zero-filled `points`: `bucket, total, verified, unverified, by_class`. `bucket` is minute, hour or day. Returns 400 if the window would need more than 2000 buckets |

Analytics time buckets use the server's receive time (`received_at`, UTC), not the node's own timestamp, because an ESP32 clock can be wrong.

## WebSocket: `/ws/alerts`

Each message is JSON with a `type`:

```json
{"type": "snapshot",    "data": {"nodes": [ ...node objects as in GET /nodes... ]}}
{"type": "alert",       "data": { ...one event row, same shape as GET /events... }}
{"type": "node_status", "data": { ...one node object... }}
```

- `snapshot` is sent once, right after connecting.
- `alert` carries the stored row including its `id`, so a dashboard can skip any event it already loaded from `/events`.
- `node_status` is sent only when a node is new or its status changes. `last_seen` is not pushed on every heartbeat, so refresh `/nodes` periodically if the UI shows last-seen time.
- Send the text `ping` to get `pong` back (keep-alive).
- Browsers do not apply CORS to WebSockets, so no extra setup is needed.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `MQTT_HOST`, `MQTT_PORT` | `localhost`, `1883` | Broker address |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed origins (Vite dev server) |
| `HEARTBEAT_TIMEOUT` | `30` | Seconds without contact before an online node is marked offline |
| `OFFLINE_CHECK_INTERVAL` | `5` | Seconds between offline sweeps |
| `SENTRYMESH_DB` | next to `db.py` | Path to the SQLite file |

The backend starts even if the broker is down and keeps retrying; `/health` shows `mqtt_connected`.

## fake_node.py options

```
--node node_01          node id
--interval 2            seconds between alerts
--count 5               number of alerts (0 = forever)
--class digging         fix the class
--unverified            always verified=false (cloud fallback case)
--heartbeat-interval 10 seconds between heartbeats
--no-heartbeat          send none (tests the timeout path)
--stay-online           after the alerts, keep running until Ctrl+C
--crash                 exit without a clean disconnect (fires the Last Will)
```

Handy scenarios:
- Normal: `python fake_node.py --count 3 --stay-online`
- Crash: `python fake_node.py --node node_02 --count 2 --crash` (node_02 goes offline immediately)
- Silent node: `HEARTBEAT_TIMEOUT=6 uvicorn app:app` then `python fake_node.py --node node_03 --count 1 --no-heartbeat --stay-online` (goes offline after about 6 s)

A clean exit (Ctrl+C or the script ending) publishes `offline` itself, because a clean MQTT disconnect does not trigger the Last Will.

## Notes for the ESP32 firmware (Phase 3)

- Set the Last Will to topic `sentrymesh/<id>/status`, payload `offline`, QoS 1, retained.
- On every (re)connect publish `online` to the same topic, retained.
- Publish a heartbeat at least every `HEARTBEAT_TIMEOUT / 3` seconds.
- Alert JSON must match `schema.Alert`.

## Known limits

- No authentication on MQTT, REST or the WebSocket.
- One SQLite connection shared behind a lock: fine for a prototype, not for heavy load.
- Events are never deleted; add a retention job before a long deployment.
