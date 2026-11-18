from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.entities import AgentActivityLog
from app.schemas.schemas import AgentActivityOut

router = APIRouter(prefix="/agents", tags=["Multi-Agent Workforce Management"])

AGENT_ROSTER = [
    {
        "id": "agent-research",
        "name": "Lead Research Agent",
        "role": "Prospect Profiling & Enrichment",
                "description": "Analyzes lead context, identifies buyer personas, and surfaces core pain points.",
        "icon": "Search"
    },
    {
        "id": "agent-scoring",
        "name": "Lead Scoring Agent",
        "role": "Explainable Predictive Scoring",
                "description": "Calculates 0-100 conversion probability with transparent factor breakdown.",
        "icon": "Target"
    },
    {
        "id": "agent-qualification",
        "name": "Qualification Agent",
        "role": "BANT Criteria Evaluation",
                "description": "Enforces Budget, Authority, Need, and Timeline verification before sales rep handoff.",
        "icon": "CheckCircle2"
    },
    {
        "id": "agent-communication",
        "name": "Sales Communication Agent",
        "role": "Omnichannel Outreach & Messaging",
                "description": "Drafts hyper-personalized WhatsApp messages, emails, and direct chat inquiries.",
        "icon": "MessageSquare"
    },
    {
        "id": "agent-rag",
        "name": "Knowledge RAG Agent",
        "role": "Grounded Knowledge Retrieval",
                "description": "Extracts facts from brochures, pricing sheets, and FAQs with zero hallucination guarantee.",
        "icon": "BookOpen"
    },
    {
        "id": "agent-objection",
        "name": "Objection Handling Agent",
        "role": "Objection Resolution Specialist",
                "description": "Detects price, timing, and competitor objections and deploys tested reframing methods.",
        "icon": "ShieldAlert"
    },
    {
        "id": "agent-voice",
        "name": "Voice Sales Agent",
        "role": "Conversational Telephony & STT/TTS",
                "description": "Executes oral discovery phone calls, streams live transcripts, and drafts post-call notes.",
        "icon": "PhoneCall"
    },
    {
        "id": "agent-followup",
        "name": "Follow-up Agent",
        "role": "Cadence Automation & Nurturing",
                "description": "Executes Day 0, 2, 5, 10 touches and automatically pauses upon customer reply.",
        "icon": "Clock"
    },
    {
        "id": "agent-scheduling",
        "name": "Scheduling Agent",
        "role": "Demo Call & Showroom Visit Booking",
                "description": "Proposes slots in showroom hours and books sample review calls and showroom visits (no external calendar yet).",
        "icon": "Calendar"
    },
    {
        "id": "agent-crm",
        "name": "CRM Agent",
        "role": "Pipeline State Synchronization",
                "description": "Synchronizes stages, updates Next Best Action, and logs audit events.",
        "icon": "Layers"
    },
    {
        "id": "agent-analytics",
        "name": "Analytics Agent",
        "role": "Sales Intelligence & Funnel Optimization",
                "description": "Detects conversion bottlenecks, monitors objection trends, and surfaces executive insights.",
        "icon": "TrendingUp"
    }
]

@router.get("/status")
def get_agents_status(db: Session = Depends(get_db)):
    """invocations_count = rows this agent wrote to the activity log; status is 'Active' once it has run."""
    counts = dict(db.query(AgentActivityLog.agent_name, func.count(AgentActivityLog.id))
                  .group_by(AgentActivityLog.agent_name).all())
    agents = [{**a, "invocations_count": counts.get(a["name"], 0),
               "status": "Active" if counts.get(a["name"]) else "Idle"} for a in AGENT_ROSTER]
    return {"total_workforce_agents": len(agents), "agents": agents}

@router.get("/activities", response_model=List[AgentActivityOut])
def get_activity_stream(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(AgentActivityLog).order_by(AgentActivityLog.created_at.desc()).limit(limit).all()
