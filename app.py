"""
Finsight — Hugging Face Spaces entry point for the GRADIO SDK (free tier).

Why this file exists:
    Some HF accounts can't pick the Docker SDK (shown as paid). The Gradio SDK
    is free on CPU Basic (16 GB RAM, same as Docker). This file lets the same
    backend run under the Gradio SDK with zero code changes to /backend.

What it does:
    1. Adds /backend to sys.path so our FastAPI app imports normally.
    2. Imports the FastAPI app from backend/main.py.
    3. Mounts a minimal Gradio landing page under /ui so the Space has
       something human-readable to look at.
    4. Serves the combined app on port 7860 (HF's default).

HF Gradio SDK runs this with `python app.py`, so the __main__ block starts
uvicorn on the FastAPI app that now contains both our /api/* routes and
the little Gradio status page at /ui.
"""

import os
import sys

# Make `backend/` importable so `main`, `routes`, `ai`, `db` all resolve.
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, BACKEND_DIR)

import gradio as gr                         # noqa: E402
import uvicorn                              # noqa: E402

from main import app as fastapi_app         # noqa: E402  (our FastAPI app)


# ── Tiny Gradio status page (mounted under /ui) ────────────────────────────────
with gr.Blocks(title="Finsight API", theme=gr.themes.Soft()) as _status:
    gr.Markdown(
        """
        # 💰 Finsight API
        This Space hosts the Finsight backend. It's an **API**, not a UI —
        the chat interface is deployed separately (Cloudflare Pages /
        Netlify / Vercel) and points here via `VITE_API_URL`.

        **Endpoints**
        - `GET /` — health check
        - `GET /health/ready` — readiness (true once embeddings load)
        - `POST /api/chat` — chat with the agent
        - `POST /api/auth/register`, `POST /api/auth/login`
        - `GET /api/daily-advice`

        **Logs** tab shows startup progress and incoming requests.
        """
    )

fastapi_app = gr.mount_gradio_app(fastapi_app, _status, path="/ui")


if __name__ == "__main__":
    # HF Spaces routes external traffic to whatever listens on port 7860.
    port = int(os.environ.get("PORT", "7860"))
    uvicorn.run(fastapi_app, host="0.0.0.0", port=port, log_level="info")
