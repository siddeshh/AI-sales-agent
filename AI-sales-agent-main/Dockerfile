# Nova AI Sales Agent on Render: one container = FastAPI backend + built React frontend.
# Uses fastembed (ONNX) instead of PyTorch so it fits Render's 512 MB free tier.

# 1) Build the frontend
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) Backend + built frontend
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    EMBEDDING_BACKEND=fastembed \
    FASTEMBED_CACHE_PATH=/app/.fastembed
WORKDIR /app

COPY backend/requirements-render.txt backend/requirements-render.txt
RUN pip install -r backend/requirements-render.txt

COPY . .
COPY --from=web /web/dist frontend/dist

# Download the embedding model (90 MB) at build time so startup is fast
RUN python -c "from fastembed import TextEmbedding; TextEmbedding('sentence-transformers/all-MiniLM-L6-v2', cache_dir='/app/.fastembed')"

WORKDIR /app/backend
# Render sets $PORT; default 8000 for running the image locally
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
