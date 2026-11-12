"""Fake ESP32 node: publishes dummy alerts so you can build/test the backend and dashboard without hardware.

Examples:
  python fake_node.py                      # one alert every 2 s, forever
  python fake_node.py --count 5 --interval 1
  python fake_node.py --class digging --unverified
"""
import argparse
import json
import random
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

CLASSES = ["normal_noise", "walk_run", "vehicle", "digging", "climbing_cutting"]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--host", default="localhost")
    p.add_argument("--port", type=int, default=1883)
    p.add_argument("--node", default="node_01")
    p.add_argument("--interval", type=float, default=2.0, help="seconds between alerts")
    p.add_argument("--count", type=int, default=0, help="0 = run forever")
    p.add_argument("--class", dest="cls", choices=CLASSES, help="fix the class instead of random")
    p.add_argument("--unverified", action="store_true", help="always send verified=false (cloud fallback case)")
    a = p.parse_args()

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.connect(a.host, a.port)
    client.loop_start()
    topic = f"sentrymesh/{a.node}/alert"

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
            client.publish(topic, json.dumps(packet), qos=1)
            print(f"published to {topic}: {packet}")
            n += 1
            time.sleep(a.interval)
    except KeyboardInterrupt:
        pass
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
