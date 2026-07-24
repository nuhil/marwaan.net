# Marwaan's LEGO Personal Website 🧱

A responsive, accessible, and playful 6-page personal website designed for a 5 and a half years old child. Built purely with modern semantic HTML5, CSS3, and client-side JavaScript. Designed to be lightweight, secure, and ready for immediate deployment on GitHub Pages or any static site hosting service.

## 🎨 Visual & UI/UX Style Guide

The site is designed with a **LEGO block / neo-brutalism** theme:
- **Colors**: High-contrast, vibrant palette:
  - Primary Blue: Sky Blue `#3498db`
  - Accent Yellow: Sunny Yellow `#f1c40f`
  - Accent Green: Lime Green `#2ecc71`
  - Accent Coral: Bright Coral `#e74c3c`
  - Background: Soft Off-White `#fcfcf9`
  - Borders & Shadows: Thick solid black `#1a1a1a` (4px borders, 6px offset shadows).
- **Tactile Feedback**: Navigation links and buttons sink and shrink their shadows on hover and active click to simulate snapping plastic toy blocks together.
- **Oversized Typography**: Uses the playful 'Fredoka' and 'Outfit' Google Fonts with massive click/tap targets (minimum 48px to 64px) for ease of use by children and grandparents.
- **Story Notebooks**: Dictated stories are formatted like digital school notebook paper with rules, margin line markers, binder holes, and emoji pencil bullets.

---

## 📂 Project Directory Structure

```
.
├── index.html          # Homepage ("All About Me" with Audio Greeting)
├── gallery.html        # Grid of drawings and Lego builds (with Lightbox Modal)
├── paint.html          # Free-hand drawing board (canvas: brushes, colors, undo, save)
├── journals.html       # Dictated story book styled like digital notebook pages
├── projects.html       # Achievement dashboard showing unlockable badges
├── games.html          # HTML5 Canvas "Lego Balloon Pop" game interface
├── contact.html        # Message form targeting a Formspree endpoint
├── css/
│   └── style.css       # Unified global styles, LEGO cards, notebook, and game layouts
├── js/
│   ├── main.js         # Navigation highlights, lightbox modal, and speech greeting fallback
│   └── games.js        # OOP canvas game physics, Web Audio API pop synthesis, and particles
├── audio/
│   └── greeting.wav    # Valid, short arpeggio greeting chime to avoid browser load errors
├── images/
│   ├── gallery/        # Art gallery illustrations and models
│   └── badges/         # Icon badges for achievement milestones
└── scratch/
    └── audio_generator.py # Python helper script to regenerate the arpeggio wave file
```

---

## 🕹️ Interactive Features

1. **Vocal Greeting (Me Page)**: Uses a custom play button to run the greeting chime. If audio is blocked or fails, it triggers the **Web Speech API (`speechSynthesis`)** to dictate the greeting using a higher-pitched kid voice model.
2. **Interactive Lightbox (Gallery Page)**: Images load in a responsive grid. Clicking an item launches a slide viewer using a native `<dialog>` element with custom backdrop filtering and Prev/Next keyboard/tap navigation.
3. **Balloon Pop Game (Games Page)**: Features falling particle explosions, scorekeeping, dynamic speeds, and sound effects generated entirely programmatically using the browser's **Web Audio API** (no heavy external audio assets needed).
4. **Toy Postbox Form (Message Page)**: Features user-friendly fields with name autocomplete, large focus states, and native user-validation error flags targeting Formspree securely.

---

## 🚀 Local Development Setup

To preview and run the website locally, spin up a lightweight development server.

### Using Python 3 (Recommended):
Run the server from the root directory:
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000` in your web browser.

### Using Node.js:
If you have node installed, you can use any static server, e.g.:
```bash
npx http-server -p 8000
```

---

## 🛠️ Regenerating the Greeting Chime
If you want to alter or regenerate the arpeggio WAV chime:
1. Open the [audio_generator.py](scratch/audio_generator.py) script.
2. Run it inside the `scratch/` directory:
   ```bash
   cd scratch
   python3 audio_generator.py
   ```
