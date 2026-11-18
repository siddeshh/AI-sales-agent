import re
from typing import Dict, Any, Optional, List

from app.services.llm import chat, build_sales_system, provider_label, LLMUnavailable


class ObjectionHandlingAgent:
    """
    Agent 5 of 10: Objection Agent (retail / bulk apparel playbook)
    - Detects objections: price, moq, delivery, competitor, authority, timing, no_interest, send_details
    - Answers with the playbook below: LLM-written and grounded in the knowledge chunks when a model is configured,
      otherwise the fixed template (whose facts match the seeded price list and policies)
    """
    AGENT_NAME = "Objection Agent"

    # Keys are the same labels the LLM classifier returns (orchestrator.IntentResult.objection_type).
    OBJECTION_PATTERNS = {
        "moq": [r"minimum order", r"\bmoq\b", r"only need (about |around )?\d+", r"small (quantity|batch|order)",
                r"too many (pieces|units)", r"fewer (pieces|units)"],
        "delivery": [r"delivery time", r"lead time", r"too (long|late|slow)", r"takes too long", r"need (it|them) by",
                     r"won'?t (arrive|reach)"],
        "price": [r"too expensive", r"costly", r"budget is tight", r"out of (my |our )?budget", r"price is high",
                  r"more than (my|our) budget", r"too high", r"cannot afford", r"expensive", r"overpriced",
                  r"discount", r"cheaper"],
        "competitor": [r"another supplier", r"other supplier", r"other vendor", r"competitor", r"better deal",
                       r"getting quotes", r"comparing", r"already buy from"],
        "authority": [r"check with my (boss|partner|manager|team)", r"need approval", r"finance (team )?needs to",
                      r"not my decision", r"partner needs to agree"],
        "timing": [r"need to think", r"will think about it", r"not right now", r"call me later", r"next month",
                   r"next quarter", r"after (diwali|the season)"],
        "no_interest": [r"not interested", r"stop (calling|messaging)", r"don'?t want", r"remove my number",
                        r"unsubscribe"],
        "send_details": [r"send (me )?(the )?(details|catalogue|catalog|price list)", r"share (the )?(details|catalogue)",
                         r"email me"],
    }

    # Playbook: what the reply should do for each objection (used for the LLM prompt and as the technique label).
    PLAYBOOK = {
        "price": ("Volume-slab pricing and value",
                  "Explain the volume slabs (bigger quantity, lower price per piece) and the value (fabric weight, "
                  "pre-shrunk cotton, returns on defects). Offer the next slab up if it fits."),
        "moq": ("Smaller trial order",
                "Offer the trial order for smaller quantities so they can check quality before a full bulk order."),
        "delivery": ("Express production option",
                     "Give the standard lead time and offer express production with its surcharge and limits."),
        "competitor": ("Quality, customisation and returns policy",
                       "Respect the comparison; differentiate on fabric quality, customisation options and the "
                       "returns/defect policy; offer a sample to compare side by side."),
        "authority": ("Stakeholder inclusion",
                      "Offer to send a one-page quote they can forward, or a sample review call with the approver."),
        "timing": ("Respect timing, keep it easy",
                   "Respect the delay, offer to send the catalogue and price list, and ask when to follow up."),
        "no_interest": ("Gracious exit", "Thank them, confirm you will stop messaging, and leave the door open."),
        "send_details": ("Send details", "Offer the catalogue and bulk price list and ask what quantity they need."),
    }

    TEMPLATES = {
        "price": ("I understand, {name}. Our bulk prices drop with volume: 15% off MRP from 50 pieces, 22% from 100, "
                  "28% from 250 and 35% from 500, for pre-shrunk combed cotton with free replacement of defective pieces. "
                  "Would it help if I priced your order at the next slab up?"),
        "moq": ("No problem. Bulk pricing starts at 50 pieces per style, but our trial order lets you take 20 to 49 "
                "pieces of one style at 10% off MRP, plain or one-colour print, to check the quality first. "
                "Shall I set that up?"),
        "delivery": ("Plain bulk orders ship in 7-10 business days and printed ones in 12-15 after artwork approval. "
                     "If you are short on time, express production takes 5-7 business days for up to 250 pieces at a "
                     "12% surcharge. Would that work for your date?"),
        "competitor": ("It's smart to compare. With us you get 180-320 GSM pre-shrunk cotton, printing or embroidery "
                       "on the same order, and free replacement of defective pieces reported within 7 days. I can send a sample "
                       "(₹499, adjusted against the order) so you can compare side by side."),
        "authority": ("Of course. I can send a one-page quote you can forward, or set up a short sample review call "
                      "with whoever approves the order. Which would be easier?"),
        "timing": ("No rush, {name}. I'll send our catalogue and bulk price list so you have them handy. "
                   "When would be a good time to check back?"),
        "no_interest": ("Thanks for letting me know, {name}. I'll stop messaging you. If you ever need apparel in "
                        "bulk, we're here."),
        "send_details": ("Sure. I'll share our product catalogue and bulk price list. Roughly how many pieces, and "
                         "which products, are you looking at?"),
    }

    @classmethod
    def detect_objection(cls, message: str) -> Optional[str]:
        msg = message.lower()
        for obj_type, patterns in cls.OBJECTION_PATTERNS.items():
            if any(re.search(p, msg) for p in patterns):
                return obj_type
        return None

    @classmethod
    def handle_objection(cls, message: str, objection_type: str, lead_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Rule-based reply from the template for this objection type."""
        obj = objection_type if objection_type in cls.TEMPLATES else "send_details"
        name = ((lead_context or {}).get("name") or "").split()[0] if (lead_context or {}).get("name") else "there"
        return {
            "agent_name": cls.AGENT_NAME,
            "objection_type": obj,
            "technique_used": cls.PLAYBOOK[obj][0],
            "handled_response": cls.TEMPLATES[obj].format(name=name),
            "resolution_status": "Addressed",
        }

    @classmethod
    def generate_reply(cls, lead, objection_type: str, history: List[Dict[str, str]],
                       chunks: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """LLM objection reply grounded in KNOWLEDGE; falls back to the template."""
        fallback = cls.handle_objection(history[-1]["content"] if history else "", objection_type, {"name": lead.name})
        technique, how = cls.PLAYBOOK[fallback["objection_type"]]
        task = (
            f"The customer raised a '{fallback['objection_type']}' objection. Acknowledge it briefly, then: {how} "
            "Use only prices, quantities, lead times and policies that appear in KNOWLEDGE. If KNOWLEDGE does not "
            "cover it, offer to check with the team. Never invent a discount or offer."
        )
        try:
            text = chat(build_sales_system(task, lead, lead.stage, chunks), history).strip()
            return {**fallback, "handled_response": text, "technique_used": technique, "provider": provider_label()}
        except LLMUnavailable:
            return {**fallback, "provider": "rules"}
