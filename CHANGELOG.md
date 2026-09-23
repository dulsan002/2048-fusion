# Changelog

All notable changes to **2048 Fusion** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc] - 2026-09-23

### Added
- **Core 2048 Engine:** Pure TypeScript deterministic puzzle engine supporting standard 4×4 board, random tile spawning (90% 2, 10% 4), directional moves, score calculation, 2048 win detection, and game over detection.
- **Anti-Double-Merge Protection:** Verified single merge per tile per turn with comprehensive test coverage.
- **YouTube Playables Integration:**
  - Official SDK v1 integration (`window.ytgame`).
  - `firstFrameReady()` and `gameReady()` lifecycle signals.
  - Strict Pause Contract compliance (`onPause`, `onResume`) freezing input, audio, and animations.
  - Platform-priority audio synchronization (`isAudioEnabled`, `onAudioEnabledChange`).
  - Cloud save persistence (`saveData`, `loadData`) with schema corruption recovery.
  - Leaderboard high-score reporting (`ytgame.engagement.sendScore`).
- **Procedural Web Audio Engine:** Zero-asset procedural oscillator sound effects for move whoosh, rising harmonic merge chimes, score pings, win fanfare, and descending game over chords.
- **Unified Input System:** Arrow keys, WASD, touch swipe with direction vector detection and gesture lock, and mouse drag.
- **Modern Cyber-Luminescent UI/UX:** Dark obsidian theme (`#0b0e14`) with custom glowing jewel-toned tile luminescence, glassmorphic modals, floating `+X` score badges, and board shake feedback.
- **Accessibility (WCAG 2.1 AA):** ARIA live announcer (`#a11y-live-region`), modal focus trapping, high contrast mode, and reduced motion overrides (`prefers-reduced-motion`).
- **Testing & Packaging:**
  - 29 automated unit and integration tests passing with 100% core coverage.
  - Automated YouTube Playables submission packager (`scripts/package-playables.js`) producing `dist/2048-fusion-playables.zip` (15.15 KiB).
  - Vercel configuration (`vercel.json`) with SPA routing and security headers.
  - Comprehensive documentation suite across architecture, design, testing, performance, accessibility, security, and certification readiness.
