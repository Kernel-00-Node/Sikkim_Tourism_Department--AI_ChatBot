"""
Throwaway local test runner — NOT part of the app, don't deploy this.

Calls run_circular_sync() directly against the mock repo so you can see
exactly what the scraper finds/ingests on the real sikkimtourism.gov.in
site, without spinning up FastAPI or dealing with admin login.

Usage:
    cd backend
    source v_env/bin/activate
    python test_scrape_live.py
"""
import asyncio
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

from app.config import settings
from app.database.mock_repo import MockRepository
from app.services.circular_scraper import run_circular_sync


async def main():
    print(f"Target: {settings.circulars_notice_url}")
    print(f"Allowed host: {settings.circulars_allowed_host}")
    print(f"Scraper enabled in .env: {settings.enable_circular_scraper}")
    print("-" * 60)

    repo = MockRepository()
    summary = await run_circular_sync(repo)

    print("-" * 60)
    print("RESULT:", summary)

    circulars = await repo.list_circulars(limit=20)
    for c in circulars:
        print(f"\n[{c.category}] {c.title}")
        print(f"  source: {c.source_url}")
        print(f"  text preview: {c.extracted_text[:150]!r}")


if __name__ == "__main__":
    asyncio.run(main())
