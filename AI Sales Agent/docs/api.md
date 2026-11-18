# REST API Reference

The backend provides a modular RESTful API built on **FastAPI**. Interactive Swagger UI is available at `/docs`.

---

## 1. Leads (`/api/leads`)
- `GET /api/leads`: List leads with optional filters (`stage`, `score_category`, `search`).
- `POST /api/leads`: Create a new lead; optionally triggers AI intake pipeline automatically (`auto_run_ai=true`).
- `GET /api/leads/{id}`: Detailed 360° lead dossier with score factors and conversations.
- `PUT /api/leads/{id}`: Update lead properties.
- `DELETE /api/leads/{id}`: Delete lead and cascading records.
- `POST /api/leads/{id}/research`: Manually trigger Lead Research Agent.
- `POST /api/leads/{id}/score`: Re-calculate explainable score and factor impacts.
- `POST /api/leads/{id}/qualify`: Evaluate BANT matrix criteria.
- `POST /api/leads/{id}/outreach`: Generate WhatsApp or Email pitch.

## 2. AI Conversations (`/api/chat`)
- `GET /api/chat/conversation/{lead_id}`: Fetch active conversation and message history.
- `POST /api/chat/message`: Send customer or human rep message. Dispatches orchestrator, runs intent/sentiment/objection detection, queries RAG, returns AI reply.
- `POST /api/chat/handoff-toggle/{conversation_id}`: Toggle human takeover mode.

## 3. Voice Telephony (`/api/voice`)
- `POST /api/voice/initiate`: Initiate outbound telephony session.
- `POST /api/voice/turn`: Process spoken transcript, reason conversational turn, synthesize speech output.
- `POST /api/voice/end/{call_id}`: Conclude call, compile AI summary, and update CRM lead stage.

## 4. Knowledge Base RAG (`/api/knowledge`)
- `GET /api/knowledge`: List uploaded documents and indexed chunk totals.
- `POST /api/knowledge/upload`: Upload PDF/TXT/MD, extract text, split into sliding window chunks, and compute normalized dense embeddings.
- `GET /api/knowledge/documents/{id}/chunks`: Inspect chunks and metadata.
- `POST /api/knowledge/query`: Interactive semantic RAG query with grounded citation verification.

## 5. Meetings (`/api/meetings`)
- `GET /api/meetings/slots`: Fetch upcoming slots within enterprise operating hours.
- `GET /api/meetings`: List booked meetings and site visits.
- `POST /api/meetings`: Schedule appointment and auto-advance pipeline stage.

## 6. Follow-up Cadence (`/api/followups`)
- `GET /api/followups`: List pending, completed, or overdue follow-ups.
- `POST /api/followups/execute/{id}`: Execute scheduled touchpoint.

## 7. CRM Pipeline (`/api/crm`)
- `GET /api/crm/pipeline`: Kanban board state with deal value rollups across 9 stages.
- `POST /api/crm/move-stage`: Move lead to new stage with audit tracking.

## 8. Analytics & Workforce (`/api/analytics`, `/api/agents`)
- `GET /api/analytics/dashboard`: Top-level KPIs, funnel stages, score distribution, and AI Sales Insights.
- `GET /api/agents/status`: Operational health and invocation metrics for all 11 agents.
- `GET /api/agents/activities`: Real-time auditable agent activity stream.
