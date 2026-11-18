# Nova — AI Sales Agent for Retail & E-Commerce SMEs

Nova is an AI that does a junior salesperson's job for a small retail or e-commerce business. It takes in leads, scores and qualifies them (BANT), and talks to them by chat and voice. It answers product questions from the company's own documents (RAG), handles objections, books meetings, updates the CRM, and hands difficult conversations to a human.

**Demo company:** *Celestial Wear*, a fictional D2C apparel brand from Bengaluru. It sells online and takes bulk/wholesale orders from boutiques, resellers, corporate gifting buyers and college fests. All leads and documents in the demo are seeded sample data, and the UI labels them **Demo mode**.

---

## The 10 agents

| # | Agent | What it does |
|---|---|---|
| 1 | **Research** | Builds a buyer profile (wholesale / corporate / individual) from the lead form. |
| 2 | **Lead Qualification** | Explainable 0–100 score from six factors: order value / quantity fit, timeline urgency, buyer type, engagement, source quality and BANT evidence. Also runs the BANT check (Budget, Authority, Need, Timeline), re-read from the conversation by the LLM after every message. |
| 3 | **Communication** | Writes chat, WhatsApp and email replies and drafts. |
| 4 | **Knowledge (RAG)** | Searches the catalogue, bulk price list, shipping/returns policy and customisation FAQ (MiniLM embeddings). Answers only from the retrieved text, and a number check blocks invented prices or dates. |
| 5 | **Objection** | Price → volume-slab pricing and value; minimum order → smaller trial order; delivery time → express production; competitor → quality, customisation and returns policy. |
| 6 | **Voice** | Browser voice session that introduces itself as Celestial Wear's AI assistant. Uses browser text-to-speech; there is no speech-to-text or telephony yet. |
| 7 | **Scheduling** | Proposes slots in showroom hours and books product demo / sample review calls or showroom visits. No external calendar yet. |
| 8 | **Follow-up** | Day 0 / 2 / 5 / 10 cadence (catalogue, customisation, sample call offer, final check-in). Messages are drafted, not sent. |
| 9 | **CRM** | Moves leads through pipeline stages, sets the next best action and logs every agent action. |
| 10 | **Analytics** | Funnel, score tiers, objection breakdown and insights, all computed from the database. |

The orchestrator classifies each customer message (intent, sentiment, objection type) and routes it to the right agent. It hands the conversation to a human when the customer asks for one, or when the knowledge base can't answer two questions in a row.

## Demo walkthrough

1. **Leads:** 12 seeded leads, e.g. *Sneha Kulkarni* (HR Manager, 250 embroidered hoodies for an offsite) and *Arjun Mehta* (Instagram reseller, 500 oversized tees). Open one to see its score factors.
2. **Conversations:** ask "What is the price for 200 oversized tees?" and the Knowledge agent answers from the bulk price list with its sources.
3. Say "That's too expensive" and the Objection agent answers with slab pricing. Say "I only need 30 pieces" and it offers the trial order.
4. Say "Can we do a sample review call on Friday?" and the Scheduling agent proposes open slots.
5. Say "I want to talk to a manager" and the conversation is handed to a human.
6. **Knowledge Base → Test a question:** see the matched chunks and their similarity scores.
7. **Reset demo data** (navbar or Settings) reloads the seed.

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, lucide-react |
| Backend | Python 3.11/3.12, FastAPI, Pydantic v2, SQLAlchemy, SQLite |
| LLM | Groq (default), OpenAI or Ollama via `app/services/llm.py`; rule-based fallback when no key is set |
| RAG | sentence-transformers `all-MiniLM-L6-v2`, cosine similarity; vectors in SQLite or optional Qdrant |

## Quick start (Windows, PowerShell)

Backend (from the repo folder):
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Frontend (second terminal):
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. API docs: http://127.0.0.1:8000/docs.

To use a real model, copy `.env.example` to `backend\.env` and set `GROQ_API_KEY`. Without a key the agents use their rule-based templates, and each message records `provider="rules"`.

Tests (from `backend/`): `.\venv\Scripts\python tests\test_rag.py` and `.\venv\Scripts\python tests\test_llm_flow.py`.

## Repository structure

```
backend/
  app/
    agents/      research, scoring, qualification, communication, rag, objection,
                 voice, scheduling, follow-up, crm, analytics agents + orchestrator
    api/         REST endpoints (leads, chat, voice, knowledge, meetings, follow-ups, crm, analytics, demo)
    core/        config, database
    models/      SQLAlchemy entities
    rag/         embeddings, chunking, vector store, grounding check
    services/    llm.py (model calls), seed_data.py (Celestial Wear demo)
  scripts/       reindex.py
  tests/         test_rag.py, test_llm_flow.py
frontend/src/    views, components, services/api.ts, types
docs/            architecture, agents, api, database, setup
CLAUDE.md        project rules and current state (read this first)
```

## License & academic use
Built for final-year engineering / PBL evaluation and demonstrations.
