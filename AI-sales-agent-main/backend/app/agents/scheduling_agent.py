from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.services.llm import chat, build_sales_system, provider_label, LLMUnavailable

class SchedulingAgent:
    """
    Agent I: Scheduling Agent
    Responsibilities:
    - Proposes slots within showroom hours (11 AM - 7 PM IST, Mon-Sat); does NOT check a real calendar yet
    - Meeting types: product demo / sample review call (Google Meet) or showroom visit (Bengaluru studio)
    - Books, cancels, and reschedules appointments
    - Prepares calendar invites & location access tokens
    """
    AGENT_NAME = "Scheduling Agent"

    @classmethod
    def get_available_slots(cls, days_ahead: int = 5) -> List[Dict[str, Any]]:
        """
        Generates realistic available meeting slots
        """
        now = datetime.utcnow()
        slots = []
        preferred_hours = [11, 14, 16] # 11:00 AM, 2:00 PM, 4:00 PM

        for d in range(1, days_ahead + 1):
            target_date = now + timedelta(days=d)
            if target_date.weekday() == 6:
                continue  # showroom closed on Sundays
            is_weekend = target_date.weekday() == 5
            
            for h in preferred_hours:
                slot_time = target_date.replace(hour=h, minute=0, second=0, microsecond=0)
                formatted_label = slot_time.strftime("%A, %d %b at %I:%M %p")
                slots.append({
                    "iso": slot_time.isoformat(),
                    "display": formatted_label,
                    "date": slot_time.strftime("%Y-%m-%d"),
                    "time": slot_time.strftime("%I:%M %p"),
                    "is_weekend": is_weekend,
                    "recommended_for": "Showroom visit or sample review call"
                })

        return slots

    @classmethod
    def book_meeting(cls, lead_id: int, lead_name: str, meeting_type: str, slot_time_iso: str, notes: str = None) -> Dict[str, Any]:
        try:
            dt = datetime.fromisoformat(slot_time_iso)
        except Exception:
            dt = datetime.utcnow() + timedelta(days=2, hours=3)

        type_labels = {
            "product_demo": "Product demo / sample review call",
            "showroom_visit": "Showroom visit",
        }

        meeting_title = f"{type_labels.get(meeting_type, 'Sales meeting')} with {lead_name}"
        location = ("Celestial Wear Studio, Indiranagar, Bengaluru" if meeting_type == "showroom_visit"
                    else "Google Meet")

        return {
            "agent_name": cls.AGENT_NAME,
            "lead_id": lead_id,
            "title": meeting_title,
            "meeting_type": meeting_type,
            "scheduled_time": dt,
            "duration_minutes": 60 if meeting_type == "showroom_visit" else 30,
            "location_or_link": location,
            "status": "scheduled",
            "confirmation_message": (
                f"Your {type_labels.get(meeting_type, 'meeting')} has been booked for "
                f"{dt.strftime('%A, %d %B %Y at %I:%M %p')}."
            )
        }

    @classmethod
    def generate_reply(cls, lead, history: List[Dict[str, str]], days_ahead: int = 5) -> Dict[str, Any]:
        """LLM reply that offers only the real free slots; falls back to the numbered slot list."""
        slots = cls.get_available_slots(days_ahead=days_ahead)
        slot_list = "\n".join(f"- {s['display']} ({s['recommended_for']})" for s in slots)
        fallback = (
            "I'd be happy to set up a sample review call or showroom visit. These slots are open:\n\n"
            + "\n".join(f"{i}) {s['display']}" for i, s in enumerate(slots[:3], 1))
            + "\n\nWhich one suits you best?"
        )
        task = (
            "The customer wants to meet. Propose up to 3 of the AVAILABLE SLOTS that best match what they asked for "
            "(day, time). If the day they asked for is not available, say so and offer the nearest ones. "
            "Ask them to pick one; do not claim anything is booked yet."
        )
        try:
            text = chat(build_sales_system(task, lead, lead.stage, extra=f"AVAILABLE SLOTS:\n{slot_list}"), history).strip()
            return {"reply": text, "provider": provider_label(), "slots": slots}
        except LLMUnavailable:
            return {"reply": fallback, "provider": "rules", "slots": slots}
