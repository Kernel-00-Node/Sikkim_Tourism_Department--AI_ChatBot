"""Offline regression tests for circular OCR helpers."""

import pytest

from app.services import circular_scraper


@pytest.mark.asyncio
async def test_scanned_pdf_joins_each_transcribed_page(monkeypatch):
    """Scanned PDFs must await every page OCR call before joining the text."""
    monkeypatch.setattr(circular_scraper.settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(
        circular_scraper,
        "_render_vision_pages_sync",
        lambda _pdf: ["first-page", "second-page"],
    )
    transcriber = object()
    monkeypatch.setattr(
        circular_scraper, "_get_vision_transcriber", lambda: transcriber
    )

    calls: list[tuple[object, str]] = []

    async def transcribe(client, image_url: str) -> str:
        calls.append((client, image_url))
        return "one" if image_url.endswith("first-page") else "two"

    monkeypatch.setattr(circular_scraper, "_transcribe_image", transcribe)

    assert await circular_scraper._extract_text_vision(b"pdf") == "one\ntwo"
    assert calls == [
        (transcriber, "data:image/png;base64,first-page"),
        (transcriber, "data:image/png;base64,second-page"),
    ]
