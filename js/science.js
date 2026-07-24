document.addEventListener('DOMContentLoaded', () => {
  setupScienceLogs();
});

const defaultExperiments = [
  {
    title: "The Erupting Kitchen Volcano! 🌋",
    date: "2026-06-08",
    category: "Chemistry",
    desc: "Mixed baking soda, red dish soap, and warm water inside our plastic cup volcano model. When we poured in the vinegar, it instantly bubbled up and overflowed like real hot lava! Marwaan loved chasing the red foam.",
    rating: 5
  },
  {
    title: "Light-Up Spaceship Wiring! 💡",
    date: "2026-05-30",
    category: "Physics",
    desc: "Built a circuit using a yellow LED bulb, copper tape, and a round coin battery. We taped the wires together, wrapped it in Lego blocks, and mounted the shining light inside the cockpit of Marwaan's custom space shuttle!",
    rating: 5
  },
  {
    title: "The Floating Salt-Water Egg! 🥚",
    date: "2026-05-15",
    category: "Biology",
    desc: "Filled two glasses with fresh tap water. In the second glass, we dissolved 4 large tablespoons of table salt. The fresh water egg sank straight to the bottom, but the salt water egg floated right at the surface!",
    rating: 4
  }
];

function setupScienceLogs() {
  const grid = document.getElementById('science-logs-grid');
  const dialog = document.getElementById('science-dialog');
  const openBtn = document.getElementById('btn-add-experiment');
  const closeBtn = document.getElementById('dialog-close');
  const form = document.getElementById('science-form');
  
  if (!grid || !dialog || !openBtn || !closeBtn || !form) return;
  
  // Load or initialize localStorage
  let logs = JSON.parse(localStorage.getItem('marwaan_science_logs'));
  if (!logs || logs.length === 0) {
    logs = defaultExperiments;
    localStorage.setItem('marwaan_science_logs', JSON.stringify(logs));
  }
  
  // Initial render
  renderLogs(logs);
  
  // Set date field to today by default
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('exp-date').value = today;
  
  // Event: Open dialog
  openBtn.addEventListener('click', () => {
    // Reset date field to today
    document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
    dialog.showModal();
  });
  
  // Event: Close dialog
  closeBtn.addEventListener('click', () => {
    dialog.close();
  });
  
  // Light dismiss on backdrop click
  dialog.addEventListener('click', (e) => {
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      dialog.close();
    }
  });
  
  // Event: Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault(); // Stop standard redirect/refresh
    
    const titleVal = document.getElementById('exp-title').value.trim();
    const dateVal = document.getElementById('exp-date').value;
    const catVal = document.getElementById('exp-category').value;
    const descVal = document.getElementById('exp-desc').value.trim();
    const ratingVal = parseInt(document.getElementById('exp-rating').value, 10);
    
    if (!titleVal || !dateVal || !catVal || !descVal) return;
    
    // Add new experiment log
    const newLog = {
      title: titleVal,
      date: dateVal,
      category: catVal,
      desc: descVal,
      rating: ratingVal
    };
    
    logs.push(newLog);
    localStorage.setItem('marwaan_science_logs', JSON.stringify(logs));
    
    // Refresh display
    renderLogs(logs);
    
    // Close & reset
    dialog.close();
    form.reset();
  });
}

function renderLogs(logs) {
  const grid = document.getElementById('science-logs-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  // Sort logs by date descending (newest first)
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  sortedLogs.forEach(log => {
    const card = document.createElement('article');
    card.className = 'graph-paper';
    
    // Category emoji mapping
    let categoryText = log.category;
    if (log.category === 'Chemistry') categoryText += ' 🌋';
    else if (log.category === 'Physics') categoryText += ' 💡';
    else if (log.category === 'Biology') categoryText += ' 🌿';
    else if (log.category === 'Engineering') categoryText += ' ⚙️';
    
    // Format date string
    const dateFormatted = formatDate(log.date);
    
    // Construct LEGO studs rating rating studs
    let studsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= log.rating) {
        studsHtml += '<span class="rating-stud" aria-hidden="true"></span>';
      } else {
        studsHtml += '<span class="rating-stud empty" aria-hidden="true"></span>';
      }
    }
    
    card.innerHTML = `
      <div class="science-meta">
        <span class="science-date">${dateFormatted}</span>
        <span class="science-category">${categoryText}</span>
      </div>
      <h2 class="science-title">${escapeHTML(log.title)}</h2>
      <p class="science-desc">${escapeHTML(log.desc)}</p>
      <div class="stud-rating-container" aria-label="Fun rating: ${log.rating} out of 5 Lego Studs">
        <span>Fun Rating:</span>
        <div class="rating-studs">
          ${studsHtml}
        </div>
      </div>
    `;
    
    grid.appendChild(card);
  });
}

function formatDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  // Use UTC values or manual parser to prevent time zone offset shifts
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const dateObj = new Date(year, month, day);
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  return formatter.format(dateObj) + ' 📅';
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
