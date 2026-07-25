"""
|| Sikkim Tourism Assistant || — FastAPI Backend Entry Point.
Now powered by LangChain + Qdrant RAG.

Run locally:
    uvicorn main:app --reload --port 8000

Or directly:
    python main.py
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database.factory import get_repo
from app.routers import chat, destinations
from app.startup import resync_vectorstore, populate_vectorstore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────
# ── Lifespan (Startup / Shutdown) ──────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    On startup: populate the Qdrant vector store from the active repository.

    - USE_MOCK_DB=true  → reads mock_data.py destinations (default)
    - USE_MOCK_DB=false → reads live MySQL destinations

    Switching modes only requires a server restart — no manual steps.
    """
    repo = get_repo()
    try:
        indexed = await populate_vectorstore(repo)
        logger.info("Startup complete. Destinations indexed: %d", indexed)
    except Exception as exc:
        logger.error("Vector store population failed (non-fatal): %s", exc)
        logger.warning("Falling back to basic keyword search. Fix the error and restart.")
    yield
    # Nothing to Clean Up for `in-memory` Qdrant


# ────────────────────────────────────────────────��───────────────

# ────────────────────────────────────────────────────────────────
# ── Security Middleware ────────────────────────────────────────────────────────────


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """FIXED: Add security headers to all responses."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )

        # HSTS only in production
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


# ────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────
# ── App ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Sikkim Tourism Assistant API",
    description=(
        "AI-powered tourism assistant for the Tourism and Civil Aviation Department, Government of Sikkim. "
        "Powered by LangChain + Qdrant RAG + Google Gemini."
    ),
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────
# ── Security Middleware ────────────────────────────────────────────────────────────

app.add_middleware(SecurityHeadersMiddleware)

# ────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────
# ── CORS (Cross-Origin-Resource-Sharing) ────────────────────────────────────────────────

origins = settings.origins_list
methods = settings.methods_list
headers = settings.headers_list
allow_credentials = origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=methods,  # FIXED: Restricted to necessary methods
    allow_headers=headers,  # FIXED: Restricted to necessary headers
)

# ────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────
# ── Rate Limiting (NEW - SECURITY) ────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait a moment before trying again."},
    )


# ────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────
# ── Routers ───────────────────────────────────────────────────────────

app.include_router(destinations.router, prefix="/api/destinations", tags=["Destinations"])
app.include_router(chat.router, prefix="/api/conversations", tags=["Chat"])

# ────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────
# ── Global_Error_Handling ────────────────────────────────────────────────────────
# Any unhandled exception (e.g. a NotImplementedError from a not-yet-wired-up
# MySQL method, a DB connection error, etc.)
# Every error the API returns has the
# predictable JSON shape: {"detail": "..."}.


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    # FIXED: Don't expose stack traces in production
    if settings.environment == "production":
        logger.error(
            f"Unhandled {type(exc).__name__} on {request.method} {request.url.path}"
        )
    else:
        logger.exception(
            f"Unhandled error on {request.method} {request.url.path}"
        )

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


# ────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────
# ── System_Endpoints ────────────────────────────────────────────────────────


@app.get("/api/health", tags=["System"])
def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "db_mode": settings.db_mode,
        "qdrant_mode": settings.qdrant_mode,
        "qdrant_collection": settings.qdrant_collection,
        # Embeddings still run on Gemini; the chat LLM step runs on Groq — both
        # keys must be set for the assistant to actually answer questions.
        "embeddings_configured": bool(settings.gemini_api_key),
        "chat_llm_configured": bool(settings.groq_api_key),
    }


admin_router = APIRouter(prefix="/api/admin", tags=["Admin"])


@admin_router.post("/sync")
async def sync_vectorstore(repo=Depends(get_repo)):
    """
    Manually re-sync the Qdrant vector store with the active repository.
    Useful after updating destinations in MySQL without restarting the server.
    """
    return await resync_vectorstore(repo)


# ────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────
app.include_router(admin_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# ────────────────────────────────────────────────────────────────
# ────────────────────────────────────────────────────────────────
# ────────────────────────────────────────────────────────────────
