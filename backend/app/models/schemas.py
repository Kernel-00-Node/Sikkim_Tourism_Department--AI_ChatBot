"""
Pydantic models shared across the entire application.

All datetime fields use timezone-aware UTC timestamps (datetime.now(timezone.utc))
rather than the deprecated datetime.utcnow(), which returns a naive datetime and
causes DeprecationWarnings on Python 3.12+.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


# ── Destination ──────────────────────────────────────────────────────────

class Destination(BaseModel):
    """Full destination record — returned by GET /api/destinations/{id}."""

    id: int
    name: str
    slug: str
    category: Literal["nature", "culture", "adventure", "pilgrimage", "wildlife"]
    description: str
    location: str
    district: str
    altitude: str | None = None
    best_time: str
    entry_fee: str | None = None
    permit_required: bool = False
    permit_info: str | None = None
    how_to_reach: str
    highlights: list[str] = []
    tags: list[str] = []
    image_placeholder: str = ""
    # Relative URL (e.g. /images/Gangtok.png) or colour hex used as CSS
    # background fallback when no image is available.
    image_url: str | None = None


class DestinationSummary(BaseModel):
    """Lightweight card payload used in list / search views."""

    id: int
    name: str
    slug: str
    category: str
    district: str
    best_time: str
    permit_required: bool
    tags: list[str]
    image_placeholder: str
    image_url: str | None = None
    # Truncated to 160 chars by the router for list views
    description: str


# ── Conversation ──────────────────────────────────────────────────────────

class Conversation(BaseModel):
    """A chat session container.  Created by POST /api/conversations/."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    # Use timezone-aware UTC — datetime.utcnow() is deprecated in Python 3.12+
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Message(BaseModel):
    """A single turn in a conversation (user or assistant)."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    conversation_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Request / Response bodies ──────────────────────────────────────────────────

class ChatRequest(BaseModel):
    """Body for POST /api/conversations/{id}/chat."""

    message: str = Field(..., min_length=1, max_length=2000)

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, v: str) -> str:
        """Sanitize user message to prevent injection attacks."""
        # Strip leading/trailing whitespace
        v = v.strip()

        # Normalize Unicode (NFKC) to prevent homograph attacks
        v = unicodedata.normalize("NFKC", v)

        # Detect common injection patterns (log warning but allow)
        # The LLM can decide if the message is legitimate
        injection_patterns = [
            r"<script",
            r"onclick\s*=",
            r"onerror\s*=",
            r"javascript:",
            r"union\s+.*\s+select",
            r"drop\s+table",
            r"delete\s+from",
            r"--\s*$",  # SQL comments
        ]

        if any(re.search(p, v, re.IGNORECASE) for p in injection_patterns):
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(
                f"Potential injection pattern detected in message: {v[:50]}..."
            )

        return v


class ConversationResponse(BaseModel):
    """Response body for conversation create / fetch endpoints."""

    conversation: Conversation
    messages: list[Message] = []


class DestinationsListResponse(BaseModel):
    """Response body for GET /api/destinations/."""

    destinations: list[DestinationSummary]
    total: int
