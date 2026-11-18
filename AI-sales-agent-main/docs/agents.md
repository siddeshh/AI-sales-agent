# Roster of the 11 Specialized AI Sales Agents

The workforce divides sales lifecycle responsibilities among 11 purpose-built agents:

| Agent | Module | Primary Responsibilities |
|---|---|---|
| **A. Lead Research Agent** | `app/agents/lead_research_agent.py` | Profiling prospect background, mapping commuter/family pain points, and deriving purchasing personas. |
| **B. Lead Scoring Agent** | `app/agents/lead_scoring_agent.py` | Transparent 0–100 scoring, conversion probability estimation, and explainable positive/negative factor attribution. |
| **C. Qualification Agent** | `app/agents/qualification_agent.py` | Rigorous BANT evaluation (Budget, Authority, Need, Timeline). Output: Qualified, Partially Qualified, or Unqualified. |
| **D. Sales Communication Agent** | `app/agents/communication_agent.py` | Generating personalized WhatsApp, Email, and omnichannel messages tailored to preferences and location. |
| **E. Knowledge / RAG Agent** | `app/agents/rag_agent.py` | Semantic vector search across official brochures and price sheets; zero hallucination enforcement with citations. |
| **F. Objection Handling Agent** | `app/agents/objection_agent.py` | Detection of price, timing, competitor, and trust objections; deploys Value Reframing and Feel-Felt-Found techniques. |
| **G. Voice Sales Agent** | `app/agents/voice_agent.py` | Telephony dialogue, speech turn management, natural oral cadence, audio visualizer telemetry, and automated post-call CRM notes. |
| **H. Follow-up Agent** | `app/agents/followup_agent.py` | Cadence management (Day 0, Day 2, Day 5, Day 10 touches); automated cadence freeze upon customer response. |
| **I. Scheduling Agent** | `app/agents/scheduling_agent.py` | Proposes slots in showroom hours (11 AM - 7 PM IST, Mon-Sat); books product demo / sample review calls and showroom visitss. |
| **J. CRM Agent** | `app/agents/crm_agent.py` | Automatic stage transitions across 9 stages, updating Next Best Action recommendations, and auditable event logging. |
| **K. Analytics Agent** | `app/agents/analytics_agent.py` | Funnel drop-off analytics, score distribution monitoring, objection frequency clustering, and AI executive insights. |
