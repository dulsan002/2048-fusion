# 2048 Fusion — Master Software Requirements Specification (SRS)
**Author / Developer:** Dulsan Vasantharaj  
**Project:** 2048 Fusion  
**Target Environments:** YouTube Playables, Vercel Web Demo, Modern Desktop & Mobile Web  
**Standard:** Production-Grade Commercial Release  

---

## 1. Functional Requirements (FR)

### FR-1: Core Board & Grid Logic
- **FR-1.1:** The board grid must be exactly 4×4 (16 cells).
- **FR-1.2:** A new game starts with exactly 2 randomly positioned tiles.
- **FR-1.3:** Newly spawned tiles have a 90% probability of value `2` and a 10% probability of value `4`.
- **FR-1.4:** Tiles can only spawn in currently empty cells.
- **FR-1.5:** The board state is completely deterministic given a sequence of moves and seed/spawn decisions.

### FR-2: Tile Movement & Compression
- **FR-2.1:** Directional movements supported: `UP`, `DOWN`, `LEFT`, `RIGHT`.
- **FR-2.2:** When a move is requested, tiles slide in the specified direction as far as possible until blocked by the grid boundary or another tile.
- **FR-2.3:** A move is considered valid *if and only if* at least one tile changes position or merges.
- **FR-2.4:** If a move results in no positional change or merge, it is an invalid/no-op move:
  - No new tile is spawned.
  - No score changes.
  - A subtle "shake" or haptic visual feedback may indicate the move was blocked.

### FR-3: Tile Merging Rules (Anti-Double Merge)
- **FR-3.1:** Two adjacent tiles in the direction of movement with identical values merge into a single tile with double their value (e.g., $2+2 \rightarrow 4$, $4+4 \rightarrow 8$, $1024+1024 \rightarrow 2048$).
- **FR-3.2 (Strict Single-Merge per Turn):** A newly merged tile cannot merge again in the same move.
  - *Example 1:* `[2, 2, 2, 2]` moving LEFT must become `[4, 4, 0, 0]`, NEVER `[8, 0, 0, 0]`.
  - *Example 2:* `[4, 2, 2, 0]` moving LEFT must become `[4, 4, 0, 0]`.
  - *Example 3:* `[2, 0, 2, 4]` moving LEFT must become `[4, 4, 0, 0]`.
- **FR-3.3:** Tiles merge towards the direction of movement (e.g., in `[2, 2, 2, 0]` moving LEFT, the two leftmost merge: `[4, 2, 0, 0]`).

### FR-4: Scoring & High Score
- **FR-4.1:** When two tiles merge, the score increases by the numerical value of the newly created tile (e.g., merging two 4s to make an 8 adds +8 to current score).
- **FR-4.2:** Current score updates instantly on merge.
- **FR-4.3:** Best score persists across game restarts and sessions.
- **FR-4.4:** If current score exceeds best score, best score updates in real-time.
- **FR-4.5:** Best score is reported to YouTube Playables via `ytgame.engagement.sendScore({ value: bestScore })`.

### FR-5: Win & Game Over Conditions
- **FR-5.1 (Win Condition):** When any tile reaches `2048`, a Win Modal is triggered.
- **FR-5.2 (Continue Option):** The player has the option to "Continue" playing beyond 2048 to reach higher tiles (4096, 8192, etc.) without the win modal re-triggering repeatedly.
- **FR-5.3 (Game Over Condition):** The game is over *if and only if*:
  1. All 16 cells are occupied, AND
  2. No two adjacent cells (horizontally or vertically) have equal values.
- **FR-5.4:** When Game Over occurs, a Game Over overlay is displayed with final score, best score, and an immediate Restart button.

### FR-6: Game Control & Lifecycle
- **FR-6.1:** **New Game / Restart:** Allows resetting the board at any time with a confirmation prompt if an active game with score > 0 is in progress.
- **FR-6.2:** **Undo Move:** Optional single-step undo feature (configurable/accessible) preserving board integrity.
- **FR-6.3:** **Pause / Resume:** The game can be paused via UI or YouTube Playables lifecycle event (`onPause`). While paused, game timers and inputs are disabled.

---

## 2. Input Requirements (IR)

- **IR-1: Unified Input Manager:** Abstracts keyboard, touch gestures, and mouse drags into high-level direction events (`UP`, `DOWN`, `LEFT`, `RIGHT`).
- **IR-2: Keyboard Navigation:**
  - Standard Arrow Keys: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`.
  - WASD Keys: `KeyW`, `KeyS`, `KeyA`, `KeyD`.
  - Action Keys: `KeyR` (Restart), `KeyP` / `Escape` (Pause/Resume), `KeyU` (Undo).
  - Prevent default browser page scrolling on Arrow keys when focused.
- **IR-3: Touch & Swipe Gestures:**
  - Minimum swipe threshold: 30px to distinguish intentional swipes from taps.
  - Direction determined by primary vector angle ($|\Delta x|$ vs $|\Delta y|$).
  - Multi-touch prevention: ignore simultaneous secondary touch points.
  - Active swipe gesture lock: one physical swipe corresponds to exactly one game move.
  - CSS `touch-action: none` on the board container to prevent elastic scrolling and pinch-zoom interference on mobile.
- **IR-4: Mouse Drag:** Mouse click-and-drag mimics swipe behavior for intuitive desktop gameplay.
- **IR-5: Input Debounce / Throttle:** Rapid consecutive inputs are handled smoothly without dropped states or visual glitching.

---

## 3. UI/UX & Design Specification (UR)

- **UR-1: Theme & Visual Identity:** "Fusion" aesthetic — sleek dark theme (`#0d1117` base) with glowing neon jewel-toned tile accents (sapphire 2, cyan 4, emerald 8, topaz 16, amber 32, ruby 64, amethyst 128, magenta 256, electric violet 512, solar gold 1024, fusion supernova 2048+).
- **UR-2: Modern Typography:** Clean, geometric, highly legible sans-serif font stack with fallback system fonts to ensure zero web font latency.
- **UR-3: Responsive Layout:**
  - Portrait mobile (320px - 480px): Compact header, full-width 1:1 aspect ratio board, touch-optimized button targets ($\ge 48\text{px}$).
  - Tablet (481px - 768px): Centered game container with balanced margins.
  - Desktop (> 768px): Centered card with keyboard shortcut hints and stats bar.
- **UR-4: Smooth Animations:**
  - Tile slide transition: 100ms - 120ms with cubic-bezier easing.
  - Tile pop / merge scale: 1.15x scale pulse on merge.
  - Tile spawn scale: 0 to 1 smooth spring animation.
  - Score increase floating badge: `+X` pop animation.
- **UR-5: Accessible Dialogs / Modals:** Modals for Win, Game Over, Settings, and How to Play with focus trap and keyboard dismissal (`Escape`).

---

## 4. Audio Specifications (AR)

- **AR-1: Procedural Web Audio Engine:**
  - Built using native Web Audio API `AudioContext` with zero external audio file dependencies.
  - Eliminates copyright/license issues completely.
  - Eliminates audio asset download size (saving megabytes of bandwidth).
- **AR-2: Procedural Sound Palette:**
  - Move: Gentle, soft low-pass filtered click/whoosh (220 Hz sine).
  - Merge: Harmonious rising chime (pitch scales with tile tier: C4, E4, G4, C5, E5, etc.).
  - Score Pop: High micro-ping (880 Hz).
  - 2048 Win: Euphoric harmonic major chord arpeggio.
  - Game Over: Gentle descending minor triad.
  - Button Click: Clean crisp UI tap (1 kHz short transient).
- **AR-3: Compliance & Platform Sync:**
  - Respects `ytgame.system.isAudioEnabled()`.
  - Mutes immediately when YouTube Playables requests mute.
  - In-game mute toggle respects user preference without violating platform constraints.
  - Auto-unlocks `AudioContext` on first user gesture (touch/key/click) to comply with browser autoplay policies.

---

## 5. Storage & State Persistence (SR)

- **SR-1: Persistence Contract:**
  - Storage adapter automatically detects environment:
    - If `ytgame.IN_PLAYABLES_ENV` is active: calls `ytgame.game.loadData()` and `ytgame.game.saveData()`.
    - If in standard browser/Vercel: calls `window.localStorage`.
- **SR-2: Payload Schema:**
  ```json
  {
    "version": 1,
    "board": [[2, 0, 0, 0], [0, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    "score": 48,
    "bestScore": 1240,
    "isWon": false,
    "isGameOver": false,
    "hasContinued": false,
    "settings": {
      "soundEnabled": true,
      "hapticsEnabled": true,
      "highContrast": false
    },
    "timestamp": 1727080000000
  }
  ```
- **SR-3: Resilience & Migration:**
  - Total payload size: < 1 KiB (well below the 3 MiB limit).
  - Corrupt or unparseable JSON is caught safely, logged as warning, and initializes a clean new game state without throwing unhandled exceptions.

---

## 6. YouTube Playables Specific Requirements (YTR)

- Full compliance with `docs/YOUTUBE_PLAYABLES_REQUIREMENTS.md`.
- `firstFrameReady()` called on initial DOM paint.
- `gameReady()` called once assets/engine are interactive.
- Pause contract: `ytgame.system.onPause()` halts game loop, input, and audio completely.
- Resume contract: `ytgame.system.onResume()` unfreezes state without input replay.
- `sendScore` updates platform high score.
- Package size under 30 MiB (target: < 100 KiB!).

---

## 7. Quality & Verification Gates (QR)

- **Gate 1: Build:** `npm run build` succeeds with zero errors.
- **Gate 2: Type Safety:** TypeScript compiler (`tsc --noEmit`) passes with zero errors under strict mode.
- **Gate 3: Lint:** ESLint / code check passes with zero warnings or errors.
- **Gate 4: Unit Tests:** 100% test pass on core engine rules (all merge combinations, double-merge prevention, win/loss, deterministic state).
- **Gate 5: Responsive & Accessibility:** Verified across 320px to 4K resolutions; keyboard navigable; high contrast support; reduced-motion support.
- **Gate 6: Zero Vulnerabilities:** Security audit passes (`npm audit`).
