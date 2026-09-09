# Backend image — FastAPI + the ML/optimization engines. No paid base image,
# no paid service: python:slim + open-source pip packages only.
FROM python:3.11-slim

WORKDIR /app

# requirements.txt pins psycopg2-binary (precompiled wheel), so no system
# build toolchain (gcc/libpq-dev) is needed here — keeps the image small and
# the build fast even on a restricted network.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Shell form (via explicit sh -c) so $PORT expands — hosts like Render assign
# a dynamic port and don't reliably support compound/chained command
# overrides in their dashboard, so this needs to be self-contained here
# rather than relying on a platform's command-override field. Seeding runs
# from app.main itself (idempotent — see app/simulator/seed.py) rather than
# as a separate chained command for the same reason; docker-compose.yml
# still runs the seed as an explicit step first, which is harmless since
# re-seeding an already-seeded database is a no-op.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
