# Marwaan's Wonder Lab

A responsive, static 3D learning playground for young children.

## Worlds

- **Math:** animated 3D farm stories for addition, subtraction, multiplication, and division.
- **Physics:** a detailed 3D car explorer with selectable mechanical systems and an animated energy journey.
- **Chemistry:** color mixing, states of matter, materials, reactions, and starter elements.
- **Biology:** a layered 3D anatomy explorer with searchable bones, muscles, organs, nerves, and vessels.
- **Space:** an explorable 3D solar system with planet cutaways, an eclipse simulation, and staged Moon and Mars flights.

## Run locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. Three.js loads as an ES module from jsDelivr, so a network connection and WebGL-capable browser are required for the 3D worlds.

## Quality checks

```bash
find js -name '*.js' -print0 | xargs -0 -n1 node --check
node tests/check-site.mjs
```

## Sound

Each page has an optional Music control. Music and feedback cues are synthesized in the browser with Web Audio and begin only after a visitor interacts with the page. The site does not use text-to-speech.

## Anatomy model credits

The Biology viewer includes anatomical geometry derived from BodyParts3D and Z-Anatomy. The bundled model files keep their upstream Creative Commons terms and required notices in `assets/anatomy/`.

The Math Meadow uses an Innerscene rabbit under CC0 and the Chickensoft mascot model under CC BY 4.0. Full credits are preserved in `assets/math/ATTRIBUTION.md`.
