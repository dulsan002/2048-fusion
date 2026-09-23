# 2048 Fusion — UI / UX Design System Specification

**Developer:** Dulsan Vasantharaj  
**Product Standard:** Production-Grade Casual Puzzle Game / YouTube Playable  

---

## 1. Design Language & Visual Hierarchy

2048 Fusion incorporates an original design language inspired by modern premium dark UI aesthetics:
- **Base Environment:** Cosmic deep midnight / near-black radial background (`#070a14` to `#020409`).
- **Surface Elevation:** Translucent glassmorphic panels (`rgba(16, 24, 46, 0.85)`) with multi-layer borders and subtle cyan/blue back-glow.
- **Primary CTA:** Luminous electric cyan-to-azure gradient (`linear-gradient(135deg, #00d2ff 0%, #0066ff 100%)`) with dynamic glow on hover.
- **Secondary Actions:** Frosted glass tiles with translucent borders and responsive hover lifting.
- **Accents:** Neon cyan (`#00f0ff`), amethyst violet (`#a855f7`), and solar gold (`#fbbf24`).

---

## 2. Screen Architecture & User Flows

### A. Main Menu (`#view-menu`)
- **Cosmic Hero Card:** Floating glass container featuring layered typography:
  - Title: Crisp white **2048** paired with glowing gradient **Fusion**.
  - Subtitle: *"Simple Moves. Infinite Possibilities."*
- **Primary CTA:** Dominant glowing `▶ Play` / `▶ Resume Game` button.
- **Secondary Action Grid:**
  - 📖 **How to Play:** Opens rules modal.
  - 📊 **High Scores:** Opens player statistics modal.
  - ⚙️ **Settings:** Opens complete settings modal.
- **Footer Bar:** Quick audio mute toggle and developer attribution (`Dulsan Vasantharaj • v1.0.0`).

### B. In-Game HUD & Board (`#view-game`)
- **Compact HUD:**
  - **Score Card:** Current score with pop-up point animations (`+4`, `+8`).
  - **Best Score Card:** Crown badge (`👑`) with all-time high score.
  - **Quick Controls:** Circular glass buttons for Undo (`↺`), Settings (`⚙`), and Menu/Pause (`⏸`).
- **4x4 Grid:**
  - Responsive square viewport maintaining strict aspect ratio across mobile and desktop.
  - Rounded cell cavities with subtle inset shadows.
- **Radiant Tile Progression:**
  - `2`: Warm ivory cream (`#eee4da`)
  - `4`: Warm sand (`#ede0c8`)
  - `8`: Tangerine glow (`#f2b179`)
  - `16`: Coral energy (`#f59563`)
  - `32`: Crimson flare (`#f67c5f`)
  - `64`: Scarlet fusion (`#f65e3b`)
  - `128`–`512`: Solar gold with escalating radiance (`#edcf72` – `#edc53f`)
  - `1024`: Electric cyan core (`#00e5ff`)
  - `2048`: Supernova singularity (`#00ffff` to `#d946ef` dynamic glow)
- **Live Hint Banner:** Contextual guidance and 1-step optimal lookahead suggestions.

### C. Game Over State (`#modal-game-over`)
- Replaces the generic modal with an engaging game state:
  - Broken heart icon (💔) with subtle pulse.
  - Heading: "Game Over" with encouraging subtitle: *"No more moves left. But great effort!"*
  - Stats card: Score, Best Score, Highest Tile badge, and Total Moves.
  - Dominant CTA: `🔄 Play Again` (primary gradient).
  - Secondary CTA: `🏠 Main Menu`.
  - Rotating encouraging quote: *"Every game gets you closer!"*

### D. Win Celebration State (`#modal-win`)
- Triggered upon creating the 2048 tile:
  - Golden trophy icon (🏆) with celebratory radiance.
  - Heading: "You Reached 2048!"
  - Performance chips: Score, Moves, and Elapsed Time.
  - Actions: `▶ Keep Playing` (continue session), `🔄 New Game`, and `🏠 Main Menu`.

### E. Professional Settings Panel (`#modal-settings`)
- Structured into 4 distinct groups:
  1. **Audio:**
     - Background Music: Switch toggle + responsive range slider with live percentage readout.
     - Sound Effects: Switch toggle + responsive range slider with live percentage readout.
  2. **Display:**
     - High Contrast: High-contrast mode with bold borders and elevated luminance.
     - Reduced Motion: Disables transitions, scaling, and shakes for accessibility.
  3. **Gameplay:**
     - Show Move Hints: Enables hint button and recommendations.
     - Confirm Restart: Prompts confirmation modal before abandoning active games.
  4. **About:**
     - Version, developer attribution (`Dulsan Vasantharaj`), and technical certification badges.

---

## 3. Responsive Breakpoints

- **Mobile (< 480px):** Single-column layout, touch-friendly 44px+ tap targets, swipe gesture prevention of background scroll.
- **Tablet (481px – 800px):** Proportionally scaled board (up to 440px) with balanced whitespace.
- **Desktop (> 800px):** Centered floating showcase, keyboard hotkeys (`WASD`, Arrow keys, `U` for Undo, `R` for Restart, `P`/`Esc` for Menu).

---

## 4. Accessibility Compliance

- **WCAG 2.1 AA:** Strict color contrast on all text and high-value tiles.
- **Keyboard Trapping:** Dialog modals trap focus while active and dismiss on `Escape`.
- **Live Regions:** Screen readers receive ARIA announcements for tile merges, milestones, game over, and win states.
- **Zero Decorative Controls:** Every button, toggle, and slider maps directly to persistent engine state.
