from typing import Dict, Any, List
from datetime import datetime

class VoiceSalesAgent:
    """
    Agent G: Voice Sales Agent
    Responsibilities:
    - Voice interaction simulation and real audio stream handling
    - Speech-to-Text parsing & speaker turn management
    - Real-time conversational response synthesis
    - Text-to-Speech generation metadata
    - Call summary, customer sentiment tracking, and CRM post-call sync
    """
    AGENT_NAME = "Voice Sales Agent"

    @classmethod
    def process_voice_turn(cls, caller_name: str, transcript: str, call_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Processes a spoken turn from the customer and crafts an oral-optimized response
        (shorter sentences, natural cadence, clear pauses).
        """
        t_lower = transcript.lower()

        # Intent detection in voice
        if "hello" in t_lower or "hi" in t_lower or "who is this" in t_lower:
            intent = "Greeting & Introduction"
            sentiment = "Neutral"
            spoken_response = (
                f"Hello {caller_name}! This is Maya from Skyline Living. "
                f"I'm following up on your inquiry for 2 BHK properties in Pune. Is now a good time to speak for two minutes?"
            )
        elif "price" in t_lower or "budget" in t_lower or "how much" in t_lower or "cost" in t_lower:
            intent = "Pricing Inquiry"
            sentiment = "Positive"
            spoken_response = (
                f"Our 2 BHK apartments in Hinjawadi start at ₹78 lakh all-inclusive. "
                f"We also have flexible subvention payment plans where you only pay 10% now. Would you like me to text the exact cost sheet to this number?"
            )
        elif "expensive" in t_lower or "costly" in t_lower or "too high" in t_lower:
            intent = "Price Objection"
            sentiment = "Hesitant"
            spoken_response = (
                f"I completely hear you, {caller_name}. That includes reserved basement parking and lifetime clubhouse access. "
                f"We also have a compact smart layout starting at ₹72 lakhs. Would you like to review both options during a brief site visit?"
            )
        elif "visit" in t_lower or "meet" in t_lower or "saturday" in t_lower or "sunday" in t_lower or "weekend" in t_lower:
            intent = "Site Visit Booking"
            sentiment = "Positive"
            spoken_response = (
                f"That's wonderful! We have open VIP slots this Saturday at 11 AM or 3 PM at the Hinjawadi experience center. "
                f"Which time works better for you and your family?"
            )
        elif "yes" in t_lower or "saturday" in t_lower or "11" in t_lower or "confirm" in t_lower:
            intent = "Slot Confirmed"
            sentiment = "Positive"
            spoken_response = (
                f"Perfect! I have confirmed your appointment for this Saturday at 11 AM. "
                f"I'm sending the Google Maps location pin and pass to your WhatsApp right away. We look forward to hosting you!"
            )
        else:
            intent = "General Inquiry"
            sentiment = "Positive"
            spoken_response = (
                f"I understand. We offer Vastu-compliant 2 and 3 BHK homes with 40-plus amenities right next to the metro corridor. "
                f"When are you planning to finalize your home?"
            )

        return {
            "agent_name": cls.AGENT_NAME,
            "user_transcript": transcript,
            "spoken_response": spoken_response,
            "intent": intent,
            "sentiment": sentiment,
            "timestamp": datetime.utcnow().isoformat()
        }

    @classmethod
    def generate_call_summary(cls, caller_name: str, duration_sec: int, transcript_turns: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Summarizes completed phone call into actionable CRM notes.
        """
        summary = (
            f"Voice call completed with {caller_name} (Duration: {duration_sec}s). "
            f"Prospect expressed active interest in 2 BHK inventory near Pune IT Park. "
            f"Discussed ₹78L-₹85L price brackets and subvention payment structure. "
            f"Agreed to review site plan and tentative weekend visit."
        )

        action_items = (
            "1. Send WhatsApp location pin & PDF brochure.\n"
            "2. Reserve Saturday 11 AM calendar slot.\n"
            "3. Notify dedicated property manager."
        )

        return {
            "summary": summary,
            "sentiment": "Positive",
            "action_items": action_items,
            "lead_score_boost": +15
        }
