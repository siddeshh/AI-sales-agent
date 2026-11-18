from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import Lead, AgentActivityLog

class CRMAgent:
    """
    Agent J: CRM Agent
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
        if stage and stage in cls.STAGES_ORDER:
            lead.stage = stage

        if next_action:
            lead.next_best_action = next_action
        if next_action_reason:
            lead.next_best_action_reason = next_action_reason
        if qualification_status:
            lead.qualification_status = qualification_status

        lead.updated_at = datetime.utcnow()

        # Log CRM audit record
        log = AgentActivityLog(
            agent_name=cls.AGENT_NAME,
            action_type="crm_sync",
            lead_id=lead.id,
            lead_name=lead.name,
            description=f"CRM updated: Stage moved from '{prev_stage}' to '{lead.stage}'. Next action: '{lead.next_best_action}'",
            details=notes or f"Qualification: {lead.qualification_status}, Score: {lead.lead_score}",
            status="success"
        )
        db.add(log)
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
