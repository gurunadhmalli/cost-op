"""
FastAPI dependencies for authentication (who is this?) and authorization
(are they allowed to do this?). REST routes use get_current_user /
require_roles as Depends(); the Co-Pilot's WebSocket can't use Depends()
for its per-message tool calls (app/agent/tools.py's dispatch() calls
route handlers directly in Python, skipping FastAPI's request pipeline
entirely), so app/api/chat.py decodes the token itself and passes the
resulting role down into dispatch() by hand — see app/agent/agent.py.
"""
import jwt
from fastapi import Depends, Header, HTTPException

from app.core.security import decode_access_token


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated — please sign in")
    token = authorization[len("Bearer "):].strip()
    try:
        return decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired — please sign in again")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session — please sign in again")


def require_roles(*roles: str):
    def dependency(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="You don't have permission to do this")
        return user
    return dependency
