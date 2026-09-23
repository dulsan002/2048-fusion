# YouTube Playables Compliance & Specification Matrix
**Author / Developer:** Dulsan Vasantharaj  
**Project:** 2048 Fusion  
**Standard Authority:** Official Google for Developers: YouTube Playables Documentation (`developers.google.com/youtube/gaming/playables`)  
**Status Key:**  
- `PLANNED`: Architectural approach designed; awaiting implementation.  
- `IN_PROGRESS`: Currently under development.  
- `VERIFIED`: Implemented and verified against official criteria.  
- `NOT_APPLICABLE`: Requirement reviewed; not relevant to this game type.  

---

## 1. SDK Integration & Environment

### YTR-01: SDK Script Tag Inclusion
- **Requirement:** Games must include an `index.html` file in the root directory and import the official YouTube Playables SDK via `<script src="https://www.youtube.com/game_api/v1"></script>` *before* any game scripts.
- **Source:** Google for Developers — YouTube Playables: Getting Started.
- **Implementation Approach:** In root `index.html`, place `<script src="https://www.youtube.com/game_api/v1"></script>` directly in the `<head>` before module bundle scripts. Provide an internal SDK wrapper that gracefully handles local dev / offline mode when the script cannot load or is blocked.
- **Verification Method:** Check DOM inspection in Chrome DevTools; verify `window.ytgame` object exists when script executes.
- **Status:** PLANNED

### YTR-02: First Frame Readiness (`firstFrameReady`)
- **Requirement:** Call `ytgame.game.firstFrameReady()` to notify the platform that the game has started rendering its initial splash / loading frame.
- **Source:** Google for Developers — YouTube Playables: Game Lifecycle.
- **Implementation Approach:** Call `ytgame.game.firstFrameReady()` as soon as the initial HTML/CSS splash DOM is rendered in `main.ts`.
- **Verification Method:** Monitor console log and SDK Test Suite event emitter.
- **Status:** PLANNED

### YTR-03: Game Ready Signal (`gameReady`)
- **Requirement:** Call `ytgame.game.gameReady()` when all assets are loaded, the loading screen is hidden, and the game is fully interactive for the user.
- **Source:** Google for Developers — YouTube Playables: Game Lifecycle.
- **Implementation Approach:** Call `ytgame.game.gameReady()` after engine initialization, save data restoration, and grid rendering are complete and ready for touch/keyboard input.
- **Verification Method:** Test via SDK Test Suite; verify loading overlay dismissal timing.
- **Status:** PLANNED

---

## 2. Platform Lifecycle & Pause Contract

### YTR-04: Strict Game Pause (`onPause`)
- **Requirement:** Implement `ytgame.system.onPause(callback)`. The game must completely stop: halt the game loop, freeze all animations, mute all audio, and block input processing.
- **Source:** Google for Developers — YouTube Playables: System Events / Certification Guidelines.
- **Implementation Approach:** Register callback with `ytgame.system.onPause`. Inside callback: set `isPaused = true`, suspend Web Audio `AudioContext.suspend()`, ignore all touch/keyboard/mouse events, and halt any running transition timers.
- **Verification Method:** Simulate pause event via SDK Test Suite; verify audio stops instantly, no inputs register, and animations freeze.
- **Status:** PLANNED

### YTR-05: State Resume (`onResume`)
- **Requirement:** Implement `ytgame.system.onResume(callback)`. The game must resume state from where it was frozen without replaying buffered inputs.
- **Source:** Google for Developers — YouTube Playables: System Events / Certification Guidelines.
- **Implementation Approach:** Register callback with `ytgame.system.onResume`. Inside callback: if game was not manually paused by player, unpause game state, resume `AudioContext.resume()` (if audio enabled), clear any pending input queue to prevent rapid move firing.
- **Verification Method:** Simulate pause/resume via SDK Test Suite while swiping; confirm no phantom moves occur.
- **Status:** PLANNED

---

## 3. Audio & Platform Volume Control

### YTR-06: Initial Audio State Sync (`isAudioEnabled`)
- **Requirement:** In-game audio must respect platform audio settings. Check `ytgame.system.isAudioEnabled()` on launch. If false, game must start silent.
- **Source:** Google for Developers — YouTube Playables: Audio Management.
- **Implementation Approach:** In `AudioEngine.init()`, query `ytgame.system.isAudioEnabled()`. If false or running in muted context, master audio gain is clamped to 0.
- **Verification Method:** Initialize game with simulated platform mute; verify zero audio output.
- **Status:** PLANNED

### YTR-07: Real-Time Audio State Change (`onAudioEnabledChange`)
- **Requirement:** Register a listener with `ytgame.system.onAudioEnabledChange(callback)`. When callback fires, immediately update audio playback.
- **Source:** Google for Developers — YouTube Playables: Audio Management.
- **Implementation Approach:** Attach listener to update internal `platformAudioMuted` flag and ramp master gain smoothly (to avoid audio clicks) between 1 and 0.
- **Verification Method:** Toggle platform mute in SDK Test Suite during active sound playback.
- **Status:** PLANNED

### YTR-08: In-Game Volume Controls Cannot Override Platform Mute
- **Requirement:** In-game audio toggles must never override YouTube platform mute controls.
- **Source:** Google for Developers — YouTube Playables: Audio Management.
- **Implementation Approach:** Master volume output = `inGameAudioSetting && platformAudioEnabled`. If platform is muted, audio is silent regardless of in-game toggle.
- **Verification Method:** Turn in-game sound ON while platform sound is OFF; verify no audio plays.
- **Status:** PLANNED

---

## 4. Storage & Persistence

### YTR-09: Cloud Save / Persistent Data (`saveData` & `loadData`)
- **Requirement:** Use `ytgame.game.saveData(data: string)` and `ytgame.game.loadData(): Promise<string>` for persistent progress. Local storage is not guaranteed in the Playables sandbox.
- **Source:** Google for Developers — YouTube Playables: Data Storage.
- **Implementation Approach:** Implement `StorageManager` service that calls `loadData()` at startup and `saveData()` on state updates. Serialize compact JSON state.
- **Verification Method:** Test save/load cycles via SDK Test Suite mock storage.
- **Status:** PLANNED

### YTR-10: Await Load Before Save Rule
- **Requirement:** Games must await `loadData()` before calling `saveData()` to avoid overwriting existing player data.
- **Source:** Google for Developers — YouTube Playables: Data Storage.
- **Implementation Approach:** Enforce a state machine flag `hasLoadedData = false`. Block any `saveData()` calls until `loadData()` promise resolves.
- **Verification Method:** Unit test asserting `saveData` throws or queues if `loadData` has not completed.
- **Status:** PLANNED

### YTR-11: Save Data Size Limitation
- **Requirement:** Saved data must be a valid UTF-16 string less than 3 MiB (recommended < 512 KiB).
- **Source:** Google for Developers — YouTube Playables: Data Storage.
- **Implementation Approach:** 2048 Fusion state payload is < 1 KiB (board array, score, best score, status).
- **Verification Method:** Automated test calculating `new Blob([serializedData]).size` (< 1024 bytes).
- **Status:** PLANNED

---

## 5. Player Engagement & High Scores

### YTR-12: High Score Reporting (`sendScore`)
- **Requirement:** Report player score via `ytgame.engagement.sendScore({ value: number })`.
- **Source:** Google for Developers — YouTube Playables: Engagement API.
- **Implementation Approach:** When score or best score increases, call `ytgame.engagement.sendScore({ value: bestScore })`.
- **Verification Method:** Verify SDK payload emission with mock listener.
- **Status:** PLANNED

### YTR-13: System Language Detection (`getLanguage`)
- **Requirement:** Use `ytgame.system.getLanguage()` to detect locale rather than browser globals or saving locale to storage.
- **Source:** Google for Developers — YouTube Playables: System API.
- **Implementation Approach:** Query `ytgame.system.getLanguage()` at launch to format numbers (e.g. `1,024` vs `1.024`).
- **Verification Method:** Verify formatting with mock BCP-47 language tags (`en-US`, `de-DE`, `fr-FR`).
- **Status:** PLANNED

---

## 6. Package Size & Performance

### YTR-14: Initial Load Package Size (< 30 MiB)
- **Requirement:** The total initial bundle size downloaded before `gameReady()` must be under 30 MiB (recommended < 15 MiB).
- **Source:** Google for Developers — YouTube Playables: Technical Requirements.
- **Implementation Approach:** Pure TypeScript + CSS + Web Audio API synthesis. Zero external heavy graphics or sound files. Total bundle size will be **< 100 KiB** (well under 0.1 MiB)!
- **Verification Method:** Build size measurement (`dist/` directory size audit).
- **Status:** PLANNED

### YTR-15: Individual File Size (< 30 MiB, recommended < 512 KiB)
- **Requirement:** No single file within the uploaded package may exceed 30 MiB.
- **Source:** Google for Developers — YouTube Playables: Technical Requirements.
- **Implementation Approach:** JavaScript bundle chunking ensures no file exceeds 60 KiB.
- **Verification Method:** Automated file size check in build pipeline.
- **Status:** PLANNED

### YTR-16: Submission Archive (ZIP Format)
- **Requirement:** Game must be delivered as a single ZIP archive with `index.html` at the root.
- **Source:** Google for Developers — YouTube Playables: Submission Guide.
- **Implementation Approach:** Build script generates `dist/` and runs a zip packaging step producing `dist/2048-fusion-playables.zip`.
- **Verification Method:** Verify ZIP structure contains root `index.html` and assets.
- **Status:** PLANNED

---

## 7. Trust & Safety, Content, and Privacy Policies

### YTR-17: Content Appropriateness (General Audience 13+)
- **Requirement:** Complies with YouTube Community Guidelines; general audience; not "Made for Kids".
- **Source:** YouTube Community Guidelines & Playables Trust & Safety Policy.
- **Implementation Approach:** Clean, abstract puzzle game featuring mathematical number merges. No violence, vulgarity, or age-restricted content.
- **Verification Method:** Content policy self-audit.
- **Status:** VERIFIED (by design)

### YTR-18: No External Links or Custom EULAs
- **Requirement:** Games must not present external Terms of Service, EULAs, or hyperlinks leading outside the YouTube platform.
- **Source:** YouTube Playables Trust & Safety Policy.
- **Implementation Approach:** No external links (`<a>` tags pointing to external URLs are prohibited in the Playables build). Legal terms rely entirely on YouTube's platform agreements.
- **Verification Method:** Static grep search verifying no external hyperlinks in game code.
- **Status:** PLANNED

### YTR-19: Privacy & Zero Tracking
- **Requirement:** No collection of Personally Identifiable Information (PII), no third-party tracking or unauthorized analytics scripts.
- **Source:** Google Privacy Policy & YouTube Playables Policy.
- **Implementation Approach:** Zero tracking scripts, zero external network calls. Entirely self-contained.
- **Verification Method:** Network tab audit during full gameplay session.
- **Status:** PLANNED

### YTR-20: Originality & Intellectual Property
- **Requirement:** Independent implementation, original code, original visual assets, and original audio.
- **Source:** YouTube Playables IP Policy.
- **Implementation Approach:** Written from scratch by Dulsan Vasantharaj. Procedural Web Audio API sound synthesis. Custom CSS/Canvas visual styling.
- **Verification Method:** Source code originality audit and license declaration.
- **Status:** PLANNED
