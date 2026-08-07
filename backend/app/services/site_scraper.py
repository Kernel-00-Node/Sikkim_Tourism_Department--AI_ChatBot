"""
|| Site_Scraper || — full breadth-first crawl of the department's live website
(sikkimtourism.gov.in) into the local `site_pages` table, with every page's
text chunked and embedded into the SAME Qdrant collection the RAG chain
already searches (see app/services/vectorstore.py + rag_chain._retrieve_context).
That means a scraped page becomes answerable by the chatbot automatically,
with no changes needed to the retrieval code — it just shows up alongside
destination records in similarity search results (tagged
metadata={"source": "site_page", ...} so it can be told apart from a
destination record if ever needed).

This runs on a schedule (see main.py's lifespan) and can also be triggered
on demand via POST /api/admin/sync-site. The chat endpoint never calls this
module directly — it only ever reads whatever this scraper has already
embedded, via the shared vector store.

Why Playwright instead of Selenium (used by circular_scraper.py):
  - Native asyncio integration — `await page.goto(...)` runs directly on
    the FastAPI event loop. No `asyncio.to_thread` wrapper needed for
    browser calls, which circular_scraper.py requires for Selenium's
    synchronous WebDriver API.
  - `wait_until="networkidle"` gives a built-in "the SPA has finished
    fetching/rendering" signal, which circular_scraper.py has to approximate
    manually with WebDriverWait + custom JS readiness checks.
  - Auto-installed, versioned browser binaries (`playwright install`)
    instead of depending on a system Firefox + geckodriver being present.

Security notes (read before changing the allowlist logic below — mirrors
the guard already in circular_scraper.py, generalised from one listing page
to an arbitrary number of discovered pages):
  - SSRF guard: every URL — the start URL AND every link discovered on
    every crawled page — is validated against `settings.site_scraper_allowed_host`
    (`_is_allowed_url`) BEFORE it is queued, and the browser's post-navigation
    URL (`page.url`) is re-checked AFTER every `page.goto()`, since a
    redirect could otherwise hop the browser off-host after the pre-check
    already passed.
  - Scope guard: the crawler only ever starts from and stays within
    `site_scraper_allowed_host`. It is not a general-purpose crawler.
  - Extension/scheme filtering: PDFs, images, archives, office docs,
    `mailto:`/`tel:`/`javascript:` links are never queued — those aren't
    pages to render, and PDFs already have their own dedicated ingestion
    path (circular_scraper.py / the manual upload endpoint).
  - Page & depth caps: `site_scraper_max_pages` and `site_scraper_max_depth`
    bound a single run so a page returning far more links than expected
    (or a link cycle) can't turn one sync into an unbounded crawl.
  - Text size cap: extracted text is truncated to `_MAX_STORED_TEXT_CHARS`
    before it's stored or embedded, bounding both the database row size and
    the embedding-API payload for any one page.
  - Per-page isolation: one page failing to load/parse/embed is logged and
    skipped — it never aborts the rest of the crawl.
  - Politeness delay: `site_scraper_politeness_delay_seconds` between page
    loads. This is still a real crawl against a public government server —
    check the department's robots.txt / terms-of-use posture for scale
    before running this against production at a shorter interval.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import uuid
from datetime import datetime, timezone
from urllib.parse import urldefrag, urljoin, urlparse

from app.config import settings
from app.database.base import BaseRepository
from app.models.schemas import SitePage
from app.services.vectorstore import ensure_collection, get_qdrant_client, get_vectorstore

logger = logging.getLogger(__name__)

# Anything with one of these extensions is an asset, not a page to render.
_SKIP_EXTENSIONS = (
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
    ".zip", ".rar", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".mp3", ".mp4", ".avi", ".mov", ".css", ".js", ".json", ".xml",
)
_SKIP_SCHEMES = ("mailto:", "tel:", "javascript:", "data:")

# Keeps DB rows and embedding payloads bounded — same reasoning as
# circular_scraper.py's _MAX_STORED_TEXT_CHARS, tuned up for full pages.
_MAX_STORED_TEXT_CHARS = 20_000

# Chunking — no extra dependency; a plain paragraph-aware sliding window is
# enough for page-length text and keeps requirements.txt from growing.
_CHUNK_SIZE = 1_200
_CHUNK_OVERLAP = 150


def _is_allowed_url(url: str) -> bool:
    """SSRF guard — only HTTPS on the configured host's default port is valid."""
    parsed = urlparse(url)
    return (
        parsed.scheme == "https"
        and parsed.hostname == settings.site_scraper_allowed_host
        and parsed.port in (None, 443)
        and not parsed.username
        and not parsed.password
    )


def _normalize_url(base: str, href: str) -> str | None:
    """
    Resolve `href` against `base`, drop fragments/asset links/off-host links,
    and canonicalise trailing slashes so "/tic" and "/tic/" dedupe to the
    same queue entry. Returns None for anything that shouldn't be crawled.
    """
    if not href:
        return None
    href = href.strip()
    if href.lower().startswith(_SKIP_SCHEMES):
        return None

    absolute = urljoin(base, href)
    absolute, _fragment = urldefrag(absolute)  # drop "#section" — same page
    parsed = urlparse(absolute)

    if parsed.path.lower().endswith(_SKIP_EXTENSIONS):
        return None
    if not _is_allowed_url(absolute):
        return None

    path = parsed.path.rstrip("/") or "/"
    normalized = f"{parsed.scheme}://{parsed.hostname}{path}"
    if parsed.query:
        normalized += f"?{parsed.query}"
    return normalized


def _chunk_text(text: str, *, size: int = _CHUNK_SIZE, overlap: int = _CHUNK_OVERLAP) -> list[str]:
    """Paragraph-aware sliding-window chunker with a hard-split fallback for
    single paragraphs longer than `size` (e.g. an unbroken block of text)."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 2 <= size:
            current = f"{current}\n\n{para}" if current else para
            continue

        if current:
            chunks.append(current)
            current = ""

        if len(para) <= size:
            current = para
        else:
            step = max(size - overlap, 1)
            for i in range(0, len(para), step):
                chunks.append(para[i:i + size])

    if current:
        chunks.append(current)

    return chunks or ([text[:size]] if text else [])


async def _extract_page_content(page) -> tuple[str, str]:
    """Strip nav/header/footer/script/style boilerplate and return (title, text)."""
    title = await page.title()
    raw_text = await page.evaluate(
        """
        () => {
          const clone = document.body.cloneNode(true);
          clone.querySelectorAll('script, style, nav, header, footer, noscript, svg')
               .forEach(el => el.remove());
          return clone.innerText || '';
        }
        """
    )
    text = re.sub(r"\n{3,}", "\n\n", (raw_text or "")).strip()
    return (title or "").strip(), text[:_MAX_STORED_TEXT_CHARS]


async def _crawl_site() -> list[dict]:
    """
    Breadth-first crawl starting at `settings.site_scraper_start_url`, staying
    on-host, capped by `site_scraper_max_pages` / `site_scraper_max_depth`.
    Returns a list of {"url", "title", "text", "depth"} dicts.

    These packages are optional in the normal API deployment — imported only
    when the scheduled scraper is actually invoked, so the rest of the app
    (and manual admin flows) keep working without Playwright installed.
    """
    from playwright.async_api import Error as PlaywrightError
    from playwright.async_api import TimeoutError as PlaywrightTimeoutError
    from playwright.async_api import async_playwright

    start_url = settings.site_scraper_start_url
    if not _is_allowed_url(start_url):
        logger.error("site_scraper_start_url is not on the allowed host — refusing to crawl.")
        return []

    visited: set[str] = set()
    queue: list[tuple[str, int]] = [(start_url, 0)]
    pages: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Deliberately NOT overriding the User-Agent — same reasoning as
        # circular_scraper.py: a real browser UA avoids WAF rules that bounce
        # unrecognised/non-browser clients back to "/".
        context = await browser.new_context()
        page = await context.new_page()
        page.set_default_timeout(settings.site_scraper_page_timeout_ms)

        try:
            while queue and len(pages) < settings.site_scraper_max_pages:
                url, depth = queue.pop(0)
                if url in visited:
                    continue
                visited.add(url)

                try:
                    await page.goto(url, wait_until="networkidle")
                except PlaywrightTimeoutError:
                    # A page with polling scripts/analytics may never truly
                    # go network-idle — that's not fatal, just use whatever
                    # DOM state has rendered so far.
                    logger.warning("Network-idle timeout on %s — using current DOM state.", url)
                except PlaywrightError as exc:
                    logger.warning("Failed to load %s (skipping): %s", url, exc)
                    continue

                # Re-validate AFTER navigation: the browser follows redirects
                # transparently, so a redirect could have hopped off-host
                # after `_is_allowed_url` already passed on the pre-nav URL.
                if not _is_allowed_url(page.url):
                    logger.warning("Navigation to %s ended up off-host at %s — skipping.", url, page.url)
                    continue

                title, text = await _extract_page_content(page)
                if text:
                    pages.append({"url": url, "title": title, "text": text, "depth": depth})

                if depth < settings.site_scraper_max_depth:
                    try:
                        hrefs = await page.eval_on_selector_all("a[href]", "els => els.map(e => e.href)")
                    except PlaywrightError:
                        hrefs = []
                    for href in hrefs:
                        child = _normalize_url(url, href)
                        if child and child not in visited:
                            queue.append((child, depth + 1))

                await asyncio.sleep(settings.site_scraper_politeness_delay_seconds)
        finally:
            await browser.close()

    return pages


def _chunk_id(url: str, index: int) -> str:
    """Deterministic Qdrant point ID — re-crawling the same URL overwrites
    its previous vectors instead of piling up duplicates on every sync."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"{url}#chunk{index}"))


def _upsert_chunks_sync(url: str, title: str, chunks: list[str]) -> None:
    """Blocking Qdrant/embedding work — run via asyncio.to_thread."""
    from langchain_core.documents import Document

    client = get_qdrant_client()
    ensure_collection(client)
    vectorstore = get_vectorstore()

    documents = [
        Document(
            page_content=f"Source page: {title}\nURL: {url}\n\n{chunk}",
            metadata={"source": "site_page", "url": url, "title": title, "chunk_index": i},
        )
        for i, chunk in enumerate(chunks)
    ]
    ids = [_chunk_id(url, i) for i in range(len(chunks))]
    vectorstore.add_documents(documents=documents, ids=ids)


def _delete_stale_chunks_sync(url: str, new_count: int, old_count: int) -> None:
    """If a re-crawled page now produces FEWER chunks than before, the extra
    old chunk IDs are orphaned vectors from the previous version — remove
    them explicitly, since add_documents only overwrites/adds, never shrinks."""
    from qdrant_client.models import PointIdsList

    stale_ids = [_chunk_id(url, i) for i in range(new_count, old_count)]
    if not stale_ids:
        return
    client = get_qdrant_client()
    client.delete(collection_name=settings.qdrant_collection, points_selector=PointIdsList(points=stale_ids))


async def _process_page(repo: BaseRepository, page_data: dict) -> str:
    """Embed one crawled page (if changed) and persist its SitePage record.
    Returns one of: "new", "updated", "unchanged", "failed"."""
    url, title, text, depth = page_data["url"], page_data["title"], page_data["text"], page_data["depth"]
    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

    existing = await repo.get_site_page_by_url(url)
    if existing is not None and existing.text_hash == text_hash:
        return "unchanged"

    chunks = _chunk_text(text)
    if not chunks:
        return "failed"

    try:
        await asyncio.to_thread(_upsert_chunks_sync, url, title, chunks)
        if existing is not None and existing.chunk_count > len(chunks):
            await asyncio.to_thread(_delete_stale_chunks_sync, url, len(chunks), existing.chunk_count)
    except Exception as exc:
        logger.exception("Failed to embed/upsert %s: %s", url, exc)
        return "failed"

    await repo.save_site_page(
        SitePage(
            url=url,
            title=(title or url)[:300],
            text_hash=text_hash,
            extracted_text=text[:_MAX_STORED_TEXT_CHARS],
            depth=depth,
            chunk_count=len(chunks),
            last_crawled_at=datetime.now(timezone.utc),
        )
    )
    return "new" if existing is None else "updated"


async def run_site_sync(repo: BaseRepository) -> dict:
    """
    Entry point called by both the scheduler and the admin sync endpoint.
    Same function, same behaviour, regardless of caller.
    """
    summary = {"found": 0, "new": 0, "updated": 0, "unchanged": 0, "failed": 0}

    if not _is_allowed_url(settings.site_scraper_start_url):
        logger.error(
            "site_scraper_start_url does not match site_scraper_allowed_host — refusing to run."
        )
        return summary

    try:
        pages = await _crawl_site()
    except Exception as exc:
        logger.exception("Whole-site crawl failed: %s", exc)
        return summary

    summary["found"] = len(pages)

    for page_data in pages:
        try:
            result = await _process_page(repo, page_data)
            summary[result] = summary.get(result, 0) + 1
        except Exception as exc:
            # Never let one bad page abort the whole batch.
            logger.exception("Failed to process page %s: %s", page_data.get("url"), exc)
            summary["failed"] += 1

    logger.info("Site sync complete: %s", summary)
    return summary