"""
RAG Pipeline — loads financial knowledge text files, chunks them,
embeds with sentence-transformers, and stores in an in-memory ChromaDB.

Call `initialize_rag()` once at app startup.
Call `retrieve_context(query)` at runtime to fetch relevant passages.
"""

import glob
import logging
import os

import chromadb
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.normpath(os.path.join(_BASE_DIR, "../../data"))

EMBED_MODEL = "all-MiniLM-L6-v2"
TOP_K       = 2

_collection = None
_model      = None


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 60) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        chunk = text[start: start + chunk_size]
        if chunk.strip():
            chunks.append(chunk.strip())
        start += chunk_size - overlap
    return chunks


def initialize_rag() -> None:
    """
    Build the ChromaDB vector store from /data/*.txt files.
    In-memory only — fast and ephemeral; rebuilt on each process start.
    """
    global _collection, _model

    txt_files = glob.glob(os.path.join(DATA_DIR, "*.txt"))
    if not txt_files:
        logger.warning(f"No .txt files found in {DATA_DIR}. RAG will return empty context.")
        return

    logger.info(f"Loading embedding model '{EMBED_MODEL}'…")
    _model = SentenceTransformer(EMBED_MODEL)

    # In-memory client: on ephemeral hosts (HF Spaces, Render free) a persistent
    # disk is gone on cold start anyway, so the "skip if already indexed" check
    # never hit. In-memory removes disk I/O for identical startup cost.
    chroma_client = chromadb.Client()
    _collection = chroma_client.get_or_create_collection(
        name="financial_knowledge",
        metadata={"hnsw:space": "cosine"},
    )

    all_chunks: list[str] = []
    all_ids:    list[str] = []

    for path in txt_files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
            chunks = _chunk_text(text)
            fname = os.path.basename(path)
            for i, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                all_ids.append(f"{fname}_{i}")
            logger.info(f"  Loaded: {fname} ({len(chunks)} chunks)")
        except Exception as e:
            logger.warning(f"  Failed to load {path}: {e}")

    if not all_chunks:
        logger.warning("No chunks to index.")
        return

    logger.info(f"Embedding {len(all_chunks)} chunks…")
    embeddings = _model.encode(all_chunks, normalize_embeddings=True).tolist()

    batch_size = 100
    for i in range(0, len(all_chunks), batch_size):
        _collection.upsert(
            ids        = all_ids[i: i + batch_size],
            documents  = all_chunks[i: i + batch_size],
            embeddings = embeddings[i: i + batch_size],
        )

    logger.info(f"ChromaDB ready (in-memory) with {len(all_chunks)} chunks.")


def is_ready() -> bool:
    """True once the embedding model and collection are loaded."""
    return _collection is not None and _model is not None


def retrieve_context(query: str) -> str:
    """
    Retrieve the most relevant financial knowledge passages for `query`.
    Returns passages joined by double newlines, or empty string if not initialized.
    """
    if not is_ready():
        logger.warning("RAG not initialized — returning empty context.")
        return ""
    # Short queries are too noisy to usefully embed.
    if len(query.strip()) < 4:
        return ""

    try:
        query_embedding = _model.encode(query, normalize_embeddings=True).tolist()
        results = _collection.query(query_embeddings=[query_embedding], n_results=TOP_K)
        docs = results.get("documents", [[]])[0]
        return "\n\n".join(d.strip() for d in docs if d.strip())
    except Exception:
        logger.exception("RAG retrieval error")
        return ""
