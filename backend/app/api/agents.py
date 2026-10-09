from fastapi import APIRouter, Depends
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
        "status": "Active",
        "description": "Analyzes lead context, identifies buyer personas, and surfaces core pain points.",
        "icon": "Search",
        "invocations_count": 48
    },
    {
        "id": "agent-scoring",
        "name": "Lead Scoring Agent",
        "role": "Explainable Predictive Scoring",
        "status": "Active",
        "description": "Calculates 0-100 conversion probability with transparent factor breakdown.",
        "icon": "Target",
        "invocations_count": 64
    },
    {
        "id": "agent-qualification",
        "name": "Qualification Agent",
        "role": "BANT Criteria Evaluation",
        "status": "Active",
        "description": "Enforces Budget, Authority, Need, and Timeline verification before sales rep handoff.",
        "icon": "CheckCircle2",
        "invocations_count": 42
    },
    {
        "id": "agent-communication",
        "name": "Sales Communication Agent",
        "role": "Omnichannel Outreach & Messaging",
        "status": "Active",
        "description": "Drafts hyper-personalized WhatsApp messages, emails, and direct chat inquiries.",
        "icon": "MessageSquare",
        "invocations_count": 115
    },
    {
        "id": "agent-rag",
        "name": "Knowledge RAG Agent",
        "role": "Grounded Knowledge Retrieval",
        "status": "Active",
        "description": "Extracts facts from brochures, pricing sheets, and FAQs with zero hallucination guarantee.",
        "icon": "BookOpen",
        "invocations_count": 89
    },
    {
        "id": "agent-objection",
        "name": "Objection Handling Agent",
        "role": "Objection Resolution Specialist",
        "status": "Active",
        "description": "Detects price, timing, and competitor objections and deploys tested reframing methods.",
        "icon": "ShieldAlert",
        "invocations_count": 31
    },
    {
        "id": "agent-voice",
        "name": "Voice Sales Agent",
        "role": "Conversational Telephony & STT/TTS",
        "status": "Active",
        "description": "Executes oral discovery phone calls, streams live transcripts, and drafts post-call notes.",
        "icon": "PhoneCall",
        "invocations_count": 18
    },
    {
        "id": "agent-followup",
        "name": "Follow-up Agent",
        "role": "Cadence Automation & Nurturing",
        "status": "Active",
        "description": "Executes Day 0, 2, 5, 10 touches and automatically pauses upon customer reply.",
        "icon": "Clock",
        "invocations_count": 56
    },
    {
        "id": "agent-scheduling",
        "name": "Scheduling Agent",
        "role": "Calendar & Site Visit Booking",
        "status": "Active",
        "description": "Checks slot availability, schedules site visits and virtual demos with instant confirmation.",
        "icon": "Calendar",
        "invocations_count": 27
    },
    {
        "id": "agent-crm",
        "name": "CRM Agent",
        "role": "Pipeline State Synchronization",
        "status": "Active",
        "description": "Synchronizes stages, updates Next Best Action, and logs audit events.",
        "icon": "Layers",
        "invocations_count": 92
    },
    {
        "id": "agent-analytics",
        "name": "Analytics Agent",
        "role": "Sales Intelligence & Funnel Optimization",
        "status": "Active",
        "description": "Detects conversion bottlenecks, monitors objection trends, and surfaces executive insights.",
        "icon": "TrendingUp",
        "invocations_count": 24
    }
]

@router.get("/status")
def get_agents_status():
    return {
        "total_workforce_agents": len(AGENT_ROSTER),
        "status": "All Systems Operational",
        "agents": AGENT_ROSTER
    }

@router.get("/activities", response_model=List[AgentActivityOut])
def get_activity_stream(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(AgentActivityLog).order_by(AgentActivityLog.created_at.desc()).limit(limit).all()
