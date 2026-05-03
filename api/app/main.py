"""FastAPI application entry point."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import engine
from .models import Base
from .routes import router

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173",
).split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Idempotent — creates the tables only if they don't exist. Safe for both
    # the local docker-compose (which seeds via /docker-entrypoint-initdb.d)
    # and the AWS RDS instance (which starts empty).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="NAFAD-PAY API",
    version="1.0.0",
    description=(
        "Group 2 Platform & API — REST service for the NAFAD-PAY simulator.\n\n"
        "Four endpoints with full SHA256-based idempotency on writes."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/", tags=["meta"])
async def root() -> dict:
    return {"service": "nafad-pay-api", "version": "1.0.0", "docs": "/docs"}
