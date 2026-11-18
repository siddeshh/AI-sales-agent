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
cd "d:\Projects\AI Sales Agent\backend"
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

The SQLite database (`sales_workforce.db`) will be automatically created and seeded with realistic demo prospects (Rahul Sharma, Priya Mehta, Amit Patil), official property brochures, and scheduled meetings.

---

## 2. Frontend Setup

In a new terminal window:

```powershell
cd "d:\Projects\AI Sales Agent\frontend"
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

## 3. Demo Mode & Offline Execution

The platform is configured with **Demo Mode (`LLM_PROVIDER="mock"`) enabled by default**.
- **100% Offline Capability**: No third-party API keys (OpenAI / Anthropic) are required to demonstrate the complete 20-step sales workflow.
- **Switch to External LLMs**: You can supply your `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in `backend/.env` or directly through the UI in **Settings & Models**.
