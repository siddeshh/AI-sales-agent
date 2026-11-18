"""Real email over SMTP (e.g. Gmail with an app password).

EMAIL_TEST_MODE=true (default) sends every email to EMAIL_TEST_RECIPIENT instead of the lead, with the intended
recipient in the subject: "[to: lead@x.com] ...". send_email() never raises; it returns ok=True only when the
SMTP server accepted the message.
"""
import smtplib
import ssl
from email.message import EmailMessage
from typing import Dict, Optional

from app.core.config import settings

TIMEOUT_SECONDS = 20


def email_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def send_email(to: Optional[str], subject: str, body: str) -> Dict[str, Optional[str]]:
    """Returns {"ok": bool, "error": str | None, "delivered_to": str | None, "subject": str}."""
    if not email_configured():
        return {"ok": False, "error": "SMTP not configured: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM in backend/.env",
                "delivered_to": None, "subject": subject}
    if not to:
        return {"ok": False, "error": "Lead has no email address", "delivered_to": None, "subject": subject}

    recipient = to
    if settings.EMAIL_TEST_MODE:
        if not settings.EMAIL_TEST_RECIPIENT:
            return {"ok": False, "error": "EMAIL_TEST_MODE is on but EMAIL_TEST_RECIPIENT is empty",
                    "delivered_to": None, "subject": subject}
        recipient, subject = settings.EMAIL_TEST_RECIPIENT, f"[to: {to}] {subject}"

    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = settings.SMTP_FROM, recipient, subject
    msg.set_content(body)
    try:
        context = ssl.create_default_context()
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=TIMEOUT_SECONDS, context=context)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=TIMEOUT_SECONDS)
            server.starttls(context=context)
        with server:
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
            refused = server.send_message(msg)
        if refused:
            return {"ok": False, "error": f"SMTP server refused: {refused}", "delivered_to": None, "subject": subject}
        return {"ok": True, "error": None, "delivered_to": recipient, "subject": subject}
    except Exception as e:  # network, TLS, auth, protocol: report, never crash the request
        return {"ok": False, "error": f"{type(e).__name__}: {e}", "delivered_to": None, "subject": subject}
