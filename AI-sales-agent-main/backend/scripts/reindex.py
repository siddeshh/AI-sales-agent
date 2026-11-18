"""Re-embed every knowledge chunk with the current EMBEDDING_MODEL and push it to the current VECTOR_STORE.

Run once after upgrading from the old 128-dim hash embeddings, or after changing model / store:
    cd backend
    .\\venv\\Scripts\\python scripts\\reindex.py
Chunk text is not changed; only embedding_json, metadata_json and the vector store are rewritten.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings  # noqa: E402
from app.core.database import Base, SessionLocal, engine, add_missing_columns  # noqa: E402
from app.models.entities import KnowledgeChunk  # noqa: E402
from app.rag.engine import index_chunks  # noqa: E402

BATCH = 64


def main():
    Base.metadata.create_all(bind=engine)
    add_missing_columns()
    db = SessionLocal()
    try:
        chunks = db.query(KnowledgeChunk).order_by(KnowledgeChunk.id).all()
        for i in range(0, len(chunks), BATCH):
            index_chunks(db, chunks[i:i + BATCH])
        db.commit()
        print(f"Re-embedded {len(chunks)} chunks with {settings.EMBEDDING_MODEL} into "
              f"VECTOR_STORE={settings.VECTOR_STORE} (DB: {settings.DATABASE_URL})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
