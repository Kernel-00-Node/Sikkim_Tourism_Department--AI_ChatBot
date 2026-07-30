"""
Pydantic models shared across the entire application.

All datetime fields use timezone-aware UTC timestamps (datetime.now(timezone.utc))
rather than the deprecated datetime.utcnow(), which returns a naive datetime and
causes DeprecationWarnings on Python 3.12+.
"""
from __future__ import annotations

import re
import unicodedata
from base64 import b64decode
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator, model_validator


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
    # Geographic coordinates — used by the frontend to fetch live weather
    # from Open-Meteo (free, no API key required).
    latitude: float | None = None
    longitude: float | None = None


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
    # Geographic coordinates forwarded from the full Destination record
    latitude: float | None = None
    longitude: float | None = None


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

# Allowed MIME types for image uploads — whitelist only.
_ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

# Max base64 length accepted (~4 MB binary → ~5.5 MB base64).
_MAX_IMAGE_BASE64_LEN = 5_600_000


class ChatRequest(BaseModel):
    """Body for POST /api/conversations/{id}/chat.

    image_base64 / image_mime_type are optional.  When supplied the backend
    routes the turn through Gemini Vision instead of the Groq text chain so
    the AI can analyse the image and answer about it in a Sikkim context.
    """

    message: str = Field(..., min_length=1, max_length=2000)

    # ── Optional image attachment ──────────────────────────────────────────
    # Raw base64-encoded image bytes (no data-URI prefix — strip it on the
    # frontend before sending to keep the payload clean and avoid surprises
    # when the backend validates length).
    image_base64: str | None = Field(default=None, max_length=_MAX_IMAGE_BASE64_LEN)
    image_mime_type: str | None = Field(default=None)

    @field_validator("message", mode="before")
    @classmethod
    def sanitize_message(cls, v):
        """Sanitize user message to prevent injection attacks.

        Runs in mode="before" — i.e. BEFORE Pydantic checks min_length/
        max_length — so a message of pure whitespace gets stripped down
        to "" first and then correctly fails min_length=1. Previously
        this validator ran "after" the length check, so "   " (length 3)
        passed validation and only became empty afterward, silently
        bypassing the empty-message guard.
        """
        if not isinstance(v, str):
            return v  # let Pydantic's normal type validation raise the error

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

    @field_validator("image_mime_type", mode="before")
    @classmethod
    def validate_mime_type(cls, v):
        """Accept only images from the explicit whitelist."""
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError("image_mime_type must be a string")
        v = v.strip().lower()
        if v not in _ALLOWED_IMAGE_MIME_TYPES:
            raise ValueError("Unsupported image type. Use JPEG, PNG, WebP, or GIF.")
        return v

    @model_validator(mode="after")
    def validate_image_payload(self):
        """Require a complete, valid image payload when an image is attached.

        Previously an unsupported MIME type was silently converted to ``None``.
        That left the base64 data in the request but routed the turn through the
        text-only chain, which is surprising to users and makes invalid uploads
        difficult to diagnose.  Validate both fields together and reject bad
        base64 before it reaches the model provider.
        """
        if (self.image_base64 is None) != (self.image_mime_type is None):
            raise ValueError(
                "image_base64 and image_mime_type must be supplied together."
            )
        if self.image_base64 is None:
            return self

        try:
            decoded = b64decode(self.image_base64, validate=True)
        except (ValueError, TypeError):
            raise ValueError("image_base64 must be valid base64 data.") from None

        # Keep the server-side limit aligned with the 4 MB client-side limit.
        if len(decoded) > 4 * 1024 * 1024:
            raise ValueError("Image must be 4 MB or smaller.")
        return self


class ConversationResponse(BaseModel):
    """Response body for conversation create / fetch endpoints."""

    conversation: Conversation
    messages: list[Message] = Field(default_factory=list)


class DestinationsListResponse(BaseModel):
    """Response body for GET /api/destinations/."""

    destinations: list[DestinationSummary] = Field(default_factory=list)
    total: int
