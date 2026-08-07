"""
Throwaway probe — NOT part of the app, don't deploy this.

We don't yet know the real structure of the travel-agents listing page
(pagination? search-only? what columns?), so before writing any
scraper/schema/model code for it, this just renders the page with a
real browser (same Selenium approach circular_scraper.py already uses
for the notices page) and dumps what's actually there:

  - the listing page's rendered HTML (saved to disk) + every link found
    that looks like it points at a specific establishment
  - one detail page rendered + all its visible text, so we can see what
    fields (address/phone/email/etc.) are actually available per agency

Usage:
    cd backend
    source v_env/bin/activate
    python test_scrape_agents.py
"""
import os

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.support.ui import WebDriverWait

LISTING_URL = "https://sikkimtourism.gov.in/registered-establishments/travel-agents"
DETAIL_URL = (
    "https://sikkimtourism.gov.in/Public/TravellerEssentials/"
    "TravelAgentDetails?EstablishmentID=NR20A854"
)
DEBUG_DIR = "/tmp/agent_scrape_probe"


def _wait_ready(driver):
    WebDriverWait(driver, 20).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )


def _dump(driver, label: str):
    os.makedirs(DEBUG_DIR, exist_ok=True)
    path = os.path.join(DEBUG_DIR, f"{label}.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(driver.page_source)
    print(f"  saved HTML -> {path}")


def probe(url: str, label: str):
    options = FirefoxOptions()
    options.add_argument("-headless")
    driver = webdriver.Firefox(options=options)
    driver.set_page_load_timeout(45)
    try:
        print(f"\n=== {label}: {url} ===")
        driver.get(url)
        try:
            _wait_ready(driver)
        except TimeoutException:
            print("  (readyState wait timed out, continuing anyway)")

        print(f"  final URL: {driver.current_url}")
        _dump(driver, label)

        anchors = driver.find_elements(By.TAG_NAME, "a")
        print(f"  {len(anchors)} anchors on page. Ones mentioning "
              f"'travelagent' or 'EstablishmentID':")
        for a in anchors:
            href = a.get_attribute("href") or ""
            if "travelagent" in href.lower() or "establishmentid" in href.lower():
                print(f"    {(a.text or '').strip()[:50]!r} -> {href}")

        # Dump visible body text too — cheapest way to see what fields
        # actually render (address/phone/email/etc.) without guessing
        # at CSS selectors ahead of time.
        body_text = driver.find_element(By.TAG_NAME, "body").text
        print(f"\n  --- visible body text ({len(body_text)} chars) ---")
        print(body_text[:3000])
    finally:
        driver.quit()


if __name__ == "__main__":
    probe(LISTING_URL, "listing")
    probe(DETAIL_URL, "detail")
    print(f"\nFull HTML dumps saved under {DEBUG_DIR}/ if you want to grep them.")