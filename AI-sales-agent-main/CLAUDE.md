# CLAUDE.md — Nova / AI Sales Agent

## 1. What this is

Nova / AI Sales Agent is an AI that does a junior salesperson's job for a small retail or e-commerce business: it takes in leads, scores and qualifies them (BANT), talks to them by chat and voice, answers product questions from the company's own documents (RAG), handles objections, books meetings, updates the CRM, and hands difficult conversations to a human.
It is a FastAPI + SQLite backend with a React 19 + Vite frontend, built as a multi-agent system where each agent owns one step of the sales job.

## 2. Problem-statement domain

**Retail & E-Commerce, for startups and SMEs.**

**Demo company: Celestial Wear**, a fictional D2C apparel brand (Bengaluru). It sells online and takes bulk/wholesale orders (boutiques, resellers, corporate gifting, college fests). The seed lives in `services/seed_data.py`: 4 knowledge docs (catalogue, bulk price list with 50/100/250/500+ slabs, shipping and returns, customisation FAQ), 12 leads, 5 conversations, objections, 3 meetings and follow-ups. `POST /api/demo/reset` (the "Reset demo data" button) reloads it. Every price an agent template quotes must match these docs. `COMPANY_PROFILE` in `core/config.py` feeds the LLM prompts.

## 3. The 10 agents

Exactly 10 agents (canonical list: `AGENTS` in `backend/app/services/activity.py`). Scoring and BANT are one agent, **Lead Qualification** (`qualification_agent.py`). The Orchestrator routes and is not counted.

| # | Agent | File(s) | What it does |
|---|---|---|---|
| 1 | **Research** | `lead_research_agent.py` | Builds a buyer persona, pain points, motivations and buying intent from the lead's fields. |
| 2 | **Lead Qualification** (scoring + BANT) | `qualification_agent.py` | 0–100 score with factor breakdown (`final = round(0.7 × base) + BANT bonus`) and BANT: lead-form checklist at intake, LLM re-read of the conversation after each message. |
| 3 | **Communication** | `communication_agent.py` | Drafts personalised email, WhatsApp and chat outreach for a lead. |
| 4 | **Knowledge (RAG)** | `rag_agent.py`, `rag/engine.py` | Chunks uploaded docs, embeds them, retrieves the top chunks for a question and answers only from them. Below the confidence threshold it says it doesn't know and flags for a human. |
| 5 | **Objection** | `objection_agent.py` | Detects price, timing, competitor, authority, trust and not-interested objections and answers with a named technique. Each one is recorded in `ObjectionRecord`. |
| 6 | **Voice** | `voice_agent.py`, `api/voice.py` | Handles a call session turn by turn (intent, sentiment, spoken reply), then writes a post-call summary and action items to the CRM. |
| 7 | **Scheduling** | `scheduling_agent.py`, `api/meetings.py` | Proposes meeting slots and books meetings in the local DB. |
| 8 | **Follow-up** | `followup_agent.py`, `api/followups.py` | Builds a Day 0/2/5/10 cadence for each lead and pauses it when the lead replies. |
| 9 | **CRM** | `crm_agent.py`, `api/crm.py` | Moves leads through pipeline stages, sets the Next Best Action and writes audit logs (`AgentActivityLog`). |
| 10 | **Analytics** | `analytics_agent.py`, `api/analytics.py` | Pulls together KPIs, the funnel, score distribution and "AI Sales Insights" for the dashboard. |

**Orchestrator** (`agents/orchestrator.py`) routes the work.
- **New lead:** `run_lead_intake_pipeline` runs Research → BANT → Scoring → CRM. BANT runs first because it is a score factor; the lead stays at `New` until it replies.
- **Chat message:** `handle_customer_message` runs sentiment → human-handoff check → objection → scheduling → RAG → default reply.

The human handoff lives inside the orchestrator. It fires on phrases like "talk to human" and sets `conversation.human_takeover`.

## 4. Running it on Windows

Prereqs: Python 3.11 or 3.12 and Node 18+ (the project was tested with Node 22). Commands are for PowerShell, run from `NOVA\AI-sales-agent-main`.

### Backend (terminal 1)
```powershell
cd backend
python -m venv venv                  # first time only
.\venv\Scripts\Activate.ps1          # if blocked: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
pip install -r requirements.txt      # first time only
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API: http://127.0.0.1:8000. Swagger docs: http://127.0.0.1:8000/docs. Health check: `/health`.
- `sales_workforce.db` (SQLite) is created and seeded automatically on the first start, in `backend/`.
- Optional config: copy `.env.example` to `backend\.env`. `pydantic-settings` reads `.env` from the current directory, which is `backend/`.
- Don't reuse a `venv` copied from another machine. Its `pyvenv.cfg` points at that machine's Python, so make a fresh one.
- The first install pulls in PyTorch (CPU) for `sentence-transformers`, which is several hundred MB. The first start downloads the embedding model (~90 MB) and then caches it.
- LLM: set `LLM_PROVIDER` and `GROQ_API_KEY` (or `OPENAI_API_KEY`, or use local `ollama`) in `backend\.env`. With no key, every agent falls back to its rule-based template, and the message is stored with `provider="rules"`.
- Tests (from `backend/`): `.\venv\Scripts\python tests\test_rag.py` (offline, stubbed LLM) and `.\venv\Scripts\python tests\test_llm_flow.py` (uses whatever provider `.env` configures).
- After changing `EMBEDDING_MODEL` or `VECTOR_STORE`, run `.\venv\Scripts\python scripts\reindex.py`. Chunks with stale-size vectors are also re-embedded automatically at startup.

### Frontend (terminal 2)
```powershell
cd frontend
npm install                          # first time only
npm run dev
```
- App: http://localhost:5173. Vite proxies `/api` to `http://127.0.0.1:8000`, so the backend must be running.
- Before you call a change done, check that both of these pass: `npm run build` (type-check + build) and `npm run lint` (oxlint).

### Repo layout
- The git repo root is `NOVA\` (remote `siddeshh/AI-sales-agent`). It contains:
  - `AI-sales-agent-main\`, the app. **This folder is the source of truth.**
  - `AI Sales Agent\`, an old duplicate copy that isn't maintained.
  - A separate Vite prototype at the root that uses only mock data (`src/mockData.ts`).

## 5. Current state

### Calls a real model (when a provider is configured)
Every call goes through `app/services/llm.py` → `chat(system, messages, json_mode)`. The providers are Groq (default), OpenAI and Ollama, all through their OpenAI-compatible APIs. Each call has a 20 s timeout and one retry. If it still fails, the caller falls back to its old rule, and the path taken is logged under `nova.llm`.

| Area | How it works |
|---|---|
| Intent / sentiment / objection | One JSON call in `orchestrator.classify`, validated with Pydantic (`IntentResult`). Falls back to the keyword rules. `Message.confidence` is the model's own number; it's `None` for rule turns. |
| Replies | Communication, Objection, Scheduling and Knowledge replies are LLM-generated, using company profile + lead profile + last 8 messages + stage + retrieved chunks. Max 3 sentences, with no facts that aren't in the chunks. `Message.provider` records `groq/<model>` or `rules`. |
| BANT | Re-extracted after every customer message as absent/partial/confirmed, each with a quote from the customer or lead profile. Stored in `Lead.bant_json`; the booleans mean "confirmed". |
| RAG | Retrieval uses `all-MiniLM-L6-v2` (384-dim): top 4 chunks by cosine similarity, threshold `RAG_SIMILARITY_THRESHOLD` (0.35). Vectors are JSON in SQLite, or in Qdrant when `VECTOR_STORE=qdrant`. The answer is generated from those chunks only. A **grounding check** makes sure every number in the answer appears in the chunks or in the question. If not, the answer is regenerated once; if it fails again, the reply becomes "I'll check and get back" and a `FollowUp` task is created. If no chunk passes the threshold twice in a row for the same lead (`Lead.rag_miss_streak`), the conversation goes to a human. |

Known limits:
- Small local models (e.g. qwen2.5:3b) can invent policies such as "no bulk sales". The grounding check only catches **numbers**.
- On CPU, Ollama often goes over the 20 s timeout and falls back.
- With MiniLM, short questions score low (e.g. "Is there a swimming pool?" scores 0.20), so at 0.35 they get "I'll check". The right chunk does rank first.

### Still rule-based or template
| Area | How it actually works |
|---|---|
| Research | Persona chosen by `Lead.buyer_type` (wholesale / corporate / individual) plus the lead's own form fields. No external lookup. |
| Scoring | `final = round(0.7 × base) + BANT bonus`. Base = five profile factors (order value / quantity fit 25, timeline 20, buyer type 15, engagement 15, source 10; max 85) scaled to 0–100. BANT bonus = min(30, round(30 × (confirmed/4)^1.5 + 1.5 × partial)), using conversation BANT (`Lead.bant_json`) when present; lead-form BANT only counts as partial. Stored in `Lead.score_breakdown_json` and shown on the lead page. Hot (81+) needs ≥3 confirmed BANT slots. Not a trained model: the Random Forest lives offline in `ml/lead_scoring/` (shown on Analytics). |
| BANT at lead intake | Keyword and threshold checks (`evaluate_bant`). The LLM version above takes over once the lead sends messages. |
| Handoff reply, follow-up cadence texts, `/leads/{id}/outreach` drafts | Fixed templates. |
| Document upload | Plain-text decode only. Files with no readable text are rejected with a 400; PDF/DOCX extraction isn't built yet. |
| Voice | **Text-to-speech is real**: it uses the browser's `speechSynthesis`. **There is no speech-to-text** and no telephony; the voice agent uses keyword intents. It introduces itself as Celestial Wear's AI assistant and says it is an AI. Duration is real elapsed time, and the summary lists what the customer said. |
| Scheduling | Slots at 11:00, 14:00 and 16:00, Mon–Sat. Types: `product_demo` (demo / sample review call, Google Meet) and `showroom_visit` (Indiranagar studio). Nothing checks a real calendar. |
| Follow-up | Email follow-ups are **really sent over SMTP** (`services/email.py`); "sent" only if the server accepted it, else "not_sent" with the error. `EMAIL_TEST_MODE=true` (default) redirects every email to `EMAIL_TEST_RECIPIENT` with "[to: lead@x]" in the subject. WhatsApp follow-ups are marked "simulated". Follow-ups do not pause when a lead replies. |
| CRM | The local SQLite tables are the CRM. There's no external CRM sync. |
| Auth | `/auth/login` accepts **any username with no password check** and auto-creates the user. `/auth/me` returns a hardcoded user. |

### Still simulated (each is labelled "Demo mode — simulated" in the UI)
- Salesforce, HubSpot, Zoho, WhatsApp, Google Calendar; phone calls and speech-to-text.
- Seeded leads, conversations and documents are sample data (navbar badge "Demo mode · Celestial Wear").
- `GET /api/integrations` is the single source for which integrations are real; Settings shows it read-only.

### Honesty rules now enforced in code
- Every activity-log row comes from `agent_run()` (`services/activity.py`) with `duration_ms` measured by `perf_counter`. Don't write `AgentActivityLog` directly.
- Dashboard / Analytics numbers come from `/api/analytics/dashboard`, each with a formula (`formulas`). Meeting rate = distinct leads with ≥1 meeting ÷ total leads; Win rate = won ÷ total. There is no "conversion rate". The funnel covers every stage and sums to total leads (asserted).
- No numeric fallbacks in the frontend: show 0 or a loading state, never a made-up value.

### Genuinely working
- CRUD for leads, meetings, follow-ups and knowledge docs, all stored in SQLite.
- Pipeline stage moves.
- The activity log.
- Funnel counts and score distribution, computed from real DB rows.
- Upload, chunking (300 words / 50 overlap), embedding and semantic retrieval for `.txt`/`.md`. The Knowledge page has a "Test a question" box that shows the answer, provider and matched chunks with scores.
- The orchestrator routing.
- Browser TTS.
- Demo reset (`/demo/reset`). This drops and reseeds every table.

## 6. Rules for every future change

1. **Never show a fake integration or a fake number in the UI.** Every number on screen comes from real data or a real computation. If a feature isn't connected (for example WhatsApp, email, calendar, STT or an LLM), the UI says so. It never shows a success message.
2. **Anything simulated must be labelled "Demo mode"** in the UI, next to the simulated thing: a seeded lead, a template reply, a simulated call duration, a rule-based score presented as AI. When a feature becomes real, remove its label.
3. **Keep the app runnable after every change.** The backend must start with `uvicorn`, the frontend must pass `npm run build`, and the app must load at `localhost:5173`. If you add a dependency, put it in `requirements.txt` or `package.json` in the same change. Real model calls must fall back cleanly, clearly labelled as Demo mode, when no API key is set.
4. **Don't delete working features without saying so.** If you remove or replace something that works, say so explicitly in the summary or commit message and explain why.
5. Secrets go in `backend/.env`, which is gitignored. Never commit keys and never hardcode them.
