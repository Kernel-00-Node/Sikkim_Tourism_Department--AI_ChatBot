"""
|| Travel_Agency_Scraper || — pulls the department's own static, per-district
JSON directory of registered travel agencies into the local
`travel_agencies` table.

Unlike circular_scraper.py, this needs no browser automation and no PDF
parsing: the six district files are plain JSON served directly by the
department's site (confirmed via DevTools — see the URLs below), so a
handful of httpx GETs is all this takes.

This is the ONLY piece of the app that talks to these endpoints. It can be
triggered on demand via POST /api/admin/sync-agencies. The chat endpoint
never calls this module directly — it only ever reads whatever this
scraper has already saved via the repository (see app/routers/chat.py).

Data-quality notes (observed from the live files, see test_fetch_agencies.py):
  - Most records omit `district` entirely — we fall back to the source
    file's district label when the record itself doesn't have one.
  - A few records are placeholders (`name: "M/s"`, everything else blank)
    — these are skipped rather than stored.
  - A handful of `registration_number` values repeat, both within a single
    district file and across runs — `registration_number` is the natural
    key, so saves are upserts (see BaseRepository.save_travel_agency),
    never blind inserts.
  - The `contact` field is sometimes spelled "conatct" in the source; both
    spellings are read and merged into `contact`.

Security notes (same posture as circular_scraper.py):
  - SSRF guard: every URL fetched is validated against
    `settings.circulars_allowed_host` before any request is made — these
    are static assets on the same department host the circular scraper is
    already allow-listed for, so no new config is introduced.
  - Redirects are disabled entirely for these plain httpx GETs.
  - Per-file isolation: one bad/unreachable district file is logged and
    skipped — it never aborts the rest of the run.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

from app.config import settings
from app.database.base import BaseRepository
from app.models.schemas import TravelAgency

logger = logging.getLogger(__name__)

_REQUEST_TIMEOUT = httpx.Timeout(15.0, connect=10.0)

_BASE_URL = "https://sikkimtourism.gov.in/assets/data/travel-agencies/"

# District label -> source JSON filename. Used both to build the request
# URL and as the fallback `district` value for records that omit it.
_DISTRICT_FILES: dict[str, str] = {
    "Gangtok": "gangtok.json",
    "Mangan": "mangan.json",
    "Namchi": "namchi.json",
    "Soreng": "soreng.json",
    "Gyalshing": "gyalshing.json",
    "Pakyong": "pakyong.json",
}

# Placeholder names seen in the source data that carry no real agency info.
_PLACEHOLDER_NAMES = {"M/S", "M/S.", "N/A", "NA", "-"}


class _SkipRecord(Exception):
    """Raised internally when a raw record has no usable name/registration_number."""


def _is_allowed_url(url: str) -> bool:
    """SSRF guard — only HTTPS on the configured host's default port is valid."""
    parsed = urlparse(url)
    return (
            parsed.scheme == "https"
            and parsed.hostname == settings.circulars_allowed_host
            and parsed.port in (None, 443)
            and not parsed.username
            and not parsed.password
    )


def _clean(value) -> str | None:
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value or None


def _normalize_record(raw: dict, district_label: str) -> TravelAgency:
    name = _clean(raw.get("name"))
    registration_number = _clean(raw.get("registration_number"))
    if not name or not registration_number or name.upper() in _PLACEHOLDER_NAMES:
        raise _SkipRecord

    # The source spells this field "conatct" in some records — read both
    # and prefer whichever is actually populated.
    contact = _clean(raw.get("contact")) or _clean(raw.get("conatct"))

    return TravelAgency(
        name=name,
        registration_number=registration_number,
        proprietor=_clean(raw.get("proprietor")),
        address=_clean(raw.get("address")),
        district=_clean(raw.get("district")) or district_label,
        grade=_clean(raw.get("grade")),
        contact=contact,
        email_or_website=_clean(raw.get("email_or_website")),
        date_of_issue=_clean(raw.get("date_of_issue")),
        renewed_upto=_clean(raw.get("renewed_upto")),
        synced_at=datetime.now(timezone.utc),
    )


async def run_travel_agency_sync(repo: BaseRepository) -> dict:
    """
    Entry point for both the admin sync endpoint and (optionally) a
    scheduler. Fetches all six district JSON files and upserts every valid
    record, keyed by registration_number.
    """
    summary = {"found": 0, "new": 0, "updated": 0, "skipped": 0, "failed": 0}

    async with httpx.AsyncClient(
            timeout=_REQUEST_TIMEOUT,
            follow_redirects=False,
            headers={"User-Agent": "SikkimTourismAssistant-AgencySync/1.0"},
    ) as client:
        for district_label, filename in _DISTRICT_FILES.items():
            url = _BASE_URL + filename
            if not _is_allowed_url(url):
                logger.error("Refusing to fetch off-allowlist agency URL: %s", url)
                continue

            try:
                response = await client.get(url)
                response.raise_for_status()
                records = response.json()
            except Exception as exc:
                logger.error("Failed to fetch/parse %s: %s", url, exc)
                continue

            if not isinstance(records, list):
                logger.error("Unexpected JSON shape (expected a list) from %s", url)
                continue

            seen_in_file: set[str] = set()
            for raw in records:
                summary["found"] += 1
                if not isinstance(raw, dict):
                    summary["skipped"] += 1
                    continue

                try:
                    agency = _normalize_record(raw, district_label)
                except _SkipRecord:
                    summary["skipped"] += 1
                    continue

                if agency.registration_number in seen_in_file:
                    # Duplicate registration_number within the same file —
                    # keep the first occurrence, skip the rest.
                    summary["skipped"] += 1
                    continue
                seen_in_file.add(agency.registration_number)

                try:
                    already_existed = await repo.agency_exists(agency.registration_number)
                    await repo.save_travel_agency(agency)
                    summary["updated" if already_existed else "new"] += 1
                except Exception as exc:
                    # Never let one bad record abort the whole batch.
                    logger.exception(
                        "Failed to save agency %s (%s): %s",
                        agency.name, agency.registration_number, exc,
                    )
                    summary["failed"] += 1

    logger.info("Travel agency sync complete: %s", summary)
    return summary