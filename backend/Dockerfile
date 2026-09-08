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

# docker-compose.yml overrides this command to seed the database before the
# very first boot; this default is what a plain `docker build && docker run`
# needs (against an already-seeded database).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
