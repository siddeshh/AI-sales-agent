from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.entities import AgentActivityLog
from app.schemas.schemas import AgentActivityOut
from app.services.activity import AGENTS

router = APIRouter(prefix="/agents", tags=["Agents"])

# One entry per agent in app.services.activity.AGENTS. Descriptions state only what the code does.
AGENT_INFO = {
    "Research Agent": ("Buyer profiling", "Builds a buyer profile (wholesale / corporate / individual) from the lead form. No external lookup.", "Search"),
    "Lead Qualification Agent": ("Score + BANT", "Explainable 0-100 score (profile base + BANT bonus) and BANT: form checklist at intake, re-read from the conversation by the LLM.", "Target"),
    "Communication Agent": ("Replies and drafts", "Writes chat replies (LLM, or template without a key) and outreach drafts. Drafts are not sent.", "MessageSquare"),
    "Knowledge Agent": ("Document Q&A (RAG)", "Answers from retrieved knowledge chunks (MiniLM embeddings); a check blocks numbers that are not in the sources.", "BookOpen"),
    "Objection Agent": ("Objection playbook", "Handles price, minimum order, delivery, competitor and other objections with the retail playbook.", "ShieldAlert"),
    "Voice Agent": ("Browser voice call", "Speech recognition and speech output in the browser; each sentence goes through the same agents as chat. 4-line summary at the end. No phone calls.", "PhoneCall"),
    "Scheduling Agent": ("Meeting slots", "Proposes slots in showroom hours and books meetings in this app's database. No external calendar.", "Calendar"),
    "Follow-up Agent": ("Follow-up cadence", "Day 0/2/5/10 tasks. Email follow-ups are sent over SMTP; WhatsApp follow-ups are simulated (demo mode).", "Clock"),
    "CRM Agent": ("Internal CRM", "Updates stages and next actions in this app's own database (the internal CRM). No external CRM.", "Layers"),
    "Analytics Agent": ("Metrics", "Computes funnel, meeting rate, win rate, score tiers and objection breakdown from the database.", "TrendingUp"),
}
assert set(AGENT_INFO) == set(AGENTS)


@router.get("/status")
def get_agents_status(db: Session = Depends(get_db)):
    """invocations_count = activity-log rows written by this agent; avg_duration_ms = mean measured duration."""
    stats = {name: (n, avg) for name, n, avg in db.query(
        AgentActivityLog.agent_name, func.count(AgentActivityLog.id), func.avg(AgentActivityLog.duration_ms)
    ).group_by(AgentActivityLog.agent_name).all()}
    agents = []
    for i, name in enumerate(AGENTS, 1):
        role, desc, icon = AGENT_INFO[name]
        n, avg = stats.get(name, (0, None))
        agents.append({"id": f"agent-{i}", "name": name, "role": role, "description": desc, "icon": icon,
                       "invocations_count": n, "avg_duration_ms": round(avg, 1) if avg is not None else None,
                       "status": "Has run" if n else "Not run yet"})
    return {"total_workforce_agents": len(agents), "agents": agents}


@router.get("/activities", response_model=List[AgentActivityOut])
def get_activity_stream(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(AgentActivityLog).order_by(AgentActivityLog.created_at.desc(), AgentActivityLog.id.desc()).limit(limit).all()
