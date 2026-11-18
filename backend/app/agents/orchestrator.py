import logging
from typing import Dict, Any, Optional, List, Literal, Tuple
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session
from app.core.config import settings

from app.models.entities import Lead, Conversation, Message, ObjectionRecord
from app.agents.lead_research_agent import LeadResearchAgent
from app.agents.qualification_agent import LeadQualificationAgent, update_bant_from_conversation
from app.agents.communication_agent import SalesCommunicationAgent
from app.agents.rag_agent import KnowledgeRAGAgent
from app.agents.objection_agent import ObjectionHandlingAgent
from app.agents.scheduling_agent import SchedulingAgent
from app.agents.crm_agent import CRMAgent
from app.agents.followup_agent import FollowUpAgent
from app.services.llm import chat, parse_json, provider_label, LLMUnavailable
from app.services.activity import agent_run

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


OBJECTION_LABEL = {"price": "price", "moq": "minimum order", "delivery": "delivery time", "competitor": "competitor",
                   "authority": "needs approval", "timing": "not now", "no_interest": "not interested",
                   "send_details": "send details"}


def first_name(lead) -> str:
    return (lead.name or "the lead").split()[0]


class WorkforceOrchestrator:
    """
    Central Multi-Agent State Machine & Workflow Orchestrator
    
    Routes work between the 10 agents (the orchestrator itself is not counted as an agent):
    - Analyzes incoming events and state transitions
    - Routes to the right agent (Research, Lead Qualification, Knowledge, Objection, Scheduling, CRM)
    - Detects customer intent, sentiment, and objections
    - Enforces anti-hallucination and triggers Human Handoff when appropriate
    """

    @classmethod
    def run_lead_intake_pipeline(cls, lead: Lead, db: Session) -> Dict[str, Any]:
        """
        Automated pipeline triggered upon new lead creation:
        Lead Created -> Research Agent -> Lead Qualification Agent (BANT, then score) -> CRM Agent
        """
        # Step 1: Research Agent
        with agent_run(db, "Research Agent", "research", lead) as run:
            research = LeadResearchAgent.research_lead(lead)
            lead.research_summary = research["research_summary"]
            lead.pain_points = research["pain_points"]
            lead.buying_intent = research["buying_intent"]
            run["description"] = f"Profiled {lead.name} as a {research['persona_type'].lower()}."

        # Step 2: Lead Qualification Agent: BANT first (it is a score factor), then score
        with agent_run(db, "Lead Qualification Agent", "qualify", lead) as run:
            qual = LeadQualificationAgent.apply_bant_checklist(lead)
            run["description"] = f"Checked {lead.name}'s lead form for BANT: {lead.qualification_status.lower()}."
            run["details"] = qual["reason"]
        with agent_run(db, "Lead Qualification Agent", "score", lead) as run:
            score_res = LeadQualificationAgent.apply(lead, db)
            run["description"] = f"Scored {lead.name} {lead.lead_score}/100 ({lead.score_category})."

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
        with agent_run(db, "Orchestrator", "classify", lead) as run:
            cls_res, cls_provider = cls.classify(user_message, history)
            run["description"] = (f"Read {first_name(lead)}'s message: {cls_res.intent.replace('_', ' ')}"
                                  f"{' (' + OBJECTION_LABEL.get(cls_res.objection_type, '') + ')' if cls_res.objection_type else ''}.")
            run["details"] = f"sentiment={cls_res.sentiment}; confidence={cls_res.confidence}; classifier={cls_provider}"
        base = {
            "intent": cls_res.intent,
            "sentiment": cls_res.sentiment.title(),
            "detected_objection": cls_res.objection_type,
            "confidence": cls_res.confidence,
            "classifier_provider": cls_provider,
            "human_handoff_triggered": False,
            "rag_sources": [],
        }

        with agent_run(db, "Lead Qualification Agent", "bant_update", lead) as run:
            if update_bant_from_conversation(lead, history) is not None:
                run["description"] = f"Updated {first_name(lead)}'s BANT from the conversation: {lead.qualification_status.lower()}."
            else:
                run["description"], run["status"] = f"Kept {first_name(lead)}'s BANT as it was (no language model configured).", "warning"

        # Human handoff
        if cls_res.intent == "human_request":
            conversation.human_requested = True
            return cls._handoff(lead, conversation, db, base, "Customer explicitly requested human sales representative",
                                "Of course. I've passed this conversation to a member of our sales team, who will take it from here shortly.")

        # Objections (incl. "not now" and opt-out)
        if cls_res.intent in ("objection", "not_now", "opt_out"):
            obj_type = cls_res.objection_type or ("no_interest" if cls_res.intent == "opt_out" else "timing")
            with agent_run(db, "Objection Agent", "objection_handled", lead) as run:
                chunks = cls._retrieve(user_message, db)
                obj_res = ObjectionHandlingAgent.generate_reply(lead, obj_type, history, chunks)
                db.add(ObjectionRecord(
                    lead_id=lead.id, conversation_id=conversation.id, objection_type=obj_type,
                    customer_statement=user_message, handled_response=obj_res["handled_response"],
                    technique_used=obj_res["technique_used"], resolution_status="Addressed"))
                run["description"] = (f"Handled {first_name(lead)}'s {OBJECTION_LABEL.get(obj_type, obj_type)} objection "
                                      f"({obj_res['technique_used'].lower()}).")
                run["details"] = f"reply by {obj_res['provider']}"
            lead.next_best_action = f"Follow-up with tailored proposal addressing {obj_type} concern"
            db.commit()
            return {**base, "detected_objection": obj_type, "active_agent": "Objection Agent",
                    "ai_reply": obj_res["handled_response"], "provider": obj_res["provider"]}

        # Meeting intent
        if cls_res.intent == "ready_to_buy":
            with agent_run(db, "Scheduling Agent", "meeting_propose", lead) as run:
                sched = SchedulingAgent.generate_reply(lead, history)
                run["description"] = f"Offered {first_name(lead)} {min(3, len(sched['slots']))} meeting slots (not booked yet)."
                run["details"] = f"reply by {sched['provider']}"
            if lead.stage in ["New", "Contacted", "Engaged"]:
                lead.stage = "Qualified"
            lead.next_best_action = "Confirm Meeting Slot"
            db.commit()
            return {**base, "active_agent": "Scheduling Agent", "ai_reply": sched["reply"], "provider": sched["provider"]}

        # Product question -> retrieve, answer only from chunks
        if cls_res.intent == "question":
            with agent_run(db, "Knowledge Agent", "rag_search", lead) as run:
                rag_res = KnowledgeRAGAgent.answer_question(user_message, db, lead=lead, history=history)
                docs = sorted({s["title"] for s in rag_res["sources"]})
                if rag_res["is_unavailable"]:
                    run["description"] = f"Could not answer {first_name(lead)}'s question from the knowledge base."
                elif rag_res["grounding_failed"]:
                    run["description"] = (f"Held back an answer to {first_name(lead)}: it used a number that is not in "
                                          f"the documents. Created a follow-up task.")
                else:
                    run["description"] = f"Answered {first_name(lead)}'s question using {', '.join(docs)}."
                if rag_res["is_unavailable"] or rag_res["grounding_failed"]:
                    run["status"] = "warning"
                # the question itself, so the dashboard can list unanswered questions
                run["details"] = (f"question: {user_message} | top similarity {rag_res['confidence']:.2f}, "
                                  f"threshold {settings.RAG_SIMILARITY_THRESHOLD}, answer by {rag_res['provider']}")
            if rag_res["is_unavailable"]:
                lead.rag_miss_streak = (lead.rag_miss_streak or 0) + 1
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
            return {**base, "active_agent": "Knowledge Agent", "ai_reply": rag_res["answer"],
                    "provider": rag_res["provider"], "rag_sources": rag_res["sources"]}

        # Greeting / other
        with agent_run(db, "Communication Agent", "reply", lead) as run:
            reply = SalesCommunicationAgent.generate_reply(lead, history)
            run["description"] = f"Replied to {first_name(lead)}."
            run["details"] = f"reply by {reply['provider']}"
        db.commit()
        return {**base, "active_agent": "Communication Agent", "ai_reply": reply["reply"], "provider": reply["provider"]}

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
        with agent_run(db, "Orchestrator", "handoff", lead) as run:
            conversation.human_takeover = True
            conversation.status = "human_takeover"
            lead.next_best_action = "Human Sales Rep Takeover Required"
            lead.next_best_action_reason = reason
            run["description"], run["status"] = f"Handed {first_name(lead)}'s conversation to a human: {reason.lower()}.", "handoff"
        db.commit()
        return {**base, "active_agent": "Orchestrator", "ai_reply": reply, "provider": "rules",
                "human_handoff_triggered": True, "handoff_reason": reason}
