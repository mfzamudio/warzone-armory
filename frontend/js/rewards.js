/**
 * Warzone Armory — Free Drops / Rewards Page
 * Loads data/rewards.json and renders promo codes, Twitch Drops, Prime Gaming news.
 */

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

async function loadData() {
  const res = await fetch('../data/rewards.json');
  if (!res.ok) throw new Error('rewards.json not found — run rewards_scraper.py first');
  return res.json();
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

function renderCodes(codes) {
  const container = document.getElementById('codes-list');
  if (!codes || codes.length === 0) {
    container.innerHTML = `
      <div class="rewards-empty">
        <p>No active promo codes right now — check back tomorrow or visit</p>
        <p>
          <a href="https://www.dexerto.com/wikis/warzone/warzone-codes/"
             target="_blank" rel="noopener noreferrer">Dexerto</a>
          directly.
        </p>
      </div>`;
    return;
  }

  const rows = codes.map(item => `
    <div class="reward-code-row">
      <div class="reward-code-value">${escHtml(item.code)}</div>
      <div class="reward-code-reward">${escHtml(item.reward)}</div>
      <button class="copy-btn" type="button" data-code="${escHtml(item.code)}"
              onclick="copyCode(this, '${escHtml(item.code).replace(/'/g, "\\'")}')">
        ⬆ Copy
      </button>
    </div>
  `).join('');

  container.innerHTML = `<div class="rewards-code-list">${rows}</div>`;
}

function renderNewsItems(items, containerId, emptyMsg, emptyUrl) {
  const container = document.getElementById(containerId);
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="rewards-empty">
        <p>${escHtml(emptyMsg)}</p>
        <p>
          <a href="${escHtml(emptyUrl)}" target="_blank" rel="noopener noreferrer">
            Check source directly
          </a>
        </p>
      </div>`;
    return;
  }

  const cards = items.map(item => {
    const date = item.published ? formatRelativeDate(item.published) : 'Unknown date';
    return `
      <a class="news-card" href="${escHtml(item.url)}" target="_blank" rel="noopener noreferrer">
        <div class="news-card-title">${escHtml(item.title)}</div>
        <div class="news-card-meta">
          <span class="news-source-badge">${escHtml(item.source)}</span>
          <span class="news-date">${date}</span>
        </div>
      </a>`;
  }).join('');

  container.innerHTML = `<div class="rewards-news-list">${cards}</div>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function copyCode(btn, code) {
  // Use clipboard API if available
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code).then(() => {
      const orig = btn.textContent;
      btn.textContent = '✓ Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('copied');
      }, 2000);
    }).catch(() => fallbackCopy(btn, code));
  } else {
    fallbackCopy(btn, code);
  }
}

function fallbackCopy(btn, code) {
  // Fallback for HTTP (non-HTTPS) environments
  const textarea = document.createElement('textarea');
  textarea.value = code;
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '⬆ Copy';
      btn.classList.remove('copied');
    }, 2000);
  } catch (err) {
    console.warn('Copy failed:', err);
  }
  document.body.removeChild(textarea);
}

function formatRelativeDate(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  try {
    const data = await loadData();

    // Update last-updated label
    if (data.last_updated) {
      const d = new Date(data.last_updated);
      document.getElementById('last-updated-label').textContent =
        `Updated ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }

    // Footer: show last code deploy date
    fetch('../data/version.json').then(r => r.json()).then(v => {
      if (v.deployed) {
        const d = new Date(v.deployed);
        document.getElementById('footer-updated').textContent =
          `Last updated ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
    }).catch(() => {});

    const activeCodes = data.promo_codes?.active ?? [];
    const allNews     = data.news_items ?? [];
    const twitchItems = allNews.filter(n => n.type === 'twitch_drops');
    const primeItems  = allNews.filter(n => n.type === 'prime_gaming');

    // Update hero stats
    document.getElementById('hero-code-count').textContent = activeCodes.length;
    document.getElementById('hero-news-count').textContent = allNews.length;

    // Render sections
    renderCodes(activeCodes);
    renderNewsItems(twitchItems, 'twitch-list',
      'No active Twitch Drops info found',
      'https://www.twitch.tv/drops'
    );
    renderNewsItems(primeItems, 'prime-list',
      'No Prime Gaming bundle info found',
      'https://gaming.amazon.com/home'
    );

    // Show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = '';

  } catch (err) {
    document.getElementById('loading').innerHTML =
      `<div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <p style="color:#c84040">Failed to load rewards data</p>
        <p style="margin-top:0.5rem;font-size:0.7rem;color:#4a5e4c">${err.message}</p>
      </div>`;
    console.error(err);
  }
})();
