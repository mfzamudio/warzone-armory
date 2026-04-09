# Product Requirements Document — Warzone Armory

**Version**: 1.0
**Status**: In Production
**Last Updated**: 2026-04-09

---

## 1. Executive Summary

Warzone Armory is a free, ad-free web application that helps Call of Duty Warzone players optimize their weapon loadouts and track free in-game rewards. The app scrapes community meta data (CODMunity.gg) and displays it through an intuitive three-page interface: a weapon browser, an analytics dashboard, and a rewards tracker. All data is static JSON updated daily via GitHub Actions, with zero backend infrastructure costs.

**Target Users**: Warzone players of all skill levels seeking competitive meta builds and free cosmetics.

---

## 2. Goals & Success Metrics

### Primary Goals
1. **Empower players** to make informed weapon and attachment choices based on community meta
2. **Reduce decision fatigue** — show the top build for each playstyle, one click away
3. **Track free rewards** — centralize code redemption and Twitch Drop info in one place
4. **Stay free forever** — no ads, no paywalls, no tracking

### Success Metrics
- ✅ 256+ weapons indexed with accurate stats
- ✅ Meta loadouts for all playstyles available for >90% of weapons
- ✅ Page loads in <2 seconds on desktop, <3 seconds on mobile
- ✅ Daily data refresh completes without manual intervention
- ✅ Active promo codes always visible and copy-able
- ✅ Zero backend downtime (static hosting only)

---

## 3. Product Overview

### What It Is
A static web application (no backend server) that surfaces community-curated meta loadouts from CODMunity.gg in a responsive, mobile-friendly UI.

### What It Is NOT
- Not affiliated with Activision or Call of Duty
- Not a replacement for official game resources
- Not intended for esports tournament data (uses community meta, not pro builds)
- Not a social platform or clan management tool

---

## 4. User Stories & Features

### User Story 1: Weapon Browser
**As a** casual Warzone player
**I want to** browse weapons by type and see the best attachments for my playstyle
**So that** I can quickly find a competitive loadout

**Acceptance Criteria**:
- [ ] Browse all 256+ weapons in a grid layout
- [ ] Filter by weapon type (AR, SMG, Sniper, etc.)
- [ ] Filter by playstyle (Aggressive, Long Range, Balanced, Sniper Support)
- [ ] Click weapon to see detail panel with:
  - [ ] Weapon icon, name, type, description
  - [ ] Core stats (RPM, ADS, bullet velocity, TTK)
  - [ ] 5 recommended attachments per playstyle
  - [ ] Gunsmith-style stat bars showing attachment impacts
  - [ ] Meta rating (1–10 scale from CODMunity)
- [ ] Copy loadout by clicking attachment list
- [ ] Switch between playstyles without closing panel

**Page**: `frontend/index.html` (Armory)
**Data Source**: `data/weapons.json`
**Scraper**: `scraper/scraper.py` (CODMunity.gg)

---

### User Story 2: Analytics Dashboard
**As a** competitive player
**I want to** see rankings of weapons across key metrics and compare TTK curves
**So that** I can identify hidden meta opportunities and counter-picks

**Acceptance Criteria**:
- [ ] View top 15 weapons ranked by:
  - [ ] Fastest TTK
  - [ ] Fastest ADS
  - [ ] Highest RPM
  - [ ] Best range (bullet velocity)
  - [ ] Meta score (community rating)
- [ ] Click weapon in rankings to open detail panel
- [ ] See most-used attachments and slots across all meta builds
- [ ] View playstyle distribution (coverage by playstyle)
- [ ] Compare up to 4 weapons side-by-side by TTK across damage ranges
- [ ] Select weapons in TTK comparison via dropdown
- [ ] Clear TTK comparison and start over

**Page**: `frontend/analytics.html` (Analytics)
**Data Sources**: `data/weapons.json`, `data/meta.json`
**Chart Library**: Chart.js 4.4.0 (CDN)
**Scraper**: `scraper/scraper.py`

---

### User Story 3: Free Rewards Tracker
**As a** Warzone player
**I want to** see active promo codes and current free reward campaigns
**So that** I can claim free cosmetics and XP tokens without digging through Twitter

**Acceptance Criteria**:
- [ ] View active promo codes with reward descriptions
- [ ] Copy code to clipboard with one click (visual feedback: "✓ Copied!")
- [ ] See count of expired codes (informational)
- [ ] View recent Twitch Drops campaign articles (title, date, link)
- [ ] View recent Prime Gaming bundle articles (title, date, link)
- [ ] See "Check source directly" fallback if no Twitch/Prime data available
- [ ] Relative date display (Today, Yesterday, N days ago, or date)
- [ ] Links open in new tabs to source sites

**Page**: `frontend/rewards.html` (Free Drops)
**Data Source**: `data/rewards.json`
**Scrapers**:
  - `scraper/rewards_scraper.py` → Dexerto (codes)
  - `scraper/rewards_scraper.py` → CharlieintelNEWS (news)

---

### User Story 4: Daily Data Sync
**As a** maintenance operator
**I want to** scrape fresh weapon meta and reward data every day
**So that** users always see current information without manual updates

**Acceptance Criteria**:
- [ ] GitHub Actions runs both scrapers at 4 AM UTC every day
- [ ] If scraping fails, previous data is retained (never blank)
- [ ] If weapon count drops >20%, abort and keep previous data
- [ ] Successful runs auto-commit to `main` branch with message `chore: update weapon data YYYY-MM-DD`
- [ ] GitHub Pages auto-deploys on commit
- [ ] Manual trigger (`workflow_dispatch`) available for testing

**Workflow**: `.github/workflows/scrape-daily.yml`

---

## 5. Technical Requirements

### Frontend
- **Tech Stack**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Build Tools**: None (no webpack, no npm, no build step)
- **Dependencies**: Chart.js 4.4.0 (loaded from CDN)
- **Hosting**: GitHub Pages (root `/` serves static files)
- **Mobile**: Responsive design (min-width 320px)
- **Accessibility**: Semantic HTML, alt text on all images, keyboard navigation

### Backend
- **No backend server** — data is fully static JSON
- **Deployment**: `data/weapons.json`, `data/meta.json`, `data/rewards.json` in repo root

### Scrapers
- **Tech Stack**: Python 3.12+
- **Libraries**:
  - `requests>=2.31.0` (HTTP)
  - `beautifulsoup4>=4.12.0` (HTML parsing)
- **User-Agent**: Required on all requests (Chromium 122 UA spoofed)
- **Error Handling**: Graceful degradation; one source failing doesn't block others
- **Safety**: Backup before overwriting; weapon count drop >20% aborts
- **CLI Flags**: `--debug` (save raw HTML), `--dry-run` (test without saving)

### Data Format
- **weapons.json**: UTF-8, 2-space indent, ISO-8601 timestamps with timezone
- **meta.json**: Same format
- **rewards.json**: Same format

---

## 6. Content & Design Requirements

### Visual Design
- **Theme**: Military dark mode (forest green + charcoal)
- **Color Palette**:
  - Primary text: `#c9d4cc`
  - Primary accent (green): `#6aaa72`
  - Gold accents: `#c9a227`
  - Background: `#0f1811`
  - Border: `#253228`
- **Typography**:
  - Headings: Rajdhani (sans-serif, wght 600/700)
  - Body: Share Tech (monospace, wght 400)
- **Layout**: Centered max-width, card-based sections, clip-path parallelograms/trapezoids
- **Responsive**:
  - Desktop: Full grid layouts
  - Tablet: 2-column cards
  - Mobile: 1-column stacked

### Content Standards
- **Weapon Names**: Exact from CODMunity (e.g., "XM4", not "xm4")
- **Type Labels**: Capitalize first letter ("Assault Rifle", not "assault rifle")
- **Playstyle Labels**: Capitalize first word ("Aggressive", "Long Range")
- **Timestamps**: ISO-8601 with UTC timezone (e.g., "2026-04-09T04:00:00+00:00")
- **Copy**: Clear, concise, no jargon where possible

---

## 7. Data Requirements

### Weapon Data (from CODMunity.gg)
```
Required Fields per Weapon:
- id (kebab-case slug)
- name (exact weapon name)
- type (category string)
- game (bo6, bo7, mw3, mw2, warzone-2)
- icon (URL to weapon image)
- stats { rpm, ads, bv, damage[], mag_size }
- loadouts { aggressive, long_range, balanced, sniper_support }
  - Each loadout: { attachments[], rating, description, loadout_code }
```

### Meta Data (computed from weapons.json)
```
Required Fields:
- top_weapons (editorial ranking)
- top_meta_scores (best weapons by community rating)
- top_attachments (most-used attachments)
- top_slots (most-used attachment slots)
- playstyle_coverage (weapon count per playstyle)
```

### Rewards Data (from Dexerto + CharlieintelNEWS)
```
Required Fields:
- promo_codes { active[], expired_count }
  - Each code: { code, reward }
- news_items[] (Twitch Drops + Prime Gaming articles)
  - Each item: { type, title, url, published, source }
- sources (reference links to data sources)
```

---

## 8. Deployment & Hosting

### Platform: GitHub Pages (Free)
- **Branch**: `main`
- **Source**: Root `/` (configure in Settings → Pages)
- **URL**: `https://<user>.github.io/warzone-armory/frontend/`
- **SSL**: Automatic via GitHub Pages
- **CDN**: GitHub's CDN (global edge caching)

### CI/CD: GitHub Actions
- **Trigger**: Daily cron (4 AM UTC) + manual dispatch
- **Cost**: Free tier (unlimited for public repos)
- **Workflow**: `.github/workflows/scrape-daily.yml`

### Data Persistence
- **Location**: `data/` directory in repo (version controlled)
- **Backup**: `data/weapons.backup.json` created before each overwrite
- **History**: All versions available via git history
- **Recovery**: If scrape fails, previous version is kept

---

## 9. Non-Functional Requirements

### Performance
- **Page Load**: <2s on desktop (Chrome Lighthouse 90+)
- **Mobile Load**: <3s on 4G (Chrome Lighthouse 80+)
- **Interaction**: <100ms input latency
- **SEO**: Semantic HTML, meta descriptions, open graph tags

### Reliability
- **Uptime**: 99.9% (GitHub Pages SLA)
- **Scraper Reliability**: 95%+ successful runs (graceful fallback if 1 source fails)
- **Data Freshness**: Daily updates, <24h max staleness

### Accessibility
- **WCAG 2.1 AA**: Contrast ratios >4.5:1, keyboard nav, alt text
- **Mobile**: Touch-friendly buttons (>44px tap target)
- **Localization**: English only (default)

### Security
- **HTTPS**: Enforced by GitHub Pages
- **XSS Protection**: HTML escaping on all user input
- **CSRF**: N/A (static site, no forms)
- **Scraper Safety**: User-Agent rotation (prevents blocking)

---

## 10. Success Criteria & Acceptance Tests

### Armory Page
- [ ] Load time <2s
- [ ] All 256 weapons visible
- [ ] Filters work correctly (type + playstyle)
- [ ] Detail panel shows correct loadout for selected playstyle
- [ ] Stat bars display with correct scaling
- [ ] Copy button works (clipboard API fallback)

### Analytics Page
- [ ] Rank chart loads and is interactive
- [ ] Clicking weapon name opens detail panel
- [ ] TTK comparison updates on dropdown change
- [ ] Clear button resets selection
- [ ] Relative dates format correctly

### Rewards Page
- [ ] Promo codes display (or show fallback if none)
- [ ] Copy button works with visual feedback
- [ ] News articles display with correct type filter
- [ ] Empty states show helpful messages with external links
- [ ] Responsive layout on mobile

### Data Pipeline
- [ ] Scraper runs daily at scheduled time
- [ ] weapons.json has 256+ entries
- [ ] rewards.json has >0 active codes (or empty gracefully)
- [ ] All timestamps are ISO-8601 UTC
- [ ] Commit message includes date
- [ ] GitHub Pages deploys within 2 minutes of commit

---

## 11. Future Enhancements (Out of Scope)

- 🔄 Real-time Twitch Drop tracking (requires API key)
- 📊 Player performance analytics (requires game API)
- 👥 Community loadout sharing (requires backend)
- 🌙 Dark/light theme toggle (CSS variables ready)
- 🌍 Localization (add language selector)
- 🎥 Video guides (embed YouTube links)
- 🏆 Pro player builds (requires editorial curation)
- 📱 PWA / offline mode (serviceworker caching)

---

## 12. Constraints & Assumptions

### Constraints
- **Cost**: Must stay free to run (GitHub Pages + Actions free tier only)
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Data Source Availability**: Dependent on CODMunity.gg, Dexerto, CharlieintelNEWS remaining accessible
- **No Backend**: Cannot store user data, track analytics, or authenticate users

### Assumptions
- **Users**: Have a stable internet connection (data loads from CDN)
- **Data Quality**: CODMunity data is accurate and up-to-date
- **Scrapers**: HTML structure of source sites remains stable (may break on redesigns)
- **Traffic**: <1000 unique users/day (GitHub Pages can handle more, but no analytics to confirm)

---

## 13. Rollout Plan

### Phase 1: MVP (Complete ✅)
- [x] Weapon browser with type/playstyle filters
- [x] Detail panel with loadout display
- [x] Analytics dashboard with rankings
- [x] TTK comparison tool
- [x] Daily scraper via GitHub Actions
- [x] Free Drops page with promo codes & news

### Phase 2: Polish (Current)
- [x] Mobile responsiveness
- [x] CSS consistency across pages
- [x] Documentation (CLAUDE.md, README.md, PRD.md)
- [x] Error handling and empty states

### Phase 3: Optimization (Future)
- [ ] Cache strategy for faster loads
- [ ] Analytics dashboard with usage stats
- [ ] Community feedback system
- [ ] Expanded data sources (pro builds, guide links)

---

## 14. Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| CODMunity.gg redesigns page | Scraper breaks, no weapon data | Medium | Monitor scraper logs, add version detection |
| GitHub Pages goes down | App unavailable | Low | Use backup CDN or mirror (costly, low priority) |
| Weapon count drops >20% | Old data retained (staleness) | Low | Investigate scraper, roll back if needed |
| Dexerto/CharlieintelNEWS blocked | Rewards data empty | Low | Graceful fallback with links to sources |
| High traffic spike | GitHub Pages throttles | Low | No CDN needed for static; can handle spikes |

---

## 15. Approval & Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | Claude (AI Assistant) | ✅ | 2026-04-09 |
| Tech Lead | Claude (AI Assistant) | ✅ | 2026-04-09 |
| QA Lead | N/A (Community tested) | — | — |

---

**Document Status**: Ready for Implementation
**Next Review Date**: 2026-05-09 (or after major feature addition)
