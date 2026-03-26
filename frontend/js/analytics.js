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

  document.getElementById('season-label').textContent =
    `${(wData.season || 'S2R').toUpperCase()} · BLACK OPS 6`;
  if (wData.last_updated) {
    const d = new Date(wData.last_updated);
    document.getElementById('last-updated-label').textContent =
      `Updated ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
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
    .map(w => ({ name: w.name, type: w.type, val: getStat(w, rankKey) }))
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
