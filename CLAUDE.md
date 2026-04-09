# Warzone Loadout Builder

## Overview
Web application that replicates the Warzone weapon selection experience. Users browse weapons by type and view the best attachment combinations filtered by playstyle. Hosted 100% free using GitHub Pages (frontend) + GitHub Actions (daily scraper).

## Architecture
```
GitHub Actions (daily cron)
    → runs scraper/scraper.py
    → updates data/weapons.json and data/meta.json
    → commits and pushes to the repository
        → GitHub Pages detects the change
        → serves the updated frontend automatically
```

No backend server. Everything is static. The frontend JS reads the JSON files directly.

## Tech Stack
- **Frontend**: Vanilla HTML + CSS + JavaScript (served free by GitHub Pages)
- **Data**: JSON files in the repository (`data/`) — updated daily by the Action
- **Scraper**: Python 3 with requests (runs in GitHub Actions, not locally)
- **CI/CD**: GitHub Actions — daily scraper + automatic deploy to GitHub Pages
- **Analytics**: Chart.js (CDN) for interactive charts on the analytics page

## Project Structure
```
warzone-armory/
├── .github/
│   └── workflows/
│       └── scrape-daily.yml           # GitHub Action: daily scraper + data commit
├── frontend/
│   ├── index.html                     # Main page — weapon browser
│   ├── analytics.html                 # Analytics dashboard
│   ├── rewards.html                   # Free Drops — promo codes & rewards
│   ├── css/
│   │   ├── style.css                  # Military dark theme (shared)
│   │   ├── analytics.css              # Analytics page styles
│   │   └── rewards.css                # Rewards page styles (independent)
│   └── js/
│       ├── app.js                     # Main page: weapon browser + detail panel
│       ├── analytics.js               # Analytics: charts + weapon detail overlay
│       └── rewards.js                 # Rewards page: codes & news rendering
├── scraper/
│   ├── scraper.py                     # Weapon & meta scraper (CODMunity.gg)
│   ├── rewards_scraper.py             # Rewards scraper (Dexerto + CharlieintelNEWS)
│   └── requirements.txt               # Dependencies: requests, beautifulsoup4
├── data/
│   ├── weapons.json                   # Weapon catalog + loadouts (updated daily)
│   ├── meta.json                      # Meta rankings + attachment frequency
│   ├── rewards.json                   # Promo codes + news items (updated daily)
│   └── weapons.backup.json            # Safety backup of weapons.json
├── .gitignore
├── CLAUDE.md                          # Developer guide (this file)
├── README.md                          # User-facing documentation
├── PRD.md                             # Product Requirements Document
├── progress.md                        # Implementation progress & status
└── .claude/
    └── settings.local.json            # Local CLI settings
```

## Key Features

### Page 1: Armory (index.html)
1. **Weapon Browser** — grid of 256 weapons grouped by type (AR, SMG, LMG, etc.)
2. **Type Filter** — filter by weapon category
3. **Playstyle Filter** — see best attachments for: Aggressive, Long Range, Balanced, Sniper Support
4. **Detail Panel** — click weapon to see gunsmith-style stat bars with attachment impact
5. **Attachment Display** — shows 5 recommended attachments with delta indicators

### Page 2: Analytics (analytics.html)
1. **Performance Rankings** — top 15 weapons ranked by TTK/ADS/RPM/Range/Meta Score
2. **Clickable Charts** — click weapon names in rankings to open detail panel
3. **Attachment Frequency** — top 12 most-used attachments across all meta builds
4. **Playstyle Coverage** — doughnut chart showing weapon variety per playstyle
5. **TTK Comparison** — line chart comparing time-to-kill across damage drop-off ranges for up to 4 weapons

### Page 3: Free Drops (rewards.html)
1. **Promo Codes** — active codes scraped daily from Dexerto with copy-to-clipboard
2. **Twitch Drops** — news articles from CharlieintelNEWS about current Twitch campaigns
3. **Prime Gaming** — news articles about Prime Gaming bundle availability
4. **Relative Dates** — displays "Today", "Yesterday", "N days ago" format

### All Pages
- **Daily Refresh** — GitHub Actions runs both scrapers at 4 AM UTC every day
- **No Login Required** — purely informational, no authentication needed
- **Mobile Responsive** — clips and parallelograms scale properly on all screen sizes
- **Military Theme** — dark green military aesthetic throughout

## Playstyle Categories
| Playstyle | Focus |
|-----------|-------|
| **Aggressive** | Fast ADS, high mobility, close-to-mid range |
| **Long Range** | Damage range, bullet velocity, precision |
| **Balanced** | All-around meta builds |
| **Sniper Support** | Marksman/Sniper rifles, patience-based play |

## Weapon Types (Warzone BO6)
Assault Rifles, SMGs, LMGs, Sniper Rifles, Marksman Rifles, Battle Rifles, Shotguns, Pistols, Launchers, Melee, Special

## Data Sources (Scraping)

### Weapon Data (scraper/scraper.py)
- **CODMunity.gg** — primary source: 256 weapons + 326 meta loadouts
  - URL: https://codmunity.gg/weapon-stats/warzone
  - Data: `<script type="application/json">` Angular transfer state (no JS execution needed)
  - Structure: `stats-comparator-page-warzone.{weapons, metaLoadouts, weaponStats}`
  - Updated: Daily (whenever CODMunity updates their meta)
- **Game Version**: Warzone Season 2 Reloaded 2026 (Black Ops 6)

### Rewards Data (scraper/rewards_scraper.py)
- **Dexerto** — promo codes (active & expired)
  - URL: https://www.dexerto.com/wikis/warzone/warzone-codes/
  - Data: HTML `<table class="min-w-full">` with code + reward text
  - Structure: table[0] = active codes, table[1] = expired codes
  - Updated: Daily
- **CharlieintelNEWS** — Twitch Drops & Prime Gaming news (best-effort)
  - URL: https://www.charlieintel.com/call-of-duty/warzone/
  - Data: `<article>` tags filtered by keywords ("twitch", "prime", "drops")
  - Status: May be empty if no recent articles match keywords
  - Updated: Daily

## Data Format (data/weapons.json)
```json
{
  "last_updated": "2026-03-26T04:00:00Z",
  "season": "S2R",
  "weapon_count": 256,
  "weapons": [
    {
      "id": "xm4",
      "name": "XM4",
      "type": "Assault Rifle",
      "game": "bo6",
      "icon": "https://assets.codmunity.gg/optimized/XM4-Dark-Spine.webp",
      "stats": { "rpm": 800, "ads": 270, "bv": 820, "damage": [...], "mag": 30 },
      "loadouts": {
        "aggressive":     { "attachments": [...], "rating": 3.2 },
        "long_range":     { "attachments": [...], "rating": 3.4 },
        "balanced":       null,
        "sniper_support": { "attachments": [...], "rating": 1.5 }
      }
    }
  ]
}
```

## Data Format (data/meta.json)
```json
{
  "last_updated": "...",
  "top_weapons": [{ "name": "Voyak KT-3", "rank": 1 }],
  "top_meta_scores": [{ "name": "Voyak KT-3", "score": 5.8 }],
  "top_attachments": [{ "name": "Casus Brake", "count": 45 }],
  "top_slots": [{ "slot": "Muzzle", "count": 271 }],
  "playstyle_coverage": { "aggressive": 94, "long_range": 98, "sniper_support": 112 },
  "total_weapons": 256
}
```

## Data Format (data/rewards.json)
```json
{
  "last_updated": "2026-04-09T04:00:00Z",
  "promo_codes": {
    "active": [
      { "code": "WZFREEOP", "reward": "2XP Token + Calling Card" }
    ],
    "expired_count": 12
  },
  "news_items": [
    {
      "type": "twitch_drops",
      "title": "Warzone Twitch Drops: All Active Drops & How to Get Them",
      "url": "https://www.charlieintel.com/...",
      "published": "2026-04-08T12:00:00Z",
      "source": "charlieintel"
    },
    {
      "type": "prime_gaming",
      "title": "Warzone Prime Gaming Bundles April 2026",
      "url": "https://www.charlieintel.com/...",
      "published": "2026-04-07T10:00:00Z",
      "source": "charlieintel"
    }
  ],
  "sources": {
    "promo_codes": "https://www.dexerto.com/wikis/warzone/warzone-codes/",
    "news": "https://www.charlieintel.com/call-of-duty/warzone/"
  }
}
```

## GitHub Actions Workflow (scrape-daily.yml)
- **Trigger**: cron `0 4 * * *` (4 AM UTC daily) + `workflow_dispatch` (manual trigger)
- **Steps**:
  1. Checkout repository
  2. Setup Python 3.12
  3. Install dependencies from `requirements.txt`
  4. Run weapon scraper → `data/weapons.json` + `data/meta.json`
  5. Run rewards scraper → `data/rewards.json`
  6. Commit all data files if changed: `chore: update weapon data YYYY-MM-DD`
  7. Push to main (GitHub Pages auto-deploys)
- **Safety**: If weapon count drops >20%, scraper aborts (keeps previous data)
- **No Secrets**: Uses implicit `GITHUB_TOKEN` for push

## Deployment (GitHub Pages)
- Branch: `main`
- GitHub Pages serves from the repo root (configure in Settings → Pages → Source: root `/`)
- Access the app at `frontend/index.html` → `https://<user>.github.io/<repo>/frontend/`
- Data files at `data/` are one level up from `frontend/`, so the relative path `../data/weapons.json` works both locally and on GitHub Pages

## Local Development
```bash
# Install scraper dependencies (requests + beautifulsoup4)
pip install -r scraper/requirements.txt

# Run weapon scraper (updates data/weapons.json + data/meta.json)
python scraper/scraper.py
python scraper/scraper.py --dry-run    # test without saving
python scraper/scraper.py --debug      # save raw HTML to scraper/debug/

# Run rewards scraper (updates data/rewards.json)
python scraper/rewards_scraper.py
python scraper/rewards_scraper.py --dry-run
python scraper/rewards_scraper.py --debug

# Serve locally from the project root
python -m http.server 8081
# Open http://localhost:8081/frontend/index.html (or analytics.html or rewards.html)
```

## Development Guidelines
- **No build tools** — pure ES6 JS, no npm, no Node.js
- **Frontend**: Vanilla HTML/CSS/JavaScript only, served by GitHub Pages
- **Scrapers**: Python 3 with `requests` + `beautifulsoup4` (no Playwright/Selenium)
- **Error Handling**: If scraping fails, do NOT overwrite existing JSON; log warning and use empty arrays
- **Data Safety**: Create backup before overwriting; weapon count drop >20% aborts commit
- **User-Agent**: Set on all HTTP requests to avoid 403 blocks
- **CSS Architecture**:
  - `style.css` — shared theme/variables (all pages)
  - `analytics.css` — analytics page styles + nav link styles (loaded by index.html too)
  - `rewards.css` — rewards page styles + nav link styles (independent module)
- **Chart.js**: Load from CDN; CSS-based bars preferred for compact data lists (avoids clip-path bugs)
- **Module Independence**: rewards.html is completely independent (own CSS, own scraper, own data file)
- **Three Pages**: index.html (browser), analytics.html (charts), rewards.html (codes/news)
