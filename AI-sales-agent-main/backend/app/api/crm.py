from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.entities import Lead
from app.agents.crm_agent import CRMAgent
from app.schemas.schemas import LeadOut

router = APIRouter(prefix="/crm", tags=["CRM"])

class MoveStageRequest(BaseModel):
    lead_id: int
    new_stage: str
    notes: str = None

@router.get("/pipeline")
def get_crm_pipeline(db: Session = Depends(get_db)):
    stages = CRMAgent.STAGES_ORDER  # every stage, so no lead is left off the board
    leads = db.query(Lead).all()

    pipeline: Dict[str, Any] = {}
    for stage in stages:
        stage_leads = [LeadOut.model_validate(l) for l in leads if l.stage == stage]
        total_value = sum(l.budget_numeric or 0 for l in stage_leads)
        pipeline[stage] = {
            "leads": stage_leads,
            "count": len(stage_leads),
            "total_value_inr": total_value
        }

    return {
        "stages": stages,
        "pipeline": pipeline,
        # same definition as the dashboard's "Open pipeline": stated budgets of leads not Won or Lost
        "total_active_pipeline_value": sum(pipeline[s]["total_value_inr"] for s in stages if s not in ("Won", "Lost"))
    }

@router.post("/move-stage")
def move_lead_stage(payload: MoveStageRequest, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    res = CRMAgent.update_lead_state(
        lead, db, 
        stage=payload.new_stage,
        notes=payload.notes or f"Moved manually or by workflow to {payload.new_stage}"
    )
    return res
