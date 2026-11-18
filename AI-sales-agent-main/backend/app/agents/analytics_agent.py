from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.entities import Lead, Meeting, Conversation, ObjectionRecord, FollowUp

class AnalyticsAgent:
    """
    Agent K: Analytics Agent
    Responsibilities:
    - Funnel aggregation & stage transition velocity
    - Objection pattern clustering & resolution rates
    - Generates actionable executive "AI Sales Insights"
    """
    AGENT_NAME = "Analytics Agent"

    @classmethod
    def generate_dashboard_metrics(cls, db: Session) -> Dict[str, Any]:
        total_leads = db.query(Lead).count() or 0
        new_leads = db.query(Lead).filter(Lead.stage == "New").count() or 0
        hot_leads = db.query(Lead).filter(Lead.score_category == "Hot").count() or 0
        qualified_leads = db.query(Lead).filter(Lead.qualification_status == "Qualified").count() or 0
        meetings_scheduled = db.query(Meeting).filter(Meeting.status == "scheduled").count() or 0
        conversations_count = db.query(Conversation).count() or 0
        active_followups = db.query(FollowUp).filter(FollowUp.status == "pending").count() or 0

        # Calculate pipeline value
        leads_list = db.query(Lead).all()
        pipeline_value = sum(l.budget_numeric or 0 for l in leads_list if l.stage not in ["Lost"])

        conversion_rate = round((meetings_scheduled / total_leads * 100), 1) if total_leads > 0 else 0.0

        # Funnel stage counts
        funnel_stages = ["New", "Contacted", "Engaged", "Qualified", "Meeting Scheduled", "Won"]
        funnel_data = []
        for stg in funnel_stages:
            cnt = db.query(Lead).filter(Lead.stage == stg).count()
            funnel_data.append({
                "stage": stg,
                "count": cnt,
                "percentage": round((cnt / total_leads * 100), 1) if total_leads > 0 else 0
            })

        # Score distribution
        score_distribution = {
            "Hot (81-100)": db.query(Lead).filter(Lead.score_category == "Hot").count(),
            "Qualified (61-80)": db.query(Lead).filter(Lead.score_category == "Qualified").count(),
            "Warm (31-60)": db.query(Lead).filter(Lead.score_category == "Warm").count(),
            "Cold (0-30)": db.query(Lead).filter(Lead.score_category == "Cold").count(),
        }

        # Objection breakdown from recorded objections
        objection_rows = db.query(ObjectionRecord.objection_type, func.count(ObjectionRecord.id))             .group_by(ObjectionRecord.objection_type).all()
        total_obj = sum(c for _, c in objection_rows)
        resolved = dict(db.query(ObjectionRecord.objection_type, func.count(ObjectionRecord.id))
                        .filter(ObjectionRecord.resolution_status.in_(["Addressed", "Resolved"]))
                        .group_by(ObjectionRecord.objection_type).all())
        objections = sorted([
            {"type": t, "count": c, "percentage": round(c / total_obj * 100, 1),
             "addressed": resolved.get(t, 0)}
            for t, c in objection_rows], key=lambda x: -x["count"])

        # Insights computed from the data above (no fixed claims)
        insights: List[Dict[str, Any]] = []
        if hot_leads:
            insights.append({
                "id": "ins-hot", "type": "opportunity",
                "title": f"{hot_leads} hot lead{'s' if hot_leads != 1 else ''} (score 81+)",
                "description": "Highest-scoring leads by order value, urgency, buyer type, engagement, source and BANT.",
                "impact": "Prioritise today", "action_text": "Open leads", "action_type": "view_leads"})
        if objections:
            top = objections[0]
            tied = len(objections) > 1 and objections[1]["count"] == top["count"]
            insights.append({
                "id": "ins-objection", "type": "trend",
                "title": (f"{total_obj} objections recorded across {len(objections)} types, no single top type" if tied
                          else f"Top objection: {top['type']} ({top['percentage']}% of {total_obj} recorded)"),
                "description": f"{top['addressed']} of {top['count']} were answered by the Objection agent.",
                "impact": "Review playbook", "action_text": "Open conversations", "action_type": "view_conversations"})
        by_source: Dict[str, List[int]] = {}
        for l in leads_list:
            by_source.setdefault(l.source or "Unknown", []).append(l.lead_score or 0)
        if by_source:
            src, scores = max(by_source.items(), key=lambda kv: sum(kv[1]) / len(kv[1]))
            insights.append({
                "id": "ins-source", "type": "recommendation",
                "title": f"{src} leads score highest on average ({sum(scores) / len(scores):.0f}/100, {len(scores)} leads)",
                "description": "Average lead score per source across all leads in the pipeline.",
                "impact": "Source quality", "action_text": "Review lead sources", "action_type": "view_sources"})

        return {
            "agent_name": cls.AGENT_NAME,
            "kpis": {
                "total_leads": total_leads,
                "new_leads": new_leads,
                "hot_leads": hot_leads,
                "qualified_leads": qualified_leads,
                "meetings_scheduled": meetings_scheduled,
                "conversion_rate": conversion_rate,
                "pipeline_value_inr": pipeline_value,
                "ai_conversations_count": conversations_count,
                "active_followups": active_followups
            },
            "funnel": funnel_data,
            "score_distribution": score_distribution,
            "objections": objections,
            "insights": insights
        }
