# Multi-Agent System Architecture

The **AI Sales Workforce** is an autonomous platform powered by 11 specialized, coordinated software agents acting as a cohesive revenue operations team. Rather than using an unconstrained chatbot, the system utilizes a **State-Machine Orchestrator** pattern.

---

## 1. Multi-Agent Orchestration Flow

```
                           [ Inbound Lead Creation ]
                                       │
                                       ▼
                          [ A. Lead Research Agent ]
                                       │
                                       ▼
                          [ B. Lead Scoring Agent ]
                                       │
                                       ▼
                         [ C. Qualification Agent ]
                                       │
                                       ▼
                       [ D. Sales Communication Agent ]
                                       │
                             (Outreach Dispatched)
                                       │
                                       ▼
                         [ Customer Message Received ]
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │  Workforce State Orchestrator │
                       └───────────────┬───────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  │                    │                    │
                  ▼                    ▼                    ▼
          [ Product Inquiry ]      [ Objection ]    [ Scheduling Intent ]
                  │                    │                    │
                  ▼                    ▼                    ▼
            [ E. RAG Agent ]    [ F. Objection ]     [ I. Scheduling ]
                  │             [ Handling Agent ]   [     Agent     ]
                  │                    │                    │
                  └────────────────────┼────────────────────┘
                                       │
                                       ▼
                             [ J. CRM Agent Sync ]
                                       │
                                       ▼
                          [ H. Follow-up Agent Queue ]
                                       │
                                       ▼
                           [ K. Analytics Agent ]
```

---

## 2. Shared State Machine Schema

The orchestrator maintains an auditable execution context across every conversational turn:

```json
{
  "lead_id": 1,
  "lead_name": "Rahul Sharma",
  "intent": "question",
  "sentiment": "Positive",
  "budget": "₹3,50,000",
  "timeline": "Within 30 days",
  "qualification_status": "Qualified",
  "lead_score": 87,
  "score_category": "Hot",
  "active_objections": ["Price"],
  "next_best_action": "Run sample review call and confirm express production",
  "human_handoff_triggered": false
}
```

---

## 3. Human Handoff Sentinel Architecture

The AI Sales Agent operates with explicit humility and guardrails. A human sales representative is automatically alerted and given thread takeover controls when:
1. **Direct Customer Request**: Keywords like *"talk to human"*, *"call manager"*, *"real person"* are detected.
2. **Low RAG Grounding Confidence**: If retrieved context falls below similarity threshold ($\text{score} < 0.28$), the system states information is unverified and flags a human specialist.
3. **Severe Sentiment Friction**: Hostile, angry, or persistent negative sentiment.
4. **Ultra High-Value Deals**: Deals above custom enterprise thresholds (e.g. above ₹10,00,000).
