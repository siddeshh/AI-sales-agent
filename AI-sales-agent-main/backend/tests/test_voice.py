"""Voice call API: AI intro, same orchestrator as chat, silence after handoff, 4-line summary, BANT update.

Run from backend/:   .\\venv\\Scripts\\python tests\\test_voice.py
Throwaway SQLite DB; the LLM is stubbed where needed (no API key used).
"""
import json
import os
import sys
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(tempfile.mkdtemp(), 'voice.db')}"
os.environ["LLM_PROVIDER"] = "mock"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
import app.agents.voice_agent as voice_mod  # noqa: E402
import app.agents.qualification_agent as qual_mod  # noqa: E402
from app.services.llm import LLMUnavailable  # noqa: E402

client = TestClient(app)


def start_call(name="Karan Malhotra"):
    client.post("/api/demo/reset")
    lead = next(l for l in client.get("/api/leads").json() if l["name"] == name)
    return lead, client.post("/api/voice/initiate", json={"lead_id": lead["id"]}).json()


def say(call_id, text):
    r = client.post("/api/voice/turn", json={"call_id": call_id, "user_transcript": text})
    assert r.status_code == 200, r.text
    return r.json()


def test_intro_and_routing():
    lead, call = start_call()
    intro = json.loads(call["live_transcript"])[0]["text"]
    assert "AI assistant" in intro and "I'm an AI" in intro
    assert say(call["id"], "What is the bulk price for 200 oversized tees?")["agent"] == "Knowledge Agent"
    assert say(call["id"], "That's too expensive")["agent"] == "Objection Agent"
    assert say(call["id"], "Can we do a sample review call on Friday?")["agent"] == "Scheduling Agent"
    r = say(call["id"], "I want to talk to a manager")
    assert r["human_handoff_triggered"] and r["agent"] == "Orchestrator"
    after = say(call["id"], "Hello?")
    assert after["spoken_response"] is None  # a human took over: the AI stays silent
    # The call is stored as a "voice" conversation, like chat
    conv = client.get(f"/api/chat/conversation/{lead['id']}?channel=voice").json()
    assert len([m for m in conv["messages"] if m["sender"] == "customer"]) == 5


def test_end_without_llm_is_labelled():
    lead, call = start_call()
    say(call["id"], "What is the bulk price for 200 oversized tees?")
    end = client.post(f"/api/voice/end/{call['id']}").json()
    assert len(end["summary"].splitlines()) == 4
    assert end["summary_provider"].startswith("rules") and end["bant_updated"] is False
    assert client.post(f"/api/voice/end/{call['id']}").status_code == 409
    assert client.post("/api/voice/turn", json={"call_id": call["id"], "user_transcript": "hi"}).status_code == 409


def test_end_with_llm_writes_summary_and_updates_bant():
    lead, call = start_call()
    say(call["id"], "We need 120 polos with our logo within 45 days, budget around one lakh, I approve purchases.")
    voice_mod.chat = lambda system, messages, json_mode=False: (
        "Wants 120 pique polos with a left-chest logo.\nBudget about 1,00,000; needed within 45 days; he approves.\n"
        "No objections raised.\nSend a quote and offer a sample review call.")
    voice_mod.provider_label = lambda: "stub/llm"
    bant = {k: {"status": "confirmed", "evidence": "We need 120 polos"} for k in ["budget", "authority", "need", "timeline"]}
    qual_mod.chat = lambda system, messages, json_mode=False: json.dumps(bant)
    end = client.post(f"/api/voice/end/{call['id']}").json()
    assert end["summary"].splitlines()[0] == "Wants 120 pique polos with a left-chest logo."
    assert end["summary_provider"] == "stub/llm" and end["bant_updated"] is True
    assert end["qualification_status"] == "Qualified"
    logs = client.get("/api/agents/activities?limit=20").json()
    assert any(l["agent_name"] == "CRM Agent" and "Voice call summary" in (l["details"] or "") for l in logs)
    # restore: later tests in the same process must see "no model"
    def no_llm(*a, **k):
        raise LLMUnavailable("stub")
    voice_mod.chat = qual_mod.chat = no_llm


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    for t in [test_intro_and_routing, test_end_without_llm_is_labelled, test_end_with_llm_writes_summary_and_updates_bant]:
        t()
        print(f"PASS {t.__name__}")
