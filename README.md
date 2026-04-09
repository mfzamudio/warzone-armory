# ⚔️ Warzone Armory — Free Loadout Builder

**Browse 256+ weapons, find the best attachments by playstyle, and claim free in-game rewards.**

Warzone Armory is a free, open-source web app that helps you optimize your Warzone loadouts. Select your weapon, choose your playstyle (Aggressive, Long Range, Balanced, Sniper Support), and see exactly which attachments will dominate. Plus, track active promo codes and Twitch Drops in one place.

**🎮 Live Demo**: [https://mfzamudio.github.io/warzone-armory/frontend/](https://mfzamudio.github.io/warzone-armory/frontend/)

---

## 🚀 Features

### 🎯 **Armory Page** — Browse & Filter Weapons
- **256+ Warzone Weapons** — Assault Rifles, SMGs, Snipers, Shotguns, and more
- **Type Filter** — Browse by weapon category
- **Playstyle Filter** — See the best builds for:
  - ⚡ **Aggressive** — close-range rush builds
  - 🎯 **Long Range** — precision and bullet velocity
  - ⚖️ **Balanced** — all-around versatility
  - 🔍 **Sniper Support** — secondary to marksman rifles
- **Detail Panel** — Click any weapon to see:
  - Gunsmith-style stat bars
  - How each attachment impacts your stats
  - Copy-ready attachment lists
  - Meta rating from community experts

### 📊 **Analytics Page** — Data-Driven Meta Analysis
- **Performance Rankings** — Top weapons by:
  - ⏱️ Fastest TTK (Time-to-Kill)
  - 🎯 Fastest ADS (Aim Down Sight)
  - 🔫 Highest RPM (Fire Rate)
  - 💥 Best Range (Bullet Velocity)
  - ⭐ Meta Score (Community rating)
- **Clickable Rankings** — Click weapon names to view loadout details
- **Attachment Meta** — Most-used attachments across all builds
- **Playstyle Coverage** — How many weapons support each playstyle
- **TTK Comparison** — Compare up to 4 weapons across damage ranges

### 🎁 **Free Drops Page** — Track Free Rewards
- **Promo Codes** — Active codes with 1-click copy (redeemable at callofduty.com/redeem)
- **Twitch Drops** — Latest campaigns and watch requirements
- **Prime Gaming** — Current free bundles for Prime members
- Updated daily — no login required

---

## 📱 How to Use

1. **Go to Armory** (main page)
   - Filter weapons by type and playstyle
   - Click any weapon to see recommended attachments
   - Review stat bars to understand attachment trade-offs

2. **Check Analytics**
   - See which weapons dominate each category
   - Compare up to 4 weapons side-by-side by TTK
   - Discover the most meta attachments

3. **Claim Free Rewards**
   - Copy active promo codes
   - Check Twitch Drops campaigns
   - See Prime Gaming bundles
   - Links take you directly to claim pages

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML, CSS, and JavaScript (no frameworks)
- **Hosting**: GitHub Pages (100% free)
- **Data**: Static JSON files updated daily
- **Scrapers**: Python + BeautifulSoup4 (no Playwright)
- **CI/CD**: GitHub Actions (daily cron at 4 AM UTC)
- **Charts**: Chart.js from CDN for analytics

**Why this stack?**
- ✅ Zero cost to run and host
- ✅ No backend server needed
- ✅ Respects original data sources
- ✅ Works offline (after first load)
- ✅ Instant deploys with GitHub Pages

---

## 📊 Data Sources

### Weapons & Loadouts
**CODMunity.gg** — The most trusted Warzone meta source
- 256 weapons with stats (RPM, ADS, Bullet Velocity, damage ranges)
- 326 community-curated meta loadouts per playstyle
- Updated whenever CODMunity refreshes their meta
- [View on CODMunity](https://codmunity.gg/weapon-stats/warzone)

### Free Rewards
**Dexerto** — Active promo codes (updated daily)
- [View Code List](https://www.dexerto.com/wikis/warzone/warzone-codes/)

**CharlieintelNEWS** — Twitch Drops & Prime Gaming news
- [View Latest](https://www.charlieintel.com/call-of-duty/warzone/)

---

## 💻 Local Setup (for developers)

```bash
# Clone the repo
git clone https://github.com/mfzamudio/warzone-armory.git
cd warzone-armory

# Install scraper dependencies
pip install -r scraper/requirements.txt

# Update weapon data (optional)
python scraper/scraper.py

# Update rewards data (optional)
python scraper/rewards_scraper.py

# Serve locally
python -m http.server 8081

# Open http://localhost:8081/frontend/
```

**CLI flags:**
```bash
python scraper/scraper.py --dry-run     # Test without saving
python scraper/scraper.py --debug       # Save raw HTML for debugging

python scraper/rewards_scraper.py --dry-run
python scraper/rewards_scraper.py --debug
```

---

## 📈 Updates

Warzone Armory updates automatically every day at **4 AM UTC** via GitHub Actions:

1. Weapon data is scraped from CODMunity.gg
2. Rewards data is scraped from Dexerto and CharlieintelNEWS
3. All data is committed to the repository
4. GitHub Pages auto-deploys the changes

**Last Updated**: Check the date in the top-right corner of any page.

---

## 🤝 Contributing

Warzone Armory is open-source. Contributions are welcome!

### Ideas for Contributions
- 🐛 Report bugs or suggest features via GitHub Issues
- 📝 Improve documentation
- 🎨 Enhance UI/UX (dark mode, mobile optimizations, etc.)
- 🔧 Add new data sources or analytics

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-idea`)
3. Make your changes
4. Test locally with `python -m http.server 8081`
5. Commit with clear messages
6. Push and open a Pull Request

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

## ⚠️ Disclaimer

Warzone Armory is a **fan-made, unofficial project** not affiliated with Activision or Call of Duty. All data is sourced from community resources (CODMunity, Dexerto, CharlieintelNEWS). This project respects all original sources and terms of service.

---

## 🎮 Questions?

- **Weapon stats don't match in-game?** — CODMunity's data may lag game updates by a few hours. Check back later or visit [CODMunity.gg](https://codmunity.gg/weapon-stats/warzone) directly.
- **Attachment not showing up?** — Only the top 5 attachments per playstyle are displayed to keep the UI clean. Full lists are on CODMunity.
- **Promo code didn't work?** — Codes may have expired, region restrictions, or limited redemptions. Visit [Dexerto](https://www.dexerto.com/wikis/warzone/warzone-codes/) for current codes.

---

**Built with ⚔️ for the Warzone community.**

[Check out Warzone Armory now →](https://mfzamudio.github.io/warzone-armory/frontend/)
