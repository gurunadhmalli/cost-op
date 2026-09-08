import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.db.database import SessionLocal
from app.agent.agent import handle_user_message

router = APIRouter()


@router.websocket("/chat")
async def chat_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)
            if message.get("type") != "user_message":
                continue

            db = SessionLocal()
            try:
                async def emit(event: dict):
                    await websocket.send_text(json.dumps(event, default=str))

                await handle_user_message(message.get("text", ""), db, emit)
            finally:
                db.close()
    except WebSocketDisconnect:
        pass
