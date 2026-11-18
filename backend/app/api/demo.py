from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db, Base, engine, SessionLocal
from app.models.entities import KnowledgeChunk
from app.rag.engine import vector_store
from app.services.seed_data import seed_database

router = APIRouter(prefix="/demo", tags=["Demo Mode"])


@router.post("/reset")
def reset_demo_data(db: Session = Depends(get_db)):
    """Drop every table and reload the Celestial Wear demo seed (leads, knowledge base, conversations, meetings)."""
    vector_store().delete([cid for (cid,) in db.query(KnowledgeChunk.id).all()])
    db.close()  # release the request session before dropping tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    fresh = SessionLocal()
    try:
        seed_database(fresh)
    finally:
        fresh.close()
    return {"status": "success", "message": "Demo data reset to the Celestial Wear seed."}
