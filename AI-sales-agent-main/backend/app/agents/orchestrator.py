import logging
from typing import Dict, Any, Optional, List, Literal, Tuple
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session
from app.core.config import settings

from app.models.entities import Lead, Conversation, Message, AgentActivityLog, ObjectionRecord
from app.agents.lead_research_agent import LeadResearchAgent
from app.agents.lead_scoring_agent import LeadScoringAgent
from app.agents.qualification_agent import QualificationAgent, update_bant_from_conversation
from app.agents.communication_agent import SalesCommunicationAgent
from app.agents.rag_agent import KnowledgeRAGAgent
from app.agents.objection_agent import ObjectionHandlingAgent
from app.agents.scheduling_agent import SchedulingAgent
from app.agents.crm_agent import CRMAgent
from app.agents.followup_agent import FollowUpAgent
from app.services.llm import chat, parse_json, provider_label, LLMUnavailable

log = logging.getLogger("nova.llm")


class IntentResult(BaseModel):
    intent: Literal["question", "objection", "ready_to_buy", "not_now", "human_request", "opt_out", "greeting", "other"]
    sentiment: Literal["positive", "neutral", "hesitant", "negative"]
    objection_type: Optional[Literal["price", "moq", "delivery", "competitor", "authority", "timing", "no_interest",
                                     "send_details"]] = None
    confidence: Optional[float] = Field(default=None, ge=0, le=1)


CLASSIFY_SYSTEM = (
    "You classify the latest customer message in a sales chat. Return only JSON with exactly these keys:\n"
    '{"intent": one of ["question","objection","ready_to_buy","not_now","human_request","opt_out","greeting","other"], '
    '"sentiment": one of ["positive","neutral","hesitant","negative"], '
    '"objection_type": one of ["price","moq","delivery","competitor","authority","timing","no_interest","send_details"] or null, '
    '"confidence": number between 0 and 1}\n'
    "Definitions: question = asks about products, pricing, availability or policies; objection = pushes back "
    "(too expensive, quantity below minimum order = moq, delivery too slow, competitor, needs approval); "
    "ready_to_buy = wants to order, book a sample review call, product demo or showroom visit; "
    "not_now = wants to postpone; human_request = asks for a human, manager or real person; opt_out = wants no "
    "more contact; greeting = only a hello. objection_type is null unless intent is objection, not_now or opt_out."
)


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

        # Step 2: Qualification Agent (before scoring: BANT is a score factor)
        qual = QualificationAgent.evaluate_bant(lead)
        lead.qualification_status = qual["qualification_status"]
        bant_data = qual["bant_breakdown"]
        lead.budget_qualified = bant_data["budget_qualified"]
        lead.authority_qualified = bant_data["authority_qualified"]
        lead.need_qualified = bant_data["need_qualified"]
        lead.timeline_qualified = bant_data["timeline_qualified"]

        cls._log_activity(db, "Qualification Agent", "qualify", lead.id, lead.name,
                          f"BANT evaluation completed: Status '{lead.qualification_status}'. {qual['reason']}")

        # Step 3: Scoring Agent
        score_res = LeadScoringAgent.apply(lead, db)

        cls._log_activity(db, "Lead Scoring Agent", "score", lead.id, lead.name,
                          f"Computed explainable score: {lead.lead_score}/100 ({lead.score_category}). Factors: {', '.join(score_res['why_summary'][:2])}")

        # Step 4: CRM Agent State Update
        lead.next_best_action = "Send introduction message with catalogue and bulk price list"
        lead.next_best_action_reason = f"Lead scored {lead.lead_score}/100 at intake; no message has been sent yet."
        CRMAgent.update_lead_state(
            lead, db,
            stage="New",  # nothing has been sent yet; the stage moves when the lead replies
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
    def classify(cls, user_message: str, history: List[Dict[str, str]]) -> Tuple[IntentResult, str]:
        """One LLM call -> validated intent/sentiment/objection JSON. Falls back to keyword rules on any failure."""
        context = "\n".join(f"{'CUSTOMER' if m['role'] == 'user' else 'AGENT'}: {m['content']}" for m in history[:-1])
        prompt = f"Earlier conversation:\n{context or '(none)'}\n\nLatest customer message:\n{user_message}"
        try:
            raw = chat(CLASSIFY_SYSTEM, [{"role": "user", "content": prompt}], json_mode=True)
            data = parse_json(raw)
            if str(data.get("objection_type")).strip().lower() in ("none", "null", ""):
                data["objection_type"] = None  # small models often send the string "none"
            res = IntentResult.model_validate(data)
            if res.intent not in ("objection", "not_now", "opt_out"):
                res.objection_type = None  # e.g. a price *question* is not a price objection
            return res, provider_label()
        except (LLMUnavailable, ValueError, ValidationError) as e:
            log.warning("Intent classification using rules: %s", e)
            return cls._classify_rules(user_message), "rules"

    @staticmethod
    def _classify_rules(user_message: str) -> IntentResult:
        """Original keyword logic, mapped onto the LLM label set. confidence=None: rules have no real confidence."""
        msg = user_message.lower()
        if any(w in msg for w in ["great", "perfect", "good", "love", "yes", "definitely", "interested", "awesome"]):
            sentiment = "positive"
        elif any(w in msg for w in ["expensive", "costly", "doubt", "hesitant", "not sure", "thinking", "delay"]):
            sentiment = "hesitant"
        elif any(w in msg for w in ["bad", "hate", "scam", "cheat", "stop", "rude", "worst"]):
            sentiment = "negative"
        else:
            sentiment = "neutral"

        human_triggers = ["talk to human", "speak to manager", "manager", "real person", "sales representative",
                          "agent please", "human agent", "call me directly"]
        scheduling = ["showroom", "visit", "schedule", "meeting", "meet", "appointment", "demo", "sample", "call me",
                      "tomorrow",
                      "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

        objection = ObjectionHandlingAgent.detect_objection(user_message)
        if any(t in msg for t in human_triggers):
            intent, obj = "human_request", None
        elif objection == "no_interest":
            intent, obj = "opt_out", "no_interest"
        elif objection == "timing":
            intent, obj = "not_now", "timing"
        elif objection:
            intent, obj = "objection", objection
        elif any(k in msg for k in scheduling):
            intent, obj = "ready_to_buy", None
        elif "?" in msg or len(user_message.split()) > 4:
            intent, obj = "question", None
        elif any(g in msg.replace(",", " ").split() for g in ["hi", "hello", "hey"]):
            intent, obj = "greeting", None
        else:
            intent, obj = "other", None
        return IntentResult(intent=intent, sentiment=sentiment, objection_type=obj, confidence=None)

    @classmethod
    def handle_customer_message(
        cls,
        lead: Lead,
        conversation: Conversation,
        user_message: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        1. Classify intent / sentiment / objection (LLM, rules fallback)
        2. Update BANT slots from the conversation (LLM; skipped on failure)
        3. Route: human_request -> handoff, objection/not_now/opt_out -> Objection Agent,
           ready_to_buy -> Scheduling Agent, question -> RAG + LLM answer, else -> Communication Agent
        """
        history = cls._history(conversation, user_message, db)
        cls_res, cls_provider = cls.classify(user_message, history)
        base = {
            "intent": cls_res.intent,
            "sentiment": cls_res.sentiment.title(),
            "detected_objection": cls_res.objection_type,
            "confidence": cls_res.confidence,
            "classifier_provider": cls_provider,
            "human_handoff_triggered": False,
            "rag_sources": [],
        }

        if update_bant_from_conversation(lead, history) is not None:
            cls._log_activity(db, "Qualification Agent", "qualify", lead.id, lead.name,
                              f"BANT updated from conversation: status '{lead.qualification_status}'.")

        # Human handoff
        if cls_res.intent == "human_request":
            conversation.human_requested = True
            return cls._handoff(lead, conversation, db, base, "Customer explicitly requested human sales representative",
                                "Of course. I've passed this conversation to a member of our sales team, who will take it from here shortly.")

        # Objections (incl. "not now" and opt-out)
        if cls_res.intent in ("objection", "not_now", "opt_out"):
            obj_type = cls_res.objection_type or ("no_interest" if cls_res.intent == "opt_out" else "timing")
            chunks = cls._retrieve(user_message, db)
            obj_res = ObjectionHandlingAgent.generate_reply(lead, obj_type, history, chunks)
            db.add(ObjectionRecord(
                lead_id=lead.id, conversation_id=conversation.id, objection_type=obj_type,
                customer_statement=user_message, handled_response=obj_res["handled_response"],
                technique_used=obj_res["technique_used"], resolution_status="Addressed"))
            cls._log_activity(db, "Objection Handling Agent", "objection_handled", lead.id, lead.name,
                              f"Detected '{obj_type}' objection ({obj_res['provider']}).")
            lead.next_best_action = f"Follow-up with tailored proposal addressing {obj_type} concern"
            db.commit()
            return {**base, "detected_objection": obj_type, "active_agent": "Objection Handling Agent",
                    "ai_reply": obj_res["handled_response"], "provider": obj_res["provider"]}

        # Meeting intent
        if cls_res.intent == "ready_to_buy":
            sched = SchedulingAgent.generate_reply(lead, history)
            cls._log_activity(db, "Scheduling Agent", "meeting_propose", lead.id, lead.name,
                              f"Proposed meeting slots ({sched['provider']}).")
            if lead.stage in ["New", "Contacted", "Engaged"]:
                lead.stage = "Qualified"
            lead.next_best_action = "Confirm Meeting Slot"
            db.commit()
            return {**base, "active_agent": "Scheduling Agent", "ai_reply": sched["reply"], "provider": sched["provider"]}

        # Product question -> retrieve, answer only from chunks
        if cls_res.intent == "question":
            rag_res = KnowledgeRAGAgent.answer_question(user_message, db, lead=lead, history=history)
            cls._log_activity(db, "Knowledge RAG Agent", "rag_search", lead.id, lead.name,
                              f"Top similarity {rag_res['confidence']:.2f}; {len(rag_res['sources'])} chunks above threshold "
                              f"{settings.RAG_SIMILARITY_THRESHOLD}; grounding_failed={rag_res['grounding_failed']}.")
            if rag_res["is_unavailable"]:
                lead.rag_miss_streak = (lead.rag_miss_streak or 0) + 1
                cls._log_activity(db, "Orchestrator", "warning", lead.id, lead.name,
                                  f"No knowledge chunk passed the threshold ({lead.rag_miss_streak} in a row).", status="warning")
                if lead.rag_miss_streak >= 2:
                    lead.rag_miss_streak = 0
                    return cls._handoff(lead, conversation, db, base,
                                        "Knowledge base could not answer two questions in a row",
                                        "I want to make sure you get accurate answers, so I've passed this conversation "
                                        "to a member of our sales team, who will follow up shortly.")
            else:
                lead.rag_miss_streak = 0
            lead.stage = "Engaged" if lead.stage in ["New", "Contacted"] else lead.stage
            lead.next_best_action = "Schedule Discovery Call / Meeting"
            db.commit()
            return {**base, "active_agent": "Knowledge RAG Agent", "ai_reply": rag_res["answer"],
                    "provider": rag_res["provider"], "rag_sources": rag_res["sources"]}

        # Greeting / other
        reply = SalesCommunicationAgent.generate_reply(lead, history)
        db.commit()
        return {**base, "active_agent": "Sales Communication Agent", "ai_reply": reply["reply"], "provider": reply["provider"]}

    @staticmethod
    def _history(conversation: Conversation, user_message: str, db: Session) -> List[Dict[str, str]]:
        """Last 8 messages as chat turns; makes sure the current customer message is last."""
        rows = (db.query(Message).filter(Message.conversation_id == conversation.id)
                .order_by(Message.created_at.desc(), Message.id.desc()).limit(8).all())
        history = [{"role": "user" if m.sender == "customer" else "assistant", "content": m.content} for m in reversed(rows)]
        if not history or history[-1] != {"role": "user", "content": user_message}:
            history = (history + [{"role": "user", "content": user_message}])[-8:]
        return history

    @staticmethod
    def _retrieve(query: str, db: Session) -> List[Dict[str, Any]]:
        return KnowledgeRAGAgent.retrieve(query, db)["chunks"]

    @classmethod
    def _handoff(cls, lead: Lead, conversation: Conversation, db: Session, base: Dict[str, Any],
                 reason: str, reply: str) -> Dict[str, Any]:
        conversation.human_takeover = True
        conversation.status = "human_takeover"
        cls._log_activity(db, "Orchestrator", "handoff", lead.id, lead.name, f"Human handoff: {reason}.", status="handoff")
        lead.next_best_action = "Human Sales Rep Takeover Required"
        lead.next_best_action_reason = reason
        db.commit()
        return {**base, "active_agent": "Human Handoff Sentinel", "ai_reply": reply, "provider": "rules",
                "human_handoff_triggered": True, "handoff_reason": reason}

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
