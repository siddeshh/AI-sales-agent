from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db, Base, engine
from app.services.seed_data import seed_database
from app.core.config import settings

router = APIRouter(prefix="/demo", tags=["Demo Mode & Multi-Industry Engine"])

AVAILABLE_INDUSTRIES = [
    {
        "id": "real_estate",
        "name": "Real Estate (Default)",
        "lead_sample": "Rahul Sharma (₹80 Lakh, 2 BHK Pune)",
        "meeting_type": "Site Visit",
        "currency": "INR (₹ Lakh / Crore)",
        "description": "Luxury residential township sales, RERA compliance, carpet area specifications, and site visits."
    },
    {
        "id": "saas",
        "name": "B2B Enterprise SaaS",
        "lead_sample": "David Chen ($45,000 ARR, SOC2 CRM)",
        "meeting_type": "Product Demo",
        "currency": "USD ($)",
        "description": "Subscription software sales, seat licenses, API integrations, and security reviews."
    },
    {
        "id": "edtech",
        "name": "EdTech & Higher Education",
        "lead_sample": "Ananya Roy (₹2.5 Lakh, AI Executive MBA)",
        "meeting_type": "Admissions Counseling",
        "currency": "INR (₹)",
        "description": "Executive education enrollment, cohort placement, EMI financing, and syllabus review."
    },
    {
        "id": "automotive",
        "name": "Automotive Dealerships",
        "lead_sample": "Vikram Malhotra (₹28 Lakh, EV SUV)",
        "meeting_type": "Test Drive",
        "currency": "INR (₹ Lakh)",
        "description": "Vehicle booking, test drive scheduling, battery warranty, and trade-in valuation."
    }
]

class IndustrySwitchRequest(BaseModel):
    industry_id: str

@router.get("/industries")
def get_industries():
    return {
        "current_industry": settings.DEFAULT_INDUSTRY,
        "available_industries": AVAILABLE_INDUSTRIES
    }

@router.post("/switch-industry")
def switch_industry(payload: IndustrySwitchRequest):
    settings.DEFAULT_INDUSTRY = payload.industry_id
    return {
        "message": f"Active workforce industry context updated to '{payload.industry_id}'",
        "current_industry": settings.DEFAULT_INDUSTRY
    }

@router.post("/reset")
def reset_demo_data(db: Session = Depends(get_db)):
    """
    Resets and refreshes database with rich demo dataset
    """
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_database(db)
    return {
        "status": "success",
        "message": "Demo database successfully reset with pre-populated leads, knowledge documents, conversations, and meetings!"
    }
