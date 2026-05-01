"""FastAPI application entry point."""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173",
).split(",")

app = FastAPI(
    title="NAFAD-PAY API",
    version="1.0.0",
    description=(
        "Group 2 Platform & API — REST service for the NAFAD-PAY simulator.\n\n"
        "Four endpoints with full SHA256-based idempotency on writes."
    ),
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
