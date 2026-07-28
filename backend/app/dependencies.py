"""
Shared FastAPI dependencies.

Currently just the admin-auth guard, but this is the right place to add
any other cross-cutting "check something before the route runs" logic
later (e.g. an internal-service auth check).
"""
from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, status

from app.config import settings


async def verify_admin_key(x_admin_key: str | None = Header(default=None)) -> None:
    """
    Guards internal/admin-only endpoints (currently just POST /api/admin/sync).

    Two deliberate design choices:

    1. FAILS CLOSED. If ADMIN_API_KEY isn't set in the environment, every
       request is rejected with 503 rather than let through. An unset
       secret must never be silently treated as "auth not required" —
       that's exactly how the endpoint ended up open in the first place.

    2. CONSTANT-TIME COMPARISON. Plain `==` on strings short-circuits at
       the first mismatched character, so response time can leak how many
       leading characters of a guess were correct. hmac.compare_digest
       always takes the same time regardless of where the strings diverge.

    Usage: add `dependencies=[Depends(verify_admin_key)]` to a router or
    route — FastAPI runs it before the handler and raises before any
    admin logic executes if it fails.
    """
    if not settings.admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Admin endpoints are disabled: ADMIN_API_KEY is not "
                "configured on the server."
            ),
        )

    if not x_admin_key or not hmac.compare_digest(x_admin_key, settings.admin_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing admin credentials.",
        )