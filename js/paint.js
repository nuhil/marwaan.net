/* ==========================================================================
   Marwaan's Drawing Board (HTML5 Canvas free-hand painting)
   Vanilla JS, static-host friendly. Unified pointer input for mouse + touch,
   device-pixel-ratio aware, with undo / clear / save-to-PNG.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('paint-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;

  // Kid-friendly preset colors (LEGO palette + a few extras).
  const SWATCHES = [
    '#1a1a1a', // black
    '#e74c3c', // coral red
    '#e67e22', // orange
    '#f1c40f', // sunny yellow
    '#2ecc71', // lime green
    '#3498db', // sky blue
    '#9b59b6', // purple
    '#ff8bbd', // pink
    '#8d5524', // brown
    '#ffffff'  // white
  ];

  // Fun sticker stamps kids can tap onto the canvas.
  const STICKERS = ['🦖', '🚀', '⭐', '❤️', '🌈', '🐱', '🌸', '🧱', '🚗', '☀️'];

  const BG_COLOR = '#ffffff';
  const SIZE_LABELS = [
    { max: 8,  label: 'Thin' },
    { max: 20, label: 'Medium' },
    { max: 34, label: 'Thick' },
    { max: 99, label: 'Jumbo' }
  ];

  // ---- Drawing state -------------------------------------------------------
  const state = {
    tool: 'brush',        // 'brush' | 'crayon' | 'rainbow' | 'fill' | 'eraser' | 'stamp'
    color: '#e74c3c',
    size: 14,
    sticker: '🦖',        // active sticker when tool === 'stamp'
    drawing: false,
    lastX: 0,
    lastY: 0,
    hue: 0                // used by the rainbow brush
  };

  const undoStack = [];
  const MAX_UNDO = 25;

  // ---- Canvas sizing (DPR-aware, preserves the drawing on resize) ----------
  function sizeCanvas(preserve) {
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));

    let snapshot = null;
    if (preserve && canvas.width > 0) {
      snapshot = document.createElement('canvas');
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      snapshot.getContext('2d').drawImage(canvas, 0, 0);
    }

    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Paint the white "paper" background.
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, cssW, cssH);

    if (snapshot) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }

  // ---- Undo ----------------------------------------------------------------
  function pushUndo() {
    try {
      undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (undoStack.length > MAX_UNDO) undoStack.shift();
    } catch (e) {
      /* getImageData can fail on very large canvases; undo just won't grow */
    }
  }

  function undo() {
    const img = undoStack.pop();
    if (!img) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(img, 0, 0);
    ctx.restore();
  }

  // ---- Pointer position in CSS pixels --------------------------------------
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // ---- Stroke helpers ------------------------------------------------------
  function strokeColor() {
    if (state.tool === 'eraser') return BG_COLOR;
    if (state.tool === 'rainbow') return `hsl(${state.hue}, 90%, 55%)`;
    return state.color;
  }

  function drawDot(x, y) {
    ctx.beginPath();
    ctx.fillStyle = strokeColor();
    ctx.arc(x, y, state.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSegment(x1, y1, x2, y2) {
    if (state.tool === 'crayon') {
      // Crayon: scatter small semi-transparent dabs along the segment for a
      // waxy, textured look.
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.max(1, Math.floor(dist / 2));
      ctx.fillStyle = state.color;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = x1 + (x2 - x1) * t;
        const cy = y1 + (y2 - y1) * t;
        const dabs = 3;
        for (let d = 0; d < dabs; d++) {
          const jitter = state.size * 0.4;
          const ox = (Math.random() - 0.5) * jitter;
          const oy = (Math.random() - 0.5) * jitter;
          ctx.globalAlpha = 0.18;
          ctx.beginPath();
          ctx.arc(cx + ox, cy + oy, state.size * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      return;
    }

    // Marker / rainbow / eraser: smooth round line.
    ctx.beginPath();
    ctx.strokeStyle = strokeColor();
    ctx.lineWidth = state.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (state.tool === 'rainbow') {
      state.hue = (state.hue + 6) % 360;
    }
  }

  // ---- Fill (flood fill / paint bucket) ------------------------------------
  function hexToRgba32(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    // Canvas ImageData is little-endian RGBA -> pack as 0xAABBGGRR.
    return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }

  function floodFill(cssX, cssY) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;
    const x = Math.floor(cssX * dpr);
    const y = Math.floor(cssY * dpr);
    if (x < 0 || y < 0 || x >= w || y >= h) return;

    const img = ctx.getImageData(0, 0, w, h);
    const px = new Uint32Array(img.data.buffer);
    const start = y * w + x;
    const target = px[start];
    const fill = hexToRgba32(state.color);
    if (target === fill) return;

    const tR = target & 0xff, tG = (target >> 8) & 0xff,
          tB = (target >> 16) & 0xff, tA = (target >> 24) & 0xff;
    const tol = 40; // tolerance so anti-aliased edges fill cleanly
    const matches = (c) => {
      const r = c & 0xff, g = (c >> 8) & 0xff, b = (c >> 16) & 0xff, a = (c >> 24) & 0xff;
      return Math.abs(r - tR) <= tol && Math.abs(g - tG) <= tol &&
             Math.abs(b - tB) <= tol && Math.abs(a - tA) <= tol;
    };

    const stack = [start];
    while (stack.length) {
      const idx = stack.pop();
      if (idx < 0 || idx >= px.length || !matches(px[idx])) continue;
      px[idx] = fill;
      const col = idx % w;
      if (col > 0) stack.push(idx - 1);
      if (col < w - 1) stack.push(idx + 1);
      if (idx - w >= 0) stack.push(idx - w);
      if (idx + w < px.length) stack.push(idx + w);
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---- Sticker stamp -------------------------------------------------------
  function stamp(cssX, cssY) {
    const fontSize = Math.max(32, state.size * 3.5);
    ctx.save();
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.sticker, cssX, cssY);
    ctx.restore();
  }

  // ---- Pointer events ------------------------------------------------------
  function onPointerDown(e) {
    e.preventDefault();
    const { x, y } = getPos(e);

    // One-shot tools: act on tap, no dragging stroke.
    if (state.tool === 'fill') {
      pushUndo();
      floodFill(x, y);
      return;
    }
    if (state.tool === 'stamp') {
      pushUndo();
      stamp(x, y);
      return;
    }

    pushUndo();
    state.drawing = true;
    state.lastX = x;
    state.lastY = y;
    drawDot(x, y);
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
  }

  function onPointerMove(e) {
    if (!state.drawing) return;
    e.preventDefault();
    // Use coalesced events for smoother lines on capable devices.
    const events = (e.getCoalescedEvents && e.getCoalescedEvents().length)
      ? e.getCoalescedEvents() : [e];
    events.forEach(ev => {
      const { x, y } = getPos(ev);
      drawSegment(state.lastX, state.lastY, x, y);
      state.lastX = x;
      state.lastY = y;
    });
  }

  function onPointerUp() {
    state.drawing = false;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  // ---- Tool / color / size controls ---------------------------------------
  function buildSwatches() {
    const host = document.getElementById('paint-swatches');
    if (!host) return;
    SWATCHES.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'paint-swatch' + (c === state.color ? ' active' : '');
      btn.style.backgroundColor = c;
      btn.setAttribute('aria-label', `Color ${c}`);
      btn.setAttribute('aria-pressed', c === state.color ? 'true' : 'false');
      btn.addEventListener('click', () => setColor(c, btn));
      host.appendChild(btn);
    });
  }

  function setColor(c, activeBtn) {
    state.color = c;
    // Leaving eraser/rainbow when a color is chosen returns to marker.
    if (state.tool === 'eraser' || state.tool === 'rainbow') setTool('brush');
    const colorInput = document.getElementById('paint-color');
    if (colorInput) colorInput.value = c;
    document.querySelectorAll('.paint-swatch').forEach(s => {
      const on = s === activeBtn;
      s.classList.toggle('active', on);
      s.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  const TOOL_BTNS = {
    brush: 'tool-brush',
    crayon: 'tool-crayon',
    rainbow: 'tool-rainbow',
    fill: 'tool-fill',
    eraser: 'tool-eraser'
  };

  function clearStickerActive() {
    document.querySelectorAll('.paint-sticker').forEach(s => {
      s.classList.remove('active');
      s.setAttribute('aria-pressed', 'false');
    });
  }

  function setTool(tool) {
    state.tool = tool;
    Object.entries(TOOL_BTNS).forEach(([name, id]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const on = name === tool;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    clearStickerActive();
  }

  function buildStickers() {
    const host = document.getElementById('paint-stickers');
    if (!host) return;
    STICKERS.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'paint-sticker';
      btn.textContent = emoji;
      btn.setAttribute('aria-label', `Stamp ${emoji} sticker`);
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => setSticker(emoji, btn));
      host.appendChild(btn);
    });
  }

  function setSticker(emoji, btn) {
    state.tool = 'stamp';
    state.sticker = emoji;
    // Deactivate brush/tool buttons, activate just this sticker.
    Object.values(TOOL_BTNS).forEach(id => {
      const b = document.getElementById(id);
      if (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); }
    });
    clearStickerActive();
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
  }

  // ---- Save the artwork into the browser gallery (localStorage) -------------
  const GALLERY_KEY = 'marwaan_gallery_drawings';

  function compressForGallery() {
    // Downscale + JPEG-encode so many drawings fit inside localStorage.
    const maxW = 600;
    const scale = Math.min(1, maxW / canvas.width);
    const w = Math.max(1, Math.round(canvas.width * scale));
    const h = Math.max(1, Math.round(canvas.height * scale));
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d');
    octx.fillStyle = BG_COLOR;
    octx.fillRect(0, 0, w, h);
    octx.drawImage(canvas, 0, 0, w, h);
    return off.toDataURL('image/jpeg', 0.85);
  }

  function addToGallery(btn) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(GALLERY_KEY)) || []; } catch (e) { list = []; }
    list.push({
      id: Date.now(),
      src: compressForGallery(),
      caption: "Marwaan's Drawing 🎨",
      date: new Date().toISOString()
    });
    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify(list));
    } catch (err) {
      alert('The gallery is full! Please delete some old drawings in the Gallery first. 🧱');
      return;
    }
    if (btn) {
      const original = btn.textContent;
      btn.textContent = '✅ Added!';
      btn.disabled = true;
      setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1600);
    }
  }

  function sizeLabel(v) {
    return (SIZE_LABELS.find(s => v <= s.max) || SIZE_LABELS[1]).label;
  }

  function wireControls() {
    Object.entries(TOOL_BTNS).forEach(([name, id]) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => setTool(name));
    });

    const colorInput = document.getElementById('paint-color');
    if (colorInput) {
      colorInput.addEventListener('input', () => {
        state.color = colorInput.value;
        if (state.tool === 'eraser' || state.tool === 'rainbow') setTool('brush');
        document.querySelectorAll('.paint-swatch').forEach(s => {
          s.classList.remove('active');
          s.setAttribute('aria-pressed', 'false');
        });
      });
    }

    const sizeInput = document.getElementById('brush-size');
    const sizeVal = document.getElementById('brush-size-value');
    if (sizeInput) {
      const applySize = () => {
        state.size = parseInt(sizeInput.value, 10);
        if (sizeVal) sizeVal.textContent = sizeLabel(state.size);
      };
      sizeInput.addEventListener('input', applySize);
      applySize();
    }

    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) undoBtn.addEventListener('click', undo);

    const clearBtn = document.getElementById('btn-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      pushUndo();
      const rect = wrap.getBoundingClientRect();
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, rect.width, rect.height);
    });

    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = 'marwaan-drawing.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });

    const galleryBtn = document.getElementById('btn-gallery');
    if (galleryBtn) galleryBtn.addEventListener('click', () => addToGallery(galleryBtn));
  }

  // ---- Init ----------------------------------------------------------------
  sizeCanvas(false);
  buildSwatches();
  buildStickers();
  wireControls();

  // Preserve artwork across responsive resizes / orientation changes.
  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => sizeCanvas(true));
  });
});
