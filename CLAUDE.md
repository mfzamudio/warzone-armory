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
warzone-loadout/
├── .github/
│   └── workflows/
│       └── scrape-daily.yml    # GitHub Action: daily scraper + data commit
├── frontend/
│   ├── index.html              # Main page — weapon browser
│   ├── analytics.html          # Analytics dashboard
│   ├── css/
│   │   ├── style.css           # Military dark theme
│   │   └── analytics.css       # Analytics page layout + chart styles
│   └── js/
│       ├── app.js              # Loads JSON, filters by type/playstyle, renders UI
│       └── analytics.js        # Rankings, attachment frequency, TTK comparison charts
├── scraper/
│   ├── scraper.py              # Scraping script — updates weapons.json + meta.json
│   └── requirements.txt        # Scraper dependencies (requests only)
├── data/
│   ├── weapons.json            # Full weapon catalog with stats and loadouts
│   └── meta.json               # Meta scores, top attachments, playstyle coverage
├── .gitignore
└── CLAUDE.md
```

## Key Features
1. **Weapon Browser** — grid of weapons grouped by type, Warzone armory style
2. **Type Filter** — filter by category: AR, SMG, LMG, Sniper, Marksman, Shotgun, Pistol
3. **Playstyle Filter** — see the best attachments per playstyle
4. **Attachment Display** — shows the 5 recommended attachments with stat impact bars
5. **Daily Refresh** — GitHub Action updates data automatically every day
6. **Analytics Page** — rankings (TTK/ADS/RPM/Range), attachment meta, TTK comparison chart

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
- **CODMunity.gg** — primary source: 256 weapons + 321 meta loadouts embedded as JSON in the page HTML
  - https://codmunity.gg/weapon-stats/warzone
  - Data is in `<script type="application/json">` — no Playwright needed, plain `requests` works
  - Key keys: `global-assets.weapons` (catalog), `stats-comparator-assets-warzone.metaLoadouts` (loadouts)
- Game version: **Warzone Season 2 Reloaded 2026 (Black Ops 6)**. Season 3: April 2, 2026

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
  "playstyle_coverage": { "aggressive": 94, "long_range": 98, "sniper_support": 112 }
}
```

## GitHub Actions Workflow (scrape-daily.yml)
- **Trigger**: cron `0 4 * * *` (4 AM UTC daily) + `workflow_dispatch` (manual trigger)
- **Steps**: checkout → setup Python → install requests → run scraper → commit + push if changed
- Scraper auto-commits with message `chore: update weapon data YYYY-MM-DD`

## Deployment (GitHub Pages)
- Branch: `main`
- GitHub Pages serves from the repo root (configure in Settings → Pages → Source: root `/`)
- Access the app at `frontend/index.html` → `https://<user>.github.io/<repo>/frontend/`
- Data files at `data/` are one level up from `frontend/`, so the relative path `../data/weapons.json` works both locally and on GitHub Pages

## Local Development
```bash
# Install scraper dependencies
pip install -r scraper/requirements.txt

# Run scraper manually (updates data/)
python scraper/scraper.py

# Serve locally from the project root
python -m http.server 8081
# Open http://localhost:8081/frontend/
```

## Development Guidelines
- No build tools — pure ES6 JS, no npm, no Node.js
- Scraper must handle errors gracefully: if scraping fails, do NOT overwrite existing JSON
- Save a backup before overwriting (`data/weapons.backup.json`)
- If weapon count drops >20% vs backup, abort and do not commit
- Set a User-Agent header on all scraper requests
- The analytics page uses Chart.js from CDN — no local install needed
- CSS-based bars preferred over Chart.js canvas for compact data lists (avoids clip-path sizing bugs)
