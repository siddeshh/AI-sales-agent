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
        "Skyline Urban Living, developer of 'Skyline Greens', a residential township in Hinjawadi Phase 1, Pune. "
        "Sells 2 BHK and 3 BHK apartments; meetings are site visits or virtual consultations."
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
    
    # Default Demo Industry
    DEFAULT_INDUSTRY: str = "real_estate"  # "real_estate", "saas", "edtech", "automotive", "b2b_services"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
