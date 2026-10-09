import re
from typing import Dict, Any, Optional

class ObjectionHandlingAgent:
    """
    Agent F: Objection Handling Agent
    Responsibilities:
    - Real-time detection of sales objections (Price, Timing, Competitor, Trust, Authority, Need)
    - Applies proven sales objection methodologies:
        * Value Reframing
        * Feel-Felt-Found
        * Concession / Alternative Configuration
    - Records resolution status for continuous CRM feedback
    """
    AGENT_NAME = "Objection Handling Agent"

    OBJECTION_PATTERNS = {
        "price": [
            r"too expensive", r"costly", r"budget is tight", r"out of budget", r"price is high", 
            r"more than my budget", r"too high", r"cannot afford", r"expensive", r"overpriced", r"discount"
        ],
        "timing": [
            r"need to think", r"will think about it", r"not right now", r"call me later", 
            r"busy right now", r"contact me later", r"next month", r"next year", r"after diwali"
        ],
        "competitor": [
            r"looking at another", r"already seeing", r"godrej", r"kolte patil", r"sobha", 
            r"competitor", r"better deal elsewhere", r"another builder"
        ],
        "authority": [
            r"need to check with my wife", r"need to ask my parents", r"family decision", 
            r"my partner needs to agree", r"consult with spouse"
        ],
        "trust": [
            r"delay in possession", r"is builder reliable", r"legal issues", r"is it safe", 
            r"rera approved", r"fraud", r"court case"
        ],
        "not_interested": [
            r"not interested", r"stop calling", r"dont want", r"remove my number", r"no interest"
        ]
    }

    @classmethod
    def detect_objection(cls, message: str) -> Optional[str]:
        msg_lower = message.lower()
        for obj_type, patterns in cls.OBJECTION_PATTERNS.items():
            for pat in patterns:
                if re.search(pat, msg_lower):
                    return obj_type
        return None

    @classmethod
    def handle_objection(cls, message: str, objection_type: str, lead_context: Dict[str, Any] = None) -> Dict[str, Any]:
        budget = (lead_context or {}).get("budget", "₹80 lakh")
        name = (lead_context or {}).get("name", "").split()[0] if lead_context else "there"

        if objection_type == "price":
            technique = "Value Reframing & Flexible Financing"
            response = (
                f"I completely understand your concern regarding the price point. "
                f"Many of our current homeowners felt the same initial hesitation until we broke down the total cost of ownership. "
                f"At {budget}, the pricing is all-inclusive (covers clubhouse lifetime membership and designated basement parking). "
                f"Furthermore, with our special 10:90 bank subvention plan, your initial outflow is only 10% with zero pre-EMI until possession. "
                f"Would you like me to share a customized payment schedule or explore our compact 2 BHK layout that saves an immediate ₹8 lakhs?"
            )

        elif objection_type == "timing":
            technique = "Urgency & Price Shielding"
            response = (
                f"I completely respect that, {name}. A home purchase is a major milestone and you should take the time you need. "
                f"The only reason I brought this up today is that the current phase has only 4 prime garden-facing units left at the pre-launch price lock. "
                f"How about I send the complete brochure and virtual 3D tour via WhatsApp, and we connect next Tuesday at a time that works best for you?"
            )

        elif objection_type == "competitor":
            technique = "Differentiation & Specification Advantage"
            response = (
                f"They are indeed a respectable developer. However, where Skyline Greens distinctly stands out is our 82% open green space ratio "
                f"and certified 0% space wastage floor plans (yielding 12% higher usable carpet area at the same price point). "
                f"I can quickly send you a side-by-side technical comparison sheet so you can evaluate the exact carpet area and RERA milestones."
            )

        elif objection_type == "authority":
            technique = "Stakeholder Inclusion"
            response = (
                f"That makes absolute sense! A home is a collaborative family decision. "
                f"How about we arrange a private weekend site visit or a convenient Zoom walkthrough where your family can experience the 3D layout together? "
                f"I can also share our family amenities video tour directly to your WhatsApp."
            )

        elif objection_type == "trust":
            technique = "Third-Party Proof & RERA Assurance"
            response = (
                f"Your caution is completely justified. Skyline Greens is 100% MahaRERA registered (Reg. P52100034981) "
                f"with clear title certification by top legal counsel, and fully pre-approved for 90% home loans by SBI and HDFC Bank. "
                f"I can send the complete legal verification docket right now to your email."
            )

        else: # not_interested / general
            technique = "Gracious Exit with Nurture Option"
            response = (
                f"I completely understand and appreciate your honesty. I will pause our messages right away so we don't disturb your schedule. "
                f"If you ever revisit your property search in the future, our portal and team remain at your service. Have a wonderful day!"
            )

        return {
            "agent_name": cls.AGENT_NAME,
            "objection_type": objection_type,
            "technique_used": technique,
            "handled_response": response,
            "resolution_status": "Addressed"
        }
