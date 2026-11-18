from typing import Dict, Any, List
from datetime import datetime

class VoiceSalesAgent:
    """
    Agent 6 of 10: Voice Agent
    Responsibilities:
    - Browser voice session: the customer's lines are typed or picked (no speech-to-text, no audio stream)
    - Keyword intents and fixed spoken replies (browser text-to-speech in the frontend)
    - Text-to-Speech generation metadata
    - Call summary from the transcript, saved to the internal CRM
    """
    AGENT_NAME = "Voice Agent"

    @classmethod
    def process_voice_turn(cls, caller_name: str, transcript: str, call_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Processes a spoken turn from the customer and crafts an oral-optimized response
        (shorter sentences, natural cadence, clear pauses).
        """
        t_lower = transcript.lower()

        # Keyword intents (rule-based); every price/policy quoted here is from the seeded knowledge docs.
        if any(w in t_lower for w in ["hello", "hi ", "who is this", "who's this"]) or t_lower.strip() in ("hi", "hey"):
            intent, sentiment = "Greeting & Introduction", "Neutral"
            spoken_response = cls.introduction(caller_name)
        elif any(w in t_lower for w in ["expensive", "costly", "too high", "cheaper"]):
            intent, sentiment = "Price Objection", "Hesitant"
            spoken_response = (
                "I understand. Our bulk prices drop with quantity: 15 percent off from 50 pieces, "
                "and up to 35 percent off from 500. Would it help if I quoted the next slab up?"
            )
        elif any(w in t_lower for w in ["price", "budget", "how much", "cost", "rate"]):
            intent, sentiment = "Pricing Inquiry", "Positive"
            spoken_response = (
                "Our Classic Crew Tee is 549 rupees retail, and from 50 pieces bulk pricing starts at 467 rupees per piece. "
                "Shall I send the full bulk price list to your WhatsApp?"
            )
        elif any(w in t_lower for w in ["minimum", "moq", "only need", "small order"]):
            intent, sentiment = "MOQ Objection", "Hesitant"
            spoken_response = (
                "No problem. Bulk pricing starts at 50 pieces, but you can place a trial order of 20 to 49 pieces "
                "at 10 percent off to check the quality first."
            )
        elif any(w in t_lower for w in ["delivery", "how long", "lead time", "urgent", "by next week"]):
            intent, sentiment = "Delivery Question", "Neutral"
            spoken_response = (
                "Plain bulk orders ship in 7 to 10 business days. If you're in a hurry, express production takes "
                "5 to 7 business days for up to 250 pieces, at a 12 percent surcharge."
            )
        elif any(w in t_lower for w in ["demo", "sample", "showroom", "visit", "meet", "call"]):
            intent, sentiment = "Meeting Booking", "Positive"
            spoken_response = (
                "Happy to set that up. We can do a sample review video call, or you can visit our showroom "
                "in Indiranagar, Bengaluru. Which would you prefer, and what day suits you?"
            )
        elif any(w in t_lower for w in ["yes", "confirm", "works", "okay", "ok"]):
            intent, sentiment = "Confirmation", "Positive"
            spoken_response = (
                "Great. I'll note that down, and a member of our team will confirm the time with you on WhatsApp."
            )
        else:
            intent, sentiment = "General Inquiry", "Neutral"
            spoken_response = (
                "We make tees, polos, hoodies, sweatshirts, kurtas, joggers, caps and totes, with printing or embroidery "
                "for bulk orders. What are you looking for, and roughly how many pieces?"
            )

        return {
            "agent_name": cls.AGENT_NAME,
            "user_transcript": transcript,
            "spoken_response": spoken_response,
            "intent": intent,
            "sentiment": sentiment,
            "timestamp": datetime.utcnow().isoformat()
        }

    @staticmethod
    def introduction(caller_name: str) -> str:
        first = (caller_name or "there").split()[0]
        return (f"Hello {first}, this is the AI assistant from Celestial Wear. I'm an AI, not a person. "
                f"I'm calling about your enquiry for bulk apparel. Is now a good time for two minutes?")

    @classmethod
    def generate_call_summary(cls, caller_name: str, duration_sec: int, transcript_turns: List[Dict[str, str]]) -> Dict[str, Any]:
        """Summary built from the actual transcript (customer lines), not a fixed paragraph."""
        said = [t["text"] for t in transcript_turns if t.get("speaker") == "customer"]
        summary = (f"Voice call with {caller_name} ({len(said)} customer turns). Customer said: "
                   + (" | ".join(said) if said else "nothing yet") + ".")
        return {
            "summary": summary,
            "sentiment": "Neutral",
            "action_items": "Review the transcript and send the quote or meeting confirmation.",
            "lead_score_boost": 0,  # scoring now comes from LeadQualificationAgent, not a fixed bonus
        }
