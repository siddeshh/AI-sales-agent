from typing import Any, Dict, List

from app.services.llm import LLMUnavailable, chat, provider_label


class VoiceSalesAgent:
    """
    Agent 6 of 10: Voice Agent
    - Browser voice call: the customer speaks (browser speech recognition, Chrome) or types; each finished utterance
      goes through the same orchestrator as chat (LLM, knowledge base, objections, BANT, handoff)
    - Replies are spoken with the browser's speech synthesis
    - Opens by saying it is an AI assistant; at the end writes a 4-line call summary for the CRM
    No phone calls are placed.
    """
    AGENT_NAME = "Voice Agent"

    @staticmethod
    def introduction(caller_name: str) -> str:
        first = (caller_name or "there").split()[0]
        return (f"Hello {first}, this is the AI assistant from Celestial Wear. I'm an AI, not a person. "
                f"I'm calling about your enquiry for bulk apparel. Is now a good time for two minutes?")

    SUMMARY_SYSTEM = (
        "You summarise a sales call for the CRM. Write exactly 4 lines, no bullets or numbering, each under 25 words:\n"
        "Line 1: what the customer wants (products, quantity).\n"
        "Line 2: budget, timeline and who decides, if mentioned; otherwise say they were not discussed.\n"
        "Line 3: objections or questions and how the assistant answered.\n"
        "Line 4: the agreed or recommended next step.\n"
        "Use only facts from the transcript. Do not invent prices, dates or promises."
    )

    @classmethod
    def summarize_call(cls, caller_name: str, transcript: List[Dict[str, str]], next_action: str,
                       objections: List[str]) -> Dict[str, Any]:
        """4-line summary by the LLM; without a model, a rule-based 4-line summary that says so."""
        lines_in = "\n".join(f"{'CUSTOMER' if t['speaker'] == 'customer' else 'ASSISTANT'}: {t['text']}" for t in transcript)
        try:
            raw = chat(cls.SUMMARY_SYSTEM, [{"role": "user", "content": f"Call with {caller_name}:\n{lines_in}"}])
            lines = [l.strip(" -•\t") for l in raw.strip().splitlines() if l.strip()]
            if len(lines) >= 4:
                return {"summary": "\n".join(lines[:4]), "provider": provider_label()}
        except LLMUnavailable:
            pass
        said = [t["text"] for t in transcript if t["speaker"] == "customer"]
        return {
            "summary": "\n".join([
                f"Customer said: {said[0] if said else 'nothing'}" + (f" (+{len(said) - 1} more)" if len(said) > 1 else ""),
                f"Last thing the customer said: {said[-1] if said else 'nothing'}",
                f"Objections raised: {', '.join(objections) if objections else 'none detected'}",
                f"Next step: {next_action or 'not set'}",
            ]),
            "provider": "rules (no language model configured)",
        }
