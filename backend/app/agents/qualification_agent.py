from typing import Dict, Any
from app.models.entities import Lead

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

    @classmethod
    def evaluate_bant(cls, lead: Lead, conversation_history: list = None) -> Dict[str, Any]:
        # 1. Budget check
        budget_str = (lead.budget or "").lower()
        budget_ok = lead.budget_numeric >= 5000000 or "lakh" in budget_str or "crore" in budget_str

        # 2. Authority check (Self-buyer, head of household, executive)
        job_title = (lead.job_title or "").lower()
        authority_ok = True  # In residential, inquiry maker is prime decision maker / co-signer
        if "student" in job_title or "intern" in job_title:
            authority_ok = False

        # 3. Need check (Concrete requirement defined)
        req = (lead.requirements or "").lower()
        need_ok = len(req) >= 5 and any(k in req for k in ["bhk", "villa", "apartment", "plot", "sq", "commercial", "home"])

        # 4. Timeline check
        timeline = (lead.timeline or "").lower()
        timeline_ok = any(t in timeline for t in ["immediate", "30", "60", "2 month", "month", "ready"])

        bant_met_count = sum([budget_ok, authority_ok, need_ok, timeline_ok])

        if bant_met_count >= 4:
            status = "Qualified"
            recommended_stage = "Qualified"
            reason = "BANT Confirmed: Verified budget capacity, prime decision-maker authority, explicit floor plan need, and near-term purchase timeline."
        elif bant_met_count >= 2:
            status = "Partially Qualified"
            recommended_stage = "Engaged"
            missing = []
            if not budget_ok: missing.append("Budget clarification")
            if not need_ok: missing.append("Property size preference")
            if not timeline_ok: missing.append("Purchase timeline")
            reason = f"Partially qualified. Additional discovery needed on: {', '.join(missing)}."
        else:
            status = "Unqualified"
            recommended_stage = "Nurture"
            reason = "Unqualified: Prospect requires long-term educational nurture."

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
