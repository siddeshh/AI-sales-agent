import json
import re
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from app.models.entities import Lead, LeadScoreFactor, Conversation, Message

BULK_MOQ = 50  # units per style, from the bulk price list
PROFILE_MAX = 85  # max points of the five profile factors
PROFILE_WEIGHT = 0.7
BANT_MAX = 30


def bant_bonus(confirmed: int, partial: int) -> int:
    """Convex in confirmed slots: the more BANT is confirmed, the more weight it carries."""
    return min(BANT_MAX, round(BANT_MAX * (confirmed / 4) ** 1.5 + 1.5 * partial))


# self-check: monotonic, and full confirmation gives the whole bonus
assert [bant_bonus(c, 0) for c in range(5)] == [0, 4, 11, 19, 30]
assert bant_bonus(4, 0) == BANT_MAX and bant_bonus(2, 2) > bant_bonus(2, 0) > bant_bonus(1, 1)


def timeline_days(text: Optional[str]) -> Optional[int]:
    """'within 10 days' → 10, '3 weeks' → 21, 'next month' → 30, 'immediately' → 3; None if no deadline stated."""
    t = (text or "").lower()
    if not t:
        return None
    if any(w in t for w in ["immediate", "asap", "urgent", "this week"]):
        return 3
    m = re.search(r"(\d+)\s*(day|week|month)", t)
    if m:
        return int(m.group(1)) * {"day": 1, "week": 7, "month": 30}[m.group(2)]
    if "next month" in t or "this month" in t:
        return 30
    if "quarter" in t:
        return 90
    return None


class LeadScoringAgent:
    """
    Agent B: Lead Scoring Agent (retail / bulk apparel)
    final = round(0.7 x base) + BANT bonus   (0-100)
      base       = profile points / 85 x 100, from five profile factors:
                   order value / quantity fit 25, timeline urgency 20, buyer type 15, engagement 15, source quality 10
      BANT bonus = min(30, round(30 x (confirmed/4)^1.5 + 1.5 x partial)): each confirmed slot is worth more
                   than the last (0, 4, 11, 19, 30 points for 0-4 confirmed), so conversation evidence dominates
                   once BANT is confirmed
    Category: Cold (0-30), Warm (31-60), Qualified (61-80), Hot (81-100).
    """
    AGENT_NAME = "Lead Scoring Agent"

    @classmethod
    def score_lead(cls, lead: Lead, customer_replies: int = 0) -> Dict[str, Any]:
        factors: List[Dict[str, Any]] = []

        def add(name, points, reason, category):
            factors.append({"factor_name": name, "score_impact": points, "explanation": reason, "category": category})

        # 1. Order value / quantity fit (25)
        value, qty = lead.budget_numeric or 0, lead.order_quantity or 0
        if qty and qty < BULK_MOQ:
            pts, why = 6, f"{qty} units is below the {BULK_MOQ}-unit bulk MOQ (trial-order candidate)"
        elif value >= 200000:
            pts, why = 25, f"Order value ₹{value:,.0f} is a large bulk order"
        elif value >= 75000:
            pts, why = 18, f"Order value ₹{value:,.0f} fits mid-size bulk slabs"
        elif value >= 25000:
            pts, why = 10, f"Order value ₹{value:,.0f} is a small bulk order"
        elif value > 0:
            pts, why = 4, f"Order value ₹{value:,.0f} is retail-size"
        else:
            pts, why = 0, "No budget or order value shared yet"
        if qty and qty >= BULK_MOQ:
            why += f" ({qty} units)"
        add("Order Value / Quantity Fit", pts, why, "Budget")

        # 2. Timeline urgency (20)
        days = timeline_days(lead.timeline)
        if days is None:
            pts, why = 2, "No delivery deadline stated"
        elif days <= 14:
            pts, why = 20, f"Needs goods within {days} days"
        elif days <= 30:
            pts, why = 14, f"Needs goods within {days} days"
        elif days <= 60:
            pts, why = 8, f"Needs goods within {days} days"
        else:
            pts, why = 3, f"Long horizon ({days} days)"
        add("Timeline Urgency", pts, why, "Timeline")

        # 3. Buyer type (15): wholesale > corporate > individual
        bt = (lead.buyer_type or "").lower()
        pts, why = {"wholesale": (15, "Wholesale buyer (boutique / reseller): repeat-order potential"),
                    "corporate": (10, "Corporate or institutional buyer: one-off bulk order"),
                    "individual": (3, "Individual buyer")}.get(bt, (0, "Buyer type unknown"))
        add("Buyer Type", pts, why, "Fit")

        # 4. Engagement (15): customer replies only; email opens are not tracked, so they are not counted
        if customer_replies >= 4:
            pts = 15
        elif customer_replies >= 2:
            pts = 10
        elif customer_replies == 1:
            pts = 5
        else:
            pts = 0
        add("Engagement", pts, f"{customer_replies} customer repl{'y' if customer_replies == 1 else 'ies'} so far",
            "Engagement")

        # 5. Source quality (10)
        src = (lead.source or "").lower()
        if "referral" in src or "website" in src:
            pts, why = 10, "Inbound website form / referral"
        elif "trade fair" in src or "whatsapp" in src:
            pts, why = 8, "Direct contact (trade fair / WhatsApp)"
        elif "instagram" in src:
            pts, why = 6, "Instagram enquiry"
        elif "csv" in src:
            pts, why = 3, "Imported list (CSV), not yet engaged"
        else:
            pts, why = 4, f"Source: {lead.source or 'unknown'}"
        add("Source Quality", pts, why, "Fit")

        # BANT evidence: from the conversation (LLM) if available, else the lead form.
        # Form answers count as "partial" only: BANT is confirmed by what the customer says.
        if lead.bant_json:
            bant = json.loads(lead.bant_json)
            confirmed = sum(1 for v in bant.values() if v.get("status") == "confirmed")
            partial = sum(1 for v in bant.values() if v.get("status") == "partial")
            source = "conversation"
        else:
            confirmed = 0
            partial = sum(bool(x) for x in [lead.budget_qualified, lead.authority_qualified,
                                            lead.need_qualified, lead.timeline_qualified])
            source = "lead form"
        bonus = bant_bonus(confirmed, partial)
        add("BANT Evidence Bonus", bonus,
            f"{confirmed} confirmed, {partial} partial BANT slots (from {source})", "Qualification")

        profile_points = sum(f["score_impact"] for f in factors[:-1])
        base = round(profile_points * 100 / PROFILE_MAX)
        weighted = round(PROFILE_WEIGHT * base)
        score = weighted + bonus
        category = "Hot" if score >= 81 else "Qualified" if score >= 61 else "Warm" if score >= 31 else "Cold"
        breakdown = {
            "formula": "final = round(0.7 x base) + BANT bonus",
            "base_formula": f"base = profile points / {PROFILE_MAX} x 100",
            "bonus_formula": f"BANT bonus = min({BANT_MAX}, round({BANT_MAX} x (confirmed/4)^1.5 + 1.5 x partial))",
            "profile_points": profile_points, "profile_max": PROFILE_MAX, "base": base,
            "profile_weight": PROFILE_WEIGHT, "weighted_base": weighted,
            "bant_source": source, "bant_confirmed": confirmed, "bant_partial": partial,
            "bant_bonus": bonus, "final": score,
        }
        return {
            "agent_name": cls.AGENT_NAME,
            "lead_score": score,
            "score_category": category,
            # shortcut: linear map of the score, not a trained probability; replace once there is won/lost history
            "conversion_probability": round(score / 100, 2),
            "factors": factors,
            "breakdown": breakdown,
            "why_summary": [f["explanation"] for f in factors if f["score_impact"] > 0],
        }

    @classmethod
    def apply(cls, lead: Lead, db: Session) -> Dict[str, Any]:
        """Score the lead from its current data and replace its stored factor rows."""
        replies = (db.query(Message).join(Conversation)
                   .filter(Conversation.lead_id == lead.id, Message.sender == "customer").count()) if lead.id else 0
        res = cls.score_lead(lead, customer_replies=replies)
        lead.lead_score = res["lead_score"]
        lead.conversion_probability = res["conversion_probability"]
        lead.score_category = res["score_category"]
        lead.score_breakdown_json = json.dumps(res["breakdown"])
        db.query(LeadScoreFactor).filter(LeadScoreFactor.lead_id == lead.id).delete()
        db.add_all([LeadScoreFactor(lead_id=lead.id, **f) for f in res["factors"]])
        return res
