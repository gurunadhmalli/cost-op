"""
Password hashing + JWT session tokens for the login/signup endpoints.
Password hashing uses only the standard library (hashlib's
PBKDF2-HMAC-SHA256) — passlib/bcrypt aren't in requirements.txt and this
prototype has no other auth infrastructure to justify adding a new
dependency for. JWTs use PyJWT (HS256, signed with JWT_SECRET).
"""
import hashlib
import hmac
import os
import time

import jwt

from app.core.config import settings

_ITERATIONS = 100_000

ROLES = ("admin", "operator", "viewer")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_SECONDS = 7 * 24 * 3600  # 7 days


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": int(time.time()),
        "exp": int(time.time()) + JWT_EXPIRY_SECONDS,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Raises jwt.PyJWTError (ExpiredSignatureError/InvalidTokenError/...) on failure."""
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])
    return {"user_id": payload["sub"], "email": payload["email"], "role": payload["role"]}


def hash_password(password: str, salt_hex: str | None = None) -> tuple[str, str]:
    """Returns (salt_hex, hash_hex). Pass salt_hex to verify against an existing hash."""
    salt_hex = salt_hex or os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), _ITERATIONS)
    return salt_hex, digest.hex()


def verify_password(password: str, salt_hex: str, expected_hash_hex: str) -> bool:
    _, computed_hash_hex = hash_password(password, salt_hex)
    return hmac.compare_digest(computed_hash_hex, expected_hash_hex)
