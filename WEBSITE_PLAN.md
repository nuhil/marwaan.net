# Marwaan's Wonder Lab: Refactor Plan

## Product direction

The site becomes six focused learning worlds: Math, Physics, Chemistry, Biology, Space, and Games. Each world is designed for kindergarten-age visitors and follows the same interaction loop:

1. See one short instruction.
2. Touch, drag, or choose something.
3. Watch the result immediately.
4. Hear or read one short explanation.
5. Try another randomly generated challenge.

No activity uses a timer by default. Correct answers earn a small visual celebration. Incorrect answers keep the activity open and provide a visual hint. Progress remains local to the visitor's device.

## Shared experience

- **Home:** Six large portal cards with animated previews and one primary action: “Pick a world.”
- **Navigation:** Home button plus six icon tabs. On phones, use a compact bottom dock rather than a long horizontal menu.
- **Instructions:** One sentence, about 8–12 words, with an optional speaker button.
- **Controls:** Minimum 48px touch targets, no interaction that depends on hover, and no required keyboard input.
- **3D controls:** Tap/select is primary. Drag to rotate and pinch to zoom are optional. Reset and Home are always visible.
- **Responsive layout:** Full-screen 3D stage on desktop and tablet. On narrow screens, activity controls become a bottom sheet and facts become swipeable cards.
- **Performance:** Generated geometry and procedural textures where possible, lazy-load each 3D world, cap pixel ratio, dispose replaced geometry/materials, and pause animation when the tab is hidden.
- **Accessibility:** Reduced-motion mode, keyboard-selectable objects, visible focus, status announcements, readable contrast, WebGL fallback content, and sound only after a user action.

## 1. Math World

### Visual idea

Original, friendly **Number Pals** made from colorful rounded 3D cubes. Every number has a stable color and face, so quantities feel like characters. The design uses the teaching idea of visible unit blocks while keeping the characters, names, artwork, and animations original.

### Activity stations

- **Addition — Join Party:** Drag two Number Pals together. Their unit cubes regroup into the answer.
- **Subtraction — Blast Away:** Tap the requested number of cubes. They fly off as stars, leaving the answer visible.
- **Multiplication — Make Teams:** Build equal rows, such as 3 groups of 2. The camera changes to a top view to reveal the array.
- **Division — Share Fairly:** Drag fruit or gems into equal baskets. The activity celebrates when every basket has the same amount.
- **Free Build:** Stack unit cubes and watch the displayed number update.

### Kindergarten range

Start with numbers 1–10. Multiplication means repeated equal groups; division means fair sharing. Difficulty can later expand to 20 without changing the interface.

## 2. Physics World

### Visual idea

A colorful 3D invention workshop with five large stations. Each station teaches one cause-and-effect relationship through play.

### Activity stations

- **Push & Pull:** Move a cart using gentle and strong forces; compare distance traveled.
- **Gravity Drop:** Drop the same object on Earth, Moon, and Jupiter; compare fall speed.
- **Weight & Balance:** Place objects on a seesaw scale and make both sides balance.
- **Atom Builder:** Place protons, neutrons, and electrons into a simplified model for hydrogen, helium, and carbon. Use “tiny building pieces” language before formal terms.
- **Circuit Path:** Snap a battery, switch, wire, and lamp into a complete loop. The lamp lights immediately when the path is complete.

### Safety and accuracy

Models are explicitly simplified. Electronics activities use virtual low-voltage parts and do not instruct children to handle outlets or household wiring.

## 3. Chemistry World

### Visual idea

A bright potion-style laboratory that teaches observation and material properties without encouraging real-world unsupervised mixing.

### Activity stations

- **Color Mixer:** Pour primary-color virtual liquids together and predict the new color.
- **States of Matter:** Heat or cool water particles and watch them change between solid, liquid, and gas.
- **Material Sort:** Sort familiar items as metal, wood, plastic, glass, or fabric using appearance and simple properties.
- **Reaction Lab:** Combine safe virtual examples such as baking soda and vinegar; observe bubbles and identify the new gas visually.
- **Element Treasure Game:** A child-friendly periodic table with a limited starter set: H, He, C, O, Na, Cl, Fe, and Au. Match symbols to familiar objects rather than memorizing the whole table.

### Safety language

Every mixing station says “Virtual lab—ask a grown-up before mixing real things.” Unknown household chemicals are never suggested.

## 4. Biology World

### Visual idea

A friendly, stylized 3D human figure with clearly separated systems. It avoids graphic detail and uses large, recognizable shapes.

### Activity stations

- **Body Explorer:** Tap head, chest, tummy, arms, hands, legs, and feet to hear their names and jobs.
- **Inside Me:** Toggle skeleton, muscles, organs, and skin using four large buttons.
- **Organ Tour:** Tap brain, heart, lungs, stomach, and intestines for one short fact and a gentle animation.
- **Build a Body:** Drag five major organs to their approximate locations.
- **Healthy Habits:** Pair sleep, movement, food, water, and hand washing with the body systems they help.

### Anatomy implementation

Use an original low-poly model built from Three.js geometry first. This keeps load time small and avoids licensing risk. A glTF model can replace it later if an appropriate licensed asset is selected.

## 5. Space World

### Keep and improve

The existing solar system, orbit controls, planet selection, mission clues, time control, and close-orbit camera remain.

### Planet facts interaction

- Tapping a planet or its dock icon opens the same fact card.
- Each card shows name, planet order, type, year length, moons, temperature, one “wow” fact, and a speaker button.
- Mobile uses a bottom sheet that occupies no more than about 45% of the screen and can be swiped down.
- Add Sun and Moon fact cards after the eight planets are stable.
- Increase the invisible touch target around small planets without changing their visual size.

## 6. Games World

### Game launcher

A responsive arcade shelf shows four games. Each game opens in the same page and has Home, Restart, Sound, and How to Play controls.

### Initial games

- **Shape Puzzle:** Rotate and place pieces into matching silhouettes.
- **Memory Pairs:** Match 6–12 cards using planets, animals, numbers, and lab objects.
- **Mini Race:** Steer left/right, collect stars, and avoid soft obstacles. No failure screen; the player always reaches the finish.
- **Castle Launcher:** A gentle trajectory game inspired by slingshot physics. Launch soft balls at block towers with drag angle and force. Use original visuals and mechanics.

### Later games

Maze, pattern train, planet sorting, and simple coding arrows can be added after the four launch games pass mobile testing.

## Technical structure

```text
index.html
math.html          js/worlds/math.js          css/worlds/math.css
physics.html       js/worlds/physics.js       css/worlds/physics.css
chemistry.html     js/worlds/chemistry.js     css/worlds/chemistry.css
biology.html       js/worlds/biology.js       css/worlds/biology.css
space.html         js/worlds/space.js         css/worlds/space.css
games.html         js/games/*.js              css/worlds/games.css
js/core/scene.js
js/core/input.js
js/core/audio.js
js/core/progress.js
js/core/ui.js
css/core/tokens.css
css/core/shell.css
data/content/*.json
```

- Continue using static HTML, CSS, JavaScript, and Three.js modules.
- Put shared renderer setup, resize handling, touch picking, audio, local progress, and disposal helpers in `js/core`.
- Keep learning content in JSON so facts and instructions can be edited without changing scene code.
- Use procedural geometry for the first release; do not add a large framework or asset pipeline.

## Build order

### Phase 1 — Foundation

1. Remove Notebook/Updates and the generic Science route.
2. Update the home page, navigation, sitemap, 404 page, and tests for the six worlds.
3. Build shared responsive shell and Three.js utility modules.
4. Define performance budgets and device breakpoints.

### Phase 2 — Core learning worlds

1. Rebuild Math with Number Pals and all four operations.
2. Split Physics from the current gravity prototype and add the five stations.
3. Upgrade Space facts and mobile planet selection.

### Phase 3 — New science worlds

1. Build Chemistry with Color Mixer and States of Matter first, then the other stations.
2. Build Biology with Body Explorer and Organ Tour first, then the placement game.

### Phase 4 — Games

1. Build Memory Pairs and Shape Puzzle.
2. Build Mini Race.
3. Build Castle Launcher with a simple 2D/3D physics model.

### Phase 5 — Verification

1. Test desktop mouse/keyboard, iPad touch, and narrow phone touch layouts.
2. Test landscape and portrait orientations.
3. Measure initial load and animation frame rate on a mid-range phone.
4. Verify every activity without sound and with reduced motion.
5. Run syntax, asset, accessibility, broken-link, and interaction checks.

## Definition of done

- Only Home, Math, Physics, Chemistry, Biology, Space, Games, and 404 are public routes.
- Each learning world contains at least two complete interactive activities; Math and Physics contain their full planned station set.
- A five-year-old can begin an activity from Home in two taps or fewer.
- Instructions never require reading a paragraph before playing.
- All activities work with touch at 320px width and with mouse/keyboard on desktop.
- Every 3D page has a working reset control and a useful WebGL fallback.
- Planet facts open from both the 3D planets and the planet dock.

