import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.entities import Lead
from app.schemas.schemas import LeadCreate, LeadUpdate, LeadOut
from app.agents.orchestrator import WorkforceOrchestrator
from app.agents.lead_research_agent import LeadResearchAgent
from app.agents.qualification_agent import LeadQualificationAgent
from app.agents.communication_agent import SalesCommunicationAgent
from app.services.activity import agent_run

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
    # "₹1,20,000" / "120000" → 120000.0; no budget stays 0 (never invent one)
    numeric_budget = payload.budget_numeric
    if not numeric_budget and payload.budget:
        digits = "".join(c for c in payload.budget if c.isdigit() or c == ".")
        numeric_budget = float(digits) if digits.replace(".", "") else 0.0

    new_lead = Lead(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        company=payload.company,
        industry=payload.industry,
        job_title=payload.job_title,
        location=payload.location,
        budget=payload.budget,
        budget_numeric=numeric_budget or 0.0,
        requirements=payload.requirements,
        order_quantity=payload.order_quantity,
        buyer_type=payload.buyer_type,
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

MAX_IMPORT_ROWS = 500
BUYER_TYPES = {"wholesale", "corporate", "individual"}


@router.post("/import")
async def import_leads(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """CSV with columns: name, email, phone, company, job_title, location, budget, order_quantity, buyer_type,
    requirements, timeline, source. Each valid row goes through the normal intake (research, BANT, score).
    Bad rows are reported with their line number; they do not stop the others."""
    raw = await file.read()
    try:
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="The file is not UTF-8 text. Save it as CSV (UTF-8).")
    if not reader.fieldnames or "name" not in [f.strip().lower() for f in reader.fieldnames]:
        raise HTTPException(status_code=400, detail="CSV needs a header row with at least a 'name' column.")
    imported, errors = [], []
    for line, row in enumerate(reader, start=2):
        if line - 1 > MAX_IMPORT_ROWS:
            errors.append({"line": line, "error": f"Stopped: more than {MAX_IMPORT_ROWS} rows"})
            break
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        try:
            qty = row.get("order_quantity")
            buyer = row.get("buyer_type", "").lower()
            payload = LeadCreate(
                name=row["name"], email=row.get("email") or None, phone=row.get("phone") or None,
                company=row.get("company") or None, job_title=row.get("job_title") or None,
                location=row.get("location") or None, budget=row.get("budget") or None,
                order_quantity=int(qty) if qty else None,
                buyer_type=buyer if buyer in BUYER_TYPES else None,
                requirements=row.get("requirements") or None, timeline=row.get("timeline") or None,
                source=row.get("source") or "CSV Import",
            )
            if not payload.name:
                raise ValueError("name is empty")
            lead = create_lead(payload, auto_run_ai=True, db=db)
            imported.append({"id": lead.id, "name": lead.name, "lead_score": lead.lead_score,
                             "score_category": lead.score_category})
        except (ValueError, ValidationError) as e:
            db.rollback()
            errors.append({"line": line, "error": str(e).splitlines()[0]})
    return {"imported": imported, "errors": errors}


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

    with agent_run(db, "Research Agent", "research", lead) as run:
        res = LeadResearchAgent.research_lead(lead)
        lead.research_summary = res["research_summary"]
        lead.pain_points = res["pain_points"]
        lead.buying_intent = res["buying_intent"]
        run["description"] = f"Re-profiled {lead.name}: {res['persona_type'].lower()}."
    db.commit()
    return res

@router.post("/{lead_id}/score")
def trigger_lead_score(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    with agent_run(db, "Lead Qualification Agent", "score", lead) as run:
        res = LeadQualificationAgent.apply(lead, db)
        run["description"] = f"Re-scored {lead.name}: {lead.lead_score}/100 ({lead.score_category})."
    db.commit()
    db.refresh(lead)
    return res

@router.post("/{lead_id}/qualify")
def trigger_lead_qualification(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    with agent_run(db, "Lead Qualification Agent", "qualify", lead) as run:
        res = LeadQualificationAgent.apply_bant_checklist(lead)
        run["description"] = f"Re-checked {lead.name}'s BANT from the lead form: {lead.qualification_status.lower()}."
    db.commit()
    return res

@router.post("/{lead_id}/outreach")
def generate_lead_outreach(lead_id: int, channel: str = "whatsapp", db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    with agent_run(db, "Communication Agent", "outreach_draft", lead) as run:
        draft = SalesCommunicationAgent.generate_outreach(lead, channel=channel)
        run["description"] = f"Drafted a {channel} message for {lead.name} (not sent)."
    db.commit()
    return draft
