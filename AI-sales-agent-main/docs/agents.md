# The 10 agents

Nova has exactly 10 agents. The **Orchestrator** (`app/agents/orchestrator.py`) routes work between them and is not counted as an agent. The canonical list lives in `app/services/activity.py` (`AGENTS`).

| # | Agent | Module | What it actually does |
|---|---|---|---|
| 1 | **Research Agent** | `lead_research_agent.py` | Buyer profile (wholesale / corporate / individual) from the lead form only. No external lookup. |
| 2 | **Lead Qualification Agent** | `qualification_agent.py` | Score `round(0.7 × profile base) + BANT bonus` with factor breakdown, and BANT: a lead-form checklist at intake, re-read from the conversation by the LLM after each message. |
| 3 | **Communication Agent** | `communication_agent.py` | Chat replies (LLM, or template without a key) and email / WhatsApp drafts. Drafts are not sent. |
| 4 | **Knowledge Agent** | `rag_agent.py` | Retrieves knowledge chunks (MiniLM embeddings, cosine, top 4, threshold 0.35) and answers only from them. Numbers in the answer must appear in the sources; otherwise it regenerates once, then says it will check and creates a follow-up task. |
| 5 | **Objection Agent** | `objection_agent.py` | Price → volume slabs; minimum order → trial order; delivery → express production; competitor → quality, customisation, returns. |
| 6 | **Voice Agent** | `voice_agent.py` | Browser voice session with keyword intents and browser text-to-speech. No phone calls, no speech-to-text. |
| 7 | **Scheduling Agent** | `scheduling_agent.py` | Proposes slots in showroom hours and books meetings in the app's database. No external calendar (Google Calendar is demo mode). |
| 8 | **Follow-up Agent** | `followup_agent.py` | Day 0/2/5/10 tasks. Email follow-ups are really sent over SMTP; WhatsApp follow-ups are simulated. Follow-ups do not pause automatically when a lead replies. |
| 9 | **CRM Agent** | `crm_agent.py` | Stage and next-action updates in the internal CRM (this app's database). No Salesforce / HubSpot / Zoho. |
| 10 | **Analytics Agent** | `analytics_agent.py` | Meeting rate, win rate, pipeline by stage, score tiers and objection breakdown, all computed from the database. |

Every run of an agent writes one row to `agent_activity_logs` with `duration_ms` measured by `time.perf_counter()` around the real work (`app/services/activity.py: agent_run`).
