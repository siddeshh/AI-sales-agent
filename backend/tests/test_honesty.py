"""Checks that the UI's numbers and labels match what the code does.

Run from backend/:   .\\venv\\Scripts\\python tests\\test_honesty.py
Throwaway SQLite DB, no LLM key, and a fake SMTP server (no real email is sent).
"""
import os
import sys
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(tempfile.mkdtemp(), 'honesty.db')}"
os.environ["LLM_PROVIDER"] = "mock"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.models.entities import Lead, Meeting, FollowUp  # noqa: E402
from app.services.activity import AGENTS  # noqa: E402
import app.services.email as email_mod  # noqa: E402

client = TestClient(app)


def reset():
    assert client.post("/api/demo/reset").status_code == 200


def test_exactly_ten_agents():
    agents = client.get("/api/agents/status").json()["agents"]
    assert len(AGENTS) == 10 and [a["name"] for a in agents] == AGENTS


def test_every_log_row_is_timed():
    reset()
    lead = client.get("/api/leads").json()[0]
    client.post("/api/chat/message", json={"lead_id": lead["id"], "content": "That's too expensive"})
    client.get("/api/analytics/dashboard")
    logs = client.get("/api/agents/activities?limit=500").json()
    assert logs and all(l["duration_ms"] is not None and l["duration_ms"] >= 0 for l in logs)
    assert all(l["agent_name"] in AGENTS + ["Orchestrator"] for l in logs)
    assert {"Objection Agent", "Analytics Agent", "Lead Qualification Agent"} <= {l["agent_name"] for l in logs}


def test_metrics_add_up():
    reset()
    d = client.get("/api/analytics/dashboard").json()
    k = d["kpis"]
    db = SessionLocal()
    total = db.query(Lead).count()
    with_meeting = len({m.lead_id for m in db.query(Meeting).filter(Meeting.status != "cancelled").all()})
    won = db.query(Lead).filter(Lead.stage == "Won").count()
    db.close()
    assert k["total_leads"] == total and k["leads_with_meeting"] == with_meeting and k["won_leads"] == won
    assert k["meeting_rate"] == round(with_meeting / total * 100, 1)
    assert k["win_rate"] == round(won / total * 100, 1)
    assert sum(f["count"] for f in d["funnel"]) == total
    assert "conversion_rate" not in k
    assert f"{with_meeting} ÷ {total}" in d["formulas"]["meeting_rate"]


def _email_followup():
    db = SessionLocal()
    fu = db.query(FollowUp).filter(FollowUp.channel == "email").first()
    lead_email, fid = fu.lead.email, fu.id
    db.close()
    return fid, lead_email


class FakeSMTP:
    sent = []

    def __init__(self, host, port, timeout=None):
        self.host = host

    def starttls(self, context=None):
        pass

    def login(self, user, password):
        pass

    def send_message(self, msg):
        FakeSMTP.sent.append(msg)
        return {}

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class BrokenSMTP(FakeSMTP):
    def __init__(self, host, port, timeout=None):
        raise OSError("connection refused")


def test_email_not_configured_is_not_sent():
    reset()
    settings.SMTP_HOST = None
    fid, _ = _email_followup()
    r = client.post(f"/api/followups/execute/{fid}").json()
    assert r["status"] == "not_sent" and "SMTP not configured" in r["send_error"]


def test_email_test_mode_redirects_and_marks_sent():
    reset()
    settings.SMTP_HOST, settings.SMTP_FROM, settings.SMTP_PORT = "smtp.example.test", "sales@celestialwear.in", 587
    settings.EMAIL_TEST_MODE, settings.EMAIL_TEST_RECIPIENT = True, "tester@example.test"
    email_mod.smtplib.SMTP = FakeSMTP
    fid, lead_email = _email_followup()
    r = client.post(f"/api/followups/execute/{fid}").json()
    msg = FakeSMTP.sent[-1]
    assert r["status"] == "sent" and r["delivered_to"] == "tester@example.test"
    assert msg["To"] == "tester@example.test" and msg["Subject"].startswith(f"[to: {lead_email}] ")
    assert client.post(f"/api/followups/execute/{fid}").status_code == 409  # no double send


def test_email_failure_is_reported_not_crashed():
    reset()
    email_mod.smtplib.SMTP = BrokenSMTP
    fid, _ = _email_followup()
    resp = client.post(f"/api/followups/execute/{fid}")
    assert resp.status_code == 200
    r = resp.json()
    assert r["status"] == "not_sent" and "connection refused" in r["send_error"]
    logs = client.get("/api/agents/activities?limit=5").json()
    assert logs[0]["agent_name"] == "Follow-up Agent" and logs[0]["status"] == "error"


def test_whatsapp_is_simulated():
    reset()
    db = SessionLocal()
    fid = db.query(FollowUp).filter(FollowUp.channel == "whatsapp").first().id
    db.close()
    r = client.post(f"/api/followups/execute/{fid}").json()
    assert r["status"] == "simulated"
    badges = {i["name"]: i["badge"] for i in client.get("/api/integrations").json()["integrations"]}
    assert badges["Email"] == "Email — real (SMTP)"
    assert badges["Internal CRM"] == "Internal CRM — real (this app's database)"
    assert all(badges[n] == "Demo mode — simulated" for n in ["Salesforce", "HubSpot", "Zoho", "WhatsApp", "Google Calendar"])


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    for t in [test_exactly_ten_agents, test_every_log_row_is_timed, test_metrics_add_up,
              test_email_not_configured_is_not_sent, test_email_test_mode_redirects_and_marks_sent,
              test_email_failure_is_reported_not_crashed, test_whatsapp_is_simulated]:
        t()
        print(f"PASS {t.__name__}")
