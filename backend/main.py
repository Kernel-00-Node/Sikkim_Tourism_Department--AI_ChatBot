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
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database.factory import get_repo
from app.dependencies import verify_admin_key
from app.limiting import limiter
from app.routers import chat, destinations
from app.startup import resync_vectorstore, populate_vectorstore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

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
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Apply browser protections consistently to every API response."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = _content_security_policy(
            request.url.path
        )
        # Allow microphone for Web Speech API (voice input).
        # Camera is not used directly (images are file-uploaded, not captured).
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(self), camera=()"
        )

        # HSTS is meaningful only when the site is always served over HTTPS.
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


def _content_security_policy(path: str) -> str:
    """Return the least-permissive policy needed for the requested endpoint.

    FastAPI's Swagger and ReDoc pages use CDN assets and an inline bootstrap
    script. The main API never needs those permissions, so the exception is
    constrained to the two documentation routes rather than weakening every
    response served by the application.
    """
    if path in {"/api/docs", "/api/redoc"}:
        return (
            "default-src 'self'; "
            "base-uri 'self'; "
            "frame-ancestors 'none'; "
            "form-action 'self'; "
            "img-src 'self' data: https://fastapi.tiangolo.com; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "connect-src 'self'"
        )

    return (
        "default-src 'self'; "
        "base-uri 'self'; "
        "frame-ancestors 'none'; "
        "form-action 'self'; "
        "img-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; "
        "connect-src 'self' https://api.open-meteo.com"
    )

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

app.add_middleware(SecurityHeadersMiddleware)

origins = settings.origins_list
methods = settings.methods_list
headers = settings.headers_list
allow_credentials = origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=methods,
    allow_headers=headers,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait a moment before trying again."},
    )

app.include_router(destinations.router, prefix="/api/destinations", tags=["Destinations"])
app.include_router(chat.router, prefix="/api/conversations", tags=["Chat"])
@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    """Log detail server-side while returning a stable public error shape."""
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


admin_router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[Depends(verify_admin_key)],
)


@admin_router.post("/sync")
async def sync_vectorstore(repo=Depends(get_repo)):
    """
    Manually re-sync the Qdrant vector store with the active repository.
    Useful after updating destinations in MySQL without restarting the server.
    """
    return await resync_vectorstore(repo)

app.include_router(admin_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
