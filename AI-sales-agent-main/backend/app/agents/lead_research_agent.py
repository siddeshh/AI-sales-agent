from typing import Dict, Any
from app.models.entities import Lead
from app.agents.lead_scoring_agent import timeline_days

class LeadResearchAgent:
    """
    Agent A: Lead Research Agent
    Responsibilities:
    - Analyze lead information (Name, Location, Budget, Requirements, Timeline, Source)
    - Enrich company/customer context
    - Identify probable buyer pain points
    - Generate comprehensive lead persona
    """
    AGENT_NAME = "Lead Research Agent"

    PERSONAS = {
        "wholesale": ("Wholesale buyer (boutique / reseller)",
                      "Healthy margin after slab pricing, consistent quality across reorders, fast restocking of bestsellers.",
                      "Unsold stock risk, MOQ too high for testing new styles, size-set mix, delivery delays before a sale."),
        "corporate": ("Corporate / institutional buyer",
                      "Branded merchandise that staff or students actually wear, one invoice, on-time delivery for the event.",
                      "Hard event deadline, logo quality (print vs embroidery), approvals from finance, size collection."),
        "individual": ("Individual buyer",
                       "Personal or small-group order, good fit and fabric, easy returns.",
                       "Small quantity below bulk MOQ, price sensitivity, uncertainty about sizing."),
    }

    @classmethod
    def research_lead(cls, lead: Lead) -> Dict[str, Any]:
        """Rule-based profile from the lead form only; it does not look anything up externally."""
        persona_type, key_motivations, pain_points = cls.PERSONAS.get(
            (lead.buyer_type or "").lower(),
            ("Unclassified buyer", "Not enough information yet.", "Unknown until the first conversation."))
        days = timeline_days(lead.timeline)
        parts = [f"{lead.name or 'Prospect'}"]
        if lead.job_title or lead.company:
            parts.append(f"({', '.join(x for x in [lead.job_title, lead.company] if x)})")
        parts.append(f"is a '{persona_type}'")
        if lead.location:
            parts.append(f"in {lead.location}")
        summary = " ".join(parts) + "."
        if lead.requirements or lead.order_quantity:
            summary += f" Wants: {lead.requirements or ''}{f' ({lead.order_quantity} units)' if lead.order_quantity else ''}."
        if lead.budget:
            summary += f" Stated budget: {lead.budget}."
        if lead.timeline:
            summary += f" Timeline: {lead.timeline}."

        return {
            "agent_name": cls.AGENT_NAME,
            "research_summary": summary,
            "persona_type": persona_type,
            "pain_points": pain_points,
            "key_motivations": key_motivations,
            "buying_intent": "High" if days is not None and days <= 21 else "Medium" if days is not None else "Low",
            "next_best_action": "Send catalogue and bulk price list, then offer a sample review call",
        }
