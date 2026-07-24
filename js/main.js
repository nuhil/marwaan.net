/* ==========================================================================
   1. Shared Site Chrome (Header + Footer)
   Single source of truth for the navigation and footer that every page
   shares. Rendered into <div id="site-header"> / <div id="site-footer">
   placeholders so the markup lives in exactly one place instead of being
   copy-pasted across every HTML file.
   ========================================================================== */
const NAV_ITEMS = [
  { href: 'index.html',    color: 'blue',   emoji: '🏠', label: 'Me' },
  { href: 'gallery.html',  color: 'yellow', emoji: '🎨', label: 'Gallery' },
  { href: 'paint.html',    color: 'coral',  emoji: '🖌️', label: 'Paint' },
  { href: 'journals.html', color: 'green',  emoji: '📖', label: 'Stories' },
  { href: 'projects.html', color: 'coral',  emoji: '🏆', label: 'Badges' },
  { href: 'science.html',  color: 'white',  emoji: '🔬', label: 'Science' },
  { href: 'games.html',    color: 'blue',   emoji: '🎮', label: 'Games' },
  { href: 'contact.html',  color: 'yellow', emoji: '✉️', label: 'Message' }
];

function renderSiteChrome() {
  // Determine the current page filename (defaults to index.html at the root).
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  const headerHost = document.getElementById('site-header');
  if (headerHost) {
    const navItems = NAV_ITEMS.map(item => {
      const isActive = item.href === currentPage;
      const activeClass = isActive ? ' active' : '';
      const ariaCurrent = isActive ? ' aria-current="page"' : '';
      return `<li class="lego-nav-item ${item.color}${activeClass}">` +
        `<a href="${item.href}"${ariaCurrent}><span>${item.emoji}</span> ${item.label}</a></li>`;
    }).join('\n          ');

    headerHost.outerHTML = `
  <header class="app-header">
    <div class="nav-container">
      <a href="index.html" class="logo-link" aria-label="Marwaan's Lego World Home">
        <div class="logo-block">
          <span class="logo-text">Marwaan's World<span class="logo-emoji">🧱</span></span>
        </div>
      </a>
      <nav aria-label="Main Navigation">
        <ul class="lego-nav">
          ${navItems}
        </ul>
      </nav>
    </div>
  </header>`;
  }

  const footerHost = document.getElementById('site-footer');
  if (footerHost) {
    footerHost.outerHTML = `
  <footer class="app-footer">
    <div class="footer-brick">
      <span class="footer-text">Made with 🧱 by Marwaan's Dad &copy; 2026</span>
    </div>
    <p class="footer-attribution">Built with HTML5, CSS3 &amp; vanilla JS. Powered by Lego brick power!</p>
  </footer>`;
  }
}

// Render chrome immediately (the placeholders are parsed before this script
// runs at the end of <body>), which avoids a flash of missing navigation.
renderSiteChrome();

document.addEventListener('DOMContentLoaded', () => {
  setupVocalGreeting();
  injectSavedDrawings(); // must run before setupLightbox so saved art is included
  setupLightbox();
});

/* ==========================================================================
   Saved Drawings (from the Paint page) rendered into the Gallery
   Drawings are stored per-device in localStorage by paint.js. Here we append
   them to the gallery grid so they appear alongside the built-in artwork and
   work with the existing lightbox.
   ========================================================================== */
const GALLERY_KEY = 'marwaan_gallery_drawings';

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function injectSavedDrawings() {
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return; // only on the gallery page

  let list = [];
  try { list = JSON.parse(localStorage.getItem(GALLERY_KEY)) || []; } catch (e) { list = []; }
  if (!list.length) return;

  // Newest first
  list.slice().reverse().forEach(item => {
    const div = document.createElement('div');
    div.className = 'gallery-item saved-drawing';
    div.tabIndex = 0;
    div.setAttribute('role', 'button');
    div.setAttribute('aria-label', `Open ${item.caption} in slide viewer`);
    div.innerHTML =
      `<img src="${item.src}" alt="${escapeHTML(item.caption)}" loading="lazy">` +
      `<div class="gallery-item-info">${escapeHTML(item.caption)}</div>` +
      `<button class="gallery-delete-btn" type="button" data-id="${item.id}" ` +
      `aria-label="Delete this drawing">✕</button>`;
    grid.appendChild(div);
  });

  // Wire up delete buttons (stop the click from also opening the lightbox)
  grid.querySelectorAll('.gallery-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('Delete this drawing?')) return;
      const id = Number(btn.getAttribute('data-id'));
      let l = [];
      try { l = JSON.parse(localStorage.getItem(GALLERY_KEY)) || []; } catch (err) { l = []; }
      l = l.filter(x => x.id !== id);
      localStorage.setItem(GALLERY_KEY, JSON.stringify(l));
      location.reload();
    });
  });
}

/* ==========================================================================
   2. Vocal Greeting (HTML5 Audio + Web Speech API Fallback)
   ========================================================================== */
function setupVocalGreeting() {
  const playBtn = document.getElementById('btn-play-greeting');
  const audio = document.getElementById('greeting-audio');
  const animation = document.querySelector('.audio-animation');
  
  if (!playBtn || !audio) return;
  
  let isPlaying = false;
  
  // Set up click handler
  playBtn.addEventListener('click', () => {
    if (isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      stopAudioVisuals();
    } else {
      // Attempt to play the audio file
      audio.play()
        .then(() => {
          startAudioVisuals();
        })
        .catch(err => {
          console.warn('Audio file play failed, using Web Speech API fallback:', err);
          // Fallback to Web Speech API
          playSpeechFallback();
        });
    }
  });
  
  // Audio events
  audio.addEventListener('ended', () => {
    stopAudioVisuals();
  });
  
  function startAudioVisuals() {
    isPlaying = true;
    playBtn.innerHTML = '<span>⏸️</span> Stop Greeting';
    animation.classList.add('playing');
  }
  
  function stopAudioVisuals() {
    isPlaying = false;
    playBtn.innerHTML = '<span>🔊</span> Play Greeting';
    animation.classList.remove('playing');
  }
  
  function playSpeechFallback() {
    if ('speechSynthesis' in window) {
      // Stop any active speech
      window.speechSynthesis.cancel();
      
      const text = "Hi there! Welcome to my awesome website! Check out my games and drawings! Have fun!";
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set child-friendly vocal parameters
      utterance.pitch = 1.4; // Slightly higher pitch for child voice
      utterance.rate = 0.95;  // Slightly slower rate
      
      utterance.onstart = () => {
        startAudioVisuals();
      };
      
      utterance.onend = () => {
        stopAudioVisuals();
      };
      
      utterance.onerror = () => {
        stopAudioVisuals();
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Hello! Welcome to my website! 🧱");
    }
  }
}

/* ==========================================================================
   3. Native Dialog Lightbox (CSS Grid + Slide Navigation)
   ========================================================================== */
function setupLightbox() {
  const dialog = document.getElementById('lightbox-dialog');
  const items = document.querySelectorAll('.gallery-item');
  const closeBtn = document.getElementById('lightbox-close');
  const nextBtn = document.getElementById('lightbox-next');
  const prevBtn = document.getElementById('lightbox-prev');
  
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  
  if (!dialog || items.length === 0) return;
  
  // Collect all gallery items meta
  const galleryData = Array.from(items).map(item => {
    const img = item.querySelector('img');
    return {
      src: img.src,
      alt: img.alt,
      caption: item.querySelector('.gallery-item-info').textContent
    };
  });
  
  let currentIndex = 0;
  
  // Attach click events to gallery items
  items.forEach((item, index) => {
    item.addEventListener('click', () => {
      currentIndex = index;
      openLightbox();
    });
  });
  
  function openLightbox() {
    updateLightboxContent();
    dialog.showModal();
  }
  
  function updateLightboxContent() {
    const data = galleryData[currentIndex];
    lightboxImg.src = data.src;
    lightboxImg.alt = data.alt;
    lightboxCaption.textContent = data.caption;
  }
  
  // Close buttons
  closeBtn.addEventListener('click', () => {
    dialog.close();
  });
  
  // Previous/Next slide events
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex + 1) % galleryData.length;
    updateLightboxContent();
  });
  
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex - 1 + galleryData.length) % galleryData.length;
    updateLightboxContent();
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
}
