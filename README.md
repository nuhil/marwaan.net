# Marwaan's Wonder Lab

A responsive, static 3D learning playground for young children.

## Worlds

- **Math:** Number Pals Meadow, a sunny 3D island where original block characters (the Number Pals) teach counting and place value, and five stations cover counting, adding (two pals join into one), taking away (Rory the rabbit eats carrots), times (Milly the hen lays equal eggs in each nest), and sharing (tap bunnies to deal carrots fairly). Links like `math.html#divide` open a station.
- **Physics:** a detailed 3D car explorer with selectable mechanical systems and an animated energy journey.
- **Chemistry:** a 3D periodic table of all 118 elements with family, state, weight, and “in my body” views. Each element opens on a display stand with a real-life 3D specimen, an animated atom model, and kid-friendly facts. Deep links such as `chemistry.html#Au` open an element directly.
- **Biology:** a layered 3D anatomy explorer with searchable bones, muscles, organs, nerves, and vessels.
- **Space:** an explorable 3D solar system with planet cutaways, an eclipse simulation, and staged Moon and Mars flights.
- **Games:** a Game Room with memory pairs, a shape puzzle, a mini race, and a castle launcher.

## Develop locally

Requires Node.js 22+ (`brew install node@22`) and Git. There are no npm dependencies to install; run `npm install` once to enable the pre-push check hook.

```bash
npm run dev      # serve at http://localhost:8000 with caching disabled (PORT=9000 npm run dev to change)
npm run check    # same checks CI runs
npm run deploy   # check, push main, and wait for GitHub Pages
```

The dev server also prints a network URL so you can test on a phone or tablet on the same Wi-Fi. Three.js loads as an ES module from jsDelivr, so a network connection and WebGL-capable browser are required for the 3D worlds.

## Deployment

GitHub Pages publishes the `main` branch root to https://marwaan.net (see `CNAME`). Every push to `main` goes live in about a minute, and the Site quality workflow runs the same `npm run check`. For larger changes, work on a branch, open a pull request so CI runs, then merge and deploy.

## Sound

Each page has an optional Music control. Music and feedback cues are synthesized in the browser with Web Audio and begin only after a visitor interacts with the page. The site does not use text-to-speech.

## Anatomy model credits

The Biology viewer includes anatomical geometry derived from BodyParts3D and Z-Anatomy. The bundled model files keep their upstream Creative Commons terms and required notices in `assets/anatomy/`.

The Math meadow uses an Innerscene rabbit under CC0 and the Chickensoft mascot model under CC BY 4.0. Full credits are preserved in `assets/math/ATTRIBUTION.md`. Its grass, soil, bark, plank, metal-roof, cobblestone, cliff and rock textures are CC0 from Poly Haven, listed in `assets/math/textures/ATTRIBUTION.md`.
