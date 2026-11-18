"""Agent activity log: one row per real agent run, with the measured duration.

    with agent_run(db, "Knowledge Agent", "rag_search", lead) as run:
        res = KnowledgeRAGAgent.answer_question(...)      # the real work, inside the timer
        run["description"] = f"... {res['confidence']:.2f}"

duration_ms is time.perf_counter() around the block, so it includes LLM / SMTP / embedding calls made inside it.
"""
import time
from contextlib import contextmanager

from app.models.entities import AgentActivityLog

# The 10 agents (README order). The Orchestrator routes between them and is not counted as an agent.
AGENTS = ["Research Agent", "Lead Qualification Agent", "Communication Agent", "Knowledge Agent", "Objection Agent",
          "Voice Agent", "Scheduling Agent", "Follow-up Agent", "CRM Agent", "Analytics Agent"]
ORCHESTRATOR = "Orchestrator"


@contextmanager
def agent_run(db, agent_name: str, action_type: str, lead=None):
    assert agent_name in AGENTS or agent_name == ORCHESTRATOR, f"unknown agent {agent_name!r}"
    run = {"description": action_type, "status": "success", "details": None}
    t0 = time.perf_counter()
    try:
        yield run
    except Exception as e:
        run["status"], run["description"] = "error", f"{action_type} failed: {e}"
        raise
    finally:
        db.add(AgentActivityLog(
            agent_name=agent_name, action_type=action_type,
            lead_id=getattr(lead, "id", None), lead_name=getattr(lead, "name", None),
            description=run["description"], details=run["details"], status=run["status"],
            duration_ms=round((time.perf_counter() - t0) * 1000, 1)))
