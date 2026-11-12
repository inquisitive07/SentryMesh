"""Fake ESP32 node: publishes alerts, heartbeats and online/offline status so you can build and test the
backend and dashboard without hardware.

Examples:
  python fake_node.py                                   # alert every 2 s + heartbeat every 10 s, forever
  python fake_node.py --count 5 --interval 1            # 5 alerts, then exit cleanly (publishes 'offline')
  python fake_node.py --class digging --unverified      # fallback case (verified=false)
  python fake_node.py --count 3 --stay-online           # send 3 alerts, then keep heartbeating until Ctrl+C
  python fake_node.py --count 3 --crash                 # die without a clean disconnect -> broker fires the Last Will
  python fake_node.py --count 1 --stay-online --no-heartbeat   # test the heartbeat-timeout path
"""
import argparse
import json
import os
import random
import sys
import threading
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

CLASSES = ["normal_noise", "walk_run", "vehicle", "digging", "climbing_cutting"]
FIRMWARE_VERSION = "fake-0.2"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--host", default="localhost")
    p.add_argument("--port", type=int, default=1883)
    p.add_argument("--node", default="node_01")
    p.add_argument("--interval", type=float, default=2.0, help="seconds between alerts")
    p.add_argument("--count", type=int, default=0, help="0 = run forever")
    p.add_argument("--class", dest="cls", choices=CLASSES, help="fix the class instead of random")
    p.add_argument("--unverified", action="store_true", help="always send verified=false (cloud fallback case)")
    p.add_argument("--heartbeat-interval", type=float, default=10.0, help="seconds between heartbeats")
    p.add_argument("--no-heartbeat", action="store_true", help="do not send heartbeats (tests the timeout path)")
    p.add_argument("--stay-online", action="store_true", help="after the alerts, keep running until Ctrl+C")
    p.add_argument("--crash", action="store_true", help="after the alerts, exit without a clean disconnect (fires the Last Will)")
    a = p.parse_args()

    alert_topic = f"sentrymesh/{a.node}/alert"
    heartbeat_topic = f"sentrymesh/{a.node}/heartbeat"
    status_topic = f"sentrymesh/{a.node}/status"
    started = time.time()

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.will_set(status_topic, "offline", qos=1, retain=True)  # the broker publishes this if we vanish

    def on_connect(client, userdata, flags, reason_code, properties=None):
        client.publish(status_topic, "online", qos=1, retain=True)  # also re-sent after a reconnect

    client.on_connect = on_connect
    client.connect(a.host, a.port)
    client.loop_start()

    stop = threading.Event()

    def heartbeat_loop():
        while not stop.is_set():
            payload = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "firmware_version": FIRMWARE_VERSION,
                "ip": "127.0.0.1",
                "uptime_s": int(time.time() - started),
            }
            client.publish(heartbeat_topic, json.dumps(payload), qos=1)
            stop.wait(a.heartbeat_interval)

    if not a.no_heartbeat:
        threading.Thread(target=heartbeat_loop, daemon=True).start()

    n = 0
    try:
        while a.count == 0 or n < a.count:
            packet = {
                "node_id": a.node,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "class": a.cls or random.choice(CLASSES),
                "confidence": round(random.uniform(0.6, 0.99), 2),
                "verified": False if a.unverified else random.random() > 0.3,
            }
            client.publish(alert_topic, json.dumps(packet), qos=1)
            print(f"published to {alert_topic}: {packet}")
            n += 1
            time.sleep(a.interval)

        if a.crash:
            print("crashing without a clean disconnect (the broker should publish the Last Will)")
            time.sleep(0.5)  # let the last QoS 1 publishes go out
            sys.stdout.flush()
            os._exit(1)
        if a.stay_online:
            print("staying online; press Ctrl+C to stop")
            while True:
                time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
        # A clean disconnect does NOT fire the Last Will, so say goodbye explicitly.
        client.publish(status_topic, "offline", qos=1, retain=True).wait_for_publish(timeout=3)
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
