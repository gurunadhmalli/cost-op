from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.core.security import ROLES, create_access_token, hash_password, verify_password
from app.db.database import get_db
from app.db import models
from app.schemas import LoginRequest, SignupRequest, UpdateRoleRequest

router = APIRouter()


def _validate_new_account(payload: SignupRequest, db: Session) -> str:
    """Shared checks for both self-serve signup and admin-created accounts.
    Returns the normalized email."""
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid work email")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of {ROLES}")
    if db.query(models.User).filter_by(email=email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    return email


@router.post("/signup")
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = _validate_new_account(payload, db)
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


# ---------------------------------------------------------------- Admin: user management
@router.get("/users")
def list_users(db: Session = Depends(get_db), admin: dict = Depends(require_roles("admin"))):
    users = db.query(models.User).order_by(models.User.created_at.asc()).all()
    return [
        {"user_id": u.user_id, "email": u.email, "role": u.role, "created_at": u.created_at.isoformat()}
        for u in users
    ]


@router.post("/users")
def create_user(
    payload: SignupRequest, db: Session = Depends(get_db), admin: dict = Depends(require_roles("admin"))
):
    """Same validation as self-serve /signup, but issued by an admin on someone
    else's behalf — no access_token in the response, since the creator's own
    session shouldn't change and the new user logs in themselves."""
    email = _validate_new_account(payload, db)
    salt, password_hash = hash_password(payload.password)
    user = models.User(email=email, password_hash=password_hash, password_salt=salt, role=payload.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": user.user_id, "email": user.email, "role": user.role}


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    payload: UpdateRoleRequest,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_roles("admin")),
):
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of {ROLES}")
    user = db.query(models.User).filter_by(user_id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Unknown user_id {user_id}")
    if user.user_id == admin["user_id"] and payload.role != "admin":
        raise HTTPException(status_code=400, detail="You can't remove your own admin access")
    user.role = payload.role
    db.commit()
    return {"user_id": user.user_id, "email": user.email, "role": user.role}
