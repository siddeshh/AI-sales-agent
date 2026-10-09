from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.entities import Lead, LeadScoreFactor
from app.schemas.schemas import LeadCreate, LeadUpdate, LeadOut
from app.agents.orchestrator import WorkforceOrchestrator
from app.agents.lead_research_agent import LeadResearchAgent
from app.agents.lead_scoring_agent import LeadScoringAgent
from app.agents.qualification_agent import QualificationAgent
from app.agents.communication_agent import SalesCommunicationAgent

router = APIRouter(prefix="/leads", tags=["Leads"])

@router.get("", response_model=List[LeadOut])
def get_leads(
    stage: Optional[str] = None,
    score_category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Lead)
    if stage:
        query = query.filter(Lead.stage == stage)
    if score_category:
        query = query.filter(Lead.score_category == score_category)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Lead.name.ilike(search_fmt)) | 
            (Lead.email.ilike(search_fmt)) | 
            (Lead.location.ilike(search_fmt)) |
            (Lead.requirements.ilike(search_fmt))
        )
    return query.order_by(Lead.created_at.desc()).all()

@router.post("", response_model=LeadOut)
def create_lead(payload: LeadCreate, auto_run_ai: bool = True, db: Session = Depends(get_db)):
    # Parse numeric budget if given as string
    numeric_budget = payload.budget_numeric
    if not numeric_budget and payload.budget:
        b_str = payload.budget.lower()
        if "crore" in b_str or "cr" in b_str:
            num = float("".join([c for c in b_str if c.isdigit() or c == '.']) or 1)
            numeric_budget = num * 10000000.0
        elif "lakh" in b_str:
            num = float("".join([c for c in b_str if c.isdigit() or c == '.']) or 50)
            numeric_budget = num * 100000.0

    new_lead = Lead(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        company=payload.company,
        industry=payload.industry,
        job_title=payload.job_title,
        location=payload.location,
        budget=payload.budget,
        budget_numeric=numeric_budget or 8000000.0,
        requirements=payload.requirements,
        timeline=payload.timeline,
        source=payload.source,
        assigned_rep=payload.assigned_rep or "AI Sales Workforce",
        stage="New"
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)

    if auto_run_ai:
        WorkforceOrchestrator.run_lead_intake_pipeline(new_lead, db)
        db.refresh(new_lead)

    return new_lead

@router.get("/{lead_id}", response_model=LeadOut)
def get_lead_by_id(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.put("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(lead, field, val)

    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    return lead

@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return {"message": f"Lead {lead_id} successfully deleted"}

@router.post("/{lead_id}/research")
def trigger_lead_research(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    res = LeadResearchAgent.research_lead(lead)
    lead.research_summary = res["research_summary"]
    lead.pain_points = res["pain_points"]
    lead.buying_intent = res["buying_intent"]
    db.commit()
    return res

@router.post("/{lead_id}/score")
def trigger_lead_score(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    res = LeadScoringAgent.score_lead(lead)
    lead.lead_score = res["lead_score"]
    lead.conversion_probability = res["conversion_probability"]
    lead.score_category = res["score_category"]
    
    # Refresh factors
    db.query(LeadScoreFactor).filter(LeadScoreFactor.lead_id == lead.id).delete()
    for f in res["factors"]:
        factor_obj = LeadScoreFactor(
            lead_id=lead.id,
            factor_name=f["factor_name"],
            score_impact=f["score_impact"],
            explanation=f["explanation"],
            category=f["category"]
        )
        db.add(factor_obj)

    db.commit()
    db.refresh(lead)
    return res

@router.post("/{lead_id}/qualify")
def trigger_lead_qualification(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    res = QualificationAgent.evaluate_bant(lead)
    lead.qualification_status = res["qualification_status"]
    b = res["bant_breakdown"]
    lead.budget_qualified = b["budget_qualified"]
    lead.authority_qualified = b["authority_qualified"]
    lead.need_qualified = b["need_qualified"]
    lead.timeline_qualified = b["timeline_qualified"]
    db.commit()
    return res

@router.post("/{lead_id}/outreach")
def generate_lead_outreach(lead_id: int, channel: str = "whatsapp", db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return SalesCommunicationAgent.generate_outreach(lead, channel=channel)
