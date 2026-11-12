"""Prints every message from the backend WebSocket. Use it to check /ws/alerts before building the dashboard.

Usage: python ws_listen.py [ws://localhost:8000/ws/alerts]
"""
import asyncio
import sys

import websockets

URL = sys.argv[1] if len(sys.argv) > 1 else "ws://localhost:8000/ws/alerts"


async def main():
    async with websockets.connect(URL) as ws:
        print(f"connected to {URL}")
        async for message in ws:
            print(message)


try:
    asyncio.run(main())
except KeyboardInterrupt:
    pass
