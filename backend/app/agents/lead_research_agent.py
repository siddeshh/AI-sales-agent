from typing import Dict, Any
from app.models.entities import Lead

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

    @classmethod
    def research_lead(cls, lead: Lead) -> Dict[str, Any]:
        industry = lead.industry or "real_estate"
        name = lead.name or "Prospect"
        budget = lead.budget or "₹80 lakh"
        location = lead.location or "Pune"
        req = lead.requirements or "2 BHK residential apartment"
        timeline = lead.timeline or "Within 30-60 days"

        # Determine buyer persona based on parameters
        if "crore" in budget.lower() or lead.budget_numeric >= 10000000:
            persona_type = "High Net-Worth / Luxury Investor"
            key_motivations = "Capital appreciation, luxury amenities, prestigious address, verified title."
            pain_points = "Risk of delayed construction, unverified builder credentials, low rental yield."
        elif "80" in budget or "75" in budget or "85" in budget:
            persona_type = "Mid-Senior Tech Professional / First-time Homebuyer"
            key_motivations = "Proximity to IT hubs (Hinjawadi / Magarpatta), kid-friendly gated township, easy home loan approvals."
            pain_points = "High EMI burden, traffic congestion during commute, hidden parking/maintenance costs."
        else:
            persona_type = "Value-Conscious Family Buyer"
            key_motivations = "Affordable pricing, good connectivity, safe neighborhood, reliable builder track record."
            pain_points = "Strict budget limitations, delayed possession dates, extra charges."

        summary = (
            f"Prospect {name} is identified as a '{persona_type}' seeking {req} in {location} "
            f"with an allocated capital budget of {budget}. Timeline is firm ({timeline}). "
            f"Motivations: {key_motivations}"
        )

        buying_intent = "High" if ("30" in timeline or "immediate" in timeline.lower()) else "Medium"

        return {
            "agent_name": cls.AGENT_NAME,
            "research_summary": summary,
            "persona_type": persona_type,
            "pain_points": pain_points,
            "key_motivations": key_motivations,
            "buying_intent": buying_intent,
            "next_best_action": "Send Personalized Property Introduction & Schedule Discovery Site Visit"
        }
