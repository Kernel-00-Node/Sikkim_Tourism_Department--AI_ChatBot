"""
|| Startup_Service || — populates the Qdrant vector store from the active repository
(mock_db or MySQL) every time the server starts.

Flow:
  1. Fetch all destinations from the repo (mock or MySQL — whichever is active)
  2. Convert each destination into a LangChain Document with rich metadata
  3. Embed via Gemini gemini-embedding-001 and upsert into Qdrant
  4. Log summary

This means:
  • mock_db mode  → Qdrant is populated from DESTINATIONS in mock_data.py
  • MySQL mode    → Qdrant is populated from the live department database
  • Switching modes just requires restarting the server — no manual steps

Also exposes `resync_vectorstore()` for the /api/admin/sync endpoint so an
operator can trigger a live re-sync without a restart (useful when the MySQL
table is updated outside the app).
"""
from __future__ import annotations

import logging
import uuid

from langchain_core.documents import Document

from app.config import settings
from app.database.base import BaseRepository
from app.models.schemas import Destination
from app.services.vectorstore import (
    ensure_collection,
    get_qdrant_client,
    get_vectorstore,
)

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────
"""
Convert a Destination Pydantic model into a rich LangChain Document.
The page_content is a structured text block that Gemini reads as context.
All fields are also preserved in metadata for filtering.
"""


def _destination_to_document(dest: Destination) -> Document:
    """FIXED: Added type hint for dest parameter."""
    permit_text = ""
    if dest.permit_required and dest.permit_info:
        permit_text = f"\nPERMIT REQUIRED: {dest.permit_info}"

    page_content = (
        f"Destination: {dest.name}\n"
        f"Category: {dest.category}\n"
        f"District: {dest.district}, Sikkim\n"
        f"Altitude: {dest.altitude or 'N/A'}\n"
        f"Description: {dest.description}\n"
        f"Best time to visit: {dest.best_time}\n"
        f"Entry fee: {dest.entry_fee or 'Free'}"
        f"{permit_text}\n"
        f"How to reach: {dest.how_to_reach}\n"
        f"Highlights: {', '.join(dest.highlights)}\n"
        f"Tags: {', '.join(dest.tags)}"
    )

    metadata = {
        "id": dest.id,
        "name": dest.name,
        "slug": dest.slug,
        "category": dest.category,
        "district": dest.district,
        "permit_required": dest.permit_required,
        "best_time": dest.best_time,
        "entry_fee": dest.entry_fee or "Free",
        "tags": ",".join(dest.tags),
    }

    return Document(page_content=page_content, metadata=metadata)


# ────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────
"""
Load all destinations from `repo`, embed them, and upsert into Qdrant.
Returns the number of documents indexed.
Idempotent — safe to call multiple times (upserts, not inserts).
"""


async def populate_vectorstore(repo: BaseRepository) -> int:
    """FIXED: Proper error handling when database is empty."""
    if not settings.gemini_api_key:
        logger.warning(
            "GEMINI_API_KEY is not set... — Skipping Vector Store Population. "
            "Set it in .env and restart to enable RAG."
        )
        return 0

    logger.info(
        "Vector store: populating from %s (collection: %s, mode: %s)...",
        settings.db_mode,
        settings.qdrant_collection,
        settings.qdrant_mode,
    )

    destinations = await repo.list_destinations()
    if not destinations:
        # FIXED: Raise error in production, warn in development
        error_msg = (
            f"CRITICAL: No destinations found in {settings.db_mode}. "
            "Vector store will be EMPTY!"
        )
        logger.error(error_msg)

        if settings.db_mode == "mysql":
            raise RuntimeError(
                error_msg + " Check MySQL connection and schema."
            )
        # For mock mode, it's acceptable but still warn loudly
        logger.warning(
            "Running in mock mode with no destinations — RAG will not work."
        )
        return 0

    documents = [_destination_to_document(d) for d in destinations]

    client = get_qdrant_client()
    ensure_collection(client)

    vectorstore = get_vectorstore()
    ids = [str(uuid.uuid4()) for _ in documents]
    vectorstore.add_documents(documents=documents, ids=ids)

    logger.info(
        "Vector store: indexed %d destinations into '%s' (%s)",
        len(documents),
        settings.qdrant_collection,
        settings.qdrant_mode,
    )
    return len(documents)


# ────────────────────────────────────────────────────────────────

# ────────────────────────────────────────────────────────────────
"""
Re-sync the vector store with the current repository state.
Called by the /api/admin/sync endpoint.
"""


async def resync_vectorstore(repo: BaseRepository) -> dict:

    count = await populate_vectorstore(repo)
    return {
        "status": "ok",
        "indexed": count,
        "db_mode": settings.db_mode,
        "qdrant_mode": settings.qdrant_mode,
        "collection": settings.qdrant_collection,
    }


# ────────────────────────────────────────────────────────────────
# ────────────────────────────────────────────────────────────────
# ────────────────────────────────────────────────────────────────
