"""
Finsight Backend — FastAPI entry point.
Initializes the RAG pipeline on startup and registers all API routes.
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from routes.chat import router as chat_router
from routes.daily_advice import router as advice_router
from routes.auth import router as auth_router
from ai.rag_pipeline import initialize_rag
from db.database import init_db

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: run startup tasks before yielding to the app."""
    logger.info("Starting Finsight API…")
    init_db()
    logger.info("Database ready.")
    logger.info("Initializing RAG pipeline (this may take a moment on first run)…")
    initialize_rag()
    logger.info("RAG pipeline ready.")
    yield
    logger.info("Shutting down Finsight API.")


# ── Rate limiter (per-IP, in-memory) ──────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(
    title="Finsight API",
    description="Conversational AI for personal finance — understands emotions, retrieves knowledge, responds like a friend.",
    version="2.0.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── CORS ──────────────────────────────────────────────────────────────────────
# Comma-separated ALLOWED_ORIGINS env var in prod. Local dev defaults to the
# Vite dev server. NEVER combine "*" with allow_credentials=True — browsers
# silently reject that combo.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
if _raw_origins:
    _origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
else:
    _origins = [
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
    ]
logger.info(f"CORS allowed origins: {_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(chat_router,   prefix="/api")
app.include_router(advice_router, prefix="/api")
app.include_router(auth_router,   prefix="/api")


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "app": "Finsight API"}


@app.get("/health/ready", tags=["health"])
def readiness():
    """RAG + DB ready for traffic."""
    from ai.rag_pipeline import is_ready
    return {"ready": is_ready()}


# Generic error surface — never leak stack traces to clients.
@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. Please try again."},
    )
