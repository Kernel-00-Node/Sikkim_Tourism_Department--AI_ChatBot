# Sikkim Tourism Assistant

An AI travel assistant for the Tourism & Civil Aviation Department, Government
of Sikkim. It provides searchable destination information, streamed
Retrieval-Augmented Generation (RAG) chat, an admin console, and optional
official-circular ingestion.

## Features

- **Streaming tourism chat** grounded in destination and circular data.
- **Gemini embeddings + Qdrant** for semantic retrieval; Groq provides the
  default text chat model and Gemini handles image-assisted questions.
- **No database required for local development**: mock destinations and an
  in-memory Qdrant instance are the defaults.
- **Admin console** for managing destinations, credentials, and circulars.
- **Optional circular scraper** for official notices, plus manual PDF/image
  uploads with file-size, type, and content-signature validation.
- **React/Vite frontend** with responsive destination browsing, weather cards,
  dark themes, and Server-Sent Events chat streaming.

## Architecture

```text
React + Vite frontend
        │  HTTPS / SSE
        ▼
FastAPI API
 ├── Destination and conversation repository (mock or MySQL)
 ├── Qdrant vector store (in-memory or remote)
 ├── Gemini embeddings and vision
 └── Groq text generation
```

In development, Vite proxies `/api/*` to `http://localhost:8000`. The current
Vercel configuration proxies production API requests to the Railway service
configured in [`frontend/vercel.json`](frontend/vercel.json).

## Requirements

- Python **3.11**
- Node.js **20+**
- A Gemini API key for embeddings and image-assisted chat
- A Groq API key for default text chat
- Firefox only when `ENABLE_CIRCULAR_SCRAPER=true`

All Python packages—application, scraper, and tests—are declared in the one
authoritative file: [`backend/requirements.txt`](backend/requirements.txt).

## Quick Start

### Automated setup

```bash
# macOS
chmod +x scripts/setup-mac.sh
./scripts/setup-mac.sh

# Linux
chmod +x scripts/setup-linux.sh
./scripts/setup-linux.sh

# Windows (Command Prompt)
scripts\setup-windows.bat
```

The scripts create `backend/v_env`, install backend and frontend packages, and
copy `backend/.env.example` to `backend/.env` when it does not already exist.

### Manual setup

```bash
# Terminal 1: backend
cd backend
python3.11 -m venv v_env
source v_env/bin/activate              # Windows: v_env\Scripts\activate.bat
pip install -r requirements.txt
cp .env.example .env                   # Windows: copy .env.example .env
python main.py
```

```bash
# Terminal 2: frontend
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The backend is available at
`http://localhost:8000`; API documentation is available at
`http://localhost:8000/api/docs` in development only.

## Configuration

Copy [`backend/.env.example`](backend/.env.example) to `backend/.env`. Never
commit a real `.env` file or credentials.

| Area | Variables | Notes |
| --- | --- | --- |
| AI | `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL` | Gemini key is required for embeddings and image-assisted chat. |
| Text chat | `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_FALLBACK_MODEL` | Groq powers the default text response path. |
| Optional AI | `ENABLE_PROMPT_GUARD`, `PROMPT_GUARD_MODEL`, `TAVILY_API_KEY`, `ENABLE_FOLLOWUPS` | Disabled by default unless enabled in `.env`. |
| Database | `USE_MOCK_DB`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | Mock data is the default; MySQL is for persistent deployments. |
| Vector store | `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION` | Leave `QDRANT_URL` empty for in-memory mode. |
| Browser access | `ALLOWED_ORIGINS`, `ALLOWED_METHODS`, `ALLOWED_HEADERS`, `ENVIRONMENT` | Production requires explicit HTTPS origins; wildcard CORS is rejected. |
| Admin | `ADMIN_API_KEY` | One-time server-side bootstrap secret for the first admin account. |
| Circulars | `ENABLE_CIRCULAR_SCRAPER`, `CIRCULARS_ALLOWED_HOST`, `CIRCULARS_NOTICE_URL`, `CIRCULARS_SYNC_INTERVAL_MINUTES`, `CIRCULARS_MAX_PDF_BYTES`, `CIRCULARS_MAX_PER_RUN` | Keep the scheduled browser scraper disabled on small web services. |

Generate the bootstrap key with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Production Deployment

The checked-in deployment topology is **Vercel frontend + Railway backend**.

1. Deploy `frontend/` to Vercel.
2. Deploy `backend/` to Railway with:

   ```bash
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

3. Configure Railway environment variables at minimum:

   ```ini
   ENVIRONMENT=production
   ALLOWED_ORIGINS=https://<your-vercel-domain>
   GEMINI_API_KEY=<secret>
   GROQ_API_KEY=<secret>
   ADMIN_API_KEY=<secret>
   ```

4. If the Railway public URL changes, update the `/api/:path*` rewrite
   destination in [`frontend/vercel.json`](frontend/vercel.json).

The backend hides OpenAPI/docs in production. The Vercel configuration applies
Content Security Policy, HSTS, anti-framing, no-sniff, referrer, and
permissions headers to frontend responses.

## Admin Operations

Visit `/admin` in the frontend to create the first administrator using the
server-side `ADMIN_API_KEY`. After setup, all admin operations require the
administrator's username and password; credentials remain in browser memory
only and are not written to local storage.

The admin console can:

- create, edit, and delete destinations;
- re-index destinations in Qdrant;
- upload and manage official circulars; and
- change admin credentials from `/admin/security`.

Destination images are intentionally restricted to local `/images/` paths,
which keeps them compatible with the frontend Content Security Policy.

## Circular Ingestion

Manual uploads accept PDFs, JPEGs, PNGs, and WebP images. Files are bounded to
the configured size, verified by signature, deduplicated by SHA-256, and
processed for text extraction before storage.

The automated scraper is disabled by default:

```ini
ENABLE_CIRCULAR_SCRAPER=false
```

Enable it only on a machine with Firefox and sufficient memory. It validates
the configured host before loading pages or downloading PDFs, limits each run,
and disables redirects for PDF fetches.

## MySQL Setup

For a persistent database:

1. Create the schema:

   ```bash
   mysql -u root -p < docs/schema.sql
   ```

2. Set `USE_MOCK_DB=false` and the `MYSQL_*` values in `backend/.env`.

3. Optionally seed a **new, empty** database from the development catalog:

   ```bash
   cd backend
   source v_env/bin/activate
   python seed_destinations.py
   ```

4. Apply migrations from [`docs/migrations`](docs/migrations) only when
   upgrading an existing schema. New installations should use `docs/schema.sql`.

Qdrant is populated from the active repository on backend startup. Use the
admin destination-sync action after editing persistent destination records.

## API Summary

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service health and development diagnostics. |
| `GET` | `/api/destinations` | Search/filter public destination summaries. |
| `GET` | `/api/destinations/categories` | Available destination categories. |
| `GET` | `/api/destinations/{id}` | Full destination record. |
| `POST` | `/api/conversations` | Create an anonymous conversation. |
| `GET` | `/api/conversations/{id}` | Read a conversation and its messages. |
| `POST` | `/api/conversations/{id}/chat` | Stream an assistant response over SSE. |
| `POST` | `/api/admin/auth/setup` | Bootstrap the first admin; requires `X-Admin-Key`. |
| `POST` | `/api/admin/auth/login` | Verify an administrator's credentials. |
| Various | `/api/admin/*` | Protected destination, circular, credential, and vector-sync operations. |

The chat endpoint accepts a text message, an optional idempotency key, and an
optional JPEG/PNG/WebP image up to 4 MB. It sends SSE events of the form:

```text
data: {"text":"..."}

data: [DONE]
```

## Security Controls

- Rate limits protect conversation creation, chat, admin setup, login, and
  uploads.
- Admin bootstrap fails closed without `ADMIN_API_KEY`; subsequent admin
  requests use verified scrypt password hashes and constant-time comparisons.
- API responses use CSP, no-sniff, anti-framing, referrer, permissions, cache,
  and production HSTS headers.
- Vercel applies equivalent browser protections to the frontend.
- Production CORS allows only explicit HTTPS origins.
- Image attachments and circular uploads have MIME, signature, size, and
  payload validation.
- The circular scraper enforces a host allowlist and bounded downloads.
- Dependency checks: `npm audit` and `pip-audit --local` are clean at the time
  of the latest repository audit.

## Quality Checks

```bash
# Backend
cd backend
source v_env/bin/activate
pytest tests -q
pip check
pip-audit --local

# Frontend
cd frontend
npm audit
npm run build
```

## Project Structure

```text
backend/
  app/
    database/       Mock and MySQL repositories
    models/         Pydantic API models and validation
    routers/        Chat and destination routes
    services/       RAG, vector store, admin auth, circular ingestion
    config.py       Environment-backed settings
    startup.py      Vector-store population and synchronization
  tests/            Backend regression tests
  main.py           FastAPI application and admin routes
  seed_destinations.py
  requirements.txt  Single Python dependency manifest
frontend/
  src/              React pages, components, hooks, and API client
  public/images/    Local destination and branding assets
  vercel.json       Deployment rewrite and frontend security headers
docs/
  schema.sql        New-install MySQL schema
  migrations/       Incremental schema migrations
scripts/            Platform setup scripts
```
