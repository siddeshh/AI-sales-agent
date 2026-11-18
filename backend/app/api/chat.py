import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.core.database import get_db
from app.models.entities import Lead, Conversation, Message
from app.schemas.schemas import ChatMessageCreate, ChatResponse, ConversationOut, MessageOut
from app.agents.orchestrator import WorkforceOrchestrator
from app.agents.qualification_agent import LeadQualificationAgent
from app.services.activity import agent_run

router = APIRouter(prefix="/chat", tags=["AI Conversations"])

@router.get("/conversation/{lead_id}", response_model=ConversationOut)
def get_or_create_conversation(lead_id: int, channel: str = "chat", db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    conv = db.query(Conversation).filter(
        Conversation.lead_id == lead_id,
        Conversation.channel == channel
    ).order_by(Conversation.created_at.desc()).first()

    if not conv:
        conv = Conversation(
            lead_id=lead_id,
            channel=channel,
            status="active",
            sentiment="Neutral",
            current_intent="Discovery",
            summary=f"Initial conversation initiated with {lead.name}."
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    return conv

@router.post("/message", response_model=ChatResponse)
def send_chat_message(payload: ChatMessageCreate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    conv = db.query(Conversation).filter(
        Conversation.lead_id == payload.lead_id,
        Conversation.channel == payload.channel
    ).order_by(Conversation.created_at.desc()).first()

    if not conv:
        conv = Conversation(
            lead_id=payload.lead_id,
            channel=payload.channel,
            status="active",
            sentiment="Neutral",
            current_intent="Inquiry"
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # 1. Record customer message or human rep message
    sender_type = "human_rep" if payload.is_human_agent else "customer"
    user_msg = Message(
        conversation_id=conv.id,
        sender=sender_type,
        agent_name="Human rep" if payload.is_human_agent else None,
        content=payload.content,
        created_at=datetime.utcnow()
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # No AI reply when a human rep wrote it, or when a human has taken over the conversation
    if payload.is_human_agent or conv.human_takeover:
        return ChatResponse(
            conversation_id=conv.id,
            customer_message=MessageOut.model_validate(user_msg),
            ai_message=None,
            detected_intent="Human Reply" if payload.is_human_agent else "Waiting for human rep",
            detected_sentiment="Neutral",
            qualification_status=lead.qualification_status,
            lead_score=lead.lead_score,
            next_best_action=lead.next_best_action,
            human_handoff_triggered=False
        )

    # 2. Run Multi-Agent Orchestrator
    ai_turn = WorkforceOrchestrator.handle_customer_message(lead, conv, payload.content, db)

    # Update conversation metadata
    conv.current_intent = ai_turn["intent"]
    conv.sentiment = ai_turn["sentiment"]
    conv.updated_at = datetime.utcnow()

    # 3. Create AI Agent Message record
    ai_msg = Message(
        conversation_id=conv.id,
        sender="ai_agent",
        agent_name=ai_turn["active_agent"],
        content=ai_turn["ai_reply"],
        intent=ai_turn["intent"],
        sentiment=ai_turn["sentiment"],
        detected_objection=ai_turn["detected_objection"],
        confidence=ai_turn["confidence"],  # classifier's own confidence; None when rules were used
        provider=ai_turn["provider"],
        sources_json=json.dumps(ai_turn.get("rag_sources") or []) if ai_turn.get("rag_sources") else None,
        created_at=datetime.utcnow()
    )
    db.add(ai_msg)

    # 4. Refresh lead score based on conversation engagement
    db.flush()
    with agent_run(db, "Lead Qualification Agent", "score", lead) as run:
        LeadQualificationAgent.apply(lead, db)
        run["description"] = f"Re-scored {lead.name} after their message: {lead.lead_score}/100 ({lead.score_category})."
    lead.last_contacted = datetime.utcnow()

    db.commit()
    db.refresh(ai_msg)
    db.refresh(lead)

    return ChatResponse(
        conversation_id=conv.id,
        customer_message=MessageOut.model_validate(user_msg),
        ai_message=MessageOut.model_validate(ai_msg),
        detected_intent=ai_turn["intent"],
        detected_sentiment=ai_turn["sentiment"],
        detected_objection=ai_turn["detected_objection"],
        qualification_status=lead.qualification_status,
        lead_score=lead.lead_score,
        next_best_action=lead.next_best_action,
        human_handoff_triggered=ai_turn["human_handoff_triggered"],
        handoff_reason=ai_turn.get("handoff_reason"),
        rag_sources=ai_turn.get("rag_sources", [])
    )

@router.post("/handoff-toggle/{conversation_id}")
def toggle_human_takeover(conversation_id: int, enable_takeover: bool, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.human_takeover = enable_takeover
    conv.status = "human_takeover" if enable_takeover else "active"
    db.commit()
    return {
        "conversation_id": conv.id,
        "human_takeover": conv.human_takeover,
        "status": conv.status
    }
