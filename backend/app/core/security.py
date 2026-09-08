"""
Password hashing for the login/signup endpoints. Uses only the standard
library (hashlib's PBKDF2-HMAC-SHA256) — passlib/bcrypt aren't in
requirements.txt and this prototype has no other auth infrastructure to
justify adding a new dependency for.
"""
import hashlib
import hmac
import os

_ITERATIONS = 100_000


def hash_password(password: str, salt_hex: str | None = None) -> tuple[str, str]:
    """Returns (salt_hex, hash_hex). Pass salt_hex to verify against an existing hash."""
    salt_hex = salt_hex or os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), _ITERATIONS)
    return salt_hex, digest.hex()


def verify_password(password: str, salt_hex: str, expected_hash_hex: str) -> bool:
    _, computed_hash_hex = hash_password(password, salt_hex)
    return hmac.compare_digest(computed_hash_hex, expected_hash_hex)
