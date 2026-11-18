from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from app.models.entities import Meeting, Lead, AgentActivityLog
from app.schemas.schemas import MeetingCreate, MeetingOut
from app.agents.scheduling_agent import SchedulingAgent
from app.agents.crm_agent import CRMAgent

router = APIRouter(prefix="/meetings", tags=["Meeting Scheduling"])

@router.get("/slots")
def get_available_slots(days: int = 5):
    return SchedulingAgent.get_available_slots(days_ahead=days)

@router.get("", response_model=List[MeetingOut])
def get_meetings(status: Optional[str] = None, lead_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Meeting)
    if status:
        query = query.filter(Meeting.status == status)
    if lead_id:
        query = query.filter(Meeting.lead_id == lead_id)
    
    meetings = query.order_by(Meeting.scheduled_time.asc()).all()
    for m in meetings:
        if m.lead:
            m.lead_name = m.lead.name
    return meetings

@router.post("", response_model=MeetingOut)
def schedule_meeting(payload: MeetingCreate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    meeting = Meeting(
        lead_id=payload.lead_id,
        title=payload.title,
        meeting_type=payload.meeting_type,
        scheduled_time=payload.scheduled_time,
        duration_minutes=payload.duration_minutes,
        location_or_link=payload.location_or_link or "Skyline Experience Centre, Hinjawadi Pune",
        notes=payload.notes,
        status="scheduled"
    )
    db.add(meeting)

    # Automatically advance lead stage in CRM
    CRMAgent.update_lead_state(
        lead, db,
        stage="Meeting Scheduled",
        next_action=f"Host {payload.meeting_type.replace('_', ' ').title()}: Prepare VIP dossier",
        next_action_reason="Site visit / demo appointment confirmed."
    )

    db.commit()
    db.refresh(meeting)
    meeting.lead_name = lead.name
    return meeting

@router.put("/{meeting_id}/status")
def update_meeting_status(meeting_id: int, status: str, db: Session = Depends(get_db)):
    m = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")

    m.status = status
    db.commit()
    return {"meeting_id": m.id, "status": m.status}
