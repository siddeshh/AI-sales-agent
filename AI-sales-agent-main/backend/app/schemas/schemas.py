from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: str = "sales_rep"

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    created_at: datetime
    class Config:
        from_attributes = True

# --- Lead Schemas ---
class ScoreFactorOut(BaseModel):
    id: int
    factor_name: str
    score_impact: int
    explanation: str
    category: str
    class Config:
        from_attributes = True

class LeadCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    industry: str = "retail"
    job_title: Optional[str] = None
    location: Optional[str] = None
    budget: Optional[str] = None
    budget_numeric: Optional[float] = None
    requirements: Optional[str] = None
    order_quantity: Optional[int] = None
    buyer_type: Optional[str] = None  # wholesale, corporate, individual
    timeline: Optional[str] = None
    source: str = "Website Form"
    assigned_rep: Optional[str] = "AI Agent Workforce"

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    industry: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    budget: Optional[str] = None
    budget_numeric: Optional[float] = None
    requirements: Optional[str] = None
    order_quantity: Optional[int] = None
    buyer_type: Optional[str] = None
    timeline: Optional[str] = None
    source: Optional[str] = None
    stage: Optional[str] = None
    qualification_status: Optional[str] = None
    lead_score: Optional[int] = None
    conversion_probability: Optional[float] = None
    assigned_rep: Optional[str] = None
    next_best_action: Optional[str] = None
    next_best_action_reason: Optional[str] = None

class LeadOut(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    industry: str
    job_title: Optional[str]
    location: Optional[str]
    budget: Optional[str]
    budget_numeric: Optional[float]
    requirements: Optional[str]
    order_quantity: Optional[int] = None
    buyer_type: Optional[str] = None
    timeline: Optional[str]
    source: str
    lead_score: int
    conversion_probability: float
    score_category: str
    stage: str
    qualification_status: str
    budget_qualified: bool
    authority_qualified: bool
    need_qualified: bool
    timeline_qualified: bool
    bant_json: Optional[str] = None
    score_breakdown_json: Optional[str] = None
    research_summary: Optional[str]
    pain_points: Optional[str]
    buying_intent: Optional[str]
    next_best_action: Optional[str]
    next_best_action_reason: Optional[str]
    last_contacted: Optional[datetime]
    next_followup: Optional[datetime]
    assigned_rep: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    score_factors: List[ScoreFactorOut] = []

    class Config:
        from_attributes = True

# --- Chat & Messaging Schemas ---
class ChatMessageCreate(BaseModel):
    lead_id: int
    content: str
    channel: str = "chat" # chat, whatsapp, email
    is_human_agent: bool = False

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender: str # customer, ai_agent, human_rep
    agent_name: Optional[str]
    content: str
    intent: Optional[str]
    sentiment: Optional[str]
    detected_objection: Optional[str]
    confidence: Optional[float]
    provider: Optional[str] = None
    sources_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationOut(BaseModel):
    id: int
    lead_id: int
    channel: str
    status: str
    sentiment: str
    current_intent: str
    human_requested: bool
    human_takeover: bool
    summary: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    messages: List[MessageOut] = []

    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    conversation_id: int
    customer_message: MessageOut
    ai_message: Optional[MessageOut] = None
    detected_intent: str
    detected_sentiment: str
    detected_objection: Optional[str] = None
    qualification_status: str
    lead_score: int
    next_best_action: str
    human_handoff_triggered: bool = False
    handoff_reason: Optional[str] = None
    rag_sources: List[Dict[str, Any]] = []

# --- Voice Call Schemas ---
class VoiceCallInitiate(BaseModel):
    lead_id: int
    phone_number: Optional[str] = None

class VoiceCallTurnRequest(BaseModel):
    call_id: int
    user_transcript: str

class VoiceCallOut(BaseModel):
    id: int
    lead_id: int
    conversation_id: Optional[int] = None
    caller_name: str
    phone_number: Optional[str]
    status: str
    duration_seconds: int
    live_transcript: Optional[str]
    summary: Optional[str]
    sentiment: str
    lead_score_after: int
    action_items: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- RAG Knowledge Base Schemas ---
class KnowledgeChunkOut(BaseModel):
    id: int
    document_id: int
    chunk_index: int
    content: str
    metadata_json: Optional[str]
    class Config:
        from_attributes = True

class KnowledgeDocumentOut(BaseModel):
    id: int
    title: str
    filename: str
    file_type: str
    category: str
    industry: str
    total_chunks: int
    file_size_bytes: int
    is_processed: bool
    created_at: datetime

    class Config:
        from_attributes = True

class RAGQueryRequest(BaseModel):
    query: str
    industry: str = "retail"

class RAGQueryResponse(BaseModel):
    query: str
    grounded_answer: str
    confidence: float
    sources: List[Dict[str, Any]]  # {title, chunk_id, chunk_number, score, excerpt}
    is_unavailable: bool = False
    provider: str = "rules"
    grounding_failed: bool = False
    threshold: float = 0.35

# --- Followup & Meeting Schemas ---
class FollowUpOut(BaseModel):
    id: int
    lead_id: int
    lead_name: Optional[str] = None
    cadence_step: int
    due_date: datetime
    status: str
    channel: str
    title: str
    message_content: Optional[str]
    executed_at: Optional[datetime]
    send_error: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class MeetingCreate(BaseModel):
    lead_id: int
    title: str
    meeting_type: str = "product_demo"
    scheduled_time: datetime
    duration_minutes: int = 45
    location_or_link: Optional[str] = None
    notes: Optional[str] = None

class MeetingOut(BaseModel):
    id: int
    lead_id: int
    lead_name: Optional[str] = None
    title: str
    meeting_type: str
    scheduled_time: datetime
    duration_minutes: int
    status: str
    location_or_link: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Analytics & Insights Schemas ---
class ObjectionMetric(BaseModel):
    objection_type: str
    count: int
    percentage: float
    resolution_rate: float

class AIInsight(BaseModel):
    id: str
    type: str # warning, opportunity, trend, recommendation
    title: str
    description: str
    impact: str
    action_text: str
    action_type: str

class AgentActivityOut(BaseModel):
    id: int
    agent_name: str
    action_type: str
    lead_id: Optional[int]
    lead_name: Optional[str]
    description: str
    details: Optional[str]
    status: str
    duration_ms: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True
