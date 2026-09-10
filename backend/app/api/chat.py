import json

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token
from app.db.database import SessionLocal
from app.agent.agent import handle_user_message

router = APIRouter()


@router.websocket("/chat")
async def chat_ws(websocket: WebSocket):
    await websocket.accept()

    # Browsers' native WebSocket API can't set an Authorization header, so
    # the token travels as a query param instead (?token=<jwt>) — see
    # frontend/src/hooks/useChatSocket.ts.
    token = websocket.query_params.get("token")
    role = None
    if token:
        try:
            role = decode_access_token(token)["role"]
        except jwt.PyJWTError:
            role = None
    if role is None:
        await websocket.send_text(json.dumps({
            "type": "agent_text",
            "text": "Please sign in to use the Co-Pilot.",
        }))
        await websocket.close()
        return

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

                await handle_user_message(message.get("text", ""), db, emit, role)
            finally:
                db.close()
    except WebSocketDisconnect:
        pass
