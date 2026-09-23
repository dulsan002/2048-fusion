# 2048 Fusion — Quality Assurance & Testing Report
**QA Lead / Test Engineer:** Dulsan Vasantharaj  
**Project:** 2048 Fusion  
**Test Suite:** Vitest v5.0.1, JSDOM, Playwright / Headless Chromium Subagent  
**Test Execution Date:** 2026-09-23  

---

## 1. Automated Test Suite Summary

```text
Test Suites: 4 passed, 4 total
Tests:       29 passed, 29 total
Duration:    414ms
Coverage:    100% Core Game Engine & anti-double-merge rules
```

| Test Suite | Spec File | Tests Passed | Status |
| :--- | :--- | :---: | :---: |
| **Core Board Matrix** | `tests/unit/Board.test.ts` | 8 / 8 | **PASS** |
| **Engine & Anti-Double-Merge** | `tests/unit/Engine.test.ts` | 14 / 14 | **PASS** |
| **Storage & Corruption Recovery** | `tests/unit/Storage.test.ts` | 2 / 2 | **PASS** |
| **YouTube Playables Integration** | `tests/unit/PlayablesIntegration.test.ts` | 5 / 5 | **PASS** |

---

## 2. Core Game Logic Verification

### 2.1 Movement & Anti-Double-Merge Rules
- **Rule 1 (`[2, 2, 2, 2]` moving LEFT):** Tested and verified that result is `[4, 4, 0, 0]` with +8 score increment. Verified it does **not** double-merge into `[8, 0, 0, 0]`.
- **Rule 2 (`[2, 2, 2, 0]` moving LEFT):** Tested and verified that leftmost two tiles merge: result `[4, 2, 0, 0]` with +4 score.
- **Rule 3 (`[0, 2, 2, 2]` moving RIGHT):** Tested and verified that rightmost two tiles merge: result `[0, 0, 2, 4]` with +4 score.
- **Rule 4 (`[4, 2, 2, 0]` moving LEFT):** Tested and verified result `[4, 4, 0, 0]` with +4 score.
- **Rule 5 (`[2, 0, 2, 4]` moving LEFT):** Tested and verified result `[4, 4, 0, 0]` with +4 score.

### 2.2 Board Boundaries & Edge Movements
- Shifting against walls when blocked generates `moved: false`, no score change, and zero new tiles spawned.
- All 4 cardinal directions (`UP`, `DOWN`, `LEFT`, `RIGHT`) tested across vertical and horizontal alignments.

### 2.3 Win & Loss Conditions
- **2048 Win:** Verified that creating a 2048 tile sets `isWon: true` and fires the win modal.
- **Continue Playing:** Verified that calling `continueGame()` allows gameplay towards 4096+ without re-triggering the win flag on subsequent moves.
- **Game Over:** Verified that when all 16 cells are filled with non-matching tiles, `canMoveAny()` returns false and `isGameOver: true` is triggered.

---

## 3. Real Browser Execution & E2E Validation

Conducted live browser testing on Chromium via automated browser agent on `http://127.0.0.1:4173/`:

| Verification Step | Target Element | Action | Observed Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :---: |
| **Initial Load** | `#app`, `#game-board` | Page navigation | Canvas/Grid rendered, 2 starting tiles placed, score 0 | **PASS** |
| **Keyboard Input** | `window` | ArrowUp, ArrowLeft, ArrowDown, ArrowRight | Tiles slide, merge, score updates to 8 | **PASS** |
| **Screen Reader Announcement** | `#a11y-live-region` | Real-time DOM query | Text: `"Merged tiles for plus 4 points. Highest tile: 4."` | **PASS** |
| **Undo System** | `#btn-undo` | Click | Restores previous board state, updates score, resets undo button | **PASS** |
| **How to Play Modal** | `#btn-help` | Click | Dialog opens, focus trapped, rules displayed, closes on 'Got It' | **PASS** |
| **Settings Modal** | `#btn-settings` | Click | Dialog opens, sound/contrast/motion switches accessible, closes | **PASS** |
| **Touch / Swipe Gestures** | `#game-board` | Pointer drag with >30px delta | Recognizes swipe direction vector accurately, single move lock | **PASS** |
| **Console Errors** | Browser DevTools | Console inspection | Exactly 0 errors or unhandled warnings | **PASS** |

---

## 4. Responsive Viewport Matrix

| Device Profile | Dimensions | Aspect Ratio | Layout Observations | Result |
| :--- | :--- | :---: | :--- | :---: |
| **iPhone SE** | 375 × 667 | 9:16 | Board fits full width (`calc(100vw - 32px)`), zero horizontal scrolling, buttons accessible | **PASS** |
| **iPhone 14 / Pixel 7** | 390 × 844 | 19.5:9 | Centered vertical layout, balanced spacing, touch targets $\ge 44\text{px}$ | **PASS** |
| **iPad Mini / Tablet** | 768 × 1024 | 3:4 | Board constrained to 460px max-width, elevated drop shadow, keyboard hints visible | **PASS** |
| **Desktop Full HD** | 1920 × 1080 | 16:9 | Crisp typography, keyboard controls active, centered application card | **PASS** |

---

## 5. Storage & Persistence Testing

- **Clean Launch:** Initial state creates 2 tiles, zero score.
- **Page Reload:** Reloading page restores exact tile positions, score, and high score.
- **Corrupted Storage Injected:** `localStorage.setItem('2048_fusion_game_state', '{bad json')`:
  - Verified game gracefully catches error, logs a clean warning, and starts a fresh valid game.
  - Zero crashes or blank screens.
- **Private Browsing / Quota Exceeded:** Writes wrapped in `try/catch` ensuring gameplay remains uninterrupted if browser denies storage access.

---

## 6. YouTube Playables Integration Testing

- **`firstFrameReady()`:** Called on DOM paint before any delay.
- **`gameReady()`:** Called only after board initialization and state restoration.
- **`onPause()`:** Verified that input processing disables immediately.
- **`onResume()`:** Verified that input unlocks without firing buffered strokes.
- **`isAudioEnabled()` / `onAudioEnabledChange()`:** Verified volume master gain clamps to 0 immediately on platform mute.
- **`sendScore()`:** Verified score transmission to platform engagement API.
