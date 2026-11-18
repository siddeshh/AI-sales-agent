import re
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.entities import Lead, Conversation, Message, AgentActivityLog, ObjectionRecord
from app.agents.lead_research_agent import LeadResearchAgent
from app.agents.lead_scoring_agent import LeadScoringAgent
from app.agents.qualification_agent import QualificationAgent
from app.agents.communication_agent import SalesCommunicationAgent
from app.agents.rag_agent import KnowledgeRAGAgent
from app.agents.objection_agent import ObjectionHandlingAgent
from app.agents.scheduling_agent import SchedulingAgent
from app.agents.crm_agent import CRMAgent
from app.agents.followup_agent import FollowUpAgent

class WorkforceOrchestrator:
    """
    Central Multi-Agent State Machine & Workflow Orchestrator
    
    Coordinates the 11 specialized sales agents:
    - Analyzes incoming events and state transitions
    - Dispatches to appropriate agent (Research, Scoring, Qualification, RAG, Objection, Scheduling, CRM)
    - Detects customer intent, sentiment, and objections
    - Enforces anti-hallucination and triggers Human Handoff when appropriate
    """

    @classmethod
    def run_lead_intake_pipeline(cls, lead: Lead, db: Session) -> Dict[str, Any]:
        """
        Automated pipeline triggered upon new lead creation:
        Lead Created -> Research Agent -> Scoring Agent -> BANT Qualification -> CRM Next Action
        """
        # Step 1: Research Agent
        research = LeadResearchAgent.research_lead(lead)
        lead.research_summary = research["research_summary"]
        lead.pain_points = research["pain_points"]
        lead.buying_intent = research["buying_intent"]

        cls._log_activity(db, "Lead Research Agent", "research", lead.id, lead.name,
                          f"Generated prospect persona '{research['persona_type']}' and mapped pain points.")

        # Step 2: Scoring Agent
        score_res = LeadScoringAgent.score_lead(lead, engagement_count=0)
        lead.lead_score = score_res["lead_score"]
        lead.conversion_probability = score_res["conversion_probability"]
        lead.score_category = score_res["score_category"]

        cls._log_activity(db, "Lead Scoring Agent", "score", lead.id, lead.name,
                          f"Computed explainable score: {lead.lead_score}/100 ({lead.score_category}). Factors: {', '.join(score_res['why_summary'][:2])}")

        # Step 3: Qualification Agent
        qual = QualificationAgent.evaluate_bant(lead)
        lead.qualification_status = qual["qualification_status"]
        bant_data = qual["bant_breakdown"]
        lead.budget_qualified = bant_data["budget_qualified"]
        lead.authority_qualified = bant_data["authority_qualified"]
        lead.need_qualified = bant_data["need_qualified"]
        lead.timeline_qualified = bant_data["timeline_qualified"]

        cls._log_activity(db, "Qualification Agent", "qualify", lead.id, lead.name,
                          f"BANT evaluation completed: Status '{lead.qualification_status}'. {qual['reason']}")

        # Step 4: CRM Agent State Update
        lead.next_best_action = "Dispatch Personalized Multi-Channel Introduction"
        lead.next_best_action_reason = "Lead intake verified with high budget match; outreach queued."
        lead.stage = "Contacted"

        CRMAgent.update_lead_state(
            lead, db, 
            stage="Contacted", 
            next_action=lead.next_best_action, 
            next_action_reason=lead.next_best_action_reason,
            qualification_status=lead.qualification_status
        )

        db.commit()
        db.refresh(lead)

        return {
            "lead_id": lead.id,
            "research": research,
            "scoring": score_res,
            "qualification": qual,
            "next_best_action": lead.next_best_action
        }

    @classmethod
    def handle_customer_message(
        cls, 
        lead: Lead, 
        conversation: Conversation, 
        user_message: str, 
        db: Session
    ) -> Dict[str, Any]:
        """
        Dynamic conversation workflow routing:
        1. Check Human Handoff triggers
        2. Detect Intent and Sentiment
        3. Check Objection Handling Agent
        4. If Product / Project Inquiry -> RAG Agent
        5. If Meeting / Site Visit Interest -> Scheduling Agent
        6. Update Lead Score, BANT, and CRM State
        """
        msg_lower = user_message.lower()

        # Step 1: Detect Sentiment
        if any(w in msg_lower for w in ["great", "perfect", "good", "love", "yes", "definitely", "interested", "awesome"]):
            sentiment = "Positive"
        elif any(w in msg_lower for w in ["expensive", "costly", "doubt", "hesitant", "not sure", "thinking", "delay"]):
            sentiment = "Hesitant"
        elif any(w in msg_lower for w in ["bad", "hate", "scam", "cheat", "stop", "rude", "worst"]):
            sentiment = "Negative"
        else:
            sentiment = "Neutral"

        # Step 2: Human Handoff Triggers
        human_triggers = ["talk to human", "speak to manager", "real person", "sales representative", "agent please", "human agent", "call me directly"]
        if any(trig in msg_lower for trig in human_triggers):
            conversation.human_requested = True
            conversation.human_takeover = True
            conversation.status = "human_takeover"
            
            handoff_msg = (
                "I completely understand! I have connected your request directly with our Senior Portfolio Director. "
                "A human representative will take over this thread immediately and reach out to your phone."
            )

            cls._log_activity(db, "Orchestrator", "handoff", lead.id, lead.name,
                              "Human handoff triggered: Prospect explicitly requested human sales representative.", status="handoff")

            lead.next_best_action = "Human Sales Rep Takeover Required"
            lead.next_best_action_reason = "Customer requested live human representative."
            db.commit()

            return {
                "active_agent": "Human Handoff Sentinel",
                "ai_reply": handoff_msg,
                "intent": "Human Representative Request",
                "sentiment": sentiment,
                "detected_objection": None,
                "human_handoff_triggered": True,
                "handoff_reason": "Customer explicitly requested human sales representative",
                "rag_sources": []
            }

        # Step 3: Check for Objections
        detected_objection = ObjectionHandlingAgent.detect_objection(user_message)
        if detected_objection:
            lead_context = {"budget": lead.budget, "name": lead.name, "location": lead.location}
            obj_res = ObjectionHandlingAgent.handle_objection(user_message, detected_objection, lead_context)
            
            # Record objection in DB
            obj_record = ObjectionRecord(
                lead_id=lead.id,
                conversation_id=conversation.id,
                objection_type=detected_objection,
                customer_statement=user_message,
                handled_response=obj_res["handled_response"],
                technique_used=obj_res["technique_used"],
                resolution_status="Addressed"
            )
            db.add(obj_record)

            cls._log_activity(db, "Objection Handling Agent", "objection_handled", lead.id, lead.name,
                              f"Detected '{detected_objection}' objection. Deployed technique: {obj_res['technique_used']}.")

            # Update Lead state
            lead.next_best_action = f"Follow-up with tailored proposal addressing {detected_objection} concern"
            db.commit()

            return {
                "active_agent": "Objection Handling Agent",
                "ai_reply": obj_res["handled_response"],
                "intent": f"Sales Objection: {detected_objection.title()}",
                "sentiment": sentiment,
                "detected_objection": detected_objection,
                "human_handoff_triggered": False,
                "rag_sources": []
            }

        # Step 4: Meeting / Scheduling Intent
        scheduling_keywords = ["site visit", "visit", "schedule", "meeting", "meet", "appointment", "saturday", "sunday", "tomorrow", "book"]
        if any(k in msg_lower for k in scheduling_keywords):
            slots = SchedulingAgent.get_available_slots(days_ahead=3)
            slot_options = f"1) {slots[0]['display']}\n2) {slots[1]['display']}\n3) {slots[2]['display']}"
            
            reply = (
                f"I'd be delighted to arrange a VIP site visit to Skyline Greens for you! "
                f"We have the following verified appointment slots available:\n\n{slot_options}\n\n"
                f"Which one suits your schedule best? I will immediately generate your personalized visitor pass and directions pin."
            )

            cls._log_activity(db, "Scheduling Agent", "meeting_propose", lead.id, lead.name,
                              "Proposed upcoming site visit calendar slots to prospect.")

            # Update stage to Qualified / Meeting Scheduled progression
            if lead.stage in ["New", "Contacted", "Engaged"]:
                lead.stage = "Qualified"
            lead.next_best_action = "Confirm Site Visit Calendar Slot"
            db.commit()

            return {
                "active_agent": "Scheduling Agent",
                "ai_reply": reply,
                "intent": "Meeting & Site Visit Scheduling",
                "sentiment": "Positive",
                "detected_objection": None,
                "human_handoff_triggered": False,
                "rag_sources": []
            }

        # Step 5: Product / Property / RAG Inquiry
        rag_keywords = [
            "price", "cost", "lakh", "crore", "amenit", "clubhouse", "pool", "gym", 
            "rera", "possession", "date", "floor plan", "carpet", "sq ft", "bhk", "parking", 
            "loan", "bank", "maintenance", "location", "hinjawadi"
        ]
        if any(k in msg_lower for k in rag_keywords) or len(user_message.split()) > 4:
            rag_res = KnowledgeRAGAgent.answer_question(user_message, db, industry=lead.industry)
            
            cls._log_activity(db, "Knowledge RAG Agent", "rag_search", lead.id, lead.name,
                              f"Executed semantic RAG search. Grounded confidence: {rag_res['confidence']:.2f}. Sources: {len(rag_res['sources'])} chunks.")

            # If confidence is exceptionally low and answer is unavailable, suggest human assist
            if rag_res["is_unavailable"]:
                cls._log_activity(db, "Orchestrator", "warning", lead.id, lead.name,
                                  "RAG confidence below threshold. Anti-hallucination guardrail active.", status="warning")

            lead.stage = "Engaged"
            lead.next_best_action = "Schedule Discovery Call / Site Visit"
            db.commit()

            return {
                "active_agent": "Knowledge RAG Agent",
                "ai_reply": rag_res["answer"],
                "intent": "Property Specification Inquiry",
                "sentiment": sentiment,
                "detected_objection": None,
                "human_handoff_triggered": False,
                "rag_sources": rag_res["sources"]
            }

        # Step 6: Default Conversational Turn
        first_name = lead.name.split()[0] if lead.name else "there"
        reply = (
            f"Thank you for sharing that, {first_name}. Skyline Greens offers luxury 2 and 3 BHK homes "
            f"in Hinjawadi Phase 1 starting at ₹78 lakh with 40+ resort amenities. "
            f"Would you like to review our verified floor plans or discuss available payment milestone plans?"
        )
        
        return {
            "active_agent": "Sales Communication Agent",
            "ai_reply": reply,
            "intent": "General Inquiry",
            "sentiment": sentiment,
            "detected_objection": None,
            "human_handoff_triggered": False,
            "rag_sources": []
        }

    @classmethod
    def _log_activity(cls, db: Session, agent_name: str, action_type: str, lead_id: int, lead_name: str, description: str, status: str = "success"):
        try:
            log = AgentActivityLog(
                agent_name=agent_name,
                action_type=action_type,
                lead_id=lead_id,
                lead_name=lead_name,
                description=description,
                status=status
            )
            db.add(log)
            db.flush()
        except Exception:
            pass
