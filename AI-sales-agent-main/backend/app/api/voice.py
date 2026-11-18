from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
import json

from app.core.database import get_db
from app.models.entities import Lead, CallSession
from app.schemas.schemas import VoiceCallInitiate, VoiceCallTurnRequest, VoiceCallOut
from app.agents.voice_agent import VoiceSalesAgent
from app.agents.crm_agent import CRMAgent
from app.services.activity import agent_run

router = APIRouter(prefix="/voice", tags=["AI Voice Agent"])

@router.post("/initiate", response_model=VoiceCallOut)
def initiate_call(payload: VoiceCallInitiate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    with agent_run(db, "Voice Agent", "voice_session_start", lead) as run:
        call = CallSession(
            lead_id=lead.id,
            caller_name=lead.name,
            phone_number=payload.phone_number or lead.phone,
            status="in_progress",
            duration_seconds=0,
            live_transcript=json.dumps([
                {"speaker": "ai", "text": VoiceSalesAgent.introduction(lead.name)}
            ]),
            sentiment="Neutral",
            lead_score_after=lead.lead_score
        )
        db.add(call)
        db.commit()
        db.refresh(call)
        run["description"] = f"Started a browser voice session with {lead.name} (no phone call is placed)."
    db.commit()

    return call

@router.post("/turn")
def process_voice_call_turn(payload: VoiceCallTurnRequest, db: Session = Depends(get_db)):
    call = db.query(CallSession).filter(CallSession.id == payload.call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call session not found")

    transcript_list = []
    if call.live_transcript:
        try:
            transcript_list = json.loads(call.live_transcript)
        except Exception:
            transcript_list = []

    # Add customer spoken utterance
    transcript_list.append({"speaker": "customer", "text": payload.user_transcript})

    # Run Voice Agent turn
    with agent_run(db, "Voice Agent", "voice_turn", call.lead) as run:
        turn_res = VoiceSalesAgent.process_voice_turn(call.caller_name, payload.user_transcript)
        run["description"] = f"Answered {call.caller_name.split()[0]} in the voice session ({turn_res['intent'].lower()})."

    # Add AI spoken reply
    transcript_list.append({"speaker": "ai", "text": turn_res["spoken_response"]})

    # Update call record
    call.live_transcript = json.dumps(transcript_list)
    call.duration_seconds = int((datetime.utcnow() - call.created_at).total_seconds())
    call.sentiment = turn_res["sentiment"]
    db.commit()

    return {
        "call_id": call.id,
        "spoken_response": turn_res["spoken_response"],
        "intent": turn_res["intent"],
        "sentiment": turn_res["sentiment"],
        "duration_seconds": call.duration_seconds,
        "transcript": transcript_list
    }

@router.post("/end/{call_id}")
def end_call(call_id: int, db: Session = Depends(get_db)):
    call = db.query(CallSession).filter(CallSession.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call session not found")

    call.status = "completed"
    call.duration_seconds = int((datetime.utcnow() - call.created_at).total_seconds())

    transcript_list = []
    if call.live_transcript:
        try:
            transcript_list = json.loads(call.live_transcript)
        except Exception:
            pass

    with agent_run(db, "Voice Agent", "voice_summary", call.lead) as run:
        summary_res = VoiceSalesAgent.generate_call_summary(call.caller_name, call.duration_seconds, transcript_list)
        run["description"] = f"Saved the voice session summary for {call.caller_name} ({call.duration_seconds}s)."
    call.summary = summary_res["summary"]
    call.action_items = summary_res["action_items"]
    call.sentiment = summary_res["sentiment"]

    # Update lead score & CRM state
    lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
    if lead:
        call.lead_score_after = lead.lead_score
        CRMAgent.update_lead_state(
            lead, db,
            stage="Engaged" if lead.stage in ["New", "Contacted"] else lead.stage,
            next_action="Send quote or meeting confirmation after the call",
            notes=summary_res["summary"]
        )

    db.commit()
    db.refresh(call)

    return {
        "call_id": call.id,
        "status": call.status,
        "duration_seconds": call.duration_seconds,
        "summary": call.summary,
        "action_items": call.action_items,
        "sentiment": call.sentiment,
        "lead_score_after": call.lead_score_after
    }

@router.get("/history/{lead_id}", response_model=List[VoiceCallOut])
def get_call_history(lead_id: int, db: Session = Depends(get_db)):
    return db.query(CallSession).filter(CallSession.lead_id == lead_id).order_by(CallSession.created_at.desc()).all()
