"""
|| Circular_Scraper || — pulls road status / cancellation-order / notice PDFs
from the department's own notices page into the local `circulars` table.

This is the ONLY piece of the app that talks to the department's live
website. It runs on a schedule (see main.py's lifespan) and can also be
triggered on demand via POST /api/admin/sync-circulars. The chat endpoint
never calls this module directly or reaches out to the website itself — it
only ever reads whatever this scraper has already saved via the repository.

Security notes (read before changing the allowlist logic below):
  - SSRF guard: every URL fetched (the listing page AND every PDF link
    found on it) is validated against `settings.circulars_allowed_host`
    before any request is made. Redirects are disabled entirely — a
    same-host page could otherwise redirect a request off-host after the
    check has already passed.
  - Size guard: PDFs are streamed with a hard byte ceiling
    (`circulars_max_pdf_bytes`) instead of being read fully into memory
    on trust — a compromised or misconfigured page shouldn't be able to
    hand us a multi-GB response and exhaust the server.
  - Content sniffing: a downloaded file must start with the `%PDF-` magic
    bytes before we hand it to any parser, regardless of what the server's
    Content-Type header claimed.
  - Batch guard: at most `circulars_max_per_run` new files are processed
    in a single run, so a page returning far more links than expected
    can't turn one sync into an unbounded job.
  - Per-file isolation: one bad/corrupt PDF is logged and skipped — it
    never aborts the rest of the batch.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import date, datetime, timezone
from urllib.parse import urljoin, urlparse

import fitz  # PyMuPDF
import httpx
from bs4 import BeautifulSoup

from app.config import settings
from app.database.base import BaseRepository
from app.models.schemas import Circular

logger = logging.getLogger(__name__)

_PDF_MAGIC = b"%PDF-"
_REQUEST_TIMEOUT = httpx.Timeout(15.0, connect=10.0)

# Category classification is a simple title-keyword heuristic — good enough
# to start, and safe to get "wrong" since it only affects which context
# bucket a circular is grouped into, never whether it gets ingested.
_CATEGORY_KEYWORDS: list[tuple[str, str]] = [
    ("road situation", "road_status"),
    ("road status", "road_status"),
    ("cancellation", "cancellation_order"),
]

# Vision fallback is capped to the first few pages — road/cancellation
# notices are short, and this bounds both latency and Gemini cost per file.
_MAX_VISION_PAGES = 5


def _classify_category(title: str) -> str:
    lowered = title.lower()
    for keyword, category in _CATEGORY_KEYWORDS:
        if keyword in lowered:
            return category
    return "notice"


def _is_allowed_url(url: str) -> bool:
    """SSRF guard — the URL must be https and match the configured host exactly."""
    parsed = urlparse(url)
    return parsed.scheme == "https" and parsed.hostname == settings.circulars_allowed_host


async def _fetch_listing_page(client: httpx.AsyncClient) -> str:
    resp = await client.get(settings.circulars_notice_url)
    resp.raise_for_status()
    return resp.text


def _extract_pdf_links(html: str, base_url: str) -> list[tuple[str, str]]:
    """Return [(absolute_url, visible_title), ...] for every PDF link found."""
    soup = BeautifulSoup(html, "lxml")
    links: list[tuple[str, str]] = []
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"]
        if ".pdf" not in href.lower():
            continue
        absolute = urljoin(base_url, href)
        if not _is_allowed_url(absolute):
            logger.warning("Skipping off-host PDF link: %s", absolute)
            continue
        title = anchor.get_text(strip=True) or href.rsplit("/", 1)[-1]
        links.append((absolute, title))
    return links


async def _download_pdf(client: httpx.AsyncClient, url: str) -> bytes | None:
    """Stream-download with a hard size cap. Returns None if oversized/invalid."""
    max_bytes = settings.circulars_max_pdf_bytes
    chunks: list[bytes] = []
    total = 0
    async with client.stream("GET", url) as resp:
        resp.raise_for_status()
        async for chunk in resp.aiter_bytes():
            total += len(chunk)
            if total > max_bytes:
                logger.warning("PDF exceeded size cap, aborting download: %s", url)
                return None
            chunks.append(chunk)
    data = b"".join(chunks)
    if not data.startswith(_PDF_MAGIC):
        logger.warning("Downloaded file is not a real PDF (bad magic bytes): %s", url)
        return None
    return data


def _extract_text_pymupdf(pdf_bytes: bytes) -> str:
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        return "\n".join(page.get_text().strip() for page in doc).strip()


async def _extract_text_vision(pdf_bytes: bytes) -> str:
    """Fallback for scanned/photographed PDFs with no real text layer.

    Renders the first few pages as images and asks Gemini Vision to
    transcribe them — reuses the exact same client setup as the chat
    app's existing image-chat path (see rag_chain.py).
    """
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY not set — cannot OCR scanned circular via vision.")
        return ""

    import base64

    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage

    vision_llm = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.0,
        max_output_tokens=2048,
    )

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        page_texts = []
        for page in doc[:_MAX_VISION_PAGES]:
            pixmap = page.get_pixmap(dpi=200)
            image_b64 = base64.b64encode(pixmap.tobytes("png")).decode()
            message = HumanMessage(content=[
                {
                    "type": "text",
                    "text": (
                        "Transcribe all readable text from this scanned government "
                        "document page exactly as written. Return only the transcription."
                    ),
                },
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}},
            ])
            result = await vision_llm.ainvoke([message])
            page_texts.append(str(result.content))

    return "\n".join(page_texts).strip()


async def _extract_text(pdf_bytes: bytes) -> str:
    text = _extract_text_pymupdf(pdf_bytes)
    if len(text) >= 40:  # a real text layer — cheap and fast, use it
        return text
    logger.info("PDF has little/no text layer — falling back to Gemini Vision.")
    return await _extract_text_vision(pdf_bytes)


def _guess_issue_date(title: str) -> str:
    """Best-effort DD/MM/YYYY extraction from the title; falls back to today."""
    import re

    match = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", title)
    if match:
        day, month, year = (int(part) for part in match.groups())
        try:
            return date(year, month, day).isoformat()
        except ValueError:
            pass
    return date.today().isoformat()


async def run_circular_sync(repo: BaseRepository) -> dict:
    """
    Entry point called by both the scheduler and the admin sync endpoint.
    Same function, same behaviour, regardless of caller.
    """
    summary = {"found": 0, "new": 0, "skipped": 0, "failed": 0}

    if not _is_allowed_url(settings.circulars_notice_url):
        logger.error(
            "circulars_notice_url does not match circulars_allowed_host — refusing to run."
        )
        return summary

    async with httpx.AsyncClient(
            timeout=_REQUEST_TIMEOUT,
            follow_redirects=False,  # redirects could otherwise hop off-host post-validation
            headers={"User-Agent": "SikkimTourismAssistant-CircularSync/1.0"},
    ) as client:
        try:
            html = await _fetch_listing_page(client)
        except Exception as exc:
            logger.error("Failed to fetch circulars listing page: %s", exc)
            return summary

        links = _extract_pdf_links(html, settings.circulars_notice_url)
        summary["found"] = len(links)

        for url, title in links[: settings.circulars_max_per_run]:
            try:
                pdf_bytes = await _download_pdf(client, url)
                if pdf_bytes is None:
                    summary["skipped"] += 1
                    continue

                pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()
                if await repo.circular_exists(pdf_hash):
                    summary["skipped"] += 1
                    continue

                extracted_text = await _extract_text(pdf_bytes)
                if not extracted_text:
                    logger.warning("No text extracted from %s — skipping.", url)
                    summary["failed"] += 1
                    continue

                circular = Circular(
                    title=title[:300],
                    category=_classify_category(title),
                    district=None,
                    issue_date=_guess_issue_date(title),
                    source_url=url,
                    pdf_hash=pdf_hash,
                    extracted_text=extracted_text,
                    ingested_at=datetime.now(timezone.utc),
                )
                await repo.save_circular(circular)
                summary["new"] += 1
                logger.info("Ingested new circular: %s", title[:80])

            except Exception as exc:
                # Never let one bad file abort the whole batch.
                logger.exception("Failed to process circular %s: %s", url, exc)
                summary["failed"] += 1

    logger.info("Circular sync complete: %s", summary)
    return summary