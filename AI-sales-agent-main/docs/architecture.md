# Architecture

Nova is a FastAPI backend (SQLite) with a React frontend. Ten agents do the sales work; an **Orchestrator** routes between them. See `docs/agents.md` for what each agent does.

## 1. Flow

```
New lead (form / API)
  └─ Research Agent ─► Lead Qualification Agent (BANT checklist, then score) ─► CRM Agent (stage "New")
                                   no message is sent automatically

Customer message (chat)
  └─ Orchestrator: classify intent / sentiment / objection (LLM, keyword rules without a key)
       ├─ Lead Qualification Agent: update BANT from the conversation (LLM only)
       ├─ human_request ─────────────► human handoff
       ├─ objection / not_now / opt_out ► Objection Agent (+ knowledge chunks)
       ├─ ready_to_buy ──────────────► Scheduling Agent (proposes slots)
       ├─ question ──────────────────► Knowledge Agent (retrieve → answer from sources → number check)
       │                                 2 questions in a row with no matching chunk ► human handoff
       └─ greeting / other ──────────► Communication Agent
  └─ Lead Qualification Agent re-scores the lead

Follow-ups page ► Follow-up Agent: email = real SMTP send, WhatsApp = simulated (demo mode)
Dashboard / Analytics ► Analytics Agent (computed from the database)
```

## 2. Human handoff (what is implemented)

The Orchestrator hands a conversation to a human (`conversation.human_takeover = True`) when:
1. The customer asks for a human (LLM intent `human_request`, or phrases like "talk to human", "manager").
2. The Knowledge Agent finds no chunk above the similarity threshold (`RAG_SIMILARITY_THRESHOLD`, default 0.35) for two questions in a row from the same lead.

Not implemented: handoff on negative sentiment or on deal size.

## 3. What is real and what is simulated

| Real | Simulated (labelled "Demo mode — simulated" in the UI) |
|---|---|
| Internal CRM (this app's database) | Salesforce, HubSpot, Zoho |
| Email via SMTP (test mode by default) | WhatsApp |
| LLM calls when a key is set (Groq / OpenAI / Ollama) | Google Calendar (no invites, no video links) |
| MiniLM embeddings and retrieval | Phone calls |
| Browser speech recognition and text-to-speech (Web Speech API) | |

## 4. Activity log

`app/services/activity.py: agent_run()` wraps every agent run, measures it with `time.perf_counter()` and writes one `agent_activity_logs` row with `duration_ms`. Nothing else writes to that table.
