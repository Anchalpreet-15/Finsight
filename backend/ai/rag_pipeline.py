"""
RAG Pipeline — loads financial knowledge text files, chunks them,
embeds with sentence-transformers, and stores in a persistent ChromaDB.

Call `initialize_rag()` once at app startup.
Call `retrieve_context(query)` at runtime to fetch relevant passages.
"""

import glob
import logging
import os

from sentence_transformers import SentenceTransformer
import chromadb

logger = logging.getLogger(__name__)

_BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.normpath(os.path.join(_BASE_DIR, "../../data"))
CHROMA_DIR = os.path.normpath(os.path.join(_BASE_DIR, "../../chroma_db"))

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
    Build (or load) the ChromaDB vector store from /data/*.txt files.
    Skips re-indexing if the collection already has documents.
    """
    global _collection, _model

    txt_files = glob.glob(os.path.join(DATA_DIR, "*.txt"))
    if not txt_files:
        logger.warning(f"No .txt files found in {DATA_DIR}. RAG will return empty context.")
        return

    logger.info(f"Loading embedding model '{EMBED_MODEL}'…")
    _model = SentenceTransformer(EMBED_MODEL)

    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    _collection = chroma_client.get_or_create_collection(
        name="financial_knowledge",
        metadata={"hnsw:space": "cosine"},
    )

    if _collection.count() > 0:
        logger.info(f"ChromaDB already has {_collection.count()} chunks — skipping re-indexing.")
        return

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
            ids=all_ids[i: i + batch_size],
            documents=all_chunks[i: i + batch_size],
            embeddings=embeddings[i: i + batch_size],
        )

    logger.info(f"ChromaDB ready at {CHROMA_DIR} with {len(all_chunks)} chunks.")


def retrieve_context(query: str) -> str:
    """
    Retrieve the most relevant financial knowledge passages for `query`.
    Returns passages joined by double newlines, or empty string if not initialized.
    """
    if _collection is None or _model is None:
        logger.warning("RAG not initialized — returning empty context.")
        return ""

    try:
        query_embedding = _model.encode(query, normalize_embeddings=True).tolist()
        results = _collection.query(query_embeddings=[query_embedding], n_results=TOP_K)
        docs = results.get("documents", [[]])[0]
        return "\n\n".join(d.strip() for d in docs if d.strip())
    except Exception as e:
        logger.error(f"RAG retrieval error: {e}")
        return ""
