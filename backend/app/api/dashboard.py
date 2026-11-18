"""Dashboard overview and lead timeline. Everything here is read from the database; nothing is estimated."""
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import AgentActivityLog, Conversation, FollowUp, Lead, Meeting, Message

router = APIRouter(tags=["Dashboard"])

# Internal bookkeeping runs that would drown the feed; they are still on the Agents page.
FEED_HIDDEN_ACTIONS = {"classify", "dashboard_metrics", "score"}


def _local_midnight_utc() -> datetime:
    """Start of today in the server's local time, expressed in UTC (timestamps are stored with utcnow)."""
    now_local = datetime.now()
    return datetime.utcnow() - (now_local - now_local.replace(hour=0, minute=0, second=0, microsecond=0))


@router.get("/dashboard/overview")
def dashboard_overview(db: Session = Depends(get_db)) -> Dict[str, Any]:
    leads = db.query(Lead).all()
    by_id = {l.id: l for l in leads}
    today = _local_midnight_utc()

    new_today = [l for l in leads if l.created_at and l.created_at >= today]
    hot = [l for l in leads if l.score_category == "Hot"]
    meetings_booked = db.query(Meeting).filter(Meeting.status == "scheduled").count()
    handoff_convs = db.query(Conversation).filter(Conversation.human_takeover == True).all()  # noqa: E712
    need_human_ids = sorted({c.lead_id for c in handoff_convs})

    cards = [
        {"key": "new_today", "label": "New leads today", "value": len(new_today),
         "formula": "Leads created since midnight (server time)"},
        {"key": "hot", "label": "Hot leads", "value": len(hot), "formula": "Leads with score 81 or more"},
        {"key": "meetings", "label": "Meetings booked", "value": meetings_booked,
         "formula": "Meetings with status 'scheduled'"},
        {"key": "need_human", "label": "Need a human", "value": len(need_human_ids),
         "formula": "Leads whose conversation was handed to a human and not handed back"},
    ]

    attention: List[Dict[str, Any]] = []
    for c in handoff_convs:
        l = by_id.get(c.lead_id)
        if l:
            attention.append({"kind": "handoff", "lead_id": l.id, "lead_name": l.name, "at": c.updated_at,
                              "text": f"{l.name} is waiting for a person: {l.next_best_action_reason or 'asked for a human'}."})
    replied = {lead_id for (lead_id,) in db.query(Conversation.lead_id).join(Message)
               .filter(Message.sender == "customer").distinct().all()}
    for l in hot:
        if l.id not in replied:
            attention.append({"kind": "hot_uncontacted", "lead_id": l.id, "lead_name": l.name, "at": l.created_at,
                              "text": f"{l.name} is a hot lead ({l.lead_score}/100) with no conversation yet."})
    misses = (db.query(AgentActivityLog).filter(AgentActivityLog.agent_name == "Knowledge Agent",
                                                AgentActivityLog.status == "warning",
                                                AgentActivityLog.details.like("question: %"))
              .order_by(AgentActivityLog.created_at.desc()).limit(10).all())
    for m in misses:
        question = m.details.split("question: ", 1)[1].split(" | ")[0]
        attention.append({"kind": "unanswered", "lead_id": m.lead_id, "lead_name": m.lead_name, "at": m.created_at,
                          "text": f"The knowledge base could not answer {m.lead_name or 'a lead'}: \"{question}\""})
    for f in db.query(FollowUp).filter(FollowUp.status == "not_sent").all():
        attention.append({"kind": "email_failed", "lead_id": f.lead_id, "lead_name": f.lead.name if f.lead else None,
                          "at": f.due_date, "text": f"Email to {f.lead.name if f.lead else 'a lead'} was not sent: {f.send_error}"})
    attention.sort(key=lambda a: a["at"] or datetime.min, reverse=True)

    rows = (db.query(AgentActivityLog).filter(AgentActivityLog.action_type.notin_(FEED_HIDDEN_ACTIONS))
            .order_by(AgentActivityLog.created_at.desc(), AgentActivityLog.id.desc()).limit(60).all())
    # "BANT not updated" (no LLM) repeats on every message; keep it on the Agents page, not in the feed
    feed_rows = [r for r in rows if not (r.action_type == "bant_update" and r.status == "warning")][:15]
    feed = [{"id": r.id, "agent": r.agent_name, "text": r.description, "at": r.created_at, "status": r.status,
             "duration_ms": r.duration_ms, "lead_id": r.lead_id} for r in feed_rows]

    return {"cards": cards, "attention": attention, "feed": feed}


@router.get("/leads/{lead_id}/timeline")
def lead_timeline(lead_id: int, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    events: List[Dict[str, Any]] = [{"at": lead.created_at, "kind": "created", "title": "Lead created",
                                     "detail": f"Source: {lead.source}"}]
    for r in db.query(AgentActivityLog).filter(AgentActivityLog.lead_id == lead_id).all():
        events.append({"at": r.created_at, "kind": "agent", "title": r.description, "detail": r.agent_name,
                       "status": r.status, "duration_ms": r.duration_ms})
    for conv in lead.conversations:
        for m in conv.messages:
            who = {"customer": lead.name, "human_rep": "Human rep"}.get(m.sender, m.agent_name or "AI")
            events.append({"at": m.created_at, "kind": "message", "title": f"{who} ({conv.channel})", "detail": m.content})
    for mt in lead.meetings:
        events.append({"at": mt.created_at, "kind": "meeting", "title": f"Meeting booked: {mt.title}",
                       "detail": f"{mt.scheduled_time.strftime('%a %d %b, %I:%M %p')} · {mt.location_or_link} · {mt.status}"})
    for f in lead.followups:
        state = {"sent": "sent", "not_sent": f"not sent: {f.send_error}", "simulated": "simulated (demo mode)"}.get(f.status, "pending")
        events.append({"at": f.executed_at or f.created_at, "kind": "followup", "title": f"Follow-up: {f.title}",
                       "detail": f"{f.channel}, {state}"})
    events.sort(key=lambda e: e["at"] or datetime.min, reverse=True)
    return events
