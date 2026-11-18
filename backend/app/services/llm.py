"""Single entry point for language-model calls (Groq / OpenAI / Ollama, all OpenAI-compatible).

Callers wrap `chat()` in try/except LLMUnavailable and fall back to their rule-based logic,
so the demo keeps working with no key or no network.
"""
import json
import logging
from typing import List, Dict, Optional

import httpx

from app.core.config import settings

log = logging.getLogger("nova.llm")

PROVIDERS = {
    "groq": {"base_url": "https://api.groq.com/openai/v1", "model": "llama-3.3-70b-versatile", "key": "GROQ_API_KEY"},
    "openai": {"base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini", "key": "OPENAI_API_KEY"},
    "ollama": {"base_url": "http://localhost:11434/v1", "model": "llama3.1", "key": None},
}
TIMEOUT_SECONDS = 20
ATTEMPTS = 2  # first try + one retry


class LLMUnavailable(Exception):
    """No provider configured, or the call failed after retry. Caller must use its rule-based fallback."""


def active_provider() -> Optional[str]:
    """Provider name that chat() will use, or None when it would fall back to rules."""
    name = (settings.LLM_PROVIDER or "").lower()
    cfg = PROVIDERS.get(name)
    if not cfg:
        return None  # "mock" or unknown → rules
    if cfg["key"] and not getattr(settings, cfg["key"]):
        return None
    return name


def chat(system: str, messages: List[Dict[str, str]], json_mode: bool = False) -> str:
    name = active_provider()
    if not name:
        log.warning("LLM path: rules fallback (LLM_PROVIDER=%s, no usable key)", settings.LLM_PROVIDER)
        raise LLMUnavailable("no provider configured")

    cfg = PROVIDERS[name]
    model = settings.LLM_MODEL or cfg["model"]
    headers = {"Authorization": f"Bearer {getattr(settings, cfg['key'])}"} if cfg["key"] else {}
    body = {
        "model": model,
        "messages": [{"role": "system", "content": system}, *messages],
        "temperature": 0.3,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    last_err: Exception = None
    for attempt in range(1, ATTEMPTS + 1):
        try:
            r = httpx.post(f"{cfg['base_url']}/chat/completions", json=body, headers=headers, timeout=TIMEOUT_SECONDS)
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"]
            log.info("LLM path: %s/%s (attempt %d)", name, model, attempt)
            return content
        except Exception as e:  # network, HTTP status, or malformed body
            last_err = e
            log.warning("LLM call failed on %s attempt %d: %s", name, attempt, e)
    log.warning("LLM path: rules fallback after %d failed attempts", ATTEMPTS)
    raise LLMUnavailable(str(last_err))


def provider_label() -> str:
    """Value stored on messages: '<provider>/<model>' for LLM output."""
    name = active_provider()
    return f"{name}/{settings.LLM_MODEL or PROVIDERS[name]['model']}" if name else "rules"


def parse_json(text: str) -> dict:
    """Models sometimes wrap JSON in ```fences``` or prose; take the outermost {...}."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON object in model output")
    return json.loads(text[start:end + 1])


REPLY_RULES = (
    "Reply in at most 3 short sentences, friendly and consultative, never pushy. "
    "Only state prices, discounts, offers, policies, dates or product facts that appear in KNOWLEDGE below; "
    "if the customer asks for something not covered there, say you will confirm with the team. "
    "Do not invent meeting times other than the ones listed. Write plain text, no markdown, no sign-off."
)


def build_sales_system(agent_task: str, lead, stage: str, chunks: List[Dict] = None, extra: str = "") -> str:
    """System prompt shared by Communication, Objection, Scheduling and Knowledge replies."""
    knowledge = "\n".join(f"- [{c.get('document_title', 'Doc')}] {c['content']}" for c in (chunks or [])) or "(none retrieved)"
    lead_profile = (
        f"name={lead.name}; company={lead.company or '-'}; job_title={lead.job_title or '-'}; "
        f"location={lead.location or '-'}; budget={lead.budget or '-'}; requirements={lead.requirements or '-'}; "
        f"timeline={lead.timeline or '-'}; source={lead.source or '-'}"
    )
    return (
        f"You are an AI sales assistant. {agent_task}\n\n"
        f"COMPANY PROFILE:\n{settings.COMPANY_PROFILE}\n\n"
        f"LEAD PROFILE:\n{lead_profile}\n\n"
        f"FUNNEL STAGE: {stage}\n\n"
        f"KNOWLEDGE (the only source of facts):\n{knowledge}\n\n"
        f"{extra}\n\n{REPLY_RULES}"
    )
