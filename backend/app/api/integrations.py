"""Which integrations are real and which are simulated. The UI shows these badges as-is."""
from fastapi import APIRouter

from app.core.config import settings
from app.services.email import email_configured
from app.services.llm import provider_label

router = APIRouter(prefix="/integrations", tags=["Integrations"])

SIMULATED = ["Salesforce", "HubSpot", "Zoho", "WhatsApp", "Google Calendar"]


@router.get("")
def list_integrations():
    email = {
        "name": "Email", "kind": "real", "badge": "Email — real (SMTP)",
        "configured": email_configured(),
        "detail": ("Test mode: all emails go to EMAIL_TEST_RECIPIENT with the lead's address in the subject."
                   if settings.EMAIL_TEST_MODE else "Live mode: emails go to the lead's address.")
                  if email_configured() else "Not configured: set SMTP_* in backend/.env. Email follow-ups will show 'Not sent'.",
    }
    crm = {"name": "Internal CRM", "kind": "real", "badge": "Internal CRM — real (this app's database)",
           "configured": True, "detail": "Leads, stages, meetings and activity are stored in this app's SQLite database."}
    simulated = [{"name": n, "kind": "simulated", "badge": "Demo mode — simulated", "configured": False,
                  "detail": "Not connected. Anything shown for this channel is simulated; nothing is sent or synced."}
                 for n in SIMULATED]
    label = provider_label()
    llm = {"name": "Language model", "kind": "real" if label != "rules" else "fallback",
           "badge": f"LLM — {label}" if label != "rules" else "LLM — not configured (rule-based templates)",
           "configured": label != "rules",
           "detail": "Set LLM_PROVIDER and the API key in backend/.env, then restart the backend."}
    return {"integrations": [llm, email, crm, *simulated]}
