# Contributing to 2048 Fusion

Thank you for your interest in contributing to **2048 Fusion**!

This project is built under strict commercial-grade quality, performance, and YouTube Playables certification standards.

---

## 1. Development Principles

1. **Zero External Runtime Dependencies:** Keep the client bundle under 50 KiB. Do not introduce runtime libraries without architectural justification.
2. **Procedural Sound Only:** Do not commit pre-recorded audio files. All sound effects must be procedurally generated via Web Audio API oscillators.
3. **Deterministic Core Logic:** Keep `src/core/` pure and decoupled from DOM or browser globals.
4. **100% Test Passing:** All pull requests must pass the automated Vitest test suite and TypeScript strict type-checking.

---

## 2. Local Setup & Testing

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run test suite
npm run test:run

# Strict typecheck
npm run typecheck

# Build and package Playables ZIP
npm run build
npm run package:playables
```

---

## 3. Pull Request Guidelines

- Ensure your branch is rebased on `main`.
- Document any new features or bug fixes in `CHANGELOG.md` and `docs/BUGS.md`.
- Verify that `npm run typecheck` and `npm run test:run` report 0 errors.
- Confirm package size remains within Playables constraints.
