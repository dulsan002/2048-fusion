# 2048 Fusion — Third-Party Licenses & Intellectual Property Inventory
**Author / Developer:** Dulsan Vasantharaj  
**Project:** 2048 Fusion  
**Audit Date:** 2026-09-23  

---

## 1. Overview & Intellectual Property Declaration

All source code, visual design, game styling, and procedural audio synthesis in **2048 Fusion** were created independently by **Dulsan Vasantharaj**.

To guarantee 100% legal compliance and eliminate copyright liabilities for YouTube Playables distribution:
1. **Zero Third-Party Audio Files:** No pre-recorded MP3, WAV, or OGG files (from NCS, audio libraries, or third-party creators) are included. All sound effects are generated procedurally via the native browser Web Audio API oscillator nodes.
2. **Zero Proprietary Art:** All graphics are rendered natively using CSS geometric styles, gradients, and custom SVG icons.
3. **Open Source Development Stack:** Only trusted, standard MIT/Apache-2.0 licensed development tooling (TypeScript, Vite, Vitest) is used during compilation.

---

## 2. Audio Assets & Licensing

| Asset Category | Method | License / Origin | Attribution Required? |
| :--- | :--- | :--- | :---: |
| **Tile Move Sound** | Procedural Sine Sweep (180 Hz $\rightarrow$ 110 Hz) | Original procedural Web Audio synthesis by Dulsan Vasantharaj | No |
| **Tile Merge Chime** | Procedural Triangle Oscillators (Harmonic Pitch Scale) | Original procedural Web Audio synthesis by Dulsan Vasantharaj | No |
| **Win Fanfare** | Procedural Major Arpeggio (C5 $\rightarrow$ C6) | Original procedural Web Audio synthesis by Dulsan Vasantharaj | No |
| **Game Over Sound** | Procedural Descending Minor Sequence | Original procedural Web Audio synthesis by Dulsan Vasantharaj | No |
| **Button Click** | Procedural Transient Tap (1000 Hz $\rightarrow$ 400 Hz) | Original procedural Web Audio synthesis by Dulsan Vasantharaj | No |

---

## 3. Development Dependencies Inventory

The following open-source packages are used exclusively as development dependencies for building, type-checking, and testing:

| Package | Version | License | Usage |
| :--- | :--- | :---: | :--- |
| **typescript** | `^5.5.4` | Apache-2.0 | Static typing and compiler |
| **vite** | `^8.3.0` | MIT | Bundler and development server |
| **vitest** | `^5.0.1` | MIT | Unit and integration test runner |
| **esbuild** | `^0.25.0` | MIT | Fast JavaScript minifier and bundler |
| **jsdom** | `^25.0.0` | MIT | Headless DOM environment for testing |
| **@types/node** | `^22.5.4` | MIT | TypeScript definitions for Node.js |

None of the development dependencies are distributed as third-party runtime dependencies in the final production bundle.
