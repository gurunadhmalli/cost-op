"""
Server-push channel for the dashboard: every simulator tick
(app/simulator/live_feed.py, scheduled from app/main.py) is broadcast here so
connected frontend tabs know to refetch cost/anomaly/recommendation data
without polling. The client never needs to send anything after connecting —
this is a pure listen socket, mirroring the pattern of /ws/chat in
app/api/chat.py but one-directional.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.live.manager import manager

router = APIRouter()


@router.websocket("/live")
async def live_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # No inbound protocol — just block here until the client
            # disconnects, so we notice and clean up the connection list.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
