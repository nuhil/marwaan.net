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

  const BG_COLOR = '#ffffff';
  const SIZE_LABELS = [
    { max: 8,  label: 'Thin' },
    { max: 20, label: 'Medium' },
    { max: 34, label: 'Thick' },
    { max: 99, label: 'Jumbo' }
  ];

  // ---- Drawing state -------------------------------------------------------
  const state = {
    tool: 'brush',        // 'brush' | 'crayon' | 'rainbow' | 'eraser'
    color: '#e74c3c',
    size: 14,
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

  // ---- Pointer events ------------------------------------------------------
  function onPointerDown(e) {
    e.preventDefault();
    pushUndo();
    state.drawing = true;
    const { x, y } = getPos(e);
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
    eraser: 'tool-eraser'
  };

  function setTool(tool) {
    state.tool = tool;
    Object.entries(TOOL_BTNS).forEach(([name, id]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const on = name === tool;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
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
  }

  // ---- Init ----------------------------------------------------------------
  sizeCanvas(false);
  buildSwatches();
  wireControls();

  // Preserve artwork across responsive resizes / orientation changes.
  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => sizeCanvas(true));
  });
});
