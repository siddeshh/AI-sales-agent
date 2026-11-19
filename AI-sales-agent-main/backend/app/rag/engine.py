"""Knowledge-base retrieval: sentence-transformers embeddings + a pluggable vector store.

VECTOR_STORE=sqlite (default): vectors live as JSON in knowledge_chunks.embedding_json, cosine in numpy.
VECTOR_STORE=qdrant: same vectors mirrored into Qdrant (QDRANT_URL, or embedded on-disk mode when unset).
SQLite stays the source of truth for chunk text either way.
"""
import atexit
import os
import json
import logging
import re
from typing import List, Dict, Any, Tuple, Optional

import numpy as np
from sqlalchemy.orm import Session

from app.core.config import settings

log = logging.getLogger("nova.rag")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")


class EmbeddingEngine:
    """all-MiniLM-L6-v2 (384-dim). Loaded once; vectors are L2-normalised so cosine == dot product.

    Two interchangeable backends for the same model:
      - fastembed (ONNX, ~150 MB RAM, no PyTorch): used on Render's 512 MB free tier
      - sentence-transformers (PyTorch): the original local setup
    EMBEDDING_BACKEND=fastembed | sentence-transformers | auto (default: fastembed if installed).
    """
    DIMENSIONS = 384
    _model = None
    _backend = None

    @classmethod
    def load(cls):
        if cls._model is not None:
            return cls._model
        choice = (os.getenv("EMBEDDING_BACKEND") or "auto").lower()
        if choice in ("auto", "fastembed"):
            try:
                from fastembed import TextEmbedding
                log.info("Loading embedding model %s (fastembed/ONNX)", settings.EMBEDDING_MODEL)
                cls._model = TextEmbedding(settings.EMBEDDING_MODEL, cache_dir=os.getenv("FASTEMBED_CACHE_PATH"))
                cls._backend = "fastembed"
                return cls._model
            except ImportError:
                if choice == "fastembed":
                    raise
        from sentence_transformers import SentenceTransformer  # heavy import (torch): only when first needed
        log.info("Loading embedding model %s (sentence-transformers)", settings.EMBEDDING_MODEL)
        try:  # cached copy first, so startup needs no internet
            cls._model = SentenceTransformer(settings.EMBEDDING_MODEL, device="cpu", local_files_only=True)
        except Exception:
            log.warning("Embedding model not cached yet; downloading it once (needs internet)")
            cls._model = SentenceTransformer(settings.EMBEDDING_MODEL, device="cpu")
        cls._backend = "sentence-transformers"
        return cls._model

    @classmethod
    def embed(cls, texts: List[str]) -> List[List[float]]:
        model = cls.load()
        if cls._backend == "fastembed":
            vecs = np.asarray(list(model.embed(texts, batch_size=16)), dtype=float)
        else:
            vecs = model.encode(texts, convert_to_numpy=True, show_progress_bar=False).astype(float)
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        vecs = vecs / np.where(norms == 0, 1, norms)
        return vecs.round(6).tolist()

    @classmethod
    def generate_embedding(cls, text: str) -> List[float]:
        return cls.embed([text])[0]


def chunk_embedding_text(title: str, content: str) -> str:
    """What gets embedded: the title gives short chunks their topic context."""
    return f"{title}: {content}" if title else content


class DocumentChunker:
    """~300-word chunks with 50-word overlap."""

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
        words = text.split()
        if len(words) <= chunk_size:
            return [" ".join(words)] if words else []
        chunks, start = [], 0
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunks.append(" ".join(words[start:end]))
            if end == len(words):
                break
            start = end - overlap
        return chunks


# ---------------------------------------------------------------- vector stores
class SqliteVectorStore:
    def upsert(self, items: List[Tuple[int, List[float], Dict[str, Any]]]):
        pass  # vectors are already saved in knowledge_chunks.embedding_json by the caller

    def delete(self, chunk_ids: List[int]):
        pass  # rows are deleted by the ORM cascade

    def search(self, db: Session, query_vec: List[float], top_k: int) -> List[Tuple[int, float]]:
        from app.models.entities import KnowledgeChunk, KnowledgeDocument
        rows = (db.query(KnowledgeChunk.id, KnowledgeChunk.embedding_json).join(KnowledgeDocument)
                .filter(KnowledgeDocument.is_processed == True, KnowledgeChunk.embedding_json.isnot(None)).all())  # noqa: E712
        ids, vecs = [], []
        for cid, emb in rows:
            v = json.loads(emb)
            if len(v) == EmbeddingEngine.DIMENSIONS:  # skips stale 128-dim hash vectors until reindex runs
                ids.append(cid)
                vecs.append(v)
        if not ids:
            return []
        scores = np.asarray(vecs) @ np.asarray(query_vec)
        order = np.argsort(-scores)[:top_k]
        return [(ids[i], float(scores[i])) for i in order]


class QdrantVectorStore:
    COLLECTION = "knowledge_chunks"

    def __init__(self):
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.models import Distance, VectorParams
        except ImportError as e:
            raise RuntimeError("VECTOR_STORE=qdrant needs `pip install qdrant-client`") from e
        self.client = (QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY) if settings.QDRANT_URL
                       else QdrantClient(path=settings.QDRANT_PATH))
        atexit.register(self.client.close)  # avoids a noisy __del__ traceback at interpreter shutdown
        if not self.client.collection_exists(self.COLLECTION):
            self.client.create_collection(self.COLLECTION, vectors_config=VectorParams(
                size=EmbeddingEngine.DIMENSIONS, distance=Distance.COSINE))

    def upsert(self, items: List[Tuple[int, List[float], Dict[str, Any]]]):
        from qdrant_client.models import PointStruct
        if items:
            self.client.upsert(self.COLLECTION, [PointStruct(id=cid, vector=v, payload=p) for cid, v, p in items])

    def delete(self, chunk_ids: List[int]):
        if chunk_ids:
            self.client.delete(self.COLLECTION, points_selector=chunk_ids)

    def search(self, db: Session, query_vec: List[float], top_k: int) -> List[Tuple[int, float]]:
        hits = self.client.query_points(self.COLLECTION, query=query_vec, limit=top_k).points
        return [(int(h.id), float(h.score)) for h in hits]


_store = None


def vector_store():
    global _store
    if _store is None:
        _store = QdrantVectorStore() if settings.VECTOR_STORE.lower() == "qdrant" else SqliteVectorStore()
        log.info("Vector store: %s", type(_store).__name__)
    return _store


def index_chunks(db: Session, chunks: list):
    """Embed KnowledgeChunk rows (must have ids, i.e. flushed), save vector + metadata, mirror to the store."""
    if not chunks:
        return
    titles = [c.document.title if c.document else "" for c in chunks]
    vecs = EmbeddingEngine.embed([chunk_embedding_text(t, c.content) for t, c in zip(titles, chunks)])
    items = []
    for c, t, v in zip(chunks, titles, vecs):
        meta = {"document_title": t, "chunk_number": c.chunk_index, "word_count": len(c.content.split()),
                "embedding_model": settings.EMBEDDING_MODEL}
        c.embedding_json = json.dumps(v)
        c.metadata_json = json.dumps(meta)
        items.append((c.id, v, {**meta, "document_id": c.document_id}))
    vector_store().upsert(items)


def reindex_stale(db: Session) -> int:
    """Re-embed chunks with no vector or a vector of the wrong size (e.g. the old 128-dim hash embeddings)."""
    from app.models.entities import KnowledgeChunk
    stale = [c for c in db.query(KnowledgeChunk).all()
             if not c.embedding_json or len(json.loads(c.embedding_json)) != EmbeddingEngine.DIMENSIONS]
    if stale:
        index_chunks(db, stale)
        db.commit()
        log.warning("Re-embedded %d stale knowledge chunks", len(stale))
    return len(stale)


# ---------------------------------------------------------------- retrieval
class RAGEngine:
    @staticmethod
    def search_chunks(db: Session, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        """Top-k chunks by cosine similarity, highest first, each with title / chunk number / score."""
        from app.models.entities import KnowledgeChunk
        hits = vector_store().search(db, EmbeddingEngine.generate_embedding(query), top_k or settings.RAG_TOP_K)
        if not hits:
            return []
        rows = {c.id: c for c in db.query(KnowledgeChunk).filter(KnowledgeChunk.id.in_([h[0] for h in hits])).all()}
        return [{
            "chunk_id": cid,
            "document_id": rows[cid].document_id,
            "document_title": rows[cid].document.title if rows[cid].document else "Document",
            "chunk_number": rows[cid].chunk_index,
            "content": rows[cid].content,
            "score": round(score, 3),
        } for cid, score in hits if cid in rows]


# ---------------------------------------------------------------- grounding check
_NUM = re.compile(r"\d+(?:[.,]\d+)*")


def _norm_numbers(text: str) -> set:
    out = set()
    for raw in _NUM.findall(text):
        n = raw.replace(",", "")
        if "." in n:
            n = n.rstrip("0").rstrip(".")
        out.add(n)
    return out


def ungrounded_numbers(answer: str, sources_text: str) -> set:
    """Numbers (prices, quantities, days, %) in the answer that appear nowhere in the allowed text."""
    return _norm_numbers(answer) - _norm_numbers(sources_text)
