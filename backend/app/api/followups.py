from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.models.entities import FollowUp
from app.schemas.schemas import FollowUpOut
from app.services.activity import agent_run
from app.services.email import send_email

router = APIRouter(prefix="/followups", tags=["Follow-up Automation"])


@router.get("", response_model=List[FollowUpOut])
def get_followups(status: Optional[str] = None, lead_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(FollowUp)
    if status:
        query = query.filter(FollowUp.status == status)
    if lead_id:
        query = query.filter(FollowUp.lead_id == lead_id)

    results = query.order_by(FollowUp.due_date.asc()).all()
    for f in results:
        if f.lead:
            f.lead_name = f.lead.name
    return results


@router.post("/execute/{followup_id}")
def execute_followup(followup_id: int, db: Session = Depends(get_db)):
    """Email follow-ups are really sent over SMTP. Other channels (WhatsApp, SMS) are simulated in demo mode."""
    fu = db.query(FollowUp).filter(FollowUp.id == followup_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Followup not found")
    if fu.status in ("sent", "simulated"):
        raise HTTPException(status_code=409, detail=f"Follow-up already {fu.status}")

    lead = fu.lead
    delivered_to = None
    with agent_run(db, "Follow-up Agent", "followup_send", lead) as run:
        if fu.channel == "email":
            res = send_email(lead.email if lead else None, fu.title, fu.message_content or "")
            if res["ok"]:
                fu.status, fu.send_error, fu.executed_at = "sent", None, datetime.utcnow()
                delivered_to = res["delivered_to"]
                run["description"] = f"Emailed {lead.name}: \"{fu.title}\" (accepted by the mail server)."
                run["details"] = f"delivered to {delivered_to}; subject: {res['subject']}"
            else:
                fu.status, fu.send_error = "not_sent", res["error"]
                run["status"], run["description"] = "error", f"Could not email {lead.name if lead else 'the lead'}: {res['error']}"
        else:
            fu.status, fu.send_error, fu.executed_at = "simulated", None, datetime.utcnow()
            run["status"] = "warning"
            run["description"] = f"Simulated a {fu.channel} follow-up to {lead.name if lead else 'the lead'} (demo mode, nothing was sent)."
    db.commit()

    return {
        "followup_id": fu.id,
        "status": fu.status,
        "executed_at": fu.executed_at.isoformat() if fu.executed_at else None,
        "send_error": fu.send_error,
        "delivered_to": delivered_to,
    }
