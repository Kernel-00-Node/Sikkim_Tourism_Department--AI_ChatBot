# Sikkim Tourism and Civil Aviation Department Assistant

> **AI-Powered Travel Chatbot for the Tourism & Civil Aviation Department, Government of Sikkim.**
>
> Built with LangChain · Qdrant · Google Gemini · FastAPI · React 18

---

## Table of Contents

- [Sikkim Tourism and Civil Aviation Department Assistant](#sikkim-tourism-and-civil-aviation-department-assistant)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [What's New in v2.0](#whats-new-in-v20)
  - [Tech Stack](#tech-stack)
  - [Architecture](#architecture)
  - [Quick Start](#quick-start)
    - [macOS](#macos)
    - [Linux (Ubuntu / Debian / Fedora)](#linux-ubuntu--debian--fedora)
    - [Windows 10 / 11](#windows-10--11)
  - [Manual Setup (All Platforms)](#manual-setup-all-platforms)
    - [Backend](#backend)
    - [Frontend](#frontend)
    - [Running Tests](#running-tests)
  - [Environment Variables](#environment-variables)
    - [Core (required)](#core-required)
    - [AI / Model](#ai--model)
    - [Database](#database)
    - [MySQL (only when `USE_MOCK_DB=false`)](#mysql-only-when-use_mock_dbfalse)
    - [Vector Store (Qdrant)](#vector-store-qdrant)
    - [Server](#server)
    - [Admin / Security](#admin--security)
  - [Security Features](#security-features)
  - [API Reference](#api-reference)
    - [Chat endpoint — SSE format](#chat-endpoint--sse-format)
  - [RAG Pipeline](#rag-pipeline)
  - [Vector Store Modes](#vector-store-modes)
  - [Switching to MySQL](#switching-to-mysql)
  - [Project Structure](#project-structure)

---

## Overview

The Sikkim Tourism Assistant is a production-grade Retrieval-Augmented Generation (RAG) chatbot that answers questions about travel destinations across Sikkim. It uses semantic vector search to retrieve the most relevant destination data, then generates grounded, accurate answers through Google Gemini — all streamed in real time to the browser.

**Zero external services needed in dev mode.** The vector store (Qdrant) runs in-memory and the database falls back to rich mock data, so the app works fully offline with only API keys.

---

## What's New in v2.0


| Area                | v1               | v2 (this version)                                                      |
| ------------------- | ---------------- | ---------------------------------------------------------------------- |
| RAG retrieval       | Keyword scoring  | **Vector similarity search via Qdrant**                                |
| Orchestration       | Manual API calls | **LangChain LCEL pipeline**                                            |
| Conversation memory | Manual dict      | **History-aware retriever** (rephrases follow-ups)                     |
| Vector store        | None             | **Qdrant in-memory** (zero setup) or remote                            |
| Embeddings          | None             | **Gemini `gemini-embedding-001`** (3072-dim, auto-detected at runtime) |
| Auto-sync           | N/A              | Qdrant**auto-populated on startup** from DB                            |
| Live re-sync        | N/A              | `POST /api/admin/sync` — **key-protected**, no restart needed         |
| LLM provider        | Gemini only      | **Gemini + Groq** (configurable)                                       |
| API hardening       | None             | **Rate limiting, admin auth, security headers, locked-down CORS**      |

---

## Tech Stack


| Layer               | Technology                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **Backend**         | Python 3.11 · FastAPI · Uvicorn                                                        |
| **AI / LLM**        | LangChain LCEL · Google Gemini (`gemini-2.5-flash`) · Groq (`llama-3.3-70b-versatile`) |
| **Embeddings**      | Gemini`gemini-embedding-001` — 3072-dim (auto-detected), API-based                      |
| **RAG**             | History-aware retriever + stuff-documents chain (LangChain)                              |
| **Vector Store**    | Qdrant — in-memory by default, remote optional                                          |
| **Database (dev)**  | Mock in-memory (Python dicts, no server needed)                                          |
| **Database (prod)** | MySQL — auto-syncs to Qdrant on startup                                                 |
| **Frontend**        | React 18 · Vite · TypeScript · Tailwind CSS v4                                        |
| **Animations**      | Framer Motion                                                                            |
| **Routing**         | Wouter                                                                                   |
| **UI Components**   | Radix UI primitives                                                                      |
| **Validation**      | Zod · Pydantic v2                                                                       |

---

## Architecture

```
Browser (React + Vite)
       │
       │  HTTP / SSE  (Vite dev proxy → localhost:8000)
       ▼
FastAPI  (uvicorn, async)
       │
       ├── GET  /api/destinations/*   →  Database layer (mock or MySQL)
       │
       └── POST /api/conversations/{id}/chat
                │
                ▼
        [History-aware retriever]
          Rephrases follow-up questions into a standalone search query
          using chat history + Gemini
                │
                ▼
        [Qdrant vector similarity search]
          Embeds the query with Gemini gemini-embedding-001
          Returns top-4 most relevant destination documents
                │
                ▼
        [Stuff-documents chain]
          Injects retrieved destinations into the Gemini system prompt
                │
                ▼
        [Gemini 1.5 Flash  /  Groq Llama 3.3]
          Generates a grounded, accurate response
                │
                ▼
        [SSE stream → browser]
          Token-by-token real-time streaming
```

---

## Quick Start

> **One-command setup scripts** are provided for each OS.
> They create the Python virtual environment, install all dependencies,
> and copy `.env.example` → `.env` automatically.

### macOS

Requires **Homebrew**. The script installs Python 3.11 and Node.js automatically if missing.

```bash
# Clone the repository
git clone https://github.com/Kernel-00-Node/Sikkim_Tourism__AI_ChatBot.git

cd Sikkim_Tourism__AI_ChatBot

# Run the setup script
chmod +x scripts/setup-mac.sh
./scripts/setup-mac.sh

# Edit your API keys
nano backend/.env          # add GEMINI_API_KEY and GROQ_API_KEY

# Terminal 1 — Backend
cd backend
source v_env/bin/activate
python main.py             # → http://localhost:8000

# Terminal 2 — Frontend
cd frontend
npm run dev                # → http://localhost:5173
```

---

### Linux (Ubuntu / Debian / Fedora)

The script auto-detects `apt`, `dnf`, or `pacman` and installs the right system packages.

```bash
git clone https://github.com/Kernel-00-Node/Sikkim_Tourism__AI_ChatBot.git

cd Sikkim_Tourism__AI_ChatBot

chmod +x scripts/setup-linux.sh
./scripts/setup-linux.sh

# Edit your API keys
nano backend/.env          # add GEMINI_API_KEY and GROQ_API_KEY

# Terminal 1 — Backend
cd backend && source v_env/bin/activate && python main.py

# Terminal 2 — Frontend
cd frontend && npm run dev
```

---

### Windows 10 / 11

**Prerequisites** — install these first if not already present:


| Tool        | Download                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------- |
| Python 3.11 | https://www.python.org/downloads/release/python-3119/ — ⚠ tick**"Add Python to PATH"** |
| Node.js 20  | https://nodejs.org/en/download                                                           |
| Git         | https://git-scm.com/download/win                                                         |

```bat
REM Clone the repo (Git Bash or Command Prompt)
git clone https://github.com/Kernel-00-Node/Sikkim_Tourism__AI_ChatBot.git

cd Sikkim_Tourism__AI_ChatBot

REM Run the setup script
scripts\setup-windows.bat
```

After setup completes:

```bat
REM Edit API keys
notepad backend\.env

REM Command Prompt 1 — Backend
cd backend
v_env\Scripts\activate.bat
python main.py

REM Command Prompt 2 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Manual Setup (All Platforms)

If you prefer to set up without the scripts:

### Backend

```bash
cd backend

# Create and Activate a Virtual Environment
python3.11 -m venv v_env          # macOS / Linux
# python -m venv v_env            # Windows

source v_env/bin/activate         # macOS / Linux
# v_env\Scripts\activate.bat      # Windows (Command Prompt)
# v_env\Scripts\Activate.ps1      # Windows (PowerShell)

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Open .env and fill in GEMINI_API_KEY (required) and GROQ_API_KEY

# Start the server
python main.py
# Server starts on http://localhost:8000
# Qdrant is auto-populated with all destination data on startup
```

### Frontend

```bash
cd frontend
npm install          # or: pnpm install
npm run dev          # → http://localhost:5173
```

Vite automatically proxies every `/api/*` request to `http://localhost:8000` — no CORS or port changes needed in dev.

### Running Tests

The backend ships with a `pytest` suite covering health checks, chat, destinations, and admin auth — fully offline, no real Gemini/Groq/MySQL calls required:

```bash
cd backend
source v_env/bin/activate     # v_env\Scripts\activate.bat on Windows
pip install -r requirements-dev.txt
pytest
```

### Production deployment (Vercel + Render)

The Vercel rewrite in `frontend/vercel.json` already proxies `/api/*` to the
Render service. In Render, set the backend root directory to `backend`, use
`pip install -r requirements.txt` as the build command, and use:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

as the start command. The included `.python-version` pins Python 3.11. Set
`ENVIRONMENT=production`, `ALLOWED_ORIGINS=https://<your-vercel-domain>`,
`GEMINI_API_KEY`, `GROQ_API_KEY`, and a strong `ADMIN_API_KEY` in Render's
environment settings. Do not commit real keys to the repository.

Keep `ENABLE_CIRCULAR_SCRAPER=false` on a 512 MiB web service. The automated
scraper starts a headless browser, so run it separately on a worker with more
memory if it is needed. Install its extra packages with
`pip install -r requirements-circular-scraper.txt`; normal API operation and
manual circular uploads do not require those packages.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values below.

### Core (required)


| Variable         | Default      | Description                                                                      |
| ---------------- | ------------ | -------------------------------------------------------------------------------- |
| `GEMINI_API_KEY` | _(required)_ | [Get one free at Google AI Studio](https://aistudio.google.com/app/apikey)       |
| `GROQ_API_KEY`   | _(optional)_ | [Get one free at console.groq.com](https://console.groq.com) — enables Groq LLM |

### AI / Model


| Variable                 | Default                       | Description                                          |
| ------------------------ | ----------------------------- | ---------------------------------------------------- |
| `GEMINI_MODEL`           | `gemini-2.5-flash`            | Stable Gemini multimodal model used for image analysis |
| `GEMINI_EMBEDDING_MODEL` | `models/gemini-embedding-001` | Embedding model (3072-dim, auto-detected at runtime) |
| `GROQ_MODEL`             | `llama-3.3-70b-versatile`     | Groq LLM model                                       |
| `TAVILY_API_KEY`         | _(empty)_                     | Optional live Sikkim travel updates                   |

### Database


| Variable      | Default | Description                                    |
| ------------- | ------- | ---------------------------------------------- |
| `USE_MOCK_DB` | `true`  | `true` = in-memory mock data (no MySQL needed) |

### MySQL (only when `USE_MOCK_DB=false`)


| Variable         | Default          |
| ---------------- | ---------------- |
| `MYSQL_HOST`     | `localhost`      |
| `MYSQL_PORT`     | `3306`           |
| `MYSQL_USER`     | `root`           |
| `MYSQL_PASSWORD` | _(empty)_        |
| `MYSQL_DATABASE` | `sikkim_tourism` |

For an existing database created before geographic coordinates were added,
apply [`docs/migrations/001_add_destination_coordinates.sql`](docs/migrations/001_add_destination_coordinates.sql)
once, then populate `latitude` and `longitude` for each destination to enable
the frontend weather panels.

### Vector Store (Qdrant)


| Variable            | Default               | Description                                                 |
| ------------------- | --------------------- | ----------------------------------------------------------- |
| `QDRANT_URL`        | _(empty)_             | Leave empty for in-memory mode. Set to connect to a server. |
| `QDRANT_API_KEY`    | _(empty)_             | Only needed for Qdrant Cloud                                |
| `QDRANT_COLLECTION` | `sikkim_destinations` | Qdrant collection name                                      |

### Server


| Variable          | Default                      | Description                                                                      |
| ----------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS` | `http://localhost:5173`      | CORS allowed origins. In production, set to your exact frontend URL — never`*`. |
| `ALLOWED_METHODS` | `GET,POST,OPTIONS`           | CORS allowed HTTP methods.                                                       |
| `ALLOWED_HEADERS` | `Content-Type,Authorization` | CORS allowed request headers.                                                    |
| `ENVIRONMENT`     | `development`                | Set to`production` to enable HSTS and other production-only behavior.            |
| `ENABLE_CIRCULAR_SCRAPER` | `false` | Enables the scheduled Selenium/Firefox scraper. Leave off on a 512 MiB web service. |

### Admin / Security


| Variable        | Default   | Description                                                                                                                                                                                                                                       |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_API_KEY` | _(empty)_ | Required to call`POST /api/admin/sync`. If unset, admin endpoints are **disabled (fail-closed)** rather than left open. Generate one with `python -c "import secrets; print(secrets.token_urlsafe(32))"` and send it as the `X-Admin-Key` header. |

---

## Security Features

The API ships with several hardening measures on by default:


| Feature              | Detail                                                                                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Rate limiting**    | Conversation creation is capped at 20/minute and chat turns at 30/minute per IP (`slowapi`).                                                                                                                                            |
| **Admin auth**       | `/api/admin/sync` requires an `X-Admin-Key` header matching `ADMIN_API_KEY`, compared using a constant-time check (`hmac.compare_digest`) to avoid timing attacks. The endpoint fails closed (503) if no key is configured.          |
| **Security headers** | Every response includes`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP, and a restrictive `Permissions-Policy`. `Strict-Transport-Security` is added automatically when `ENVIRONMENT=production`. |
| **Locked-down CORS** | Allowed origins, methods, and headers are all explicitly configurable — no wildcard`*` origin by default.                                                                                                                           |

---

## API Reference

Interactive docs available at **http://localhost:8000/api/docs** (Swagger UI) after starting the backend.


| Method | Path                           | Description                                                                                                                             |
| ------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/health`                  | Health check — returns`db_mode`, `qdrant_mode`, `ai_configured`                                                                        |
| `GET`  | `/api/destinations/`           | List destinations — supports`?search=` and `?category=`                                                                                |
| `GET`  | `/api/destinations/categories` | All available category slugs                                                                                                            |
| `GET`  | `/api/destinations/{id}`       | Full destination detail                                                                                                                 |
| `POST` | `/api/conversations/`          | Create a new conversation                                                                                                               |
| `GET`  | `/api/conversations/{id}`      | Fetch conversation + message history                                                                                                    |
| `POST` | `/api/conversations/{id}/chat` | Send a message →**SSE stream** of AI tokens                                                                                            |
| `POST` | `/api/admin/sync`              | Re-index Qdrant from the current database without restarting — requires`X-Admin-Key` header (see [Admin / Security](#admin--security)) |

### Chat endpoint — SSE format

```
POST /api/conversations/{id}/chat
Content-Type: application/json

{ "message": "What are the best places in North Sikkim?" }
```

Response is a **Server-Sent Events** stream:

```
data: The best places in North

data:  Sikkim include...

data: [DONE]
```

---

## RAG Pipeline

```
User message
    │
    ▼
[1] History-aware retriever
    Uses previous chat turns to rephrase the user's question into a
    self-contained search query (handles "tell me more", "what about that?" etc.)
    │
    ▼
[2] Qdrant vector similarity search
    The standalone query is embedded with Gemini gemini-embedding-001
    The top-4 closest destination documents are retrieved
    │
    ▼
[3] Stuff-documents chain
    Retrieved documents are formatted and injected into the system prompt
    │
    ▼
[4] Gemini 1.5 Flash  (or Groq Llama 3.3)
    Generates a grounded, factually anchored response
    │
    ▼
[5] SSE stream
    Tokens are streamed to the browser in real time via Server-Sent Events
```

---

## Vector Store Modes


| Mode                      | Configuration                                                   | Best for                               |
| ------------------------- | --------------------------------------------------------------- | -------------------------------------- |
| **In-memory** _(default)_ | `QDRANT_URL=` _(empty)_                                         | Dev, testing, mock DB mode             |
| **Local server**          | `QDRANT_URL=http://localhost:6333`                              | Persistent local dev (requires Docker) |
| **Qdrant Cloud**          | `QDRANT_URL=https://xyz.cloud.qdrant.io` + `QDRANT_API_KEY=...` | Production                             |

To run a local Qdrant server with Docker:

```bash
docker run -p 6333:6333 qdrant/qdrant
```

---

## Switching to MySQL

1. Run the database schema:

   ```bash
   mysql -u root -p < docs/schema.sql
   ```
2. Update `backend/.env`:

   ```ini
   USE_MOCK_DB=false
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=yourpassword
   MYSQL_DATABASE=sikkim_tourism
   ```
3. Restart the backend — Qdrant is **automatically re-populated** from MySQL on startup.

No other changes are needed. The vector store, RAG chain, and frontend all work identically in both modes.

---

## Project Structure

```
Sikkim_Tourism__AI_ChatBot/
│
├── backend/
│   ├── app/
│   │   ├── config.py              # Pydantic settings — reads .env
│   │   ├── startup.py             # Qdrant auto-population on startup + /api/admin/sync logic
│   │   ├── dependencies.py        # Admin-key auth guard (constant-time check, fail-closed)
│   │   ├── database/
│   │   │   ├── base.py            # Abstract repository interface
│   │   │   ├── factory.py         # Picks Mock vs MySQL repo based on USE_MOCK_DB
│   │   │   ├── mock_data.py       # Seeded destination records used in mock mode
│   │   │   ├── mock_repo.py       # In-memory mock data (dev default)
│   │   │   └── mysql_repo.py      # MySQL repository (production)
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── chat.py            # Conversation + SSE chat endpoint
│   │   │   └── destinations.py    # Destination list/detail endpoints
│   │   └── services/
│   │       ├── rag_chain.py       # LangChain LCEL RAG chain (Groq LLM + Gemini embeddings)
│   │       └── vectorstore.py     # Qdrant client + embedding helpers
│   ├── main.py                    # FastAPI app + security middleware + CORS + rate limiting + lifespan
│   ├── list_models.py             # Utility: lists Gemini models available to your API key
│   ├── requirements.txt
│   ├── .env.example               # Template — copy to .env and fill in keys
│   └── tests/                     # Pytest suite (health, chat, destinations, admin auth)
│
├── docs/
│   └── schema.sql                 # MySQL schema for production (repo root, not backend/)
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx               # React entry point
│   │   ├── App.tsx                # Router + layout wrapper
│   │   ├── config/
│   │   │   ├── brand.ts           # Government of Sikkim logo path
│   │   │   ├── chat-theme.ts      # Theme-aware colour tokens for the chat surfaces
│   │   │   └── hero-media.ts      # Home page hero video/poster paths
│   │   ├── hooks/
│   │   │   ├── use-mobile.tsx
│   │   │   └── use-toast.ts
│   │   ├── lib/
│   │   │   ├── api.ts             # Typed API client (fetch wrappers)
│   │   │   └── utils.ts           # Shared helpers (cn, etc.)
│   │   ├── pages/
│   │   │   ├── home.tsx           # Landing page + popular destinations
│   │   │   ├── destinations.tsx   # Searchable destination grid
│   │   │   └── not-found.tsx      # 404 page
│   │   └── components/
│   │       ├── chat.tsx                        # Chat panel UI + SSE streaming logic
│   │       ├── chat-widget.tsx                 # Floating launcher that mounts <Chat/>
│   │       ├── destination-card.tsx            # Destination summary card
│   │       ├── destination-details-dialog.tsx  # Full-detail modal
│   │       ├── layout.tsx                      # Navbar + page shell
│   │       └── ui/                             # Radix UI component wrappers
│   ├── vite.config.ts             # Vite config + /api proxy
│   └── package.json
│
├── scripts/
│   ├── setup-mac.sh               # One-command setup for macOS
│   ├── setup-linux.sh             # One-command setup for Linux
│   └── setup-windows.bat          # One-command setup for Windows
│
├── .gitignore
└── README.md
```

---

*Built as part of an Summer Internship Project for the `Tourism & Civil Aviation Department, Government of Sikkim.`*
