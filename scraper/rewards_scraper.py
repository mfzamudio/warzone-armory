"""
Warzone Rewards Scraper
Scrapes free promo codes from Dexerto and Twitch Drops / Prime Gaming
news links from CharlieintelNEWS.

Usage:
  python rewards_scraper.py            # Normal run -> data/rewards.json
  python rewards_scraper.py --debug    # Also saves raw HTML to scraper/debug/
  python rewards_scraper.py --dry-run  # Parse and print without saving
"""

import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ROOT_DIR    = Path(__file__).parent.parent
DATA_DIR    = ROOT_DIR / "data"
DEBUG_DIR   = Path(__file__).parent / "debug"
OUTPUT_FILE = DATA_DIR / "rewards.json"

DEXERTO_URL      = "https://www.dexerto.com/wikis/warzone/warzone-codes/"
CHARLIEINTEL_URL = "https://www.charlieintel.com/call-of-duty/warzone/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

NEWS_KEYWORDS = ["twitch", "drops", "prime gaming", "prime", "free bundle", "free rewards"]

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
    encoding="utf-8",
)
log = logging.getLogger("rewards_scraper")

# ---------------------------------------------------------------------------
# Fetch
# ---------------------------------------------------------------------------

def fetch_page(url: str) -> str:
    log.info(f"Fetching {url} ...")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    log.info(f"  Response: {resp.status_code}, {len(resp.text):,} chars")
    return resp.text

# ---------------------------------------------------------------------------
# Scrape Dexerto Promo Codes
# ---------------------------------------------------------------------------

def scrape_promo_codes(html: str) -> dict:
    """
    Parse Dexerto promo codes table.
    table[0] = active codes, table[1] = expired codes
    """
    active = []
    expired_count = 0

    try:
        soup = BeautifulSoup(html, "html.parser")
        tables = soup.find_all("table", class_="min-w-full")

        if len(tables) >= 1:
            tbody = tables[0].find("tbody")
            if tbody:
                for row in tbody.find_all("tr"):
                    cells = row.find_all("td")
                    if len(cells) >= 2:
                        code   = cells[0].get_text(strip=True)
                        reward = cells[1].get_text(strip=True)
                        if code:
                            active.append({"code": code, "reward": reward})

        if len(tables) >= 2:
            tbody = tables[1].find("tbody")
            if tbody:
                expired_count = len(tbody.find_all("tr"))

    except Exception as e:
        log.warning(f"Error parsing promo codes: {e}")

    log.info(f"Promo codes: {len(active)} active, {expired_count} expired")
    return {"active": active, "expired_count": expired_count}

# ---------------------------------------------------------------------------
# Scrape CharlieintelNEWS
# ---------------------------------------------------------------------------

def classify_news_type(title: str) -> str:
    """Classify news item as twitch_drops or prime_gaming based on title."""
    t = title.lower()
    if "prime" in t:
        return "prime_gaming"
    return "twitch_drops"

def scrape_news_items(html: str) -> list:
    """
    Parse CharlieintelNEWS articles looking for Twitch Drops / Prime Gaming posts.
    Match on headlines containing keywords.
    """
    results = []

    try:
        soup = BeautifulSoup(html, "html.parser")
        articles = soup.find_all("article", limit=40)

        for article in articles:
            # Find headline in h2, h3, h4
            headline_el = article.find(["h2", "h3", "h4"])
            if not headline_el:
                continue

            title = headline_el.get_text(strip=True)
            lower = title.lower()

            # Check if title matches any keyword
            if not any(kw in lower for kw in NEWS_KEYWORDS):
                continue

            # Extract link
            link_el = article.find("a", href=True)
            url = link_el["href"] if link_el else ""
            if url and url.startswith("/"):
                url = "https://www.charlieintel.com" + url

            # Extract date
            time_el = article.find("time")
            published = time_el.get("datetime", "") if time_el else ""

            results.append({
                "type":      classify_news_type(title),
                "title":     title,
                "url":       url,
                "published": published,
                "source":    "charlieintel",
            })

            # Limit to 4 news items
            if len(results) >= 4:
                break

    except Exception as e:
        log.warning(f"Error parsing news items: {e}")

    log.info(f"News items: {len(results)} found")
    return results

# ---------------------------------------------------------------------------
# Save
# ---------------------------------------------------------------------------

def save_output(data: dict, dry_run: bool):
    if dry_run:
        log.info(f"[dry-run] Would save rewards.json")
        log.info(f"  active codes: {len(data['promo_codes']['active'])}")
        log.info(f"  news items:   {len(data['news_items'])}")
        return

    DATA_DIR.mkdir(exist_ok=True)

    # Safety check: warn if active codes dropped to 0 (but still save)
    if OUTPUT_FILE.exists():
        try:
            prev = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
            prev_active = len(prev.get("promo_codes", {}).get("active", []))
            new_active  = len(data["promo_codes"]["active"])
            if prev_active > 0 and new_active == 0:
                log.warning(
                    f"Active codes dropped from {prev_active} to 0. "
                    "This may be correct (all codes expired) — saving anyway."
                )
        except Exception as e:
            log.warning(f"Could not check previous data: {e}")

    OUTPUT_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )
    log.info(f"Saved -> {OUTPUT_FILE}")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Warzone rewards scraper")
    parser.add_argument("--debug",   action="store_true", help="Save raw HTML to scraper/debug/")
    parser.add_argument("--dry-run", action="store_true", help="Parse and print without saving")
    args = parser.parse_args()

    log.info("=== Warzone Rewards Scraper ===")

    promo_codes = {"active": [], "expired_count": 0}
    news_items  = []

    # --- Dexerto promo codes ---
    try:
        dexerto_html = fetch_page(DEXERTO_URL)
        if args.debug:
            DEBUG_DIR.mkdir(exist_ok=True)
            (DEBUG_DIR / "dexerto_codes.html").write_text(dexerto_html, encoding="utf-8")
            log.info(f"Debug HTML -> {DEBUG_DIR / 'dexerto_codes.html'}")
        promo_codes = scrape_promo_codes(dexerto_html)
    except Exception as e:
        log.warning(f"Promo codes scrape failed: {e}. Using empty list.")

    # --- CharlieintelNEWS news items ---
    try:
        charlieintel_html = fetch_page(CHARLIEINTEL_URL)
        if args.debug:
            (DEBUG_DIR / "charlieintel.html").write_text(charlieintel_html, encoding="utf-8")
            log.info(f"Debug HTML -> {DEBUG_DIR / 'charlieintel.html'}")
        news_items = scrape_news_items(charlieintel_html)
    except Exception as e:
        log.warning(f"News scrape failed: {e}. Using empty list.")

    output = {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "promo_codes":  promo_codes,
        "news_items":   news_items,
        "sources": {
            "promo_codes": DEXERTO_URL,
            "news":        CHARLIEINTEL_URL,
        },
    }

    save_output(output, dry_run=args.dry_run)
    log.info("Done.")

if __name__ == "__main__":
    main()
