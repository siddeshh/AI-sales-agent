from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.models.entities import Lead, FollowUp

class FollowUpAgent:
    """
    Agent H: Follow-up Agent
    Responsibilities:
    - Automated Cadence Management:
        * Day 0: Introduction with catalogue and bulk price list
        * Day 2: Customisation options (printing, embroidery, mockups)
        * Day 5: Sample review call / showroom visit offer
        * Day 10: Final check-in before long nurture
    - Inactivity detection & automatic stop on prospect response
    - Contact-later rescheduling
    """
    AGENT_NAME = "Follow-up Agent"

    CADENCE_TEMPLATES = {
        0: {
            "title": "Day 0: Introduction with catalogue and price list",
            "channel": "whatsapp",
            "content": "Hi {name}! Thanks for your interest in Celestial Wear. Here are our product catalogue and bulk price list. Which products and quantities are you considering?"
        },
        2: {
            "title": "Day 2: Customisation options",
            "channel": "whatsapp",
            "content": "Hi {name}, quick follow-up: we can add screen printing, DTF or embroidery to bulk orders and share a digital mockup within 48 hours. Want to send us your logo?"
        },
        5: {
            "title": "Day 5: Sample review call offer",
            "channel": "email",
            "content": "Dear {name}, if it helps you decide, we can do a short sample review call or you can visit our Bengaluru showroom to see the fabrics. Let me know a time that suits you."
        },
        10: {
            "title": "Day 10: Final check-in",
            "channel": "whatsapp",
            "content": "Hi {name}, one last check-in from Celestial Wear. If now isn't the right time, no problem at all. We're here whenever you need apparel in bulk."
        }
    }

    @classmethod
    def schedule_cadence_for_lead(cls, lead: Lead) -> List[Dict[str, Any]]:
        """
        Generates full scheduled timeline for new lead
        """
        now = datetime.utcnow()
        scheduled_tasks = []

        cadence_offsets = [(0, 0), (2, 2), (5, 5), (10, 10)]
        first_name = lead.name.split()[0] if lead.name else "there"

        for step, days in cadence_offsets:
            template = cls.CADENCE_TEMPLATES.get(step, {})
            due = now + timedelta(days=days)
            rendered_msg = template.get("content", "").format(name=first_name)

            scheduled_tasks.append({
                "lead_id": lead.id,
                "cadence_step": step,
                "due_date": due,
                "status": "pending",
                "channel": template.get("channel", "whatsapp"),
                "title": template.get("title", f"Day {step} Touchpoint"),
                "message_content": rendered_msg
            })

        return scheduled_tasks

    @classmethod
    def handle_customer_response(cls, lead: Lead) -> Dict[str, Any]:
        """
        When customer replies, stop automated cold follow-ups immediately
        """
        return {
            "agent_name": cls.AGENT_NAME,
            "action": "pause_automated_cadence",
            "lead_id": lead.id,
            "reason": "Prospect actively engaged in two-way conversation",
            "status": "cadence_paused"
        }

    @classmethod
    def reschedule_contact_later(cls, lead: Lead, days_ahead: int = 7) -> Dict[str, Any]:
        new_date = datetime.utcnow() + timedelta(days=days_ahead)
        return {
            "agent_name": cls.AGENT_NAME,
            "action": "rescheduled",
            "new_followup_date": new_date,
            "reason": f"Customer requested follow-up in {days_ahead} days"
        }
