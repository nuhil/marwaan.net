/* ==========================================================================
   STEM Lab (science.html)
   Loads experiments from data/experiments.json (the single source of truth —
   edit that file to add or change experiments). Renders rich lab-journal cards
   with a category filter. No visitor editing / localStorage.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  setupScience();
});

// Emoji + CSS class for each known category. Unknown categories fall back to a
// neutral flask, so adding a brand-new category to the JSON still works.
const CATEGORY_META = {
  Chemistry:   { emoji: '🌋', cls: 'chemistry' },
  Physics:     { emoji: '💡', cls: 'physics' },
  Biology:     { emoji: '🌿', cls: 'biology' },
  Engineering: { emoji: '⚙️', cls: 'engineering' }
};

function categoryMeta(cat) {
  return CATEGORY_META[cat] || { emoji: '🔬', cls: 'default' };
}

let ALL_EXPERIMENTS = [];
let currentFilter = 'All';

function setupScience() {
  const grid = document.getElementById('science-logs-grid');
  if (!grid) return;

  fetch('data/experiments.json')
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      ALL_EXPERIMENTS = Array.isArray(data) ? data : [];
      buildFilters();
      render();
    })
    .catch(err => {
      console.warn('Could not load experiments.json:', err);
      grid.innerHTML =
        '<div class="graph-paper" style="grid-column: 1 / -1; text-align: center;">' +
        '<p class="science-desc">Oops! My experiments are taking a little nap. 😴 ' +
        'Please check back soon!</p></div>';
    });
}

function buildFilters() {
  const bar = document.getElementById('science-filter-bar');
  if (!bar) return;

  // "All" plus every distinct category that appears in the data (in first-seen order).
  const categories = ['All', ...Array.from(new Set(ALL_EXPERIMENTS.map(e => e.category)))];

  bar.innerHTML = '';
  categories.forEach(cat => {
    const emoji = cat === 'All' ? '🔬' : categoryMeta(cat).emoji;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-chip' + (cat === currentFilter ? ' active' : '');
    btn.dataset.filter = cat;
    btn.textContent = `${cat} ${emoji}`;
    btn.setAttribute('aria-pressed', cat === currentFilter ? 'true' : 'false');
    btn.addEventListener('click', () => {
      currentFilter = cat;
      bar.querySelectorAll('.filter-chip').forEach(c => {
        const on = c.dataset.filter === cat;
        c.classList.toggle('active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      render();
    });
    bar.appendChild(btn);
  });
}

function render() {
  const grid = document.getElementById('science-logs-grid');
  const countEl = document.getElementById('science-count');
  if (!grid) return;

  // Newest first, then apply the active category filter.
  let list = ALL_EXPERIMENTS.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  if (currentFilter !== 'All') list = list.filter(e => e.category === currentFilter);

  if (countEl) {
    const n = list.length;
    countEl.textContent = `${n} experiment${n === 1 ? '' : 's'}` +
      (currentFilter === 'All' ? ' logged 🧪' : ` in ${currentFilter}`);
  }

  grid.innerHTML = '';
  list.forEach(exp => grid.appendChild(renderCard(exp)));
}

function renderCard(exp) {
  const meta = categoryMeta(exp.category);
  const card = document.createElement('article');
  card.className = `graph-paper cat-${meta.cls}`;
  card.dataset.category = exp.category;

  const sections = [];

  if (Array.isArray(exp.materials) && exp.materials.length) {
    const chips = exp.materials
      .map(m => `<span class="science-chip">${escapeHTML(m)}</span>`)
      .join('');
    sections.push(section('🧰', 'What I used', `<div class="science-chips">${chips}</div>`));
  }
  if (exp.hypothesis) {
    sections.push(section('🤔', 'What I thought', `<p class="science-section-text">${escapeHTML(exp.hypothesis)}</p>`));
  }
  if (exp.observation) {
    sections.push(section('🔬', 'What happened', `<p class="science-section-text">${escapeHTML(exp.observation)}</p>`));
  }

  const funFact = exp.funFact
    ? `<div class="science-funfact">💡 <strong>Cool fact:</strong> ${escapeHTML(exp.funFact)}</div>`
    : '';

  card.innerHTML = `
    <div class="science-meta">
      <span class="science-date">📅 ${formatDate(exp.date)}</span>
      <span class="science-category cat-badge-${meta.cls}">${escapeHTML(exp.category)} ${meta.emoji}</span>
    </div>
    <h2 class="science-title"><span class="science-emoji" aria-hidden="true">${exp.emoji || '🧪'}</span> ${escapeHTML(exp.title)}</h2>
    ${sections.join('')}
    ${funFact}
    <div class="stud-rating-container" aria-label="Fun rating: ${exp.rating} out of 5 Lego Studs">
      <span>Fun Rating:</span>
      <div class="rating-studs">${renderStuds(exp.rating)}</div>
    </div>
  `;
  return card;
}

function section(icon, label, innerHTML) {
  return `<div class="science-section">
      <span class="science-section-label">${icon} ${label}</span>
      ${innerHTML}
    </div>`;
}

function renderStuds(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="rating-stud${i <= rating ? '' : ' empty'}" aria-hidden="true"></span>`;
  }
  return html;
}

function formatDate(dateStr) {
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;

  // Build the date from parts to avoid time-zone offset shifts.
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const dateObj = new Date(year, month, day);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  }).format(dateObj);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
