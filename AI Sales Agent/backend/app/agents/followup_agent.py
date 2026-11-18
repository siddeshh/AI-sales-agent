from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.models.entities import Lead, FollowUp

class FollowUpAgent:
    """
    Agent H: Follow-up Agent
    Responsibilities:
    - Automated Cadence Management:
        * Day 0: Initial greeting & floor plan share
        * Day 2: Value-add follow-up (Amenities & Infrastructure video)
        * Day 5: Financing & payment milestone guide
        * Day 10: Final courtesy touchpoint before re-routing to long nurture
    - Inactivity detection & automatic stop on prospect response
    - Contact-later rescheduling
    """
    AGENT_NAME = "Follow-up Agent"

    CADENCE_TEMPLATES = {
        0: {
            "title": "Day 0: Initial Outreach & Project Overview",
            "channel": "whatsapp",
            "content": "Hi {name}! Attached is the complete project brochure and carpet area plan for Skyline Greens Pune. Let me know if you'd like to see specific 2 BHK floor options!"
        },
        2: {
            "title": "Day 2: Amenities & Township Lifestyle Video",
            "channel": "whatsapp",
            "content": "Hi {name}! Following up on your property search — here is a 2-minute 3D walkthrough showing our 25,000 sq.ft clubhouse and Olympic swimming pool. Would Saturday work for a site visit?"
        },
        5: {
            "title": "Day 5: Home Loan & Subvention Financing Guide",
            "channel": "email",
            "content": "Dear {name}, we have just partnered with HDFC & SBI for an exclusive 10:90 subvention scheme on our 2 BHK towers. Here is the full financial breakdown to review at your convenience."
        },
        10: {
            "title": "Day 10: Final Courtesy Check-in",
            "channel": "whatsapp",
            "content": "Hi {name}, I wanted to do one last check-in. If your property search is on pause, no problem at all! Whenever you are ready to explore, we are here to assist."
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
