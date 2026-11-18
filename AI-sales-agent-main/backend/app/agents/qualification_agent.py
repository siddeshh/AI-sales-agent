import logging
from typing import Dict, Any, List, Literal, Optional
from pydantic import BaseModel, ValidationError
from app.models.entities import Lead
from app.agents.lead_scoring_agent import timeline_days
from app.services.llm import chat, parse_json, LLMUnavailable

log = logging.getLogger("nova.llm")

class QualificationAgent:
    """
    Agent C: Qualification Agent
    Responsibilities:
    - BANT (Budget, Authority, Need, Timeline) framework evaluation
    - Classifies lead into:
        - Qualified (All 4 criteria met)
        - Partially Qualified (2-3 criteria met)
        - Unqualified (< 2 criteria met)
    - Recommends next milestone or nurture path
    """
    AGENT_NAME = "Qualification Agent"

    DECISION_TITLES = ["owner", "founder", "proprietor", "director", "head", "manager", "partner", "procurement",
                       "secretary", "lead", "buyer", "ceo"]

    @classmethod
    def evaluate_bant(cls, lead: Lead, conversation_history: list = None) -> Dict[str, Any]:
        """Intake checklist from the lead form only; the conversation-based LLM version replaces it later."""
        # Budget: a stated order value
        budget_ok = (lead.budget_numeric or 0) > 0

        # Authority: job title suggests they sign off purchases
        job_title = (lead.job_title or "").lower()
        authority_ok = any(t in job_title for t in cls.DECISION_TITLES)

        # Need: a stated product requirement or quantity
        need_ok = bool(lead.order_quantity) or len((lead.requirements or "").strip()) >= 5

        # Timeline: a deadline within ~2 months
        days = timeline_days(lead.timeline)
        timeline_ok = days is not None and days <= 60

        bant_met_count = sum([budget_ok, authority_ok, need_ok, timeline_ok])

        if bant_met_count >= 4:
            status = "Qualified"
            recommended_stage = "Qualified"
            reason = "All four BANT criteria met on the lead form: order value, decision-maker title, product need, deadline within 60 days."
        elif bant_met_count >= 2:
            status = "Partially Qualified"
            recommended_stage = "Engaged"
            missing = []
            if not budget_ok: missing.append("order value")
            if not authority_ok: missing.append("who approves the purchase")
            if not need_ok: missing.append("products and quantity")
            if not timeline_ok: missing.append("delivery deadline")
            reason = f"Partially qualified. Additional discovery needed on: {', '.join(missing)}."
        else:
            status = "Unqualified"
            recommended_stage = "Nurture"
            reason = "Fewer than two BANT criteria met; nurture until needs are clearer."

        return {
            "agent_name": cls.AGENT_NAME,
            "qualification_status": status,
            "recommended_stage": recommended_stage,
            "bant_breakdown": {
                "budget_qualified": budget_ok,
                "authority_qualified": authority_ok,
                "need_qualified": need_ok,
                "timeline_qualified": timeline_ok,
                "criteria_met_count": bant_met_count
            },
            "reason": reason
        }


class BantSlot(BaseModel):
    status: Literal["absent", "partial", "confirmed"]
    evidence: str = ""


class BantUpdate(BaseModel):
    budget: BantSlot
    authority: BantSlot
    need: BantSlot
    timeline: BantSlot


BANT_SYSTEM = (
    "You extract BANT sales-qualification status from a conversation. For each of budget, authority, need, "
    "timeline return status 'absent' (not mentioned), 'partial' (hinted or vague) or 'confirmed' (explicitly stated), "
    "and evidence: a short verbatim quote from what the CUSTOMER said or from the lead profile (empty string if absent). "
    "Never use the AGENT's words as evidence: only the customer can confirm BANT. "
    'Return only JSON: {"budget": {"status": "...", "evidence": "..."}, "authority": {...}, "need": {...}, "timeline": {...}}'
)


def update_bant_from_conversation(lead: Lead, history: List[Dict[str, str]]) -> Optional[Dict[str, Any]]:
    """LLM re-reads the conversation and updates the four BANT slots on the lead.
    Returns the parsed BANT dict, or None (lead left unchanged) if the LLM is unavailable or returns bad JSON."""
    profile = (f"Lead profile: budget={lead.budget or '-'}; job_title={lead.job_title or '-'}; "
               f"requirements={lead.requirements or '-'}; timeline={lead.timeline or '-'}")
    transcript = "\n".join(f"{'CUSTOMER' if m['role'] == 'user' else 'AGENT'}: {m['content']}" for m in history)
    try:
        raw = chat(BANT_SYSTEM, [{"role": "user", "content": f"{profile}\n\nConversation:\n{transcript}"}], json_mode=True)
        bant = BantUpdate.model_validate(parse_json(raw))
    except (LLMUnavailable, ValueError, ValidationError) as e:
        log.warning("BANT update skipped, keeping rule-based values: %s", e)
        return None

    lead.bant_json = bant.model_dump_json()
    lead.budget_qualified = bant.budget.status == "confirmed"
    lead.authority_qualified = bant.authority.status == "confirmed"
    lead.need_qualified = bant.need.status == "confirmed"
    lead.timeline_qualified = bant.timeline.status == "confirmed"
    confirmed = sum([lead.budget_qualified, lead.authority_qualified, lead.need_qualified, lead.timeline_qualified])
    lead.qualification_status = "Qualified" if confirmed == 4 else "Partially Qualified" if confirmed >= 2 else "Unqualified"
    return bant.model_dump()
