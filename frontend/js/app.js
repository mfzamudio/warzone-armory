/**
 * Warzone Armory — Frontend Logic
 * Loads data/weapons.json and renders the weapon browser + detail panel.
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let allWeapons    = [];
let activeType    = 'ALL';
let activePlaystyle = 'ALL';
let searchQuery   = '';
let selectedWeapon = null;
let activePanelPs  = null;   // currently shown playstyle in detail panel
let statNorms     = {};      // global normalization ranges computed on load

// ---------------------------------------------------------------------------
// Stat bar configuration
// ---------------------------------------------------------------------------

// Stats shown in the gunsmith diagram, in display order
const STAT_DEFS = [
  { key: 'damage',    label: 'Damage',     unit: '',     invert: false },
  { key: 'fire_rate', label: 'Fire Rate',  unit: 'rpm',  invert: false },
  { key: 'range',     label: 'Range',      unit: 'm/s',  invert: false },
  { key: 'ads',       label: 'ADS Speed',  unit: 'ms',   invert: true  },  // lower = better
  { key: 'accuracy',  label: 'Accuracy',   unit: '',     invert: false },
  { key: 'mobility',  label: 'Mobility',   unit: '',     invert: false },
];

// How many delta "units" each slot contributes to each stat (positive = improves)
// Based on common Warzone attachment trade-offs
const SLOT_EFFECTS = {
  'Muzzle':         { range: 2, accuracy: 2, ads: -1 },
  'Barrel':         { range: 3, damage: 1, ads: -1 },
  'Optic':          { accuracy: 1 },
  'Underbarrel':    { accuracy: 3, mobility: -1 },
  'Magazine':       { /* magazine not in bars */ ads: -1 },
  'Rear Grip':      { ads: 2, accuracy: 1 },
  'Stock':          { mobility: 2, ads: 2 },
  'Laser':          { ads: 3 },
  'Fire Mods':      { fire_rate: 2 },
  'Conversion Kit': { damage: 3, fire_rate: 1 },
  'Ammunition':     { range: 2, damage: 2, ads: -1 },
};

// ---------------------------------------------------------------------------
// Stat normalization — computed once after data loads
// ---------------------------------------------------------------------------

function computeNorms(weapons) {
  // Extract raw values for each stat key
  const raw = { damage: [], fire_rate: [], range: [], ads: [], accuracy: [], mobility: [] };

  weapons.forEach(w => {
    const s = w.stats || {};
    // Damage: use min TTK at close range (entry 0) — invert so lower TTK = higher score
    if (Array.isArray(s.damage) && s.damage[0]?.ttk > 0) raw.damage.push(s.damage[0].ttk);
    if (s.rpm)    raw.fire_rate.push(s.rpm);
    if (s.bv)     raw.range.push(s.bv);
    if (s.ads)    raw.ads.push(s.ads);
    // Accuracy and Mobility: we don't have raw values so use defaults (all weapons start at 50)
  });

  const norms = {};
  Object.entries(raw).forEach(([key, values]) => {
    if (!values.length) { norms[key] = { min: 0, max: 100 }; return; }
    norms[key] = { min: Math.min(...values), max: Math.max(...values) };
  });
  return norms;
}

// Normalize a value 0–100, accounting for invert
function normalizeVal(key, rawVal, invert) {
  const n = statNorms[key];
  if (!n || rawVal == null) return null;
  const { min, max } = n;
  if (max === min) return 50;
  let pct = ((rawVal - min) / (max - min)) * 100;
  if (invert) pct = 100 - pct;
  return Math.round(Math.max(5, Math.min(95, pct)));
}

// Get the raw stat value for a given key from weapon stats
function getRawStat(key, stats) {
  switch (key) {
    case 'damage':    return Array.isArray(stats?.damage) ? stats.damage[0]?.ttk : null;
    case 'fire_rate': return stats?.rpm ?? null;
    case 'range':     return stats?.bv ?? null;
    case 'ads':       return stats?.ads ?? null;
    case 'accuracy':  return null;  // no raw value, will show at 50%
    case 'mobility':  return null;
    default:          return null;
  }
}

// Compute aggregate delta effects from an attachment list
function getLoadoutDeltas(attachments) {
  const totals = {};
  (attachments || []).forEach(a => {
    const effects = SLOT_EFFECTS[a.slot] || {};
    Object.entries(effects).forEach(([stat, delta]) => {
      totals[stat] = (totals[stat] || 0) + delta;
    });
  });
  return totals;  // e.g. { range: 5, ads: -2, accuracy: 2 }
}

// ---------------------------------------------------------------------------
// Render stat bars
// ---------------------------------------------------------------------------

function renderStatBars(weapon, loadout) {
  const container = document.getElementById('panel-statbars');
  const stats     = weapon.stats || {};
  const deltas    = loadout ? getLoadoutDeltas(loadout.attachments) : {};
  const hasLoadout = loadout?.attachments?.length > 0;

  // Max delta units per stat across all possible slots (used to scale delta bar width)
  const MAX_DELTA = 8;
  const DELTA_BAR_MAX_PCT = 18;  // delta bar can take up to 18% of track width

  const rows = STAT_DEFS.map(def => {
    const rawVal  = getRawStat(def.key, stats);
    const basePct = rawVal != null
      ? normalizeVal(def.key, rawVal, def.invert)
      : 50;  // fallback for stats without raw data

    const isFallback = rawVal == null;
    const deltaUnits = deltas[def.key] || 0;
    const deltaPct   = Math.round((Math.abs(deltaUnits) / MAX_DELTA) * DELTA_BAR_MAX_PCT);
    const deltaDir   = deltaUnits > 0 ? 'positive' : deltaUnits < 0 ? 'negative' : '';

    // Clamp base bar so base + delta don't exceed 95%
    const cappedBase = Math.min(basePct, 95 - (deltaDir === 'positive' ? deltaPct : 0));

    // Delta bar starts right after the base fill
    const deltaLeft  = cappedBase;
    const deltaLabel = deltaUnits > 0 ? `+${deltaUnits}` : deltaUnits < 0 ? `${deltaUnits}` : '';

    const displayVal = isFallback
      ? ''
      : def.key === 'ads'       ? `${rawVal}ms`
      : def.key === 'fire_rate' ? `${rawVal}`
      : def.key === 'range'     ? `${rawVal}`
      : '';

    const deltaHtml = (hasLoadout && deltaUnits !== 0) ? `
      <div class="statbar-delta ${deltaDir}"
           style="left:${deltaLeft}%; width:${deltaPct}%">
      </div>` : '';

    const deltaLabelHtml = hasLoadout
      ? `<span class="statbar-delta-label ${deltaUnits > 0 ? 'pos' : deltaUnits < 0 ? 'neg' : 'neu'}">
           ${deltaLabel}
         </span>`
      : '<span class="statbar-delta-label neu"></span>';

    return `
      <div class="statbar-row">
        <span class="statbar-label">${def.label}</span>
        <div class="statbar-track">
          <div class="statbar-mid-tick"></div>
          <div class="statbar-fill" style="width:${cappedBase}%; opacity:${isFallback ? 0.35 : 1}"></div>
          ${deltaHtml}
        </div>
        <span class="statbar-value">${displayVal}</span>
        ${deltaLabelHtml}
      </div>`;
  }).join('');

  const legendHtml = hasLoadout ? `
    <div class="statbars-legend">
      <div class="legend-item"><div class="legend-dot base"></div> Base</div>
      <div class="legend-item"><div class="legend-dot positive"></div> Improves</div>
      <div class="legend-item"><div class="legend-dot negative"></div> Trade-off</div>
    </div>` : '';

  container.innerHTML = `
    <div class="statbars-title">Weapon Stats</div>
    ${rows}
    ${legendHtml}`;
}

const PLAYSTYLE_LABELS = {
  aggressive:     'Aggressive',
  long_range:     'Long Range',
  balanced:       'Balanced',
  sniper_support: 'Sniper Support',
};

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function init() {
  try {
    // data/ is always one level up from frontend/ — works locally and on GitHub Pages
    const dataPath = '../data/weapons.json';

    const res = await fetch(dataPath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allWeapons = data.weapons || [];
    statNorms  = computeNorms(allWeapons);

    // Update header meta
    updateHeaderMeta(data);

    // Build type filter tabs
    buildTypeTabs();

    // Initial render
    renderGrid();

    // Show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = '';

  } catch (err) {
    document.getElementById('loading').innerHTML =
      `<div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <p>Could not load weapon data.</p>
        <p style="margin-top:0.5rem; font-size:0.7rem; color:#4a5e4c">${err.message}</p>
        <p style="margin-top:0.5rem; font-size:0.7rem; color:#4a5e4c">
          Run the scraper first: python scraper/scraper.py
        </p>
      </div>`;
  }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function updateHeaderMeta(data) {
  if (data.season) {
    document.getElementById('season-label').textContent =
      `${data.season.toUpperCase()} · BLACK OPS 6`;
  }
  if (data.last_updated) {
    const d = new Date(data.last_updated);
    const label = `Updated ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    document.getElementById('last-updated-label').textContent = label;
  }
  const heroTotal = document.getElementById('hero-total');
  if (heroTotal && allWeapons.length) heroTotal.textContent = allWeapons.length + '+';
}

// ---------------------------------------------------------------------------
// Type filter tabs
// ---------------------------------------------------------------------------

function buildTypeTabs() {
  const types = [...new Set(allWeapons.map(w => w.type))].sort();
  const container = document.getElementById('type-tabs');

  types.forEach(type => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.type = type;
    btn.textContent = type;
    container.appendChild(btn);
  });
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function getFilteredWeapons() {
  return allWeapons.filter(w => {
    // Type filter
    if (activeType !== 'ALL' && w.type !== activeType) return false;

    // Playstyle filter — only show weapons that have a loadout for this playstyle
    if (activePlaystyle !== 'ALL') {
      const loadout = w.loadouts?.[activePlaystyle];
      if (!loadout || !loadout.attachments?.length) return false;
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!w.name.toLowerCase().includes(q) && !w.type.toLowerCase().includes(q)) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Render grid
// ---------------------------------------------------------------------------

function renderGrid() {
  const weapons  = getFilteredWeapons();
  const grid     = document.getElementById('weapons-grid');
  const countEl  = document.getElementById('results-count');
  const psLabel  = document.getElementById('active-playstyle-label');

  countEl.textContent = weapons.length;
  psLabel.textContent = activePlaystyle !== 'ALL'
    ? `Filtered by: ${PLAYSTYLE_LABELS[activePlaystyle]}`
    : '';

  if (!weapons.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128269;</div>
        <p>No weapons match your filters</p>
      </div>`;
    return;
  }

  grid.innerHTML = weapons.map(w => buildCardHTML(w)).join('');

  // Attach click handlers
  grid.querySelectorAll('.weapon-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const weapon = allWeapons.find(w => w.id === id);
      if (weapon) openPanel(weapon);
    });
  });
}

// ---------------------------------------------------------------------------
// Build card HTML
// ---------------------------------------------------------------------------

function buildCardHTML(w) {
  const hasLoadout = Object.values(w.loadouts || {}).some(l => l?.attachments?.length);
  const imgTag = w.icon
    ? `<img src="${escHtml(w.icon)}" alt="${escHtml(w.name)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">`
    : '';
  const fallback = `<span class="card-no-img" ${w.icon ? 'style="display:none"' : ''}>&#9651;</span>`;

  // Show playstyle badges for available loadouts
  const badges = Object.entries(w.loadouts || {})
    .filter(([, l]) => l?.attachments?.length)
    .map(([ps]) => {
      const icons = { aggressive: '&#128293;', long_range: '&#127919;', balanced: '&#9878;', sniper_support: '&#128269;' };
      return `<span class="badge badge-loadout" title="${PLAYSTYLE_LABELS[ps]}">${icons[ps] || ps}</span>`;
    }).join('');

  const gameBadge = w.game && w.game !== 'warzone-2'
    ? `<span class="badge badge-game">${escHtml(w.game.toUpperCase())}</span>`
    : '';

  const isActive = selectedWeapon?.id === w.id ? 'active' : '';

  return `
    <div class="weapon-card ${isActive}" data-id="${escHtml(w.id)}">
      <div class="card-type-bar" data-type="${escHtml(w.type)}"></div>
      <div class="card-img-wrap">
        ${imgTag}${fallback}
      </div>
      <div class="card-info">
        <div class="card-name" title="${escHtml(w.name)}">${escHtml(w.name)}</div>
        <div class="card-type">${escHtml(w.type)}</div>
        <div class="card-badges">${badges}${gameBadge}</div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------

function openPanel(weapon) {
  selectedWeapon = weapon;

  // Update active card style
  document.querySelectorAll('.weapon-card').forEach(c => {
    c.classList.toggle('active', c.dataset.id === weapon.id);
  });

  // Header
  document.getElementById('panel-img').src  = weapon.icon || '';
  document.getElementById('panel-img').alt  = weapon.name;
  document.getElementById('panel-type').textContent = weapon.type;
  document.getElementById('panel-name').textContent = weapon.name;
  document.getElementById('panel-desc').textContent = weapon.description || '';

  // Stats
  const stats = weapon.stats || {};
  document.getElementById('stat-rpm').innerHTML =
    stats.rpm ? stats.rpm : '<span style="color:var(--text-muted)">—</span>';
  document.getElementById('stat-ads').innerHTML =
    stats.ads ? `${stats.ads}<span class="stat-unit">ms</span>` : '<span style="color:var(--text-muted)">—</span>';
  document.getElementById('stat-bv').innerHTML =
    stats.bv ? `${stats.bv}<span class="stat-unit">m/s</span>` : '<span style="color:var(--text-muted)">—</span>';

  // Best TTK from damage array
  const bestTTK = getBestTTK(stats.damage);
  document.getElementById('stat-ttk').innerHTML =
    bestTTK ? `${bestTTK}<span class="stat-unit">ms</span>` : '<span style="color:var(--text-muted)">—</span>';

  // Playstyle tabs — mark which ones have data
  const psTabs = document.querySelectorAll('.playstyle-tab');
  psTabs.forEach(tab => {
    const ps = tab.dataset.ps;
    const hasData = weapon.loadouts?.[ps]?.attachments?.length > 0;
    tab.classList.toggle('no-data', !hasData);
  });

  // Pick best playstyle to show first: active filter > first available > 'aggressive'
  const preferred = activePlaystyle !== 'ALL' ? activePlaystyle : null;
  const firstAvailable = Object.keys(weapon.loadouts || {}).find(ps => weapon.loadouts[ps]?.attachments?.length);
  const psToShow = (preferred && weapon.loadouts?.[preferred]?.attachments?.length)
    ? preferred
    : (firstAvailable || 'aggressive');

  showLoadout(weapon, psToShow);   // also calls renderStatBars
  document.getElementById('detail-overlay').classList.add('open');
}

function showLoadout(weapon, ps) {
  activePanelPs = ps;

  // Update tab active state
  document.querySelectorAll('.playstyle-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.ps === ps);
  });

  const loadout = weapon.loadouts?.[ps];
  // Update stat bars to reflect this loadout's effects
  renderStatBars(weapon, loadout || null);

  const container = document.getElementById('panel-loadout');

  if (!loadout || !loadout.attachments?.length) {
    container.innerHTML = `
      <div class="no-loadout">
        &#9888;&nbsp; No ${PLAYSTYLE_LABELS[ps] || ps} loadout available for this weapon
      </div>`;
    return;
  }

  const stars = ratingToStars(loadout.rating);
  const codeTag = loadout.loadout_code
    ? `<span class="loadout-code">CODE: ${escHtml(loadout.loadout_code)}</span>`
    : '';

  const rows = loadout.attachments.map(a => `
    <div class="attachment-row">
      <span class="attachment-slot">${escHtml(a.slot)}</span>
      <span class="attachment-name">${escHtml(a.name)}</span>
    </div>`).join('');

  container.innerHTML = `
    <div class="loadout-meta">
      <div class="loadout-rating">
        <span>Meta Rating</span>
        <span class="rating-stars">${stars}</span>
        <span>${loadout.rating?.toFixed(1) ?? '—'}</span>
      </div>
      ${codeTag}
    </div>
    <div class="attachments-list">${rows}</div>`;
}

function closePanel() {
  document.getElementById('detail-overlay').classList.remove('open');
  selectedWeapon = null;
  document.querySelectorAll('.weapon-card').forEach(c => c.classList.remove('active'));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBestTTK(damageArr) {
  if (!Array.isArray(damageArr) || !damageArr.length) return null;
  const ttks = damageArr.map(d => d.ttk).filter(t => t && t > 0);
  return ttks.length ? Math.round(Math.min(...ttks)) : null;
}

function ratingToStars(rating) {
  if (!rating) return '';
  const full  = Math.floor(rating / 2);
  const half  = (rating % 2) >= 1 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
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
// Event listeners
// ---------------------------------------------------------------------------

// Type tabs
document.getElementById('type-tabs').addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('#type-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeType = btn.dataset.type;
  renderGrid();
});

// Playstyle tabs
document.querySelector('.filters-section').addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn[data-playstyle]');
  if (!btn) return;
  document.querySelectorAll('[data-playstyle]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activePlaystyle = btn.dataset.playstyle;
  renderGrid();
});

// Search
document.getElementById('search-input').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  renderGrid();
});

// Panel playstyle tabs
document.getElementById('panel-playstyle-bar').addEventListener('click', e => {
  const tab = e.target.closest('.playstyle-tab');
  if (!tab || tab.classList.contains('no-data')) return;
  if (selectedWeapon) showLoadout(selectedWeapon, tab.dataset.ps);
});

// Close panel
document.getElementById('panel-close').addEventListener('click', closePanel);
document.getElementById('detail-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('detail-overlay')) closePanel();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePanel();
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

init();
