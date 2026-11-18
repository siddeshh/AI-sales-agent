from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.models.entities import FollowUp, Lead, AgentActivityLog
from app.schemas.schemas import FollowUpOut

router = APIRouter(prefix="/followups", tags=["Follow-up Automation"])

@router.get("", response_model=List[FollowUpOut])
def get_followups(status: Optional[str] = None, lead_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(FollowUp)
    if status:
        query = query.filter(FollowUp.status == status)
    if lead_id:
        query = query.filter(FollowUp.lead_id == lead_id)
    
    results = query.order_by(FollowUp.due_date.asc()).all()
    # Attach lead_name
    for f in results:
        if f.lead:
            f.lead_name = f.lead.name
    return results

@router.post("/execute/{followup_id}")
def execute_followup(followup_id: int, db: Session = Depends(get_db)):
    fu = db.query(FollowUp).filter(FollowUp.id == followup_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Followup not found")

    fu.status = "completed"
    fu.executed_at = datetime.utcnow()

    # Log agent action
    log = AgentActivityLog(
        agent_name="Follow-up Agent",
        action_type="followup_executed",
        lead_id=fu.lead_id,
        lead_name=fu.lead.name if fu.lead else "Prospect",
        description=f"Executed Cadence Step {fu.cadence_step} via {fu.channel.upper()}: '{fu.title}'",
        details=fu.message_content,
        status="success"
    )
    db.add(log)
    db.commit()

    return {
        "followup_id": fu.id,
        "status": fu.status,
        "executed_at": fu.executed_at.isoformat(),
        "dispatched_message": fu.message_content
    }
