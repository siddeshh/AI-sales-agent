from typing import Dict, Any, List
from app.models.entities import Lead

class LeadScoringAgent:
    """
    Agent B: Lead Scoring Agent
    Responsibilities:
    - Transparent, explainable scoring from 0-100
    - Calculates conversion probability
    - Produces factor breakdown (Budget, Need, Timeline, Engagement, Authority)
    - Categorizes into Cold (0-30), Warm (31-60), Qualified (61-80), Hot (81-100)
    """
    AGENT_NAME = "Lead Scoring Agent"

    @classmethod
    def score_lead(cls, lead: Lead, engagement_count: int = 1) -> Dict[str, Any]:
        base_score = 40
        factors: List[Dict[str, Any]] = []

        # 1. Budget Evaluation
        budget = (lead.budget or "").lower()
        if "80 lakh" in budget or "1.2 crore" in budget or lead.budget_numeric >= 7500000:
            impact = 25
            explanation = "High budget match (Aligned with prime project inventory ₹75L-₹1.5Cr)"
            lead_budget_qualified = True
        elif lead.budget_numeric >= 4500000:
            impact = 15
            explanation = "Moderate budget match (Matches compact 1/2 BHK units)"
            lead_budget_qualified = True
        else:
            impact = -10
            explanation = "Below primary inventory price floor (< ₹45 lakh)"
            lead_budget_qualified = False
        
        base_score += impact
        factors.append({
            "factor_name": "Budget Match",
            "score_impact": impact,
            "explanation": explanation,
            "category": "Budget"
        })

        # 2. Timeline Urgency
        timeline = (lead.timeline or "").lower()
        if "immediate" in timeline or "30 days" in timeline or "1 month" in timeline:
            impact = 20
            explanation = "Purchase timeline is urgent (Within 30 days decision window)"
        elif "60 days" in timeline or "2 months" in timeline:
            impact = 12
            explanation = "Mid-term buying intent (Planning within 60 days)"
        else:
            impact = 5
            explanation = "Longer decision horizon (> 90 days)"
        
        base_score += impact
        factors.append({
            "factor_name": "Timeline Urgency",
            "score_impact": impact,
            "explanation": explanation,
            "category": "Timeline"
        })

        # 3. Requirement Specificity
        req = (lead.requirements or "").lower()
        if len(req) > 20 and ("bhk" in req or "facing" in req or "sq" in req or "balcony" in req):
            impact = 15
            explanation = "Highly specific property requirements indicating high buyer readiness"
        else:
            impact = 5
            explanation = "Broad or exploratory property preference"
        
        base_score += impact
        factors.append({
            "factor_name": "Requirement Clarity",
            "score_impact": impact,
            "explanation": explanation,
            "category": "Need"
        })

        # 4. Engagement & Communication Responsiveness
        if engagement_count >= 3:
            impact = 15
            explanation = "High two-way engagement (Active conversation, questions asked)"
        elif engagement_count >= 1:
            impact = 10
            explanation = "Responded to initial outreach message"
        else:
            impact = 0
            explanation = "Newly acquired prospect awaiting first touchpoint"
        
        base_score += impact
        factors.append({
            "factor_name": "Communication Engagement",
            "score_impact": impact,
            "explanation": explanation,
            "category": "Engagement"
        })

        # 5. Lead Source Credibility
        source = (lead.source or "").lower()
        if "referral" in source or "website form" in source:
            impact = 8
            explanation = "High-intent inbound source (Direct website inquiry or referral)"
        else:
            impact = 4
            explanation = "Third-party portal lead"
        
        base_score += impact
        factors.append({
            "factor_name": "Source Credibility",
            "score_impact": impact,
            "explanation": explanation,
            "category": "Fit"
        })

        final_score = max(5, min(100, base_score))

        # Categorize
        if final_score >= 81:
            category = "Hot"
        elif final_score >= 61:
            category = "Qualified"
        elif final_score >= 31:
            category = "Warm"
        else:
            category = "Cold"

        # Conversion Probability mapping
        conversion_prob = round(final_score / 100.0 * 0.94, 2)
        conversion_prob = max(0.10, min(0.96, conversion_prob))

        # Explanatory summary bullets
        why_bullets = [f["explanation"] for f in factors if f["score_impact"] > 0]

        return {
            "agent_name": cls.AGENT_NAME,
            "lead_score": final_score,
            "score_category": category,
            "conversion_probability": conversion_prob,
            "factors": factors,
            "why_summary": why_bullets,
            "budget_qualified": lead_budget_qualified
        }
