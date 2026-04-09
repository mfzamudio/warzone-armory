"""
Warzone Loadout Scraper
Extracts weapon data and best loadouts from CODMunity.gg.

The page embeds all data in a <script type="application/json"> tag —
no browser automation needed, plain requests works fine.

Usage:
  python scraper.py              # Normal run -> updates data/weapons.json
  python scraper.py --debug      # Also saves raw JSON to scraper/debug/
  python scraper.py --dry-run    # Parse and print stats without saving
"""

import argparse
import json
import logging
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ROOT_DIR    = Path(__file__).parent.parent
DATA_DIR    = ROOT_DIR / "data"
DEBUG_DIR   = Path(__file__).parent / "debug"
OUTPUT_FILE  = DATA_DIR / "weapons.json"
META_FILE    = DATA_DIR / "meta.json"
BACKUP_FILE  = DATA_DIR / "weapons.backup.json"

SOURCE_URL = "https://codmunity.gg/weapon-stats/warzone"

# Warzone current era: weapons from these game sources are available
WARZONE_GAMES = {"bo6", "bo7", "mw3", "mw2", "warzone-2"}

# Attachment slot names we care about (in display order)
ATTACHMENT_SLOTS = [
    "Muzzle", "Barrel", "Optic", "Underbarrel",
    "Magazine", "Rear Grip", "Stock", "Laser",
    "Fire Mods", "Conversion Kit", "Ammunition",
]

# Map CODMunity playstyle names -> our app playstyle keys
PLAYSTYLE_MAP = {
    "Long Range":       "long_range",
    "Close Range":      "aggressive",
    "Sniper Support":   "sniper_support",
    "Sniper":           "sniper_support",   # merge Sniper into sniper_support
    "Mouse & Keyboard": "balanced",
    "Semi Auto":        "long_range",
    "Secondary":        "aggressive",
}

# If weapon count drops more than this vs previous run, abort
MAX_DROP_FRACTION = 0.20

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
    encoding="utf-8",
)
log = logging.getLogger("scraper")

# ---------------------------------------------------------------------------
# Fetch + parse
# ---------------------------------------------------------------------------

def fetch_page(url: str) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    log.info(f"Fetching {url} ...")
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    log.info(f"  Response: {resp.status_code}, {len(resp.text):,} chars")
    return resp.text


def extract_json_state(html: str) -> dict:
    """Extract the embedded Angular JSON transfer state from the page."""
    m = re.search(r'<script[^>]+application/json[^>]*>(.*?)</script>', html, re.DOTALL)
    if not m:
        raise ValueError("Could not find <script type='application/json'> in page")
    return json.loads(m.group(1))


# ---------------------------------------------------------------------------
# Build weapons list
# ---------------------------------------------------------------------------

def build_weapons(state: dict) -> list[dict]:
    """
    Combine weapon catalog + loadouts + stats from the JSON state.
    Returns a list of normalized weapon dicts.
    """
    # New structure: data moved to stats-comparator-page-warzone
    page_data = state.get("stats-comparator-page-warzone", {})

    raw_weapons  = page_data.get("weapons", [])
    raw_loadouts = page_data.get("metaLoadouts", [])
    raw_stats    = page_data.get("weaponStats", [])

    log.info(f"Raw data: {len(raw_weapons)} weapons, {len(raw_loadouts)} loadouts, {len(raw_stats)} stat entries")

    # --- Index weapon stats by name ---
    stats_by_name: dict[str, dict] = {}
    for s in raw_stats:
        name = s.get("gun", "")
        if name:
            stats_by_name[name] = {
                "rpm":    s.get("rpm"),
                "ads":    s.get("ads"),          # ADS time in ms
                "bv":     s.get("bv"),            # bullet velocity m/s
                "damage": s.get("simple_damage"),
                "mag":    s.get("mag_size"),
            }

    # --- Index loadouts by (weapon_name, playstyle_key) -> best loadout ---
    # Keep only the highest-rated loadout per weapon+playstyle combo
    loadouts_by_weapon: dict[str, dict] = {}   # weapon_name -> {playstyle_key: loadout_dict}

    for raw in raw_loadouts:
        weapon_name = raw.get("WeaponName", "")
        raw_playstyle = raw.get("Playstyle", "")
        playstyle_key = PLAYSTYLE_MAP.get(raw_playstyle, "balanced")
        rating = raw.get("Rating", 0) or 0

        if not weapon_name:
            continue

        # Build attachment list (non-zero string values from known slots)
        attachments = []
        for slot in ATTACHMENT_SLOTS:
            val = raw.get(slot)
            if val and isinstance(val, str) and val != "0":
                attachments.append({"slot": slot, "name": val})

        if not attachments:
            continue

        entry = {
            "attachments":  attachments,
            "rating":       rating,
            "description":  raw.get("Comment") or f"{raw_playstyle} meta build",
            "loadout_code": raw.get("LoadoutCode"),
            "image":        raw.get("image"),
        }

        existing = loadouts_by_weapon.setdefault(weapon_name, {})
        prev = existing.get(playstyle_key)
        if prev is None or rating > prev.get("rating", 0):
            existing[playstyle_key] = entry

    # --- Build final weapon list (only Warzone-era weapons) ---
    weapons: list[dict] = []

    for raw in raw_weapons:
        app_game = raw.get("appGame", "")
        if app_game not in WARZONE_GAMES:
            continue

        name     = raw.get("WeaponName") or raw.get("name", "")
        category = raw.get("Category", "Unknown")
        slug     = raw.get("slug") or re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
        icon     = raw.get("Icon", "")
        desc     = raw.get("Description", "")

        loadouts = loadouts_by_weapon.get(name, {})
        stats    = stats_by_name.get(name, {})

        weapons.append({
            "id":          slug,
            "name":        name,
            "type":        category,
            "game":        app_game,
            "icon":        icon,
            "description": desc,
            "stats":       stats,
            "loadouts": {
                "aggressive":     loadouts.get("aggressive"),
                "long_range":     loadouts.get("long_range"),
                "balanced":       loadouts.get("balanced"),
                "sniper_support": loadouts.get("sniper_support"),
            },
        })

    # Sort by type then name
    weapons.sort(key=lambda w: (w["type"], w["name"]))
    return weapons


# ---------------------------------------------------------------------------
# Save output
# ---------------------------------------------------------------------------

def build_meta(state: dict, weapons: list[dict]) -> dict:
    """
    Build meta.json:
      - top_weapons: ranked list from CODMunity's topWeapons array
      - meta_scores: per-weapon score derived from loadout ratings
      - attachment_frequency: most used attachments across all meta loadouts
      - playstyle_coverage: how many weapons have each playstyle loadout
      - popularity: pick-rate proxy from popularityByGame if available
    """
    page_data = state.get("stats-comparator-page-warzone", {})
    global_data = page_data.get("global", {})

    # --- Top weapons list (CODMunity editorial ranking) ---
    top_weapons_raw = global_data.get("topWeapons", [])
    top_weapons = [
        {"name": w.get("WeaponName", ""), "game": w.get("appGame", ""), "rank": i + 1}
        for i, w in enumerate(top_weapons_raw)
        if w.get("WeaponName")
    ]

    # --- Meta scores: best loadout rating per weapon, averaged across playstyles ---
    meta_scores: dict[str, float] = {}
    for w in weapons:
        scores = [
            lo["rating"] for lo in (w.get("loadouts") or {}).values()
            if lo and lo.get("rating")
        ]
        if scores:
            meta_scores[w["name"]] = round(max(scores), 2)

    top_meta = sorted(meta_scores.items(), key=lambda x: x[1], reverse=True)

    # --- Attachment frequency: count each attachment name across all loadouts ---
    att_freq: dict[str, int] = {}
    slot_freq: dict[str, int] = {}
    for w in weapons:
        for lo in (w.get("loadouts") or {}).values():
            if not lo:
                continue
            for a in (lo.get("attachments") or []):
                name = a.get("name", "")
                slot = a.get("slot", "")
                if name:
                    att_freq[name] = att_freq.get(name, 0) + 1
                if slot:
                    slot_freq[slot] = slot_freq.get(slot, 0) + 1

    top_attachments = sorted(att_freq.items(), key=lambda x: x[1], reverse=True)[:30]
    top_slots       = sorted(slot_freq.items(), key=lambda x: x[1], reverse=True)

    # --- Playstyle coverage ---
    playstyle_coverage: dict[str, int] = {
        "aggressive": 0, "long_range": 0, "balanced": 0, "sniper_support": 0
    }
    for w in weapons:
        for ps, lo in (w.get("loadouts") or {}).items():
            if lo and lo.get("attachments"):
                playstyle_coverage[ps] = playstyle_coverage.get(ps, 0) + 1

    # --- Popularity by game from global assets ---
    popularity_raw = global_data.get("popularityByGame", [])
    popularity = []
    for entry in popularity_raw:
        if isinstance(entry, dict):
            popularity.append(entry)

    return {
        "last_updated":       datetime.now(timezone.utc).isoformat(),
        "top_weapons":        top_weapons,
        "top_meta_scores":    [{"name": n, "score": s} for n, s in top_meta[:50]],
        "top_attachments":    [{"name": n, "count": c} for n, c in top_attachments],
        "top_slots":          [{"slot": s, "count": c} for s, c in top_slots],
        "playstyle_coverage": playstyle_coverage,
        "popularity":         popularity,
        "total_weapons":      len(weapons),
    }


def save_output(weapons: list[dict], dry_run: bool):
    if dry_run:
        log.info(f"[dry-run] Would save {len(weapons)} weapons to {OUTPUT_FILE}")
        return

    DATA_DIR.mkdir(exist_ok=True)

    # Safety check: abort if weapon count dropped significantly
    if OUTPUT_FILE.exists():
        existing = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        prev_count = len(existing.get("weapons", []))
        if prev_count > 0:
            drop = (prev_count - len(weapons)) / prev_count
            if drop > MAX_DROP_FRACTION:
                log.error(
                    f"ABORTED: weapon count dropped {drop:.0%} "
                    f"({prev_count} -> {len(weapons)}). "
                    "Possible scraping failure. Previous data kept."
                )
                sys.exit(1)

        shutil.copy(OUTPUT_FILE, BACKUP_FILE)
        log.info(f"Backup -> {BACKUP_FILE.name}")

    output = {
        "last_updated":  datetime.now(timezone.utc).isoformat(),
        "season":        "S2R",
        "weapon_count":  len(weapons),
        "weapons":       weapons,
    }

    OUTPUT_FILE.write_text(
        json.dumps(output, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    log.info(f"Saved {len(weapons)} weapons -> {OUTPUT_FILE}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Warzone loadout scraper")
    parser.add_argument("--debug",   action="store_true", help="Save raw JSON state to scraper/debug/")
    parser.add_argument("--dry-run", action="store_true", help="Parse and print stats without saving")
    args = parser.parse_args()

    log.info("=== Warzone Loadout Scraper ===")

    html  = fetch_page(SOURCE_URL)
    state = extract_json_state(html)

    if args.debug:
        DEBUG_DIR.mkdir(exist_ok=True)
        debug_path = DEBUG_DIR / "codmunity_state.json"
        debug_path.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
        log.info(f"Debug state saved -> {debug_path}")

    weapons = build_weapons(state)
    meta    = build_meta(state, weapons)

    # Summary
    by_type: dict[str, int] = {}
    with_loadouts = 0
    for w in weapons:
        by_type[w["type"]] = by_type.get(w["type"], 0) + 1
        if any(v for v in w["loadouts"].values()):
            with_loadouts += 1

    log.info(f"Result: {len(weapons)} weapons, {with_loadouts} with loadouts")
    for t, count in sorted(by_type.items()):
        log.info(f"  {t}: {count}")

    save_output(weapons, dry_run=args.dry_run)

    if not args.dry_run:
        META_FILE.write_text(
            json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        log.info(f"Saved meta -> {META_FILE}")
    else:
        log.info(f"[dry-run] top_meta={meta['top_meta_scores'][:3]}, "
                 f"top_att={meta['top_attachments'][:3]}")

    log.info("Done.")


if __name__ == "__main__":
    main()
