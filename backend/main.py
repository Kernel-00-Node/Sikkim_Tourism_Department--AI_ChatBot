"""
|| Sikkim Tourism Assistant || — FastAPI Backend Entry Point.
Now powered by LangChain + Qdrant RAG.

Run locally:
    uvicorn main:app --reload --port 8000

Or directly:
    python main.py
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database.factory import get_repo
from app.dependencies import verify_admin_key
from app.limiting import limiter
from app.routers import chat, destinations
from app.startup import resync_vectorstore, populate_vectorstore
from app.models.schemas import Destination, DestinationWrite

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    On startup: populate the Qdrant vector store from the active repository,
    then run the circulars scraper once and start its recurring schedule.

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
        logger.warning("The chat service will continue without vector retrieval. Fix the error and restart.")

    scheduler = None
    if settings.enable_circular_scraper:
        # Keep the browser/PDF scraper out of the normal API process.  Its
        # optional dependencies (especially Selenium) substantially increase
        # RSS on small Render instances even when no sync is running.
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            from app.services.circular_scraper import run_circular_sync
        except ModuleNotFoundError as exc:
            logger.error(
                "Automatic circular scraper requested but optional dependency %r "
                "is not installed; continuing without it. Install "
                "requirements-circular-scraper.txt on a dedicated worker to enable it.",
                exc.name,
            )
        else:
            try:
                summary = await run_circular_sync(repo)
                logger.info("Initial circular sync complete: %s", summary)
            except Exception as exc:
                logger.error("Circular sync failed on startup (non-fatal): %s", exc)

            scheduler = AsyncIOScheduler()
            scheduler.add_job(
                run_circular_sync,
                "interval",
                minutes=settings.circulars_sync_interval_minutes,
                args=[repo],
                id="circular_sync",
                # If a run is somehow still in flight when the next tick fires,
                # skip that tick instead of stacking overlapping scrapes.
                max_instances=1,
                coalesce=True,
            )
            scheduler.start()
            logger.info(
                "Circular sync scheduler started — every %d minutes.",
                settings.circulars_sync_interval_minutes,
            )
    else:
        logger.info(
            "Automatic circular scraper disabled; manual admin uploads remain available."
        )

    yield

    if scheduler is not None:
        scheduler.shutdown(wait=False)
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

        # Conversation IDs are bearer-like capabilities. Never allow their
        # history (or authenticated admin responses) into browser/proxy caches.
        if request.url.path.startswith(("/api/conversations", "/api/admin")):
            response.headers.setdefault(
                "Cache-Control", "no-store, max-age=0, must-revalidate"
            )
        elif (
                request.method == "GET"
                and request.url.path.startswith("/api/destinations")
                and response.status_code == 200
        ):
            # These records are public and change infrequently. Browser/CDN
            # caching avoids an unnecessary Vercel-to-backend round trip.
            response.headers.setdefault(
                "Cache-Control", "public, max-age=300, s-maxage=3600"
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
    # Interactive docs are useful locally but unnecessarily expose the API
    # surface in production. Keep the machine-readable schema private too.
    docs_url="/api/docs" if settings.environment != "production" else None,
    redoc_url="/api/redoc" if settings.environment != "production" else None,
    openapi_url="/api/openapi.json" if settings.environment != "production" else None,
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

# Serves app/static/admin_upload.js for the admin upload page below.
# Same-origin, so it's allowed under the default CSP's script-src 'self'
# without needing any policy exception.
app.mount(
    "/admin/static",
    StaticFiles(directory=Path(__file__).parent / "app" / "static"),
    name="admin_static",
)


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
    if settings.environment == "production":
        return {"status": "ok", "version": "2.0.0"}
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


@app.get("/admin/upload-circular", include_in_schema=False)
def admin_upload_page():
    """
    Simple browser form for manually uploading a circular (e.g. a road
    status report forwarded over WhatsApp) — same-origin page, so its
    fetch() call to POST /api/admin/upload-circular needs no CORS setup.
    The page itself has no secrets in it; the admin key is only ever
    typed in and sent at submit time, never stored.
    """
    return FileResponse(Path(__file__).parent / "app" / "static" / "admin_upload.html")


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


@admin_router.post("/sync-circulars")
async def sync_circulars(repo=Depends(get_repo)):
    """
    Manually trigger a circulars scrape immediately instead of waiting for
    the next scheduled tick. Same underlying function the scheduler calls —
    same behaviour, same safety limits, just an on-demand trigger.
    """
    if not settings.enable_circular_scraper:
        return {
            "status": "disabled",
            "detail": "Automatic circular scraping is disabled on this deployment."
        }
    from app.services.circular_scraper import run_circular_sync

    return await run_circular_sync(repo)


_UPLOAD_CATEGORIES = {"road_status", "cancellation_order", "notice"}


@admin_router.get("/dashboard")
async def admin_dashboard(repo=Depends(get_repo)):
    """Return the small operational summary rendered by the admin console."""
    destinations, circulars = await asyncio.gather(
        repo.list_destinations(), repo.list_circulars(limit=5)
    )
    return {
        "destination_count": len(destinations),
        "recent_circulars": circulars,
        "db_mode": settings.db_mode,
        "qdrant_mode": settings.qdrant_mode,
    }


@admin_router.get("/destinations", response_model=list[Destination])
async def admin_list_destinations(repo=Depends(get_repo)):
    return await repo.list_destinations()


@admin_router.post("/destinations", response_model=Destination, status_code=201)
async def admin_create_destination(
        destination: DestinationWrite, repo=Depends(get_repo)
):
    try:
        return await repo.create_destination(destination)
    except Exception as exc:
        if "duplicate" in str(exc).lower():
            raise HTTPException(status_code=409, detail="A destination with this slug already exists.")
        raise


@admin_router.put("/destinations/{destination_id}", response_model=Destination)
async def admin_update_destination(
        destination_id: int, destination: DestinationWrite, repo=Depends(get_repo)
):
    try:
        updated = await repo.update_destination(destination_id, destination)
    except Exception as exc:
        if "duplicate" in str(exc).lower():
            raise HTTPException(status_code=409, detail="A destination with this slug already exists.")
        raise
    if not updated:
        raise HTTPException(status_code=404, detail="Destination not found.")
    return updated


@admin_router.delete("/destinations/{destination_id}", status_code=204)
async def admin_delete_destination(destination_id: int, repo=Depends(get_repo)):
    if not await repo.delete_destination(destination_id):
        raise HTTPException(status_code=404, detail="Destination not found.")


@admin_router.get("/circulars")
async def admin_list_circulars(
        limit: int = Query(100, ge=1, le=250), repo=Depends(get_repo)
):
    return await repo.list_circulars(limit=limit)


@admin_router.delete("/circulars/{circular_id}", status_code=204)
async def admin_delete_circular(circular_id: int, repo=Depends(get_repo)):
    if not await repo.delete_circular(circular_id):
        raise HTTPException(status_code=404, detail="Circular not found.")


@admin_router.post("/upload-circular")
@limiter.limit("10/minute")
async def upload_circular(
        request: Request,
        file: UploadFile = File(...),
        title: str = Form(...),
        category: str = Form("road_status"),
        district: str | None = Form(None),
        repo=Depends(get_repo),
):
    """
    Manual ingestion path for circulars that never appear on the public
    website — chiefly the road status report, which the Police Control
    Room sends over WhatsApp and never publishes anywhere online. There is
    no way to scrape something that was never published, so a person saves
    the WhatsApp PDF/photo and uploads it here; everything downstream
    (hash dedup, text extraction, storage) is identical to the automatic
    scraper.

    Accepts either a real PDF or a plain photo (jpg/png/webp) straight off
    WhatsApp, since the road report is usually a photographed scan.
    """
    if category not in _UPLOAD_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"category must be one of: {', '.join(sorted(_UPLOAD_CATEGORIES))}",
        )
    title = title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required.")
    if len(title) > 300:
        raise HTTPException(status_code=422, detail="title must be 300 characters or fewer.")
    if district is not None:
        district = district.strip() or None
        if district and len(district) > 100:
            raise HTTPException(status_code=422, detail="district must be 100 characters or fewer.")

    # UploadFile spools large multipart bodies to disk, but reading it without
    # a bound would copy an attacker-controlled file into process memory before
    # this size check runs.  Read at most one byte beyond the allowed limit.
    max_upload_bytes = settings.circulars_max_pdf_bytes
    file_bytes = await file.read(max_upload_bytes + 1)
    if len(file_bytes) > max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {max_upload_bytes // (1024*1024)} MB limit.",
        )
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # This import is deliberately local: PDF/image processing is an admin-only
    # feature and importing its native/browser stack at app startup can push a
    # 512 MiB web service over its memory limit.
    from app.services.circular_scraper import ingest_uploaded_circular

    result = await ingest_uploaded_circular(
        repo,
        file_bytes=file_bytes,
        title=title,
        category=category,
        source_url="manual-upload:whatsapp",
        mime_type=file.content_type,
        district=district,
    )

    if result["status"] == "rejected":
        raise HTTPException(status_code=400, detail=result["detail"])
    if result["status"] == "failed":
        raise HTTPException(status_code=422, detail=result["detail"])

    return result

app.include_router(admin_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
