# CLAUDE.md - Antigravity Agent Guidelines

This file outlines the commands, architecture patterns, and design system rules for development on Marwaan's LEGO Personal Website.

## 🚀 Quick Command Guides

### Start Local Dev Server
```bash
python3 -m http.server 8000
```

### Validate JavaScript Syntax
```bash
node -c js/main.js && node -c js/games.js
```

### Regenerate Greeting Chime Audio
```bash
cd scratch && python3 audio_generator.py
```

---

## 🎨 Visual System & CSS Variables

Ensure all new visual edits rely on variables in [style.css](file:///css/style.css):

```css
:root {
  --sky-blue: #3498db;
  --sky-blue-dark: #2980b9;
  --sunny-yellow: #f1c40f;
  --sunny-yellow-dark: #f39c12;
  --lime-green: #2ecc71;
  --lime-green-dark: #27ae60;
  --bright-coral: #e74c3c;
  --bright-coral-dark: #c0392b;
  --dark-gray: #1a1a1a;
  --off-white: #fcfcf9;
  --white: #ffffff;
  
  --font-primary: 'Fredoka', system-ui, sans-serif;
  --font-header: 'Outfit', system-ui, sans-serif;
  
  --border-width: 4px;
  --border-radius: 20px;
  --shadow-offset: 6px;
}
```

---

## 🧱 Architectural Patterns & Guidelines

### 1. LEGO Card Component Pattern
Use the following DOM structure to preserve visual LEGO brick vibes:
```html
<div class="lego-card [blue|yellow|green|coral]">
  <!-- LEGO Stud rows decoration -->
  <div class="lego-studs-row">
    <span class="lego-stud"></span>
    <span class="lego-stud"></span>
    <span class="lego-stud"></span>
    <span class="lego-stud"></span>
  </div>
  <div class="lego-card-body">
    <h2>[Heading Title]</h2>
    <p>[Body Text]</p>
  </div>
</div>
```

### 2. Tactile Button Markup
All buttons and links trigger a visual press effect down-right when clicked. Use class names:
- `<button class="lego-btn [blue|yellow|green|coral]" type="button">` for JavaScript triggers.
- `<a class="lego-btn [blue|yellow|green|coral]" href="...">` for standard links.

### 3. Accessible Forms Rules (Based on Web Best Practices)
- **Top Labels**: Keep `<label>` labels directly above inputs.
- **Autofill & Constraints**: Always supply matching `autocomplete`, `type`, and standard constraint validations (e.g. `required`, `maxlength`).
- **Tactile Inputs**: Fields use `.form-control` with a minimum touch-target height of `48px`.
- **Validation**: Utilize native `:invalid:user-invalid` styling selectors to check validation without premature alerts.
- **Submit Protection**: Prevent double-submission by disabling form buttons upon valid submission triggers.

### 4. Interactive Dialog Lightbox
For photo or artwork viewing, do not implement custom overlay boxes. Use the native HTML5 `<dialog>` component styled in CSS via `::backdrop` and `.lightbox-dialog`. Open and close via standard `.showModal()` and `.close()` methods.

### 5. Web Audio API Procedural Sounds
Synthesize clean sound effects in JS using `AudioContext` sweeps to keep the codebase static-host friendly without external file loading requirements.
