# Finsight

> A conversational AI that understands how real people talk about money.

Finsight is a full-stack web app that combines emotion detection, retrieval-augmented generation (RAG), and a conversational LLM to respond like a financially smart, empathetic friend — not a banking chatbot.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI (Python 3.11+) |
| LLM | Groq API — LLaMA 3 8B |
| Emotion Detection | GoEmotions BERT (`bhadresh-savani/bert-base-go-emotion`) |
| RAG | ChromaDB + sentence-transformers |
| Memory | In-process conversation buffer (per session) |

---

## Project Structure

```
Finsight/
├── backend/
│   ├── main.py                  # FastAPI app entrypoint
│   ├── requirements.txt
│   ├── .env.example
│   ├── ai/
│   │   ├── agent.py             # Agentic finance advisor
│   │   ├── emotion_detector.py  # GoEmotions BERT inference
│   │   ├── financial_tools.py   # Tools for agent
│   │   └── rag_pipeline.py      # ChromaDB RAG pipeline
│   └── routes/
│       ├── chat.py              # POST /api/chat
│       └── daily_advice.py      # GET /api/daily_advice
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       ├── hooks/
│       └── services/
├── data/                        # Financial knowledge base for RAG
│   ├── budgeting_basics.txt
│   ├── investing_basics.txt
│   └── ...
└── README.md
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free tier available)

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd Finsight
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Start the server
uvicorn main:app --reload --port 8001
```

> **Note:** On first startup, the app will:
> 1. Download the GoEmotions BERT model (~430 MB) from Hugging Face — one-time only.
> 2. Download the `all-MiniLM-L6-v2` embedding model (~90 MB) — one-time only.
> 3. Build the ChromaDB vector store from the `/data` text files.
>
> Subsequent starts are fast (models are cached locally by Hugging Face).

### 3. Frontend setup

Open a **new terminal window**:

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Visit `http://localhost:3001`

The Vite dev server automatically proxies all `/api` requests to `http://127.0.0.1:8001`, so no extra configuration is needed for local development.

---

## API Reference

### `POST /api/chat`

Send a message and receive an AI response.

**Request body:**
```json
{
  "message": "I got paid but I'm already broke again",
  "session_id": "optional-uuid-string"
}
```

**Response:**
```json
{
  "response": "Hey, I hear you — that paycheck disappearing feeling is so real...",
  "emotion": "stressed",
  "emotion_score": 0.847,
  "emotion_color": "#ef4444",
  "session_id": "generated-uuid"
}
```

### `GET /api/daily_advice`

Returns a daily financial tip.

### `GET /`

Health check — returns `{"status": "ok"}`.

---

## Deployment

### Backend → Render

1. Push code to GitHub.
2. In [Render](https://render.com), create a new **Web Service** pointing to your repo.
3. Set:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add `GROQ_API_KEY` in Render's environment variables dashboard.

### Frontend → Vercel

1. In [Vercel](https://vercel.com), import your GitHub repo.
2. Set:
   - **Framework preset:** Vite
   - **Root directory:** `frontend`
3. Add environment variable:
   - `VITE_API_URL` = `https://your-backend.onrender.com`
4. Deploy.

---

## How It Works

```
User types message
       │
       ▼
[GoEmotions BERT] ──→ Detects emotion (28 classes → friendly label + color)
       │
       ▼
[ChromaDB RAG] ──────→ Retrieves top-3 relevant passages from financial knowledge base
       │
       ▼
[Groq LLaMA 3] ──────→ Generates response using:
  • System prompt tuned to detected emotion
  • Retrieved financial context
  • Full conversation history
       │
       ▼
Response returned to frontend with emotion tag
```

---

## Adding Your Own Financial Knowledge

Drop any `.txt` file into the `/data` folder and restart the backend. The RAG pipeline re-indexes on every startup.

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GROQ_API_KEY` | Backend `.env` | Your Groq API key |
| `HF_TOKEN` | Backend `.env` (optional) | HuggingFace token for gated models |
| `VITE_API_URL` | Frontend `.env.local` | Backend URL (leave blank for local dev) |
