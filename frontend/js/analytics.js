/**
 * Warzone Armory — Analytics Page
 * Loads weapons.json + meta.json and renders all analytics charts.
 */

// ---------------------------------------------------------------------------
// Chart.js global defaults — military dark theme
// ---------------------------------------------------------------------------

Chart.defaults.color           = '#8da88a';
Chart.defaults.borderColor     = '#253228';
Chart.defaults.font.family     = "'Share Tech', 'Courier New', monospace";
Chart.defaults.font.size       = 11;
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.tooltip.backgroundColor = '#0f1811';
Chart.defaults.plugins.tooltip.borderColor     = '#3a5240';
Chart.defaults.plugins.tooltip.borderWidth     = 1;
Chart.defaults.plugins.tooltip.padding         = 10;

// Color palette
const COLORS = {
  green:  '#6aaa72',
  blue:   '#4a9fd4',
  gold:   '#c9a227',
  red:    '#c84040',
  orange: '#c86d1a',
  purple: '#8a5fc8',
  teal:   '#4ab8a8',
  pink:   '#c85090',
};

const PLAYSTYLE_COLORS = {
  aggressive:     '#c84040',
  long_range:     '#4a9fd4',
  balanced:       '#6aaa72',
  sniper_support: '#c9a227',
};

const WEAPON_TYPE_COLORS = [
  '#6aaa72','#4a9fd4','#c9a227','#c84040',
  '#c86d1a','#8a5fc8','#4ab8a8','#c85090',
  '#7a9a72','#9a7a72','#7a7a9a','#9a9a72',
];

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

let weapons = [];
let meta    = {};
let selectedWeapon = null;

// Playstyle labels
const PLAYSTYLE_LABELS = {
  aggressive:     'Aggressive',
  long_range:     'Long Range',
  balanced:       'Balanced',
  sniper_support: 'Sniper Support',
};

// Stats shown in the gunsmith diagram, in display order
const STAT_DEFS = [
  { key: 'damage',    label: 'Damage',     unit: '',     invert: false },
  { key: 'fire_rate', label: 'Fire Rate',  unit: 'rpm',  invert: false },
  { key: 'range',     label: 'Range',      unit: 'm/s',  invert: false },
  { key: 'ads',       label: 'ADS Speed',  unit: 'ms',   invert: true  },
  { key: 'accuracy',  label: 'Accuracy',   unit: '',     invert: false },
  { key: 'mobility',  label: 'Mobility',   unit: '',     invert: false },
];

// Attachment slot effects
const SLOT_EFFECTS = {
  'Muzzle':         { range: 2, accuracy: 2, ads: -1 },
  'Barrel':         { range: 3, damage: 1, ads: -1 },
  'Optic':          { accuracy: 1 },
  'Underbarrel':    { accuracy: 3, mobility: -1 },
  'Magazine':       { ads: -1 },
  'Rear Grip':      { ads: 2, accuracy: 1 },
  'Stock':          { mobility: 2, ads: 2 },
  'Laser':          { ads: 3 },
  'Fire Mods':      { fire_rate: 2 },
  'Conversion Kit': { damage: 3, fire_rate: 1 },
  'Ammunition':     { range: 2, damage: 2, ads: -1 },
};

let statNorms = {};

async function loadData() {
  const [wRes, mRes] = await Promise.all([
    fetch('../data/weapons.json'),
    fetch('../data/meta.json'),
  ]);
  if (!wRes.ok) throw new Error('weapons.json not found — run the scraper first');
  if (!mRes.ok) throw new Error('meta.json not found — run the scraper first');
  const wData = await wRes.json();
  const mData = await mRes.json();
  weapons = wData.weapons || [];
  meta    = mData;
  statNorms = computeNorms(weapons);

  document.getElementById('season-label').textContent =
    `${(wData.season || 'S2R').toUpperCase()} · BLACK OPS 6`;
  if (wData.last_updated) {
    const d = new Date(wData.last_updated);
    document.getElementById('last-updated-label').textContent =
      `Updated ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
}

// ---------------------------------------------------------------------------
// Stat normalization
// ---------------------------------------------------------------------------

function computeNorms(weps) {
  const raw = { damage: [], fire_rate: [], range: [], ads: [], accuracy: [], mobility: [] };

  weps.forEach(w => {
    const s = w.stats || {};
    if (Array.isArray(s.damage) && s.damage[0]?.ttk > 0) raw.damage.push(s.damage[0].ttk);
    if (s.rpm)    raw.fire_rate.push(s.rpm);
    if (s.bv)     raw.range.push(s.bv);
    if (s.ads)    raw.ads.push(s.ads);
  });

  const norms = {};
  Object.entries(raw).forEach(([key, values]) => {
    if (!values.length) { norms[key] = { min: 0, max: 100 }; return; }
    norms[key] = { min: Math.min(...values), max: Math.max(...values) };
  });
  return norms;
}

function normalizeVal(key, rawVal, invert) {
  const n = statNorms[key];
  if (!n || rawVal == null) return null;
  const { min, max } = n;
  if (max === min) return 50;
  let pct = ((rawVal - min) / (max - min)) * 100;
  if (invert) pct = 100 - pct;
  return Math.round(Math.max(5, Math.min(95, pct)));
}

function getRawStat(key, stats) {
  switch (key) {
    case 'damage':    return Array.isArray(stats?.damage) ? stats.damage[0]?.ttk : null;
    case 'fire_rate': return stats?.rpm ?? null;
    case 'range':     return stats?.bv ?? null;
    case 'ads':       return stats?.ads ?? null;
    case 'accuracy':  return null;
    case 'mobility':  return null;
    default:          return null;
  }
}

function getLoadoutDeltas(attachments) {
  const totals = {};
  (attachments || []).forEach(a => {
    const effects = SLOT_EFFECTS[a.slot] || {};
    Object.entries(effects).forEach(([key, val]) => {
      totals[key] = (totals[key] || 0) + val;
    });
  });
  return totals;
}

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
// Helper: get numeric stat from weapon
// ---------------------------------------------------------------------------

function getStat(w, key) {
  const s = w.stats || {};
  switch (key) {
    case 'ttk':   {
      const arr = Array.isArray(s.damage) ? s.damage : [];
      const ttks = arr.map(d => d.ttk).filter(t => t > 0);
      return ttks.length ? Math.round(Math.min(...ttks)) : null;
    }
    case 'ads':   return s.ads   ?? null;
    case 'rpm':   return s.rpm   ?? null;
    case 'range': return s.bv    ?? null;
    case 'meta':  {
      const scores = Object.values(w.loadouts || {})
        .filter(l => l?.rating).map(l => l.rating);
      return scores.length ? Math.max(...scores) : null;
    }
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Detail Panel Functions
// ---------------------------------------------------------------------------

function renderStatBars(weapon, loadout) {
  const container = document.getElementById('panel-statbars');
  const stats     = weapon.stats || {};
  const deltas    = loadout ? getLoadoutDeltas(loadout.attachments) : {};
  const hasLoadout = loadout?.attachments?.length > 0;

  const MAX_DELTA = 8;
  const DELTA_BAR_MAX_PCT = 18;

  const rows = STAT_DEFS.map(def => {
    const rawVal  = getRawStat(def.key, stats);
    const basePct = rawVal != null
      ? normalizeVal(def.key, rawVal, def.invert)
      : 50;

    const isFallback = rawVal == null;
    const deltaUnits = deltas[def.key] || 0;
    const deltaPct   = Math.round((Math.abs(deltaUnits) / MAX_DELTA) * DELTA_BAR_MAX_PCT);
    const deltaDir   = deltaUnits > 0 ? 'positive' : deltaUnits < 0 ? 'negative' : '';

    const cappedBase = Math.min(basePct, 95 - (deltaDir === 'positive' ? deltaPct : 0));

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

function openPanel(weapon) {
  selectedWeapon = weapon;

  document.getElementById('panel-img').src  = weapon.icon || '';
  document.getElementById('panel-img').alt  = weapon.name;
  document.getElementById('panel-type').textContent = weapon.type;
  document.getElementById('panel-name').textContent = weapon.name;
  document.getElementById('panel-desc').textContent = weapon.description || '';

  const stats = weapon.stats || {};
  document.getElementById('stat-rpm').innerHTML =
    stats.rpm ? stats.rpm : '<span style="color:var(--text-muted)">—</span>';
  document.getElementById('stat-ads').innerHTML =
    stats.ads ? `${stats.ads}<span class="stat-unit">ms</span>` : '<span style="color:var(--text-muted)">—</span>';
  document.getElementById('stat-bv').innerHTML =
    stats.bv ? `${stats.bv}<span class="stat-unit">m/s</span>` : '<span style="color:var(--text-muted)">—</span>';

  const bestTTK = getBestTTK(stats.damage);
  document.getElementById('stat-ttk').innerHTML =
    bestTTK ? `${bestTTK}<span class="stat-unit">ms</span>` : '<span style="color:var(--text-muted)">—</span>';

  const psTabs = document.querySelectorAll('.playstyle-tab');
  psTabs.forEach(tab => {
    const ps = tab.dataset.ps;
    const hasData = weapon.loadouts?.[ps]?.attachments?.length > 0;
    tab.classList.toggle('no-data', !hasData);
  });

  const firstAvailable = Object.keys(weapon.loadouts || {}).find(ps => weapon.loadouts[ps]?.attachments?.length);
  const psToShow = firstAvailable || 'aggressive';

  showLoadout(weapon, psToShow);
  document.getElementById('detail-overlay').classList.add('open');
}

function showLoadout(weapon, ps) {
  document.querySelectorAll('.playstyle-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.ps === ps);
  });

  const loadout = weapon.loadouts?.[ps];
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
}

// ---------------------------------------------------------------------------
// Chart 1 — Performance Rankings (horizontal bar)
// ---------------------------------------------------------------------------

let rankChart = null;

const RANK_CONFIG = {
  ttk:   { label: 'Fastest TTK (ms)',   sort: 'asc',  color: COLORS.green,  unit: 'ms',  note: 'Lower = better' },
  ads:   { label: 'Fastest ADS (ms)',   sort: 'asc',  color: COLORS.blue,   unit: 'ms',  note: 'Lower = better' },
  rpm:   { label: 'Highest RPM',        sort: 'desc', color: COLORS.gold,   unit: 'rpm', note: 'Higher = better' },
  range: { label: 'Best Range (BV m/s)',sort: 'desc', color: COLORS.orange, unit: 'm/s', note: 'Higher = better' },
  meta:  { label: 'Meta Score',         sort: 'desc', color: COLORS.purple, unit: '',    note: 'CODMunity rating' },
};

function buildRankChart(rankKey) {
  const cfg = RANK_CONFIG[rankKey];

  // Gather weapons with this stat
  let ranked = weapons
    .map(w => ({ name: w.name, type: w.type, val: getStat(w, rankKey), weapon: w }))
    .filter(x => x.val != null);

  ranked.sort((a, b) => cfg.sort === 'asc' ? a.val - b.val : b.val - a.val);
  ranked = ranked.slice(0, 15);

  const labels = ranked.map(x => x.name);
  const values = ranked.map(x => x.val);
  const bgColors = ranked.map((_, i) => {
    if (i === 0) return cfg.color;
    if (i <= 2)  return cfg.color + 'cc';
    return cfg.color + '66';
  });

  if (rankChart) rankChart.destroy();

  rankChart = new Chart(document.getElementById('rank-chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: cfg.label,
        data: values,
        backgroundColor: bgColors,
        borderColor: cfg.color,
        borderWidth: 1,
        borderRadius: 2,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw}${cfg.unit}  —  ${ranked[ctx.dataIndex].type}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(37,50,40,0.5)' },
          ticks: { color: '#8da88a' },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: ctx => ctx.index === 0 ? '#fff' : '#8da88a',
            font: ctx => ({ size: ctx.index === 0 ? 13 : 11, weight: ctx.index === 0 ? '700' : '400' }),
          },
        },
      },
    },
  });

  // Add click handler to open weapon panel
  const canvas = document.getElementById('rank-chart');
  canvas.style.cursor = 'pointer';
  canvas.addEventListener('click', (event) => {
    const canvasRect = canvas.getBoundingClientRect();
    const x = event.clientX - canvasRect.left;
    const y = event.clientY - canvasRect.top;

    const canvasPosition = { x, y };
    const dataY = rankChart.scales.y.getValueForPixel(canvasPosition.y);

    if (dataY != null && dataY >= 0 && dataY < ranked.length) {
      const index = Math.round(dataY);
      if (index >= 0 && index < ranked.length && ranked[index]) {
        openPanel(ranked[index].weapon);
      }
    }
  });

  // Update note
  document.getElementById('rank-chart').closest('.rank-chart-wrap').dataset.note = cfg.note;
}

// ---------------------------------------------------------------------------
// CSS Bars — attachment + slot (no Chart.js, fast render)
// ---------------------------------------------------------------------------

function buildCSSBars(containerId, items, nameKey, countKey, colorClass = '') {
  const container = document.getElementById(containerId);
  const max = items[0]?.[countKey] || 1;
  container.innerHTML = items.map((item, i) => {
    const pct = Math.round((item[countKey] / max) * 100);
    const cls = i === 0 ? 'gold' : colorClass;
    return `
      <div class="css-bar-row">
        <span class="css-bar-name" title="${item[nameKey]}">${item[nameKey]}</span>
        <div class="css-bar-track">
          <div class="css-bar-fill ${cls}" style="width:${pct}%"></div>
        </div>
        <span class="css-bar-count">${item[countKey]}</span>
      </div>`;
  }).join('');
}

function buildAttachmentBars() {
  buildCSSBars('attachment-bars', (meta.top_attachments || []).slice(0, 12), 'name', 'count');
}

function buildSlotBars() {
  buildCSSBars('slot-bars', (meta.top_slots || []).slice(0, 9), 'slot', 'count', 'blue');
}

// ---------------------------------------------------------------------------
// Chart 4 — Playstyle Coverage (doughnut)
// ---------------------------------------------------------------------------

function buildPlaystyleChart() {
  const coverage = meta.playstyle_coverage || {};
  const labels = ['Aggressive', 'Long Range', 'Sniper Support'];
  const keys   = ['aggressive', 'long_range', 'sniper_support'];
  const values = keys.map(k => coverage[k] || 0);
  const colors = keys.map(k => PLAYSTYLE_COLORS[k]);

  new Chart(document.getElementById('playstyle-chart'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + 'aa'),
        borderColor:     colors,
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16, color: '#8da88a' },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw} weapons have a ${ctx.label} loadout`,
          },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Chart 5 — Weapons by Class (CSS bars — avoids clip-path canvas sizing bug)
// ---------------------------------------------------------------------------

function buildClassChart() {
  const counts = {};
  weapons.forEach(w => { counts[w.type] = (counts[w.type] || 0) + 1; });
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([slot, count]) => ({ slot, count }));

  buildCSSBars('class-bars', sorted, 'slot', 'count', 'blue');
}

// ---------------------------------------------------------------------------
// Chart 6 — TTK Comparison (line chart)
// ---------------------------------------------------------------------------

const TTK_COLORS = [COLORS.green, COLORS.blue, COLORS.gold, COLORS.red];
let ttkChart = null;

function populateTTKSelects() {
  // Only weapons that have TTK data at multiple ranges
  const eligible = weapons
    .filter(w => Array.isArray(w.stats?.damage) && w.stats.damage.length >= 2)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (let i = 0; i < 4; i++) {
    const sel = document.getElementById(`ttk-sel-${i}`);
    eligible.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = `${w.name} (${w.type})`;
      sel.appendChild(opt);
    });
  }

  // Pre-select 2 popular weapons for a good first impression
  const defaults = ['xm4', 'c9', 'ksv', 'ak_74'];
  defaults.forEach((id, i) => {
    const sel = document.getElementById(`ttk-sel-${i}`);
    if (sel) {
      const opt = [...sel.options].find(o => o.value === id);
      if (opt) sel.value = id;
    }
  });
}

function buildTTKChart() {
  const selectedIds = [0,1,2,3].map(i => document.getElementById(`ttk-sel-${i}`).value).filter(Boolean);

  if (!selectedIds.length) {
    if (ttkChart) { ttkChart.destroy(); ttkChart = null; }
    document.getElementById('ttk-hint').style.display = '';
    return;
  }
  document.getElementById('ttk-hint').style.display = 'none';

  // Gather all unique range breakpoints across selected weapons
  const allRanges = new Set();
  const weaponData = [];

  selectedIds.forEach(id => {
    const w = weapons.find(x => x.id === id);
    if (!w || !Array.isArray(w.stats?.damage)) return;
    w.stats.damage.forEach(d => allRanges.add(d.dropoff));
    weaponData.push(w);
  });

  const ranges = [...allRanges].sort((a, b) => a - b);
  const xLabels = ranges.map(r => `${r}m`);

  const datasets = weaponData.map((w, i) => {
    const damageArr = w.stats.damage;
    // For each range label, find the applicable TTK (use the last entry whose dropoff <= range)
    const ttkPoints = ranges.map(r => {
      // Find the entry where dropoff <= r (damage that applies at this range)
      const applicable = damageArr.filter(d => d.dropoff <= r);
      if (!applicable.length) return null;
      const entry = applicable[applicable.length - 1];
      return entry.ttk ? Math.round(entry.ttk) : null;
    });

    return {
      label: w.name,
      data: ttkPoints,
      borderColor: TTK_COLORS[i],
      backgroundColor: TTK_COLORS[i] + '22',
      pointBackgroundColor: TTK_COLORS[i],
      pointRadius: 5,
      pointHoverRadius: 7,
      borderWidth: 2,
      tension: 0.3,
      fill: false,
      spanGaps: true,
    };
  });

  if (ttkChart) ttkChart.destroy();

  ttkChart = new Chart(document.getElementById('ttk-chart'), {
    type: 'line',
    data: { labels: xLabels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#dde8da', padding: 20, usePointStyle: true },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.raw ?? '—'} ms TTK`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Range', color: '#4a5e4c', font: { size: 11 } },
          grid: { color: 'rgba(37,50,40,0.4)' },
          ticks: { color: '#8da88a' },
        },
        y: {
          title: { display: true, text: 'TTK (ms) — lower is better', color: '#4a5e4c', font: { size: 11 } },
          grid: { color: 'rgba(37,50,40,0.4)' },
          ticks: { color: '#8da88a' },
          reverse: false,
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

function bindEvents() {
  // Rank tabs
  document.getElementById('rank-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.rank-tab');
    if (!tab) return;
    document.querySelectorAll('.rank-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    buildRankChart(tab.dataset.rank);
  });

  // TTK selectors
  for (let i = 0; i < 4; i++) {
    document.getElementById(`ttk-sel-${i}`).addEventListener('change', buildTTKChart);
  }

  // Clear TTK
  document.getElementById('ttk-clear').addEventListener('click', () => {
    for (let i = 0; i < 4; i++) {
      document.getElementById(`ttk-sel-${i}`).value = '';
    }
    buildTTKChart();
    document.getElementById('ttk-hint').style.display = '';
  });

  // Detail panel events
  document.getElementById('panel-playstyle-bar').addEventListener('click', e => {
    const tab = e.target.closest('.playstyle-tab');
    if (!tab || tab.classList.contains('no-data')) return;
    if (selectedWeapon) showLoadout(selectedWeapon, tab.dataset.ps);
  });

  document.getElementById('panel-close').addEventListener('click', closePanel);
  document.getElementById('detail-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('detail-overlay')) closePanel();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePanel();
  });
}

// ---------------------------------------------------------------------------
// Lazy chart loader — renders canvas only when scrolled into view
// ---------------------------------------------------------------------------

function lazyChart(canvasId, buildFn) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  let built = false;
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !built) {
      built = true;
      obs.disconnect();
      buildFn();
    }
  }, { threshold: 0.1 });
  obs.observe(el);
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function init() {
  try {
    await loadData();

    // Render fast elements immediately (no canvas)
    buildRankChart('ttk');
    buildAttachmentBars();
    buildSlotBars();
    bindEvents();

    // Show content BEFORE setting up observers — elements must be visible first
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = '';

    // CSS bars render instantly — no canvas sizing issues
    buildClassChart();

    // Playstyle donut uses a canvas — defer one frame so DOM has painted
    setTimeout(() => {
      try { buildPlaystyleChart(); } catch(e) { console.error('playstyle chart:', e); }
      lazyChart('ttk-chart', () => { populateTTKSelects(); buildTTKChart(); });
    }, 50);
  } catch (err) {
    document.getElementById('loading').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <p>Could not load analytics data</p>
        <p style="margin-top:0.5rem;font-size:0.7rem;color:#4a5e4c">${err.message}</p>
      </div>`;
  }
}

init();
