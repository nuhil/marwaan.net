# CLAUDE.md — Marwaan's Wonder Lab

A static, no-build 3D learning site for young children, deployed to https://marwaan.net by GitHub Pages from `main` (repo root). Three.js `0.186.0` loads from jsDelivr through an import map in each 3D page.

## Commands

Node 22 is installed via Homebrew (`/opt/homebrew/opt/node@22/bin`, keg-only; on PATH via `~/.zshrc`).

```bash
npm run dev      # no-cache dev server at http://localhost:8000 (PORT=9000 to change); prints a LAN URL for phones
npm run check    # same checks as CI: JS syntax + every local href/src in the HTML exists
npm run deploy   # on clean main: check, push, wait for the GitHub Pages build
```

A `.githooks/pre-push` hook runs `npm run check` (enabled by `npm install`).

## Pages

| Page | Script | Styles | Notes |
|---|---|---|---|
| `index.html`, `404.html` | `js/hub.js` | `css/hub.css` | `hub.js` injects the shared header/nav/footer (Home, five worlds, Games). |
| `games.html` | `js/games/games.js` (host: scene, HUD, dock, touch pad, keyboard, levels, stars) + one module per game (`memory`, `sorter`, `race`, `launch`) and `kit.js` (textures, tweens, toys) | `css/core/explorer.css` + `css/worlds/games.css` | Each game exports `enter/exit/restart/update/key/tap`; Castle Launch lazy-loads `cannon-es` from the import map. Textures in `assets/games/textures` (CC0). |
| `space.html` | `js/space.js` (solar system, cutaways) + `js/space-sims.js` (eclipse and Moon/Mars missions: Kepler orbits, step timeline, auto camera) | `css/space.css` | Bump `?v=` in `space.html` when changing its CSS/JS |
| `physics.html` | `js/worlds/physics.js` | `css/worlds/physics.css` | GLB car with systems, X-ray and energy-journey demo |
| `biology.html` | `js/worlds/biology.js` | `css/worlds/biology.css` | Draco GLB anatomy layers, finder, callout labels |
| `chemistry.html` | `js/worlds/chemistry.js`, data in `js/worlds/elements-data.js` | `css/core/explorer.css` + `css/worlds/chemistry.css` | 3D periodic table, specimen stage, atom model, `#Au` deep links |
| `math.html` | `js/worlds/math.js`, `math-models.js` (Number Pals, props), `math-scenery.js` (island) | `css/worlds/math.css` | Number Pals Meadow: five stations, `#add` etc. deep links |

Shared modules: `js/core/icons.js` (inline SVG icons via `data-icon`), `js/core/audio.js` (sound engine: `play(name,{volume,rate,loop,bus})` for `assets/audio/*.mp3`, `playSfx(kind)`, generative music + ambience per theme, synth effects `engine()`, `heartbeat()`, `breathing()`, `geiger()`, `neonHum()`, `quindar()`; starts after a user gesture; set `window.__audioLog=[]` to trace sounds in tests). `css/core/world.css` holds the toast (`.feedback`) and WebGL fallback styles used by every 3D page.

## Conventions

- Every 3D page has: a brand link back to `index.html`, a music toggle, a loading overlay that gets `.done`, a `#fallback` shown when WebGL fails, and pauses rendering when `document.hidden`.
- Camera moves use a `flight` object; while flying, skip `controls.update()` (OrbitControls would clamp distance) and call `camera.lookAt` instead.
- Keep UI touch-first: 44–48px targets, no hover-only actions, labels that hide when their target is off-screen. Test at 1440×900, 820×1180 and 390×844.
- Respect `prefers-reduced-motion`; wrap `localStorage` in try/catch (stars are stored under `wonder-stars`).
- New third-party assets need a license file beside them (see `assets/*/ATTRIBUTION.md`, `assets/anatomy/NOTICE`). Math textures are CC0 from Poly Haven, downscaled to 1k color / 512px normal JPEGs.
- Code style is compact (dense one-line functions); match the surrounding file.
