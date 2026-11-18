"""Browser voice call. Speech-to-text and text-to-speech run in the browser (Web Speech API); this API receives the
finished utterance as text and answers through the same orchestrator as chat. No phone call is placed."""
import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents.crm_agent import CRMAgent
from app.agents.orchestrator import WorkforceOrchestrator
from app.agents.qualification_agent import LeadQualificationAgent, update_bant_from_conversation
from app.agents.voice_agent import VoiceSalesAgent
from app.api.chat import run_customer_turn
from app.core.database import get_db
from app.models.entities import CallSession, Conversation, Lead, Message, ObjectionRecord
from app.schemas.schemas import VoiceCallInitiate, VoiceCallOut, VoiceCallTurnRequest
from app.services.activity import agent_run

router = APIRouter(prefix="/voice", tags=["AI Voice Agent"])


def _transcript(call: CallSession) -> List[dict]:
    try:
        return json.loads(call.live_transcript or "[]")
    except ValueError:
        return []


@router.post("/initiate", response_model=VoiceCallOut)
def initiate_call(payload: VoiceCallInitiate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    with agent_run(db, "Voice Agent", "voice_session_start", lead) as run:
        intro = VoiceSalesAgent.introduction(lead.name)  # always says it is an AI assistant
        conv = Conversation(lead_id=lead.id, channel="voice", status="active", sentiment="Neutral",
                            current_intent="Voice call")
        db.add(conv)
        db.flush()
        db.add(Message(conversation_id=conv.id, sender="ai_agent", agent_name="Voice Agent", content=intro,
                       provider="rules", created_at=datetime.utcnow()))
        call = CallSession(lead_id=lead.id, conversation_id=conv.id, caller_name=lead.name,
                           phone_number=payload.phone_number or lead.phone, status="in_progress", duration_seconds=0,
                           live_transcript=json.dumps([{"speaker": "ai", "text": intro, "agent": "Voice Agent"}]),
                           sentiment="Neutral", lead_score_after=lead.lead_score)
        db.add(call)
        run["description"] = f"Started a browser voice call with {lead.name} (no phone call is placed)."
    db.commit()
    db.refresh(call)
    return call


@router.post("/turn")
def process_voice_call_turn(payload: VoiceCallTurnRequest, db: Session = Depends(get_db)):
    call = db.query(CallSession).filter(CallSession.id == payload.call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call session not found")
    if call.status != "in_progress":
        raise HTTPException(status_code=409, detail="This call has ended")
    text = payload.user_transcript.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty utterance")
    conv = db.query(Conversation).filter(Conversation.id == call.conversation_id).first()
    lead = call.lead

    transcript = _transcript(call)
    transcript.append({"speaker": "customer", "text": text})
    db.add(Message(conversation_id=conv.id, sender="customer", content=text, created_at=datetime.utcnow()))
    db.commit()

    if conv.human_takeover:
        result = {"spoken_response": None, "agent": None, "provider": None, "intent": "Waiting for human rep",
                  "human_handoff_triggered": False, "sources": []}
    else:
        # Same path as chat: orchestrator (LLM / knowledge base / objections / BANT / handoff), saved reply, re-score
        with agent_run(db, "Voice Agent", "voice_turn", lead) as run:
            ai_turn, _ = run_customer_turn(lead, conv, text, db)
            run["description"] = f"Answered {lead.name.split()[0]} on the voice call via the {ai_turn['active_agent']}."
        transcript.append({"speaker": "ai", "text": ai_turn["ai_reply"], "agent": ai_turn["active_agent"]})
        result = {"spoken_response": ai_turn["ai_reply"], "agent": ai_turn["active_agent"], "provider": ai_turn["provider"],
                  "intent": ai_turn["intent"], "human_handoff_triggered": ai_turn["human_handoff_triggered"],
                  "sources": [s["title"] for s in ai_turn.get("rag_sources") or []]}

    call.live_transcript = json.dumps(transcript)
    call.duration_seconds = int((datetime.utcnow() - call.created_at).total_seconds())
    call.sentiment = conv.sentiment or call.sentiment
    db.commit()
    return {"call_id": call.id, "duration_seconds": call.duration_seconds, "transcript": transcript, **result}


@router.post("/end/{call_id}")
def end_call(call_id: int, db: Session = Depends(get_db)):
    call = db.query(CallSession).filter(CallSession.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call session not found")
    if call.status == "completed":
        raise HTTPException(status_code=409, detail="This call has already ended")
    lead = call.lead
    conv = db.query(Conversation).filter(Conversation.id == call.conversation_id).first()
    call.status = "completed"
    call.duration_seconds = int((datetime.utcnow() - call.created_at).total_seconds())
    transcript = _transcript(call)

    # BANT from the whole call (LLM; unchanged without a model), then re-score
    history = [h for h in (WorkforceOrchestrator._history(conv, "", db) if conv else []) if h["content"]]
    with agent_run(db, "Lead Qualification Agent", "bant_update", lead) as run:
        bant = update_bant_from_conversation(lead, history) if history else None
        if bant is not None:
            run["description"] = f"Updated {lead.name}'s BANT from the voice call: {lead.qualification_status.lower()}."
        else:
            run["description"], run["status"] = f"Kept {lead.name}'s BANT as it was (no language model configured).", "warning"
    LeadQualificationAgent.apply(lead, db)

    objections = ([o.objection_type for o in db.query(ObjectionRecord).filter(ObjectionRecord.conversation_id == conv.id)]
                  if conv else [])
    with agent_run(db, "Voice Agent", "voice_summary", lead) as run:
        res = VoiceSalesAgent.summarize_call(lead.name, transcript, lead.next_best_action, objections)
        run["description"] = f"Wrote the call summary for {lead.name} ({call.duration_seconds}s call)."
        run["details"] = f"summary by {res['provider']}"
    call.summary = res["summary"]
    call.action_items = lead.next_best_action
    call.lead_score_after = lead.lead_score
    if conv:
        conv.summary, conv.status = res["summary"], "closed"
    CRMAgent.update_lead_state(lead, db, stage="Engaged" if lead.stage in ["New", "Contacted"] else lead.stage,
                               notes=f"Voice call summary ({res['provider']}):\n{res['summary']}")
    db.commit()
    db.refresh(call)
    return {"call_id": call.id, "status": call.status, "duration_seconds": call.duration_seconds,
            "summary": call.summary, "summary_provider": res["provider"], "bant_updated": bant is not None,
            "qualification_status": lead.qualification_status, "lead_score_after": call.lead_score_after,
            "next_action": lead.next_best_action}


@router.get("/history/{lead_id}", response_model=List[VoiceCallOut])
def get_call_history(lead_id: int, db: Session = Depends(get_db)):
    return db.query(CallSession).filter(CallSession.lead_id == lead_id).order_by(CallSession.created_at.desc()).all()
