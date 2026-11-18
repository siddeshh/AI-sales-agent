import logging
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import FollowUp
from app.rag.engine import RAGEngine, ungrounded_numbers
from app.services.llm import chat, build_sales_system, provider_label, LLMUnavailable

log = logging.getLogger("nova.rag")

ANSWER_INSTRUCTION = "Answer only from these sources. If the answer is not in them, say you will check and get back."
CHECK_BACK = "I don't have that in our documents yet. Let me check with the team and get back to you."


_WORD = re.compile(r"[a-z0-9]+")
_STOP = {"the", "and", "for", "you", "your", "what", "how", "are", "can", "with", "per", "our", "any", "this", "that", "from", "have", "does", "do", "is", "of", "to", "in", "a", "an", "on"}


def _terms(text: str) -> set:
    return {w.rstrip("s") for w in _WORD.findall(text.lower()) if w not in _STOP}  # "tees" == "tee"


def best_sentences(text: str, query: str, n: int = 2) -> str:
    """The n sentences of `text` that best match `query`, in their original order.
    Rare words count more (1 / number of sentences containing the word), so 'oversized' beats 'bulk'."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    terms = [_terms(s) for s in sentences]
    q = _terms(query)
    df = {w: sum(w in t for t in terms) for w in q}
    score = [sum(1 / df[w] for w in q & t) for t in terms]
    keep = sorted(sorted(range(len(sentences)), key=lambda k: -score[k])[:n])
    return " ".join(sentences[k] for k in keep)


class KnowledgeRAGAgent:
    """
    Agent 4 of 10: Knowledge Agent
    - Semantic retrieval (all-MiniLM-L6-v2, cosine, top-k, threshold)
    - LLM answer restricted to the retrieved chunks, with source list
    - Grounding check: every number in the answer must appear in the sources (or the customer's question);
      regenerate once, then fall back to "I'll check and get back" + a follow-up task
    """
    AGENT_NAME = "Knowledge Agent"

    @staticmethod
    def retrieve(query: str, db: Session) -> Dict[str, Any]:
        hits = RAGEngine.search_chunks(db, query)
        passing = [h for h in hits if h["score"] >= settings.RAG_SIMILARITY_THRESHOLD]
        return {"hits": hits, "chunks": passing, "top_score": hits[0]["score"] if hits else 0.0}

    @staticmethod
    def _sources(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [{"title": c["document_title"], "chunk_id": c["chunk_id"], "chunk_number": c["chunk_number"],
                 "score": c["score"], "excerpt": c["content"][:200] + ("..." if len(c["content"]) > 200 else "")}
                for c in chunks]

    @classmethod
    def answer_question(cls, query: str, db: Session, lead=None, history: Optional[List[Dict[str, str]]] = None,
                        industry: str = None) -> Dict[str, Any]:
        r = cls.retrieve(query, db)
        chunks = r["chunks"]
        result = {"agent_name": cls.AGENT_NAME, "query": query, "confidence": r["top_score"],
                  "sources": cls._sources(chunks), "chunks": chunks, "is_unavailable": False,
                  "grounding_failed": False, "provider": "rules"}

        if not chunks:
            return {**result, "answer": CHECK_BACK, "is_unavailable": True}

        sources_block = "\n".join(f"[{i}] {c['document_title']} (chunk {c['chunk_number']}): {c['content']}"
                                  for i, c in enumerate(chunks, 1))
        if lead is not None:
            system = build_sales_system(ANSWER_INSTRUCTION, lead, lead.stage, chunks)
        else:
            system = f"You are a sales assistant. {ANSWER_INSTRUCTION} Reply in at most 3 sentences.\n\nSOURCES:\n{sources_block}"
        messages = history or [{"role": "user", "content": query}]
        allowed_text = " ".join(c["content"] for c in chunks) + " " + query

        try:
            for attempt in (1, 2):
                answer = chat(system, messages).strip()
                bad = ungrounded_numbers(answer, allowed_text)
                if not bad:
                    return {**result, "answer": answer, "provider": provider_label()}
                log.warning("Grounding check failed (attempt %d): numbers %s not in sources", attempt, sorted(bad))
                system += (f"\n\nYour previous answer used numbers that are not in the sources: {', '.join(sorted(bad))}. "
                           "Use only numbers that appear in the sources.")
        except LLMUnavailable:
            top = chunks[0]
            # No model: quote the best-matching sentences verbatim (grounded by construction, short enough to speak).
            return {**result, "answer": f"From {top['document_title']}: {best_sentences(top['content'], query)}"}

        cls._create_followup(db, lead, query)
        return {**result, "answer": CHECK_BACK, "grounding_failed": True, "provider": provider_label()}

    @classmethod
    def _create_followup(cls, db: Session, lead, query: str):
        if lead is None:
            return  # knowledge-page test question: no lead to follow up with
        db.add(FollowUp(
            lead_id=lead.id, cadence_step=0, due_date=datetime.utcnow() + timedelta(days=1), status="pending",
            channel="chat", title="Answer pending product question",
            message_content=f"Customer asked: \"{query}\". The AI answer failed the grounding check; confirm the facts and reply."))
