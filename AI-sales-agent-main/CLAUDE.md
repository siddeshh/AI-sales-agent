# CLAUDE.md — Nova / AI Sales Agent

## 1. What this is

Nova / AI Sales Agent is an AI that does a junior salesperson's job for a small retail or e-commerce business: it takes in leads, scores and qualifies them (BANT), talks to them by chat and voice, answers product questions from the company's own documents (RAG), handles objections, books meetings, updates the CRM, and hands difficult conversations to a human.
It is a FastAPI + SQLite backend with a React 19 + Vite frontend, built as a multi-agent system where each agent owns one step of the sales job.

## 2. Problem-statement domain

**Retail & E-Commerce, for startups and SMEs.**

> Heads-up: the current code, seed data and copy are written for **real estate** (a fictional "Skyline Greens" township in Pune: BHK flats, RERA numbers, site visits, ₹ lakh budgets). Moving it to retail/e-commerce (products, SKUs, carts, order value, demos/calls instead of site visits) is upcoming work. Don't assume the domain logic already fits retail.

## 3. The 10 agents

The code in `backend/app/agents/` has 11 files because scoring and BANT are separate. For this project they count as one agent: **Lead Qualification**.

| # | Agent | File(s) | What it does |
|---|---|---|---|
| 1 | **Research** | `lead_research_agent.py` | Builds a buyer persona, pain points, motivations and buying intent from the lead's fields. |
| 2 | **Lead Qualification** (scoring + BANT) | `lead_scoring_agent.py`, `qualification_agent.py` | Gives a 0–100 score with a factor-by-factor breakdown, a category (Cold/Warm/Qualified/Hot) and a conversion probability, then checks Budget/Authority/Need/Timeline and returns Qualified / Partially Qualified / Unqualified. |
| 3 | **Communication** | `communication_agent.py` | Drafts personalised email, WhatsApp and chat outreach for a lead. |
| 4 | **Knowledge (RAG)** | `rag_agent.py`, `rag/engine.py` | Chunks uploaded docs, embeds them, retrieves the top chunks for a question and answers only from them. Below the confidence threshold it says it doesn't know and flags for a human. |
| 5 | **Objection** | `objection_agent.py` | Detects price, timing, competitor, authority, trust and not-interested objections and answers with a named technique. Each one is recorded in `ObjectionRecord`. |
| 6 | **Voice** | `voice_agent.py`, `api/voice.py` | Handles a call session turn by turn (intent, sentiment, spoken reply), then writes a post-call summary and action items to the CRM. |
| 7 | **Scheduling** | `scheduling_agent.py`, `api/meetings.py` | Proposes meeting slots and books meetings in the local DB. |
| 8 | **Follow-up** | `followup_agent.py`, `api/followups.py` | Builds a Day 0/2/5/10 cadence for each lead and pauses it when the lead replies. |
| 9 | **CRM** | `crm_agent.py`, `api/crm.py` | Moves leads through pipeline stages, sets the Next Best Action and writes audit logs (`AgentActivityLog`). |
| 10 | **Analytics** | `analytics_agent.py`, `api/analytics.py` | Pulls together KPIs, the funnel, score distribution and "AI Sales Insights" for the dashboard. |

**Orchestrator** (`agents/orchestrator.py`) routes the work.
- **New lead:** `run_lead_intake_pipeline` runs Research → Scoring → BANT → CRM.
- **Chat message:** `handle_customer_message` runs sentiment → human-handoff check → objection → scheduling → RAG → default reply.

The human handoff lives inside the orchestrator. It fires on phrases like "talk to human" and sets `conversation.human_takeover`.

## 4. Running it on Windows

Prereqs: Python 3.11 and Node 18+ (the project was tested with Node 22). Commands are for PowerShell, run from the repo root (`AI-sales-agent-main`).

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

### Frontend (terminal 2)
```powershell
cd frontend
npm install                          # first time only
npm run dev
```
- App: http://localhost:5173. Vite proxies `/api` to `http://127.0.0.1:8000`, so the backend must be running.
- Before you call a change done, check that both of these pass: `npm run build` (type-check + build) and `npm run lint` (oxlint).

### Other things in `Desktop\Webdev\NOVA`
- The parent folder `NOVA\` holds a separate Vite prototype that uses only mock data (`src/mockData.ts`).
- `NOVA\AI Sales Agent\` is a duplicate of this repo with a foreign venv, `dist/` and a DB.

This repo (`AI-sales-agent-main`) is the source of truth.

## 5. Current state

**No part of the app calls a real AI model today.** No LLM SDK is installed (see `requirements.txt`). `LLM_PROVIDER`, `DEMO_MODE`, `OPENAI_API_KEY` and the other keys are declared in `core/config.py`, but no code reads them.

### Rule-based or template today (everything)
| Area | How it actually works |
|---|---|
| Research | `if/elif` on the budget string, then fixed persona text. |
| Scoring | Hand-tuned point table: base 40, then plus or minus points for budget, timeline, requirement words, engagement and source. "Conversion probability" is just `score × 0.94`. It is not a trained model. |
| BANT | Keyword and threshold checks. Authority is `True` unless the job title contains "student" or "intern". |
| Communication | f-string templates with hardcoded Skyline Greens copy. |
| Objection | Regex keyword lists → a fixed reply per category. |
| Sentiment / intent | Keyword lists in `orchestrator.py` and `voice_agent.py`. |
| RAG retrieval | A homemade 128-dim "embedding" that hashes words and bigrams into buckets, plus cosine similarity and a keyword-overlap boost. No real embedding model, no Qdrant (`QDRANT_URL` is unused). Python's `hash()` is salted per process, so embeddings stored at seed time don't match query embeddings after a restart. In practice the keyword boost does most of the ranking. |
| RAG answer | Returns the top chunk wrapped in a canned sentence picked by keyword ("price", "amenit", "rera"…). It is not generated. |
| Document upload | Decodes the file bytes as UTF-8. PDF and DOCX text is not extracted, so binary files turn into garbage chunks. |
| Voice | **Text-to-speech is real**: it uses the browser's `speechSynthesis`. **There is no speech-to-text**: the user clicks preset prompts or types. There's no telephony either. Each turn adds a fake +18 s to the call duration, an empty call gets a default 74 s, and the post-call summary is a fixed paragraph. Every call adds +15 to the lead score. |
| Scheduling | Generates slots for 11:00, 14:00 and 16:00 on the next N days. Nothing checks a calendar, and booking only writes to the DB. The "confirmation pass dispatched" text is false. |
| Follow-up | "Execute" sets the row to `completed` and writes a log entry. **Nothing is sent**: no WhatsApp or email integration exists. |
| CRM | The local SQLite tables are the CRM. There's no external CRM sync. |
| Auth | `/auth/login` accepts **any username with no password check** and auto-creates the user. `/auth/me` returns a hardcoded user. |
| Industry switch | `/demo/switch-industry` changes `settings.DEFAULT_INDUSTRY` in memory only. The agents don't use it. |

### Fake numbers and fake integrations currently shown in the UI (fix these)
- `api/agents.py`: `invocations_count` per agent (48, 64, …), every agent "Active", and "All Systems Operational". All hardcoded.
- `AgentsWorkforceView.tsx`: "SLA: 99.9%".
- `DashboardView.tsx`: "+14.2% vs last month" and "67% BANT verified".
- `AnalyticsView.tsx`: objection breakdown 68/18/14% and "79% / 84% / 72% resolved".
- `analytics_agent.py`: insight cards claim "68% of Inquiries", "resolved 79%", "84%", "3.4x" and "2.1x". There are fallbacks too: pipeline value `42000000` and conversion rate `24.5` are shown when the real value is 0.
- `SettingsView.tsx`: the LLM provider dropdown, API key field and "Saved successfully" message only change local React state. Nothing reaches the backend.
- `services/api.ts`: the request header is misspelled `'Content-Trans-Type'` (it should be `Content-Type`).

### Genuinely working
- CRUD for leads, meetings, follow-ups and knowledge docs, all stored in SQLite.
- Pipeline stage moves.
- The activity log.
- Funnel counts and score distribution, computed from real DB rows.
- Chunking of uploaded `.txt` files.
- The orchestrator routing.
- Browser TTS.
- Demo reset (`/demo/reset`). This drops and reseeds every table.

## 6. Rules for every future change

1. **Never show a fake integration or a fake number in the UI.** Every number on screen comes from real data or a real computation. If a feature isn't connected (for example WhatsApp, email, calendar, STT or an LLM), the UI says so. It never shows a success message.
2. **Anything simulated must be labelled "Demo mode"** in the UI, next to the simulated thing: a seeded lead, a template reply, a simulated call duration, a rule-based score presented as AI. When a feature becomes real, remove its label.
3. **Keep the app runnable after every change.** The backend must start with `uvicorn`, the frontend must pass `npm run build`, and the app must load at `localhost:5173`. If you add a dependency, put it in `requirements.txt` or `package.json` in the same change. Real model calls must fall back cleanly, clearly labelled as Demo mode, when no API key is set.
4. **Don't delete working features without saying so.** If you remove or replace something that works, say so explicitly in the summary or commit message and explain why.
5. Secrets go in `backend/.env`, which is gitignored. Never commit keys and never hardcode them.
