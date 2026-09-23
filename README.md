# 2048 Fusion

[![Build & Verification](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-29%20passed-success.svg)]()
[![Bundle Size](https://img.shields.io/badge/bundle%20size-15.1%20KiB%20(ZIP)-blue.svg)]()
[![YouTube Playables](https://img.shields.io/badge/YouTube%20Playables-certified%20ready-red.svg)]()
[![WCAG](https://img.shields.io/badge/accessibility-WCAG%202.1%20AA-purple.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A production-grade, cyber-luminescent 2048 puzzle game engineered specifically for **YouTube Playables**, **GitHub Portfolio**, and **Vercel** deployment.

Created and engineered by **Dulsan Vasantharaj**.

---

## 1. Overview

**2048 Fusion** re-imagines the classic 2048 sliding puzzle as an energy core fusion experience. Built from scratch with pure TypeScript, hardware-accelerated CSS Grid GPU transforms, and procedural Web Audio API synthesis, it delivers an ultra-smooth 60/120 FPS experience with an initial package size of just **15 KiB**—over 99.9% below YouTube Playables' 30 MiB initial download limit.

---

## 2. Key Features

- **Production-Grade YouTube Playables Integration:**
  - Official SDK v1 lifecycle synchronization: `firstFrameReady()`, `gameReady()`.
  - Strict compliance with YouTube's **Pause Contract** (`onPause`, `onResume`) freezing inputs, audio, and animations.
  - Platform-priority audio synchronization (`isAudioEnabled`, `onAudioEnabledChange`).
  - Encrypted Cloud Saves via `ytgame.game.saveData` / `loadData` with schema corruption recovery.
  - Platform High Score reporting via `ytgame.engagement.sendScore`.
- **Mathematical Accuracy & Anti-Double-Merge:**
  - Strict standard 2048 merge rules: e.g. `[2, 2, 2, 2]` moving LEFT merges into `[4, 4, 0, 0]` (+8 score), never into `[8]`.
  - Deterministic PRNG with 90% chance of tile 2 and 10% chance of tile 4.
  - Reaching the 2048 Fusion Core triggers a celebration modal with the option to continue playing towards 4096+ and higher singularities.
- **100% Original Procedural Web Audio Synthesis:**
  - Zero external MP3/WAV file downloads.
  - Real-time harmonic chimes whose pitch scales dynamically with tile values (from C4 up to C6 major arpeggio).
  - Clean UI taps, whooshes, win fanfare, and descending minor game over chords.
  - Zero copyright or third-party audio licensing risks.
- **Universal Unified Input:**
  - **Keyboard:** Arrow keys, WASD, `R` (Restart), `U` (Undo), `P`/`Escape` (Pause).
  - **Touch & Mobile:** High-precision swipe gesture tracking with 30px deadzone, angle vector detection, multi-touch rejection, and gesture locking.
  - **Mouse:** Click-and-drag directional gestures on desktop.
- **Enterprise Accessibility (WCAG 2.1 AA):**
  - Dedicated screen-reader ARIA live announcer (`#a11y-live-region`).
  - High Contrast mode for maximum visual distinction.
  - Full keyboard focus trap on modal dialogs.
  - System `prefers-reduced-motion` detection and in-game reduced motion toggle.
  - Touch target sizing $\ge 44 \times 44\text{px}$.

---

## 3. Technology Stack

- **Language:** TypeScript 5.5+ (Strict mode, zero `any`, strict null checks)
- **Bundler & Dev Server:** Vite 8+
- **Styling:** Vanilla CSS with custom design tokens, CSS Grid, and 3D GPU transforms (`translate3d`)
- **Audio:** Native Web Audio API (`AudioContext`, OscillatorNode, GainNode)
- **Test Framework:** Vitest 5+ with JSDOM
- **Deployment Targets:** YouTube Playables (ZIP archive) & Vercel (SPA static hosting)

---

## 4. Architecture Overview

```text
2048-fusion/
├── docs/                        # Complete technical and certification documentation
│   ├── ACCESSIBILITY.md         # WCAG 2.1 AA audit & accessibility details
│   ├── ARCHITECTURE.md          # Module boundaries, state machine, and data flow
│   ├── BUGS.md                  # Defect tracking register (0 open P0/P1)
│   ├── CERTIFICATION_READINESS.md # YouTube Playables readiness audit table
│   ├── GAME_DESIGN.md           # Cyber-luminescent visual design system
│   ├── PERFORMANCE.md           # Bundle size, memory, and frame rate metrics
│   ├── PLAYABLES_INTEGRATION.md # SDK lifecycle, pause contract, cloud storage
│   ├── PROJECT_DISCOVERY.md     # Discovery report on environment & platform specs
│   ├── RELEASE_CHECKLIST.md     # Release candidate verification checklist
│   ├── REQUIREMENTS.md          # Master Software Requirements Specification
│   ├── SECURITY_PRIVACY.md      # Zero-data-collection & vulnerability audit
│   ├── TESTING.md               # QA report covering unit, integration, and E2E tests
│   ├── THIRD_PARTY_LICENSES.md  # IP inventory & procedural audio declaration
│   └── YOUTUBE_PLAYABLES_REQUIREMENTS.md # Platform requirement matrix
├── src/
│   ├── audio/AudioEngine.ts     # Procedural Web Audio synthesizer & mute sync
│   ├── core/                    # Pure deterministic logic (Zero DOM dependencies)
│   │   ├── Board.ts             # 4x4 matrix operations and empty cell queries
│   │   ├── Engine.ts            # Sliding rules, anti-double-merge, win/loss
│   │   ├── Random.ts            # Seeded/unseeded PRNG for deterministic tests
│   │   └── Types.ts             # Core domain interfaces
│   ├── input/InputManager.ts    # Unified Keyboard, Touch swipe, and Mouse drag
│   ├── platform/                # Platform adapters
│   │   ├── PlayablesBridge.ts   # Official ytgame SDK bridge with standalone fallback
│   │   └── StorageAdapter.ts    # YouTube cloud saves & localStorage resilience
│   ├── styles/                  # CSS Design System
│   │   ├── board.css            # Hardware-accelerated 4x4 grid and tile animations
│   │   ├── main.css             # Reset, layout centering, focus indicators
│   │   ├── tokens.css           # Color tokens, tile gradients, typography
│   │   └── ui.css               # Header, toolbar, score pills, modal dialogs
│   ├── ui/
│   │   ├── A11yAnnouncer.ts     # ARIA live regions & modal focus traps
│   │   ├── BoardRenderer.ts     # Tile DOM lifecycle and GPU positioning
│   │   └── UIManager.ts         # Scores, modals (Win, Game Over, Settings, Info)
│   └── main.ts                  # Application bootstrap and platform lifecycle
├── tests/                       # Automated test suites (29 tests passing)
├── scripts/package-playables.js # Automated YouTube Playables submission packager
├── index.html                   # Semantic HTML entry with Playables SDK script
├── package.json                 # Minimal devDependencies (0 runtime dependencies)
├── tsconfig.json                # Strict TypeScript configuration
├── vercel.json                  # Vercel deployment and security headers
└── vite.config.ts               # Production build configuration
```

---

## 5. Getting Started & Local Development

### Prerequisites
- Node.js `v20+` or `v24+`
- npm `v10+`

### Installation
```bash
git clone https://github.com/dulsan002/2048-fusion.git
cd 2048-fusion
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Testing & Quality Assurance

Run the automated test suite powered by Vitest:

```bash
# Run unit and integration tests
npm run test:run

# Run TypeScript strict type-checking
npm run typecheck
```

Test coverage includes:
- 100% of core board matrix operations.
- Anti-double-merge rules and all cardinal directions.
- Scoring, high-score, 2048 win, and game-over conditions.
- Storage schema validation and corrupted payload recovery.
- YouTube Playables lifecycle, pause contract, and audio synchronization.

---

## 7. Production Build & YouTube Playables Packaging

### Production Build
```bash
npm run build
```
Compiles and minifies assets to `dist/`.

### Packaging for YouTube Playables
```bash
npm run package:playables
```
Generates `dist/2048-fusion-playables.zip` with automated compliance verification:
- Confirms `index.html` is at the root.
- Audits file sizes against YouTube Playables limits.
- Output package size: **~15.15 KiB** (well below the 30 MiB initial download limit).

---

## 8. Deployment to Vercel

2048 Fusion includes a pre-configured `vercel.json` with SPA routing and security headers.

To deploy via Vercel CLI:
```bash
npx vercel
```
Or connect your GitHub repository directly to Vercel with default settings:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

---

## 9. Accessibility (WCAG 2.1 AA)

- Screen reader announcements via dynamic ARIA live region.
- High Contrast mode available in Settings.
- Motion reduction setting (`prefers-reduced-motion` and manual toggle).
- Keyboard focus trapping on modal dialogs.
- Clear `:focus-visible` indicators on all interactive elements.

---

## 10. Performance Benchmarks

| Metric | Measured Value | YouTube Playables Limit | Status |
| :--- | :--- | :--- | :---: |
| **ZIP Submission Package** | **15.15 KiB** | 30.00 MiB | **PASS** |
| **Total Uncompressed Size** | **52.71 KiB** | 250.00 MiB | **PASS** |
| **Largest JavaScript Chunk** | **31.01 KiB** | 30.00 MiB (Rec: < 512 KiB) | **PASS** |
| **Audio Download Size** | **0.00 KiB** | N/A (Procedural) | **PASS** |
| **Frame Rate** | **60 / 120 FPS** | 60 FPS Target | **PASS** |
| **Runtime Heap Memory** | **~5.8 MB** | Platform Budget | **PASS** |

---

## 11. Security & Privacy

- **0 Known Vulnerabilities** (`npm audit` verified).
- **Zero Third-Party Trackers or Analytics.**
- **Zero Collection of Personally Identifiable Information (PII).**
- **Zero Secrets or API Keys in Repository.**
- Compliant with YouTube Playables Trust & Safety guidelines.

---

## 12. License & Author

Developed by **Dulsan Vasantharaj**.

Distributed under the **MIT License**. See [LICENSE](LICENSE) for full details.

*Disclaimer: 2048 Fusion is an independent video game developed by Dulsan Vasantharaj. It is not affiliated with, sponsored by, or endorsed by Google, YouTube, or the original creators of the 2048 open-source concept.*
