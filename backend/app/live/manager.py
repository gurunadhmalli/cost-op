"""
A tiny in-memory WebSocket fan-out for /ws/live (see app/api/live.py).

Deliberately not a message queue or pub/sub service (that would mean a paid
or extra-infra dependency) — this is a single-process prototype, so a plain
list of open connections is enough to push each simulator tick
(app/simulator/live_feed.py) out to every connected dashboard tab.
"""
import json

from fastapi import WebSocket


class LiveConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active:
            self.active.remove(websocket)

    async def broadcast(self, event: dict) -> None:
        payload = json.dumps(event, default=str)
        dead: list[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = LiveConnectionManager()
