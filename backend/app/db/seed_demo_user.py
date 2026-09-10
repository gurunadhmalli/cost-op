"""
Ensures the demo login (plant.manager@auracost.demo / AURA@2026Demo) always
exists, with full (admin) access. Separate from app/simulator/seed.py
because that script no-ops entirely once the plant/machine data has been
seeded once — this needs to run every startup regardless, so the demo
account works even against a database that was already seeded in an
earlier session.
"""
from app.core.security import hash_password
from app.db import models
from app.db.database import SessionLocal

DEMO_EMAIL = "plant.manager@auracost.demo"
DEMO_PASSWORD = "AURA@2026Demo"
DEMO_ROLE = "admin"


def ensure_demo_user() -> None:
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter_by(email=DEMO_EMAIL).first()
        if existing:
            # Rows from before the `role` column existed default to
            # "viewer" (see the ALTER TABLE in app/main.py) — upgrade the
            # demo account back to full access rather than silently
            # regressing everyone using it.
            if existing.role != DEMO_ROLE:
                existing.role = DEMO_ROLE
                db.commit()
            return
        salt, password_hash = hash_password(DEMO_PASSWORD)
        db.add(models.User(email=DEMO_EMAIL, password_hash=password_hash, password_salt=salt, role=DEMO_ROLE))
        db.commit()
    finally:
        db.close()
