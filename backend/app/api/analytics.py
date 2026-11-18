from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.agents.analytics_agent import AnalyticsAgent
from app.services.activity import agent_run

router = APIRouter(prefix="/analytics", tags=["Sales Analytics & AI Insights"])

@router.get("/dashboard")
def get_dashboard_analytics(db: Session = Depends(get_db)):
    with agent_run(db, "Analytics Agent", "dashboard_metrics") as run:
        metrics = AnalyticsAgent.generate_dashboard_metrics(db)
        run["description"] = f"Computed the dashboard numbers from {metrics['kpis']['total_leads']} leads."
    db.commit()
    return metrics
