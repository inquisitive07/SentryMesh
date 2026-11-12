"""Prints every SentryMesh message on the broker. Use this to check the MQTT plumbing."""
import sys

import paho.mqtt.client as mqtt

HOST = sys.argv[1] if len(sys.argv) > 1 else "localhost"


def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f"connected to {HOST} ({reason_code}); listening on sentrymesh/#")
    client.subscribe("sentrymesh/#")


def on_message(client, userdata, msg):
    print(f"{msg.topic}: {msg.payload.decode()}")


client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_connect = on_connect
client.on_message = on_message
client.connect(HOST, 1883)
client.loop_forever()
