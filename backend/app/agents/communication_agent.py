from typing import Dict, Any, List
from app.models.entities import Lead
from app.services.llm import chat, build_sales_system, provider_label, LLMUnavailable

class SalesCommunicationAgent:
    """
    Agent 3 of 10: Communication Agent
    Responsibilities:
    - Writes chat replies (LLM or template) and email / WhatsApp drafts; drafts are not sent
    - Incorporates customer profile, preferred location, and budget
    - Ensures warm, consultative, and non-pushy enterprise tone
    """
    AGENT_NAME = "Communication Agent"

    @classmethod
    def generate_outreach(cls, lead: Lead, channel: str = "whatsapp") -> Dict[str, Any]:
        """Template drafts (not sent anywhere). Facts match the seeded catalogue and bulk price list."""
        first_name = lead.name.split()[0] if lead.name else "there"
        need = lead.requirements or "apparel"
        qty = f" for about {lead.order_quantity} pieces" if lead.order_quantity else ""

        if channel == "email":
            return {
                "channel": "email",
                "subject": f"Celestial Wear catalogue and bulk pricing for {lead.company or first_name}",
                "content": (
                    f"Dear {first_name},\n\n"
                    f"Thank you for your enquiry about {need}{qty}. I can share our product catalogue and bulk "
                    f"price list: bulk pricing starts at 50 pieces per style, with lower prices at 100, 250 and 500 pieces, "
                    f"and we can add screen printing, DTF or embroidery.\n\n"
                    f"Would a short sample review call this week help you decide?\n\n"
                    f"Warm regards,\nCelestial Wear (AI sales assistant)"
                ),
                "agent_name": cls.AGENT_NAME,
            }
        if channel == "whatsapp":
            return {
                "channel": "whatsapp",
                "content": (
                    f"Hi {first_name}! Thanks for reaching out to Celestial Wear about {need}{qty}. "
                    f"Bulk pricing starts at 50 pieces per style and gets lower at 100, 250 and 500. "
                    f"Shall I share the price list here, or set up a quick sample review call?"
                ),
                "agent_name": cls.AGENT_NAME,
            }
        return {
            "channel": "chat",
            "content": (
                f"Hi {first_name}! I'm the AI assistant for Celestial Wear. Happy to help with {need}{qty}. "
                f"Which products are you looking at, and by when do you need them?"
            ),
            "agent_name": cls.AGENT_NAME,
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
