# 2048 Fusion — Accessibility Specification & Audit
**Accessibility Lead:** Dulsan Vasantharaj  
**Standard:** Web Content Accessibility Guidelines (WCAG) 2.1 Level AA  
**Evaluation Status:** PASS  

---

## 1. Executive Summary

2048 Fusion is engineered to ensure players with diverse visual, auditory, motor, and cognitive abilities can enjoy the game without barriers. Accessibility features are built into the core presentation layer rather than retrofitted.

---

## 2. Accessibility Features Implemented

### 2.1 Screen Reader & Assistive Technology Support
- **Dedicated Live Region:** A hidden ARIA live region (`#a11y-live-region`, `aria-live="polite"`, `aria-atomic="true"`) announces:
  - Movement and tile merges: e.g. `"Merged tiles for plus 8 points. Highest tile: 64."`
  - Score updates and high score achievements.
  - Game win condition: `"Congratulations! You reached the 2048 Fusion Core!"`
  - Game over condition: `"Game over. No more moves available. Final score: 1024."`
  - Undo actions: `"Move undone."`
- **Tile Elements:** Decorative inner tiles use `aria-hidden="true"` to prevent screen reader focus redundancy while the live region delivers concise, meaningful updates.

### 2.2 Semantic HTML & Landmarks
- Structured using semantic HTML5 elements: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`.
- Clear, descriptive `aria-label` attributes on interactive icon buttons (`#btn-sound`, `#btn-help`, `#btn-settings`, `#btn-new-game`, `#btn-undo`).
- Modal dialogs use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and dynamic `aria-hidden`.

### 2.3 Keyboard Navigation & Focus Management
- **Complete Keyboard Control:**
  - Game moves: Arrow keys (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) and WASD keys.
  - Actions: `R` (Restart), `U` (Undo), `P` / `Escape` (Pause / Close modal).
- **Focus Trapping:** When a modal is open, focus is trapped within the dialog using `A11yAnnouncer.trapFocus()`. Pressing `Escape` or clicking outside dismisses the dialog.
- **Visible Focus Rings:** `:focus-visible` styling provides a high-contrast cyan outline (`outline: 2px solid #00f0ff`, `outline-offset: 2px`) for keyboard tab navigation.

### 2.4 Color Contrast & High Contrast Mode
- **Standard Palette:** All text and tile values meet or exceed the WCAG 2.1 AA 4.5:1 contrast ratio.
- **High Contrast Mode:** An accessible toggle switch in Settings activates high-contrast styling:
  - Deep black backgrounds (`#000000`)
  - Crisp solid 1px/2px pure white borders on all tiles, buttons, and dialogs
  - Pure white typography (`#ffffff`)

### 2.5 Non-Color-Only Information
- Tile hierarchy is communicated through **bold numerals** and sizing hierarchy, not color alone.
- Tiles increase in text font weight, size scaling, and border luminescence.
- Audio cues provide acoustic confirmation of merges with rising harmonic pitches.

### 2.6 Motor & Touch Target Sizing
- All interactive touch targets (buttons, modal actions, switches) meet the minimum $44 \times 44$ pixel touch area recommended by WCAG 2.5.5 and mobile platforms.
- `touch-action: none` prevents accidental page scrolling or elastic bounces during active swipe gestures.

### 2.7 Motion Sensitivity (`prefers-reduced-motion`)
- Automatically detects user preference via `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- Includes a manual in-game toggle in the Settings modal.
- When enabled:
  - Tile slide transitions (`transform`) are made instantaneous (0ms).
  - Spawn pop and merge scale animations are disabled.
  - Board shake animation on invalid moves is disabled.

---

## 3. WCAG 2.1 AA Compliance Checklist

| Success Criterion | Level | Description | Implementation in 2048 Fusion | Status |
| :--- | :---: | :--- | :--- | :---: |
| **1.1.1 Non-text Content** | A | Controls have text alternatives | All icon buttons have explicit `aria-label` | **PASS** |
| **1.3.1 Info and Relationships** | A | Information structure is semantic | Semantic HTML5 structure and landmark roles | **PASS** |
| **1.4.3 Contrast (Minimum)** | AA | Contrast ratio $\ge 4.5:1$ for text | All text values verified $\ge 4.5:1$; High Contrast mode available | **PASS** |
| **2.1.1 Keyboard** | A | All functionality operable via keyboard | Arrow keys, WASD, R, U, Escape, Tab | **PASS** |
| **2.1.2 No Keyboard Trap** | A | Focus can be moved away from elements | Escape or Tab cycles cleanly | **PASS** |
| **2.2.2 Pause, Stop, Hide** | A | Moving content can be paused/stopped | Pause contract hooks into YouTube SDK; animations cease | **PASS** |
| **2.3.3 Animation from Interactions** | AAA | Motion can be disabled | `prefers-reduced-motion` and manual toggle | **PASS** |
| **2.4.7 Focus Visible** | AA | Keyboard focus indicator is visible | 2px solid cyan `:focus-visible` ring | **PASS** |
| **2.5.5 Target Size** | AAA | Touch targets $\ge 44 \times 44\text{px}$ | All buttons $\ge 44\text{px}$ touch area | **PASS** |
| **4.1.2 Name, Role, Value** | A | Standard accessibility attributes | Semantic roles, `aria-modal`, `aria-live` | **PASS** |
