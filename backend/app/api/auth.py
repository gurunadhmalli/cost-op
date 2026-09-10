from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import ROLES, create_access_token, hash_password, verify_password
from app.db.database import get_db
from app.db import models
from app.schemas import LoginRequest, SignupRequest

router = APIRouter()


@router.post("/signup")
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid work email")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of {ROLES}")
    if db.query(models.User).filter_by(email=email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    salt, password_hash = hash_password(payload.password)
    user = models.User(email=email, password_hash=password_hash, password_salt=salt, role=payload.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.user_id, user.email, user.role)
    return {"user_id": user.user_id, "email": user.email, "role": user.role, "access_token": token}


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(models.User).filter_by(email=email).first()
    if not user or not verify_password(payload.password, user.password_salt, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.user_id, user.email, user.role)
    return {"user_id": user.user_id, "email": user.email, "role": user.role, "access_token": token}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user
