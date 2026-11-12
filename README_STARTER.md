# SentryMesh starter: MQTT + fake node + FastAPI backend

Gets the software plumbing running without any hardware. A fake node publishes alerts, the backend validates and stores them, and you can read them over HTTP. Later the real ESP32 replaces the fake node and the React dashboard reads `/events`.

Tested end to end (Mosquitto, FastAPI, fake node, SQLite). The alert JSON and topic names are the PROPOSED ones from README_TEAM.md section 5.

## Files

| File | What it does |
|---|---|
| `schema.py` | Alert packet model (node_id, timestamp, class, confidence, verified) |
| `db.py` | SQLite event table and queries |
| `app.py` | FastAPI server; subscribes to `sentrymesh/+/alert`, validates, stores |
| `fake_node.py` | Pretend ESP32; publishes dummy alerts |
| `subscriber_print.py` | Prints every message on the broker (to check MQTT) |

## 1. Install the MQTT broker (Mosquitto)

- **Windows:** download the installer from https://mosquitto.org/download/ and run it. Then start it from a terminal in its install folder: `mosquitto -v`
- **macOS:** `brew install mosquitto` then `mosquitto -v`
- **Ubuntu/Debian:** `sudo apt install mosquitto` then `mosquitto -v` (stop the system service first if port 1883 is busy: `sudo systemctl stop mosquitto`)

Leave it running in its own terminal. By default Mosquitto 2.x accepts connections from the same machine only, which is fine for now. To accept connections from the ESP32 later, you must add a config file with a listener and an auth choice (see the Mosquitto docs).

## 2. Install the Python packages

```
python -m venv .venv
# Windows: .venv\Scripts\activate      macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

## 3. Check the MQTT plumbing

Terminal A: `python subscriber_print.py`

Terminal B: `python fake_node.py --count 3 --interval 1`

Terminal A should print three alerts. If it does, the broker works.

## 4. Run the backend

Terminal C: `uvicorn app:app --reload`

Terminal B again: `python fake_node.py --count 5 --interval 1`

Then open in a browser:
- http://localhost:8000/health shows counters (received, stored, rejected)
- http://localhost:8000/events shows the stored alerts, newest first
- http://localhost:8000/events?class=digging&limit=10 filters them
- http://localhost:8000/docs is the auto-generated API page

Try the fallback case: `python fake_node.py --class digging --unverified --count 1` stores an alert with `verified: 0`.

Bad packets (wrong class name, confidence outside 0-1, invalid JSON) are rejected and counted in `/health`.

Environment variables if the broker is elsewhere: `MQTT_HOST`, `MQTT_PORT`.

The SQLite file `sentrymesh.db` is created next to `app.py`. Delete it to start clean.

## What to build next

1. **Dashboard (A5):** a React page that polls `/events` and shows the fence-line schematic, event type, confidence, verified status and an alarm. A WebSocket or server-sent events endpoint can replace polling later.
2. **Cloud result path (B3):** a second topic `sentrymesh/<node_id>/cloud_result` for the video detector's output.
3. **Fusion simulation (C1):** a Python module that takes a sensor result plus a cloud result (or none) and decides the alert and its verified flag. This is where the open conflict-policy decision gets settled.
4. **Replace the fake node** with the ESP32 firmware once the hardware is ready, keeping the same JSON.

## Known limits of this starter

- No authentication on MQTT or the API.
- Timestamps come from the sender; the backend also stores `received_at`.
- One SQLite connection shared with a lock; fine for a prototype, not for heavy load.
