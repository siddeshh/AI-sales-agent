from typing import Dict, Any, List
from app.models.entities import Lead
from app.services.llm import chat, build_sales_system, provider_label, LLMUnavailable

class SalesCommunicationAgent:
    """
    Agent D: Sales Communication Agent
    Responsibilities:
    - Generates personalized emails, WhatsApp messages, and omnichannel chat responses
    - Incorporates customer profile, preferred location, and budget
    - Ensures warm, consultative, and non-pushy enterprise tone
    """
    AGENT_NAME = "Sales Communication Agent"

    @classmethod
    def generate_outreach(cls, lead: Lead, channel: str = "whatsapp") -> Dict[str, Any]:
        first_name = lead.name.split()[0] if lead.name else "there"
        req = lead.requirements or "2 BHK apartment"
        location = lead.location or "Pune"
        budget = lead.budget or "₹80 lakh"

        if channel == "email":
            subject = f"Curated {req} Opportunities in {location} | Exclusive Portfolio for {first_name}"
            body = (
                f"Dear {first_name},\n\n"
                f"Thank you for reaching out regarding premium residential properties in {location}.\n\n"
                f"Based on your preference for a {req} within the {budget} bracket, I have matched "
                f"our RERA-approved 'Skyline Greens Phase 2' township near the IT Corridor. "
                f"It features east-facing Vastu-compliant layouts, zero space wastage, and over 40+ resort-grade amenities.\n\n"
                f"Would you be open to a quick 10-minute briefing or a personalized site visit this Saturday?\n\n"
                f"Warm regards,\n"
                f"AI Sales Advisor | Skyline Urban Living"
            )
            return {
                "channel": "email",
                "subject": subject,
                "content": body,
                "agent_name": cls.AGENT_NAME
            }

        elif channel == "whatsapp":
            message = (
                f"Hi {first_name}! 👋 Thanks for your inquiry regarding {req} in {location}. "
                f"We have ready-to-move and under-construction units matching your {budget} budget "
                f"with pre-approved 8.4% home loan rates from HDFC & SBI.\n\n"
                f"Would you like me to share the verified floor plans and pricing breakdown here, "
                f"or could we schedule a quick 5-min intro call?"
            )
            return {
                "channel": "whatsapp",
                "content": message,
                "agent_name": cls.AGENT_NAME
            }

        else: # chat
            message = (
                f"Hello {first_name}! I would be glad to assist you with your search for a {req} in {location}. "
                f"To help me pinpoint the ideal floor plan within {budget}, could you share your preferred possession timeframe?"
            )
            return {
                "channel": "chat",
                "content": message,
                "agent_name": cls.AGENT_NAME
            }

    @classmethod
    def generate_reply(cls, lead: Lead, history: List[Dict[str, str]]) -> Dict[str, Any]:
        """LLM reply for greetings and general turns. Falls back to the chat template."""
        task = "Continue the conversation and move the lead one step forward (understand their need, then offer a meeting)."
        try:
            text = chat(build_sales_system(task, lead, lead.stage), history).strip()
            return {"reply": text, "provider": provider_label(), "agent_name": cls.AGENT_NAME}
        except LLMUnavailable:
            return {"reply": cls.generate_outreach(lead, "chat")["content"], "provider": "rules", "agent_name": cls.AGENT_NAME}
