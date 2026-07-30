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
    clear_collection,
    get_qdrant_client,
    get_vectorstore,
)

logger = logging.getLogger(__name__)

def _destination_to_document(dest: Destination) -> Document:
    """Build the text and metadata used for retrieval."""
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


async def populate_vectorstore(repo: BaseRepository) -> int:
    """Replace the active Qdrant collection with the repository snapshot."""
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
    # Make syncs authoritative: upserts alone retain records that were deleted
    # from the data source and let stale destinations leak into retrieval.
    clear_collection(client)

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


async def resync_vectorstore(repo: BaseRepository) -> dict:

    count = await populate_vectorstore(repo)
    return {
        "status": "ok",
        "indexed": count,
        "db_mode": settings.db_mode,
        "qdrant_mode": settings.qdrant_mode,
        "collection": settings.qdrant_collection,
    }
