from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(String(20), default="sales_rep")  # admin, sales_manager, sales_rep
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    email = Column(String(100), nullable=True, index=True)
    phone = Column(String(30), nullable=True)
    company = Column(String(100), nullable=True)
    industry = Column(String(50), default="retail")
    job_title = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    budget = Column(String(50), nullable=True)           # e.g. "₹1,20,000"
    budget_numeric = Column(Float, default=0.0)         # in INR (120000.0)
    requirements = Column(Text, nullable=True)          # e.g. "150 printed crew tees, mixed sizes"
    order_quantity = Column(Integer, nullable=True)     # units the buyer wants
    buyer_type = Column(String(20), nullable=True)      # wholesale, corporate, individual
    timeline = Column(String(50), nullable=True)        # e.g. "Within 3 weeks"
    source = Column(String(50), default="Website Form") # Website Form, Instagram, WhatsApp, Trade Fair, CSV Import
    
    # Scoring & Qualification
    lead_score = Column(Integer, default=50)            # 0 - 100
    conversion_probability = Column(Float, default=0.50)# 0.0 - 1.0
    score_category = Column(String(20), default="Warm") # Cold, Warm, Qualified, Hot
    stage = Column(String(30), default="New", index=True) # New, Contacted, Engaged, Qualified, Meeting Scheduled, Proposal, Negotiation, Won, Lost, Nurture
    qualification_status = Column(String(30), default="Unqualified") # Unqualified, Partially Qualified, Qualified
    
    # BANT Matrix breakdown
    budget_qualified = Column(Boolean, default=False)
    authority_qualified = Column(Boolean, default=False)
    need_qualified = Column(Boolean, default=False)
    timeline_qualified = Column(Boolean, default=False)
    # LLM-extracted BANT: {"budget": {"status": "absent|partial|confirmed", "evidence": "..."}, ...}
    bant_json = Column(Text, nullable=True)
    score_breakdown_json = Column(Text, nullable=True)  # formula inputs: base, weights, BANT bonus
    rag_miss_streak = Column(Integer, default=0)  # consecutive questions with no chunk above threshold
    
    # AI Enrichment & Next Best Action
    research_summary = Column(Text, nullable=True)
    pain_points = Column(Text, nullable=True)
    buying_intent = Column(String(50), default="Medium") # Low, Medium, High, Urgent
    next_best_action = Column(String(150), default="Run Lead Research & Send Personalized Greeting")
    next_best_action_reason = Column(Text, nullable=True)
    
    # Metadata & Tracking
    last_contacted = Column(DateTime, nullable=True)
    next_followup = Column(DateTime, nullable=True)
    assigned_rep = Column(String(100), default="AI Agent Workforce")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    score_factors = relationship("LeadScoreFactor", back_populates="lead", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="lead", cascade="all, delete-orphan")
    calls = relationship("CallSession", back_populates="lead", cascade="all, delete-orphan")
    followups = relationship("FollowUp", back_populates="lead", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="lead", cascade="all, delete-orphan")
    objections = relationship("ObjectionRecord", back_populates="lead", cascade="all, delete-orphan")

class LeadScoreFactor(Base):
    __tablename__ = "lead_score_factors"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    factor_name = Column(String(100), nullable=False)
    score_impact = Column(Integer, default=0) # e.g. +25 or -10
    explanation = Column(Text, nullable=False)
    category = Column(String(50), default="Fit") # Fit, Budget, Need, Timeline, Engagement

    lead = relationship("Lead", back_populates="score_factors")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    channel = Column(String(30), default="chat") # chat, whatsapp, email, voice
    status = Column(String(30), default="active") # active, waiting_customer, human_takeover, closed
    sentiment = Column(String(30), default="Neutral") # Positive, Neutral, Hesitant, Negative
    current_intent = Column(String(100), default="Inquiry")
    human_requested = Column(Boolean, default=False)
    human_takeover = Column(Boolean, default=False)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lead = relationship("Lead", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender = Column(String(20), nullable=False) # customer, ai_agent, human_rep
    agent_name = Column(String(50), default="Communication Agent")
    content = Column(Text, nullable=False)
    intent = Column(String(50), nullable=True)
    sentiment = Column(String(30), nullable=True)
    detected_objection = Column(String(50), nullable=True)
    confidence = Column(Float, nullable=True)  # model's own classification confidence; None for rule-based turns
    provider = Column(String(60), nullable=True)  # "groq/llama-3.3-70b-versatile", "rules", ...
    sources_json = Column(Text, nullable=True)  # knowledge sources used for this answer: [{title, chunk_id, score, ...}]
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")

class CallSession(Base):
    __tablename__ = "call_sessions"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    caller_name = Column(String(100), nullable=False)
    phone_number = Column(String(30), nullable=True)
    status = Column(String(30), default="completed") # scheduled, in_progress, completed, missed
    duration_seconds = Column(Integer, default=0)
    live_transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    sentiment = Column(String(30), default="Positive")
    lead_score_after = Column(Integer, default=75)
    action_items = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="calls")

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    filename = Column(String(200), nullable=False)
    file_type = Column(String(20), default="pdf") # pdf, txt, md, json, faq
    category = Column(String(50), default="Catalogue") # Catalogue, Pricing, Policy, FAQ
    industry = Column(String(50), default="retail")
    total_chunks = Column(Integer, default=0)
    file_size_bytes = Column(Integer, default=0)
    is_processed = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("knowledge_documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)
    embedding_json = Column(Text, nullable=True) # JSON array of floats for cosine search

    document = relationship("KnowledgeDocument", back_populates="chunks")

class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    cadence_step = Column(Integer, default=0) # 0, 2, 5, 10
    due_date = Column(DateTime, nullable=False)
    status = Column(String(20), default="pending") # pending, sent (SMTP accepted), not_sent (error), simulated (demo channel)
    send_error = Column(Text, nullable=True)  # SMTP error when status is not_sent
    channel = Column(String(20), default="whatsapp") # whatsapp, email, sms
    title = Column(String(100), default="Automated Follow-up")
    message_content = Column(Text, nullable=True)
    executed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="followups")

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    title = Column(String(150), nullable=False)
    meeting_type = Column(String(50), default="product_demo") # product_demo (demo / sample review call), showroom_visit
    scheduled_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=45)
    status = Column(String(30), default="scheduled") # scheduled, completed, cancelled, rescheduled
    location_or_link = Column(String(200), default="Video call (link not generated)")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="meetings")

class ObjectionRecord(Base):
    __tablename__ = "objection_records"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)
    objection_type = Column(String(50), nullable=False) # price, timing, competitor, trust, authority, need
    customer_statement = Column(Text, nullable=False)
    handled_response = Column(Text, nullable=False)
    technique_used = Column(String(50), default="Value Reframing") # Feel-Felt-Found, Value Reframing, Concession
    resolution_status = Column(String(30), default="Resolved") # Resolved, Pending, Escalated
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="objections")

class AgentActivityLog(Base):
    __tablename__ = "agent_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    agent_name = Column(String(50), nullable=False, index=True)
    action_type = Column(String(50), nullable=False) # research, score, qualify, chat, rag_search, objection_handled, follow_up, meeting_booked, crm_sync
    lead_id = Column(Integer, nullable=True, index=True)
    lead_name = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(20), default="success") # success, warning, error, handoff
    duration_ms = Column(Float, nullable=True)  # measured with time.perf_counter around the agent run
    created_at = Column(DateTime, default=datetime.utcnow)
