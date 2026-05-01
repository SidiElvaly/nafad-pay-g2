# Single-stage Dockerfile. Multi-stage caused the uvicorn binary to land in
# /install/bin (not on PATH). The simpler single-stage approach is more
# reliable and the image stays small (~180 MB) on python:3.12-slim.
FROM python:3.12-slim

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN groupadd --system app && useradd --system --gid app --create-home app

WORKDIR /app

# Install dependencies first so this layer caches across code changes
RUN pip install --upgrade pip && \
    pip install \
        fastapi \
        'uvicorn[standard]' \
        'sqlalchemy[asyncio]' \
        asyncpg \
        'pydantic>=2.6' \
        numpy

COPY app ./app

RUN chown -R app:app /app
USER app

EXPOSE 8000

# Container-level healthcheck. The ALB in production uses GET /stats; for
# the local Docker health, the lightweight /health endpoint is enough.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=4)" || exit 1

# Use `python -m uvicorn` so we don't depend on the uvicorn shim being on PATH.
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
