from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal, add_missing_columns
from app.services.seed_data import seed_database
from app.rag.engine import EmbeddingEngine, vector_store, reindex_stale

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
from app.api.ml import router as ml_router
from app.api.integrations import router as integrations_router
from app.api.dashboard import router as dashboard_router

# Ensure tables exist immediately
Base.metadata.create_all(bind=engine)
add_missing_columns()
EmbeddingEngine.load()  # once per process; first run downloads the model (~90 MB)
vector_store()
db_init = SessionLocal()
try:
    seed_database(db_init)
    reindex_stale(db_init)
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
    description="Nova AI Sales Agent: multi-agent sales assistant for retail and e-commerce SMEs (demo company: Celestial Wear).",
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
app.include_router(ml_router, prefix=settings.API_V1_STR)
app.include_router(integrations_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)

@app.get("/api/info")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "demo_company": "Celestial Wear",
    }

@app.get("/health")
def healthcheck():
    return {"status": "healthy"}


# --- Production: serve the built React app (frontend/dist) from this same server -------------------
# In development Vite serves the frontend on :5173 and proxies /api here, so this block is skipped.
import os
from pathlib import Path
from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", Path(__file__).resolve().parents[2] / "frontend" / "dist"))
if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        file = (FRONTEND_DIST / full_path).resolve()
        if full_path and file.is_file() and FRONTEND_DIST.resolve() in file.parents:
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")  # React Router handles /app, /app/leads, ...
