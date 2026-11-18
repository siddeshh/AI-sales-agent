from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal, add_missing_columns
from app.services.seed_data import seed_database
from app.rag.engine import EmbeddingEngine, vector_store

# Import API Routers
from app.api.auth import router as auth_router
from app.api.leads import router as leads_router
from app.api.chat import router as chat_router
from app.api.voice import router as voice_router
from app.api.knowledge import router as knowledge_router
from app.api.followups import router as followups_router
from app.api.meetings import router as meetings_router
from app.api.crm import router as crm_router
from app.api.analytics import router as analytics_router
from app.api.agents import router as agents_router
from app.api.demo import router as demo_router

# Ensure tables exist immediately
Base.metadata.create_all(bind=engine)
add_missing_columns()
EmbeddingEngine.load()  # once per process; first run downloads the model (~90 MB)
vector_store()
db_init = SessionLocal()
try:
    seed_database(db_init)
finally:
    db_init.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup check
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Autonomous Multi-Agent Sales Workforce platform coordinating 11 specialized AI sales agents.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(leads_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(voice_router, prefix=settings.API_V1_STR)
app.include_router(knowledge_router, prefix=settings.API_V1_STR)
app.include_router(followups_router, prefix=settings.API_V1_STR)
app.include_router(meetings_router, prefix=settings.API_V1_STR)
app.include_router(crm_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(agents_router, prefix=settings.API_V1_STR)
app.include_router(demo_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "workforce_agents": 11,
        "demo_industry": settings.DEFAULT_INDUSTRY
    }

@app.get("/health")
def healthcheck():
    return {"status": "healthy"}
