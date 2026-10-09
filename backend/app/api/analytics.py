from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.agents.analytics_agent import AnalyticsAgent

router = APIRouter(prefix="/analytics", tags=["Sales Analytics & AI Insights"])

@router.get("/dashboard")
def get_dashboard_analytics(db: Session = Depends(get_db)):
    metrics = AnalyticsAgent.generate_dashboard_metrics(db)
    return metrics
