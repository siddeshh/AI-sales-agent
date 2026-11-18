# Database Architecture & Entity Relational Schema

The platform utilizes **SQLAlchemy ORM**, compatible with **SQLite** (local zero-configuration default) and **PostgreSQL** in production.

---

## 1. Core Tables & Relational Schema

```
 [ users ]
    │
 [ leads ] ─────────────┬─────────────┬─────────────┬─────────────┐
    │                   │             │             │             │
    ▼                   ▼             ▼             ▼             ▼
[ lead_score_factors ]  [ followups ] [ meetings ]  [ calls ]  [ conversations ]
                                                                      │
                                                                      ▼
                                                                  [ messages ]
                                                                      │
                                                                      ▼
                                                             [ objection_records ]

[ knowledge_documents ] ───► [ knowledge_chunks ]
[ agent_activity_logs ]
```

---

## 2. Table Specifications

### `leads`
- `id` (PK, Integer)
- `name` (String, Indexed)
- `email` (String)
- `phone` (String)
- `company` (String)
- `industry` (String, default: "retail")
- `location` (String)
- `budget` (String, e.g. "₹1,20,000")
- `order_quantity` (Integer, pieces) and `buyer_type` (wholesale / corporate / individual)
- `budget_numeric` (Float, in INR)
- `requirements` (Text)
- `timeline` (String)
- `source` (String)
- `lead_score` (Integer, 0–100)
- `conversion_probability` (Float, 0.0–1.0)
- `score_category` (String: "Cold", "Warm", "Qualified", "Hot")
- `stage` (String, Indexed: "New", "Contacted", "Engaged", "Qualified", "Meeting Scheduled", "Proposal", "Negotiation", "Won", "Lost")
- `qualification_status` (String: "Unqualified", "Partially Qualified", "Qualified")
- `budget_qualified`, `authority_qualified`, `need_qualified`, `timeline_qualified` (Boolean)
- `research_summary` (Text)
- `pain_points` (Text)
- `next_best_action` (String)
- `next_best_action_reason` (Text)

### `lead_score_factors`
- `id` (PK, Integer)
- `lead_id` (FK -> leads.id)
- `factor_name` (String)
- `score_impact` (Integer, e.g. +25, +20, -10)
- `explanation` (Text)
- `category` (String)

### `conversations` & `messages`
- `conversations`: `id`, `lead_id`, `channel`, `status`, `sentiment`, `current_intent`, `human_requested`, `human_takeover`, `summary`
- `messages`: `id`, `conversation_id`, `sender` ("customer", "ai_agent", "human_rep"), `agent_name`, `content`, `intent`, `sentiment`, `detected_objection`, `confidence`

### `knowledge_documents` & `knowledge_chunks`
- `knowledge_documents`: `id`, `title`, `filename`, `file_type`, `category`, `industry`, `total_chunks`, `file_size_bytes`, `is_processed`
- `knowledge_chunks`: `id`, `document_id`, `chunk_index`, `content`, `embedding_json`

### `followups`
- `id`, `lead_id`, `cadence_step` (0, 2, 5, 10), `due_date`, `status` ("pending", "completed", "overdue"), `channel`, `title`, `message_content`

### `meetings`
- `id`, `lead_id`, `title`, `meeting_type` ("product_demo" = demo / sample review call, "showroom_visit"), `scheduled_time`, `duration_minutes`, `status`, `location_or_link`, `notes`

### `agent_activity_logs`
- `id`, `agent_name`, `action_type`, `lead_id`, `lead_name`, `description`, `details`, `status`, `created_at`
