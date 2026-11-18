"""Sends 5 customer messages through /api/chat/message (orchestrator + agents + storage) and prints the result.

Run from backend/:   .\\venv\\Scripts\\python tests\\test_llm_flow.py
Uses a throwaway SQLite DB so the real sales_workforce.db is untouched.
Provider comes from backend/.env (LLM_PROVIDER, GROQ_API_KEY, ...); with no key it exercises the rules fallback.
"""
import json
import logging
import os
import sys
import tempfile

DB_PATH = os.path.join(tempfile.mkdtemp(), "test_llm_flow.db")
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"  # must be set before app imports create the engine
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.services.llm import provider_label  # noqa: E402

MESSAGES = [
    "Hi, do you sell in bulk?",
    "What is the price for 200 units?",
    "That's too expensive",
    "Can we do a demo on Friday?",
    "I want to talk to a manager",
]
INTENTS = {"question", "objection", "ready_to_buy", "not_now", "human_request", "opt_out", "greeting", "other"}


def test_llm_flow():
    sys.stdout.reconfigure(encoding="utf-8")  # Windows console defaults to cp1252, which has no ₹
    logging.basicConfig(level=logging.INFO, format="  [%(name)s] %(message)s")
    client = TestClient(app)
    lead = client.post("/api/leads", json={
        "name": "Test Buyer", "company": "Test Retail Co", "location": None,
        "budget": None, "budget_numeric": 0, "requirements": None, "timeline": None,
    }).json()
    print(f"\nProvider configured: {provider_label()}   lead_id={lead['id']}\n")

    turns = []
    for text in MESSAGES:
        r = client.post("/api/chat/message", json={"lead_id": lead["id"], "content": text})
        assert r.status_code == 200, r.text
        body = r.json()
        ai = body["ai_message"]
        turns.append(body)
        print(f"CUSTOMER : {text}")
        print(f"  intent={body['detected_intent']}  sentiment={body['detected_sentiment']}  "
              f"objection={body['detected_objection']}  confidence={ai['confidence']}")
        print(f"  agent={ai['agent_name']}  provider={ai['provider']}")
        print(f"  REPLY  : {ai['content']}\n")
        assert body["detected_intent"] in INTENTS
        assert ai["content"].strip()
        assert ai["provider"]

    assert turns[-1]["human_handoff_triggered"], "manager request must hand off to a human"

    final = client.get(f"/api/leads/{lead['id']}").json()
    print(f"Qualification: {final['qualification_status']}")
    print("BANT:", json.dumps(json.loads(final["bant_json"]), indent=2) if final["bant_json"] else "(not updated: LLM unavailable)")


if __name__ == "__main__":
    test_llm_flow()
