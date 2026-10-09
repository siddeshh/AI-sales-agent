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
    LLM_PROVIDER: str = "mock"  # "mock", "openai", "groq", "anthropic", "ollama"
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    # Qdrant Vector DB (optional; falls back to embedded semantic vector engine)
    QDRANT_URL: Optional[str] = None
    QDRANT_API_KEY: Optional[str] = None
    
    # Default Demo Industry
    DEFAULT_INDUSTRY: str = "real_estate"  # "real_estate", "saas", "edtech", "automotive", "b2b_services"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
