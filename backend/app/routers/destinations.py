"""Destinations router — read-only, no auth required."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database.base import BaseRepository
from app.database.factory import get_repo
from app.models.schemas import Destination, DestinationSummary, DestinationsListResponse

router = APIRouter()

VALID_CATEGORIES = {"nature", "culture", "adventure", "pilgrimage", "wildlife"}


def _to_summary(d: Destination) -> DestinationSummary:
    return DestinationSummary(
        id=d.id,
        name=d.name,
        slug=d.slug,
        category=d.category,
        district=d.district,
        best_time=d.best_time,
        permit_required=d.permit_required,
        tags=d.tags,
        image_placeholder=d.image_placeholder,
        image_url=d.image_url,
        description=d.description[:160] + ("…" if len(d.description) > 160 else ""),
    )

@router.get("", response_model=DestinationsListResponse)
async def list_destinations(
    search: str | None = Query(None, max_length=100),
    category: str | None = Query(None),
    repo: BaseRepository = Depends(get_repo),
):
    if category and category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Choose from: {', '.join(sorted(VALID_CATEGORIES))}")

    destinations = await repo.list_destinations(search=search, category=category)
    return DestinationsListResponse(
        destinations=[_to_summary(d) for d in destinations],
        total=len(destinations),
    )


@router.get("/categories")
async def list_categories():
    return {"categories": sorted(VALID_CATEGORIES)}


@router.get("/{destination_id}", response_model=Destination)
async def get_destination(
    destination_id: int,
    repo: BaseRepository = Depends(get_repo),
):
    destination = await repo.get_destination(destination_id)
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found.")
    return destination
