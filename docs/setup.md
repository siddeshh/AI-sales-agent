# Local Development & Setup Guide

This guide describes how to run the **AI Sales Agent — Autonomous Multi-Agent Sales Workforce** locally on Windows.

---

## Prerequisites
- **Python**: Version 3.10 or higher (Tested with Python 3.11.9)
- **Node.js**: Version 18 or higher (Tested with Node v22.14.0, npm 11.6.2)
- **Git** (optional)

---

## 1. Backend Setup

Open PowerShell and navigate to the project directory:

```powershell
cd backend
```

Create and activate virtual environment (if not already created):
```powershell
python -m venv venv
.\venv\Scripts\activate
```

Install backend requirements:
```powershell
pip install -r requirements.txt
```

Launch the FastAPI backend server:
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend starts at `http://127.0.0.1:8000`.
- Interactive Swagger API docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

The SQLite database (`sales_workforce.db`) will be automatically created and seeded with the Celestial Wear demo: 12 retail and bulk-apparel leads, 4 knowledge documents (catalogue, bulk price list, shipping and returns, customisation FAQ), conversations, meetings and follow-ups. Use **Reset demo data** to reload it.

---

## 2. Frontend Setup

In a new terminal window:

```powershell
cd frontend
```

Install dependencies:
```powershell
npm install
```

Launch the Vite development server:
```powershell
npm run dev
```

Open your browser at:
`http://localhost:5173/`

---

## 3. Language model and demo mode

- Copy `.env.example` to `backend\.env` and set `LLM_PROVIDER` plus `GROQ_API_KEY` (default provider), or `OPENAI_API_KEY`, or use a local `ollama`.
- With no key the app still runs: every agent falls back to its rule-based template and the message is stored with `provider="rules"`. The UI labels this as Demo mode.
- The **Settings** page provider form does not change the backend yet; use `backend\.env`.
- The navbar shows **Demo mode · Celestial Wear** because all leads and documents are seeded sample data. **Reset demo data** reloads that seed.
