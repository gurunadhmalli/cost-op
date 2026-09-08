from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
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
    if db.query(models.User).filter_by(email=email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    salt, password_hash = hash_password(payload.password)
    user = models.User(email=email, password_hash=password_hash, password_salt=salt)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": user.user_id, "email": user.email}


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(models.User).filter_by(email=email).first()
    if not user or not verify_password(payload.password, user.password_salt, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"user_id": user.user_id, "email": user.email}
