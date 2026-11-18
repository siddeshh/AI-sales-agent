from pydantic_settings import BaseSettings
from typing import Optional, List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Sales Agent — Autonomous Multi-Agent Sales Workforce"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = "ai-sales-workforce-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = "sqlite:///./sales_workforce.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # AI Engine & LLM Settings
    DEMO_MODE: bool = True
    LLM_PROVIDER: str = "groq"  # "groq", "openai", "ollama"; "mock" forces rule-based fallback
    LLM_MODEL: Optional[str] = None  # None or "" → provider default (see app/services/llm.py)
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    # Injected into every reply prompt. Default matches the seeded demo knowledge base.
    COMPANY_PROFILE: str = (
        "Celestial Wear, a D2C apparel brand from Bengaluru. Sells tees, polos, hoodies, sweatshirts, kurtas, "
        "joggers, caps and totes online, and takes bulk/wholesale orders (boutiques, resellers, corporate gifting, "
        "college fests) with custom printing and embroidery. Meetings are product demo / sample review calls "
        "(Google Meet) or showroom visits at the Indiranagar studio."
    )
    
    # Knowledge base / RAG
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    VECTOR_STORE: str = "sqlite"  # "sqlite" (vectors as JSON in the DB) or "qdrant"
    RAG_TOP_K: int = 4
    RAG_SIMILARITY_THRESHOLD: float = 0.35

    # Qdrant (only when VECTOR_STORE="qdrant"): server at QDRANT_URL, else embedded on-disk at QDRANT_PATH
    QDRANT_URL: Optional[str] = None
    QDRANT_API_KEY: Optional[str] = None
    QDRANT_PATH: str = "./qdrant_data"
    
    # Offline lead-scoring experiment output (ml/lead_scoring/experiment.py --out ...), shown on the Analytics page
    ML_RESULTS_DIR: str = "../ml/lead_scoring/output"

    # Default Demo Industry
    DEFAULT_INDUSTRY: str = "retail"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
