"""
Finsight Backend — FastAPI entry point.
Initializes the RAG pipeline on startup and registers all API routes.
"""

import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


app = FastAPI(
    title="Finsight API",
    description="Conversational AI for personal finance — understands emotions, retrieves knowledge, responds like a friend.",
    version="2.0.0",
    lifespan=lifespan,
)

# Allow all origins in development; restrict to your Vercel URL in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")
app.include_router(advice_router, prefix="/api")
app.include_router(auth_router, prefix="/api")


@app.get("/", tags=["health"])
def health_check():
    """Quick health check endpoint."""
    return {"status": "ok", "app": "Finsight API"}
