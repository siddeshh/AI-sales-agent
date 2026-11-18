"""Knowledge-base checks: chunker, grounding check, real retrieval, grounding failure → follow-up, 2 misses → handoff.

Run from backend/:   .\\venv\\Scripts\\python tests\\test_rag.py
Uses a throwaway SQLite DB and a stubbed LLM, so it needs no API key (the embedding model must be downloadable/cached).
"""
import os
import sys
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(tempfile.mkdtemp(), 'test_rag.db')}"
os.environ["LLM_PROVIDER"] = "mock"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.models.entities import FollowUp, Lead  # noqa: E402
from app.rag.engine import DocumentChunker, ungrounded_numbers  # noqa: E402
import app.agents.rag_agent as rag_agent  # noqa: E402
from app.agents.rag_agent import KnowledgeRAGAgent, CHECK_BACK  # noqa: E402


def test_chunker():
    words = [f"w{i}" for i in range(700)]
    chunks = DocumentChunker.chunk_text(" ".join(words))
    assert [len(c.split()) for c in chunks] == [300, 300, 200]
    assert chunks[1].split()[0] == "w250"  # 50-word overlap


def test_grounding_check():
    src = "Classic Crew Tee: 180 GSM, MRP ₹549, 50+ ₹467. Express production 5-7 business days, 12% surcharge. DTF ₹90.50."
    assert ungrounded_numbers("180 GSM tee at ₹467 from 50 pieces, express in 5-7 days for 12%, DTF 90.5", src) == set()
    assert ungrounded_numbers("We give a 15% discount within 3 days", src) == {"15", "3"}
    assert ungrounded_numbers("An order of 1,050 pieces", "1050 to 1,220 pieces") == set()


def test_retrieval():
    db = SessionLocal()
    hit = KnowledgeRAGAgent.retrieve("What is the bulk price for 250 hoodies?", db)
    miss = KnowledgeRAGAgent.retrieve("Do you sell gaming laptops with RTX graphics cards?", db)
    db.close()
    print("price question top:", hit["hits"][0]["document_title"], hit["hits"][0]["score"])
    print("off-topic top score:", miss["top_score"])
    assert hit["chunks"] and "₹1,151" in hit["chunks"][0]["content"]
    assert not miss["chunks"], "off-topic question must not pass the threshold"


def test_grounding_failure_creates_followup():
    calls = []

    def fake_chat(system, messages, json_mode=False):
        calls.append(1)
        return "Sure, we can offer a 33% discount if you pay within 19 hours."  # numbers not in any source

    rag_agent.chat, rag_agent.provider_label = fake_chat, lambda: "stub/llm"
    db = SessionLocal()
    lead = db.query(Lead).first()
    before = db.query(FollowUp).filter(FollowUp.lead_id == lead.id).count()
    res = KnowledgeRAGAgent.answer_question("What is the bulk price for 250 hoodies?", db, lead=lead)
    db.commit()
    after = db.query(FollowUp).filter(FollowUp.lead_id == lead.id).count()
    db.close()
    assert len(calls) == 2, "must regenerate exactly once"
    assert res["grounding_failed"] and res["answer"] == CHECK_BACK
    assert after == before + 1


def test_two_misses_trigger_handoff():
    client = TestClient(app)
    lead = client.post("/api/leads", json={"name": "Miss Tester"}).json()
    replies = [client.post("/api/chat/message", json={"lead_id": lead["id"], "content": q}).json()
               for q in ["Do you sell gaming laptops with RTX cards?", "What about mechanical keyboards for esports?"]]
    for r in replies:
        print(f"  {r['detected_intent']:<10} handoff={r['human_handoff_triggered']}  {r['ai_message']['content']}")
    assert not replies[0]["human_handoff_triggered"]
    assert replies[1]["human_handoff_triggered"]


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    for t in [test_chunker, test_grounding_check, test_retrieval, test_grounding_failure_creates_followup,
              test_two_misses_trigger_handoff]:
        t()
        print(f"PASS {t.__name__}")
