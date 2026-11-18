"""The jury demo (/app/demo), steps a-e, through the API.

Run from backend/:   .\\venv\\Scripts\\python tests\\test_demo_flow.py
Offline check (LLM configured but the network is down):
    set HTTPS_PROXY=http://127.0.0.1:9 & set HTTP_PROXY=http://127.0.0.1:9 & set LLM_PROVIDER=groq & set GROQ_API_KEY=x
    .\\venv\\Scripts\\python tests\\test_demo_flow.py
Every reply must still be sensible (rule-based fallback) and fast.
"""
import os
import sys
import tempfile
import time
from pathlib import Path

os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(tempfile.mkdtemp(), 'demo.db')}"
os.environ.setdefault("LLM_PROVIDER", "mock")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

SAMPLES = Path(__file__).resolve().parents[2] / "data" / "samples"
client = TestClient(app)
MAX_SECONDS_PER_MESSAGE = 8  # generous for a slow laptop; offline replies must not wait on network timeouts


def say(lead_id, text):
    t0 = time.perf_counter()
    r = client.post("/api/chat/message", json={"lead_id": lead_id, "content": text})
    took = time.perf_counter() - t0
    assert r.status_code == 200, r.text
    body = r.json()
    print(f"  {text!r:45} -> {body['ai_message']['agent_name'] if body['ai_message'] else '(no AI reply)'} "
          f"[{body['ai_message']['provider'] if body['ai_message'] else ''}] {took:.1f}s")
    assert took < MAX_SECONDS_PER_MESSAGE, f"reply took {took:.1f}s"
    return body


def test_demo_flow():
    assert client.post("/api/demo/reset").status_code == 200
    assert not any("price list" in d["title"].lower() for d in client.get("/api/knowledge").json())

    # a. Upload the bulk order price list (twice: the second upload replaces, no duplicate)
    for _ in range(2):
        with open(SAMPLES / "bulk_order_price_list.txt", "rb") as f:
            r = client.post("/api/knowledge/upload", data={"title": "Bulk order price list", "category": "Pricing"},
                            files={"file": ("bulk_order_price_list.txt", f, "text/plain")})
        assert r.status_code == 200, r.text
    assert [d["title"] for d in client.get("/api/knowledge").json()].count("Bulk order price list") == 1

    # b. Import 5 leads; exactly one is Hot, and the breakdown explains why
    with open(SAMPLES / "leads.csv", "rb") as f:
        res = client.post("/api/leads/import", files={"file": ("leads.csv", f, "text/csv")}).json()
    assert len(res["imported"]) == 5 and not res["errors"], res
    for l in sorted(res["imported"], key=lambda x: -x["lead_score"]):
        print(f"  {l['lead_score']:>3} {l['score_category']:<9} {l['name']}")
    hot = [l for l in res["imported"] if l["score_category"] == "Hot"]
    assert [h["name"] for h in hot] == ["Kavya Shah"], hot
    kavya = client.get(f"/api/leads/{hot[0]['id']}").json()
    factors = {f["factor_name"]: f for f in kavya["score_factors"]}
    assert factors["Order Value / Quantity Fit"]["score_impact"] == 25 and factors["BANT Evidence Bonus"]["score_impact"] == 30

    # c. Conversation as the customer
    lid = kavya["id"]
    r = say(lid, "What is the bulk price for 400 oversized tees?")
    assert r["ai_message"]["agent_name"] == "Knowledge Agent" and "Oversized" in r["ai_message"]["content"]
    assert any(s["title"] == "Bulk order price list" for s in r["rag_sources"])
    r = say(lid, "That's too expensive")
    assert r["ai_message"]["agent_name"] == "Objection Agent" and r["detected_objection"] == "price"
    r = say(lid, "Can we do a call on Friday?")
    assert r["ai_message"]["agent_name"] == "Scheduling Agent" and "booked" in r["ai_message"]["content"]

    # d. Meeting on the Meetings page, CRM record and BANT
    meetings = [m for m in client.get("/api/meetings").json() if m["lead_id"] == lid]
    assert len(meetings) == 1 and meetings[0]["scheduled_time"][:10] and "Friday" in r["ai_message"]["content"]
    lead = client.get(f"/api/leads/{lid}").json()
    assert lead["stage"] == "Meeting Scheduled", lead["stage"]
    assert lead["qualification_status"] == "Qualified"
    pipeline = client.get("/api/crm/pipeline").json()["pipeline"]
    assert any(l["id"] == lid for l in pipeline["Meeting Scheduled"]["leads"])

    # e. Human handoff
    r = say(lid, "I want to talk to a manager")
    assert r["human_handoff_triggered"]
    overview = client.get("/api/dashboard/overview").json()
    assert {c["key"]: c["value"] for c in overview["cards"]}["need_human"] == 1
    assert any(a["kind"] == "handoff" and a["lead_id"] == lid for a in overview["attention"])
    r = client.post("/api/chat/message", json={"lead_id": lid, "content": "Hello?"}).json()
    assert r["ai_message"] is None  # the AI stays quiet after the handoff


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    print("LLM_PROVIDER =", os.environ["LLM_PROVIDER"], "| proxy =", os.environ.get("HTTPS_PROXY", "none"))
    test_demo_flow()
    print("PASS test_demo_flow")
