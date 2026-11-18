from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
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


SAMPLES_DIR = Path(__file__).resolve().parents[3] / "data" / "samples"
SAMPLE_FILES = {"leads.csv": "text/csv", "bulk_order_price_list.txt": "text/plain"}


@router.get("/samples/{name}")
def download_sample(name: str):
    """The two files used in the demo steps (data/samples/). Only these names are served."""
    if name not in SAMPLE_FILES or not (SAMPLES_DIR / name).is_file():
        raise HTTPException(status_code=404, detail="Sample not found")
    return FileResponse(SAMPLES_DIR / name, media_type=SAMPLE_FILES[name], filename=name)
