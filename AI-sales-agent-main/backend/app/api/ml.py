"""Serves the offline lead-scoring experiment (ml/lead_scoring) to the Analytics page.

Nothing here is computed live: it returns whatever experiment.py last wrote to ML_RESULTS_DIR.
"""
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.config import settings

router = APIRouter(prefix="/ml", tags=["Lead Scoring Experiment"])


def _dir() -> Path:
    return Path(settings.ML_RESULTS_DIR).resolve()


@router.get("/lead-scoring")
def get_experiment_results():
    d = _dir()
    results_file = d / "results.json"
    if not results_file.is_file():
        return {"available": False, "results": None, "figures": [],
                "hint": "Run ml/lead_scoring/experiment.py with the X Education CSV to generate results."}
    return {"available": True,
            "results": json.loads(results_file.read_text(encoding="utf-8")),
            "figures": sorted(p.name for p in d.glob("*.png"))}


@router.get("/lead-scoring/figures/{name}")
def get_experiment_figure(name: str):
    path = (_dir() / Path(name).name).resolve()  # basename only: no path traversal out of the results folder
    if path.parent != _dir() or path.suffix.lower() != ".png" or not path.is_file():
        raise HTTPException(status_code=404, detail="Figure not found")
    return FileResponse(path, media_type="image/png")
