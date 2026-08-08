"""Regression tests for agency district normalization."""
import pytest

from app.database.mock_repo import MockRepository
from app.database.mock_data import TRAVEL_AGENCIES
from app.models.schemas import TravelAgency
from app.services.travel_agency_scraper import _normalize_record


def test_source_file_district_overrides_inconsistent_record_value():
    agency = _normalize_record(
        {"name": "Example Tours", "registration_number": "SK/TEST/001", "district": "East Sikkim"},
        "Namchi",
    )
    assert agency.district == "Namchi"


@pytest.mark.asyncio
async def test_mock_directory_filter_handles_legacy_district_labels():
    original = list(TRAVEL_AGENCIES)
    TRAVEL_AGENCIES[:] = [
        TravelAgency(name="Legacy Agency", registration_number="SK/TEST/002", district="North Sikkim"),
        TravelAgency(name="Current Agency", registration_number="SK/TEST/003", district="Mangan"),
    ]
    try:
        repo = MockRepository()
        assert await repo.count_travel_agencies("Mangan") == 2
        assert [agency.name for agency in await repo.list_travel_agencies("North Sikkim")] == [
            "Legacy Agency",
            "Current Agency",
        ]
    finally:
        TRAVEL_AGENCIES[:] = original
