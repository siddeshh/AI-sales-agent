# AI Sales Agent — Autonomous Multi-Agent Sales Workforce

> An enterprise-grade, end-to-end AI sales automation platform that orchestrates the entire revenue lifecycle: from lead acquisition and predictive scoring to qualification, omnichannel outreach, grounded RAG product Q&A, objection handling, voice telephony, calendar scheduling, and automated CRM synchronization.

---

## 🌟 Executive Overview

Traditional revenue teams spend over 65% of their working hours on manual, repetitive tasks: qualifying leads, drafting repetitive follow-up emails, handling routine pricing objections, checking calendar slots, and manually updating CRM fields.

**AI Sales Agent** replaces scattered point solutions with a coordinated **11-Agent AI Workforce**. Designed as a production-grade enterprise platform, it operates like a dedicated sales pod that qualifies prospects 24/7 while preserving human sales representative oversight through an automated **Human Handoff Sentinel**.

---

## 🏢 Multi-Industry Universal Architecture

While **Real Estate** serves as the default flagship demonstration industry (featuring residential 2 BHK / 3 BHK configurations, RERA compliance certificates, and VIP site visit bookings), the architecture is completely decoupled and supports one-click switching to:
- **B2B Enterprise SaaS** (ARR, seat tiers, SOC2 compliance, product demos)
- **Higher Education & EdTech** (Executive MBA, cohort placements, admissions counseling)
- **Automotive Dealerships** (EV SUVs, battery warranty, test drive scheduling)
- **Healthcare & Insurance** (Policy tiers, underwriting discovery, consultations)

---

## 🤖 The 11 Autonomous Sales Agents

The workforce architecture divides sales operations among 11 purpose-built agents:

1. **Lead Research Agent (`A`)**: Scans prospect background, derives buyer personas (e.g. *Senior IT Architect*), and uncovers commuter/family pain points.
2. **Lead Scoring Agent (`B`)**: Calculates transparent 0–100 scores and conversion probability percentages with factor-by-factor explainability.
3. **Qualification Agent (`C`)**: Implements strict **BANT** qualification (Budget, Authority, Need, Timeline) before moving prospects down-funnel.
4. **Sales Communication Agent (`D`)**: Drafts hyper-personalized WhatsApp messages, emails, and direct chat interactions.
5. **Knowledge RAG Agent (`E`)**: Executes semantic vector retrieval across official project brochures and price sheets with strict anti-hallucination guardrails.
6. **Objection Handling Agent (`F`)**: Detects price, timing, and competitor hesitations in real time; applies **Value Reframing** and **10:90 Subvention financing** techniques.
7. **Voice Sales Agent (`G`)**: Conversational telephony agent featuring speech turn management, natural oral pacing, live audio waveforms, and automated post-call CRM summaries.
8. **Follow-up Agent (`H`)**: Manages automated 4-touch cadences (Day 0, Day 2, Day 5, Day 10) and automatically freezes drip campaigns the moment a prospect replies.
9. **Scheduling Agent (`I`)**: Checks working hour calendar availability (10 AM - 6 PM IST) and books VIP on-site flat visits or virtual consultations.
10. **CRM Agent (`J`)**: Automatically updates stages across 9 Kanban columns, logs Next Best Action recommendations, and records auditable activity logs.
11. **Analytics Agent (`K`)**: Aggregates conversion funnel velocity, monitors objection trends, and surfaces executive AI Sales Insights.

---

## 🎯 20-Step Demonstrable Sales Lifecycle Scenario

The application includes a built-in **Interactive 20-Step Demo Tour** modal that walks through this complete lifecycle:

1. **Step 1: Lead Intake** — Create or import prospect (*Rahul Sharma, ₹80 Lakh budget, Pune, 2 BHK, 30 days*).
2. **Step 2: AI Lead Research** — Research Agent profiles persona as Senior IT Architect seeking Hinjawadi proximity.
3. **Step 3: Predictive Scoring** — Scoring Agent assigns **87/100 (HOT)** with **82% conversion probability**.
4. **Step 4: Factor Explainability** — Shows why: *High budget match (+25)*, *Urgent 30-day timeline (+20)*, *Specific 2 BHK criteria (+15)*.
5. **Step 5: Personalized Outreach** — Synthesizes customized WhatsApp and Email outreach.
6. **Step 6: Customer Replies** — Customer responds on chat inquiring about 2 BHK layouts.
7. **Step 7: Intent & Sentiment Detection** — NLP classifies turn as *Positive* sentiment and *Property Inquiry* intent.
8. **Step 8: Specification Question** — Customer asks about clubhouse amenities and RERA date.
9. **Step 9: Semantic Vector RAG** — Embeddings generated and top brochure chunks retrieved.
10. **Step 10: Grounded Answer** — Answers citing verified details: December 2026 possession, MahaRERA P52100034981, and 25,000 sq.ft clubhouse.
11. **Step 11: Customer Raises Price Objection** — Customer states: *"₹80 lakh is slightly high. Are there discounts?"*
12. **Step 12: Objection Handling Agent Resolves** — Deploys Value Reframing and 10:90 Developer Subvention Scheme.
13. **Step 13: Buying Intent Surges** — Customer agrees subvention plan fits and requests to visit this Saturday.
14. **Step 14: BANT Qualification** — Qualification Agent marks all 4 criteria verified: status updated to **Qualified**.
15. **Step 15: Propose Meeting Slots** — Scheduling Agent offers Saturday 11 AM and 3 PM slots.
16. **Step 16: Meeting Booked** — VIP Site Visit confirmed for Saturday 11 AM at Hinjawadi Experience Centre.
17. **Step 17: Automatic CRM Sync** — CRM Agent moves stage to **Meeting Scheduled** and logs ₹80 Lakh deal value.
18. **Step 18: Follow-up Scheduled** — Follow-up Agent queues Day 2 reminder with 3D model walkthrough and Google Maps pin.
19. **Step 19: Analytics Updates** — Funnel conversion velocity and executive pipeline metrics update in real-time.
20. **Step 20: AI Sales Insights** — System recommends Next Best Action: *"Prepare VIP welcome kit and high-floor floor plans for Rahul Sharma before Saturday visit."*

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Modern Vanilla CSS Design System, Lucide Icons |
| **Backend** | Python 3.11, FastAPI, Pydantic V2, Starlette, Uvicorn |
| **Database** | SQLAlchemy ORM, SQLite (Default out-of-the-box local), PostgreSQL support |
| **RAG & Search** | Normalized 128-D Dense Cosine Similarity Vector Index + Keyword Hybrid |
| **Telephony / Voice** | Browser Speech Synthesis + Telemetry Waveforms + Faster-Whisper Architecture |
| **Authentication** | JWT (JSON Web Tokens), Role-Based Access Control (Admin, Manager, Rep) |

---

## 🚀 Quick Start Guide (Windows)

### 1. Start Backend Server
```powershell
cd "d:\Projects\AI Sales Agent\backend"
.\venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API is live at: `http://127.0.0.1:8000`
- Interactive Swagger docs: `http://127.0.0.1:8000/docs`

### 2. Start Frontend Application
In a second terminal:
```powershell
cd "d:\Projects\AI Sales Agent\frontend"
npm run dev
```
- Web Application is live at: `http://localhost:5173/`

---

## 📁 Repository Structure

```
ai-sales-agent/
│
├── backend/
│   ├── app/
│   │   ├── agents/          # 11 Specialized AI Agents & Orchestrator
│   │   │   ├── lead_research_agent.py
│   │   │   ├── lead_scoring_agent.py
│   │   │   ├── qualification_agent.py
│   │   │   ├── communication_agent.py
│   │   │   ├── rag_agent.py
│   │   │   ├── objection_agent.py
│   │   │   ├── voice_agent.py
│   │   │   ├── followup_agent.py
│   │   │   ├── scheduling_agent.py
│   │   │   ├── crm_agent.py
│   │   │   ├── analytics_agent.py
│   │   │   └── orchestrator.py
│   │   ├── api/             # REST API Endpoints (Leads, Chat, Voice, RAG, CRM, etc.)
│   │   ├── core/            # Config, Security, Database engine
│   │   ├── models/          # SQLAlchemy Entity Models
│   │   ├── rag/             # Chunking, Embeddings, Grounded Answer Engine
│   │   ├── schemas/         # Pydantic Schemas
│   │   ├── services/        # Seed Data & Business Logic
│   │   └── main.py          # FastAPI Application
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Badges, Navbar, Sidebar, DemoTourModal
│   │   ├── views/           # Dashboard, Leads, Chat, Voice, CRM, RAG, etc.
│   │   ├── services/        # Type-Safe API Client
│   │   ├── types/           # TypeScript Definitions
│   │   ├── App.tsx          # Main Application Component
│   │   └── index.css        # Enterprise Design System
│   ├── package.json
│   └── vite.config.ts
│
├── docs/
│   ├── architecture.md      # Multi-Agent State Machine Architecture
│   ├── agents.md            # Details on all 11 Agents
│   ├── api.md               # Complete REST API Reference
│   ├── database.md          # ER Schema & Table Specs
│   └── setup.md             # Local Setup Guide
│
├── .env.example
└── README.md
```

---

## 🛡️ License & Academic Usage
Designed and built for final-year engineering / PBL evaluation and enterprise production demonstrations.
