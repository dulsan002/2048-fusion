# 2048 Fusion — Project Discovery Report
**Author / Developer:** Dulsan Vasantharaj  
**Project:** 2048 Fusion (YouTube Playable & Web Game)  
**Lifecycle Phase:** Phase 0 — Project Discovery  
**Date:** 2026-09-23  

---

## 1. System Environment & Tooling Audit

| Tool / Environment | Version / Path | Discovery Notes |
| :--- | :--- | :--- |
| **Operating System** | Linux (x86_64) | Standard POSIX-compliant dev environment |
| **Node.js** | `v24.13.1` (NVM managed) | Latest LTS/Current node runtime |
| **npm** | `11.8.0` | Full support for modern `package.json`, lockfile v3, workspaces |
| **npx** | `/home/dulsan002/.nvm/versions/node/v24.13.1/bin/npx` | Available for CLI scaffolding and runner tools |
| **Git** | `git version 2.43.0` | Active git repository initialized with `.gitattributes` |
| **Installed Browsers** | `/usr/bin/google-chrome`<br>`/usr/bin/firefox` | Available for automated/headless and interactive verification |
| **Repository State** | `/home/dulsan002/Documents/GitHub/2048-fusion` | Git initialized; empty `docs/` folder; clean working tree |
| **Vercel Configuration** | None yet | Needs production-grade `vercel.json` with SPA routing and security headers |
| **Testing Tools** | Vitest / Playwright | Vitest planned for unit/integration logic; browser runner for E2E |

---

## 2. YouTube Playables Official Requirements & Architecture Discovery

Based on the latest official **Google for Developers: YouTube Playables** documentation and specifications:

### 2.1 SDK & Entry Point
- **Script Tag Inclusion:** The Playables SDK must be loaded in the root `index.html` *before* any other game scripts:
  ```html
  <script src="https://www.youtube.com/game_api/v1"></script>
  ```
- **Global Namespace:** The platform exposes the `window.ytgame` object.
- **Environment Detection:** `ytgame.IN_PLAYABLES_ENV` (boolean) indicates if running inside the active YouTube Playables runtime. When running standalone (e.g. Vercel demo or local dev), the SDK behaves as a no-op or is absent.
- **Lifecycle Signals:**
  - `ytgame.game.firstFrameReady()`: Signals the splash/initial loading screen is painted and loading has commenced.
  - `ytgame.game.gameReady()`: Signals assets are loaded, loading UI is dismissed, and game is immediately interactive.

### 2.2 Storage & Cloud Save Contract
- **No `localStorage` / Cookies in Production:** The YouTube Playables iframe sandbox does not guarantee persistent `localStorage` across devices, accounts, or sessions.
- **SDK Save API:**
  - `ytgame.game.loadData(): Promise<string>`: Retrieves previously saved UTF-16 serialized JSON string.
  - `ytgame.game.saveData(data: string): Promise<void>`: Saves serialized UTF-16 game data (max 3 MiB; recommended < 512 KiB).
  - **Sequential Rule:** Games **must** await `loadData()` before calling `saveData()` to prevent data clobbering.
  - **Dual-Storage Adapter Pattern:** A persistence bridge is required that routes to `ytgame.game.*` when `IN_PLAYABLES_ENV` is true, and safely falls back to standard `localStorage` with error handling when in web/standalone demo mode.

### 2.3 Audio & Platform Synchronization
- **Platform Audio Control Supremacy:** In-game audio settings must **never** override platform volume or mute controls.
- **SDK Methods:**
  - `ytgame.system.isAudioEnabled(): boolean`: Queries platform mute status.
  - `ytgame.system.onAudioEnabledChange(callback: (enabled: boolean) => void)`: Subscribes to real-time platform mute/unmute events.
- **Web Audio Implementation:** Audio must be paused or muted immediately if `isAudioEnabled()` returns false. Audio will be synthesized procedurally via the Web Audio API (`AudioContext`), eliminating external asset download footprint, eliminating copyright/licensing risks, and guaranteeing sub-millisecond audio response.

### 2.4 Pause Contract & App Lifecycle
- **Strict Halt:**
  - `ytgame.system.onPause(callback: () => void)`: Triggered when YouTube pauses the game (ad display, app minimize, system overlay).
  - The game must **completely halt** the game loop, pause timers, freeze animations, mute all sounds, and disable input processing.
  - `ytgame.system.onResume(callback: () => void)`: Resumes state exactly from where it was frozen without replaying buffered input strokes.

### 2.5 Engagement & High Scores
- `ytgame.engagement.sendScore({ value: number }): Promise<void>`: Reports player high score / score to YouTube's native leaderboards and game interface.

### 2.6 Bundle & Packaging Constraints
- **ZIP Submission Format:** Game must be archived as a ZIP file containing `index.html` at the root.
- **Size Limits:**
  - Initial load bundle (downloaded up to `gameReady()`): **< 30 MiB** (recommended < 15 MiB; our architecture targets **< 100 KiB** total!).
  - Total package size: **< 250 MiB**.
  - Single file size: **< 30 MiB** (recommended < 512 KiB).
- **Zero Third-Party Tracking / External Networks:** No external analytics, CDNs, fonts, or tracking scripts are allowed inside the Playables sandbox. All assets and code must be self-contained within the package.

---

## 3. Trust & Safety, Content, and Privacy Compliance

1. **Age Rating & Audience:** General audience (13+). Must not be directed exclusively to young children ("Made for Kids" compliance).
2. **Community Guidelines:** No violence, hate speech, vulgarity, or suggestive content.
3. **No External Links / External Agreements:** Games must not present external Terms of Service, EULAs, or redirect out of the YouTube environment.
4. **Privacy & Data Collection:** Zero collection of Personally Identifiable Information (PII). No cookies, fingerprints, or user tracking.
5. **Intellectual Property & Originality:**
   - Gameplay mechanics (sliding tile merge) are generic puzzle rules.
   - Distinctive brand identity: **2048 Fusion**.
   - Original color scheme, UI layout, typography hierarchy, animations, and sound effects.
   - Developer credit: **Dulsan Vasantharaj**.

---

## 4. Architectural & Technology Selection

- **Engine Choice:** High-performance, lightweight **Vanilla TypeScript + HTML5 CSS/DOM Hybrid with Web Audio API**.
  - *Why not Phaser?* Phaser adds ~1.2 MB minified runtime overhead, canvas-only text rendering hurdles, and complex accessibility DOM shim layers.
  - *Why not React?* React adds ~140 KB runtime overhead, VDOM reconciliation delays, and unnecessary framework abstractions for a single-screen puzzle loop.
  - *Benefits of TypeScript + Vite + Native DOM:*
    1. Total production bundle: **~35 KB gzip** (ultra-fast, loads in < 50ms).
    2. Zero external dependencies at runtime.
    3. Flawless native DOM accessibility (`aria-live`, `aria-label`, high-contrast styling, keyboard navigation).
    4. Hardware-accelerated CSS GPU transforms (`transform: translate3d`) for 60/120 FPS tile motion.
    5. Clean deterministic state machine decoupled from rendering for 100% automated test coverage.
- **Build System:** Vite + TypeScript.
- **Testing System:** Vitest with jsdom / node environment for 100% core engine unit coverage and lifecycle verification.
- **Deployment:** Vercel web demo configuration (`vercel.json`) with automated build script and Playables ZIP packaging script.
