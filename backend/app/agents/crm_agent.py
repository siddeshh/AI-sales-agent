from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import Lead
from app.services.activity import agent_run

class CRMAgent:
    """
    Agent 9 of 10: CRM Agent
    Responsibilities:
    - Maintains customer 360 profile in the database
    - Transitions pipeline stages (New -> Contacted -> Engaged -> Qualified -> Meeting Scheduled -> Proposal -> Won/Lost)
    - Records detailed activity history and auditable agent decision logs
    - Schedules next best action recommendations
    """
    AGENT_NAME = "CRM Agent"

    STAGES_ORDER = [
        "New", "Contacted", "Engaged", "Qualified", "Meeting Scheduled", 
        "Proposal", "Negotiation", "Won", "Lost", "Nurture"
    ]

    @classmethod
    def update_lead_state(
        cls, 
        lead: Lead, 
        db: Session, 
        stage: Optional[str] = None, 
        next_action: Optional[str] = None, 
        next_action_reason: Optional[str] = None,
        qualification_status: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        prev_stage = lead.stage
        with agent_run(db, cls.AGENT_NAME, "crm_update", lead) as run:
            if stage and stage in cls.STAGES_ORDER:
                lead.stage = stage
            if next_action:
                lead.next_best_action = next_action
            if next_action_reason:
                lead.next_best_action_reason = next_action_reason
            if qualification_status:
                lead.qualification_status = qualification_status
            lead.updated_at = datetime.utcnow()
            run["description"] = (f"Moved {lead.name} from {prev_stage} to {lead.stage}." if prev_stage != lead.stage
                                  else f"Updated {lead.name}'s next step: {lead.next_best_action}.")
            run["details"] = notes
        db.commit()
        db.refresh(lead)

        return {
            "agent_name": cls.AGENT_NAME,
            "lead_id": lead.id,
            "previous_stage": prev_stage,
            "current_stage": lead.stage,
            "qualification_status": lead.qualification_status,
            "next_best_action": lead.next_best_action,
            "updated_at": lead.updated_at.isoformat()
        }
