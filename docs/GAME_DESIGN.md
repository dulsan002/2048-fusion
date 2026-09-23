# 2048 Fusion — UX/UI Design & Game Design Specification
**Author / Developer:** Dulsan Vasantharaj  
**Role:** Senior UX/UI Designer & Game Feel Lead  
**Project:** 2048 Fusion  
**Visual Style:** Modern Cyber-Luminescent "Fusion" Theme  

---

## 1. Visual Identity & Brand Direction

### 1.1 Brand Concept
"Fusion" evokes high-energy nuclear fusion and luminescent energy cores. Rather than flat beige paper tones (standard generic 2048 clones), **2048 Fusion** adopts a deep, sleek dark obsidian backdrop (`#0d1117`) paired with vibrant jewel-toned luminescent tiles that brighten and gain energetic glow as they fuse towards the 2048 Fusion Core.

### 1.2 Originality & IP Clearances
- **Zero copyrighted art:** All visual elements are rendered using pure CSS geometry, radial glows, CSS filters, and custom SVG iconography.
- **Original title & styling:** Distinctive "Fusion" logo treatment with gradient typography.
- **Developer credit:** Dulsan Vasantharaj prominently displayed in credits and game info modal.

---

## 2. Color Palette & Tile Design System

### 2.1 Base Theme Palette
- **Background Deep:** `#0b0e14` (Deep space obsidian)
- **Board Container:** `#151b26` (Frosted obsidian surface with subtle inner shadow)
- **Cell Slot Empty:** `#1c2433` (Recessed empty cell with border-radius: 8px)
- **Primary Accent / Glow:** `#00f0ff` (Electric cyan)
- **Text Main:** `#f0f6fc` (Crisp white)
- **Text Muted:** `#8b949e` (Cool slate gray)
- **Surface Elevation (Cards/Modals):** `#161c28` with glassmorphic `backdrop-filter: blur(12px)` and 1px border `#30363d`.

### 2.2 Tile Luminescence Scale
Each tile tier has an energetic color identity with WCAG AA compliant text contrast:

| Tile Value | Background Gradient | Border / Glow | Font Color | Theme Identity |
| :---: | :--- | :--- | :---: | :--- |
| **2** | `#1e293b` $\rightarrow$ `#334155` | `#475569` | `#f1f5f9` | Stardust Slate |
| **4** | `#0f3b46` $\rightarrow$ `#155e75` | `#0891b2` | `#ecfeff` | Cyan Spark |
| **8** | `#064e3b` $\rightarrow$ `#047857` | `#10b981` | `#ecfdf5` | Emerald Catalyst |
| **16** | `#713f12` $\rightarrow$ `#b45309` | `#f59e0b` | `#fffbeb` | Amber Ignition |
| **32** | `#7c2d12` $\rightarrow$ `#c2410c` | `#f97316` | `#fff7ed` | Solar Flare |
| **64** | `#831843` $\rightarrow$ `#be185d` | `#f43f5e` | `#fff1f2` | Ruby Pulsar |
| **128** | `#4c1d95` $\rightarrow$ `#6d28d9` | `#8b5cf6` | `#f5f3ff` | Amethyst Surge |
| **256** | `#581c87` $\rightarrow$ `#7e22ce` | `#a855f7` | `#faf5ff` | Violet Quasar |
| **512** | `#1e1b4b` $\rightarrow$ `#3730a3` | `#6366f1` | `#e0e7ff` | Cobalt Hyperdrive |
| **1024** | `#78350f` $\rightarrow$ `#d97706` | `#fbbf24` (Glow) | `#fffbeb` | Solar Corona |
| **2048** | `linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)` | `#fde047` (Pulse) | `#ffffff` | **Fusion Core** (Supernova) |
| **4096+** | `linear-gradient(135deg, #00f0ff, #7928ca, #ff0080)` | Dynamic chromatic | `#ffffff` | Singularity |

---

## 3. Typography & Spacing Hierarchy

### 3.1 Typography
- **Font Stack:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"`
  - Zero external web font requests (100% offline, zero network latency, zero Playables CSP blocking).
- **Weights & Sizes:**
  - Game Title: `28px` / Bold 800, letter-spacing `-0.5px`
  - Score Labels: `11px` / Medium 600, uppercase, letter-spacing `1px`
  - Score Values: `20px` / Extra-Bold 800
  - Tile Numbers:
    - 1-2 digits (2 - 64): `clamp(24px, 6vw, 36px)` / Extra-Bold 800
    - 3 digits (128 - 512): `clamp(20px, 5vw, 30px)` / Extra-Bold 800
    - 4 digits (1024 - 8192): `clamp(16px, 4vw, 24px)` / Bold 800

### 3.2 Spacing & Responsive Grid
- Base grid unit: `8px`.
- Board layout: 4×4 grid with `grid-gap: clamp(8px, 2vw, 12px)`.
- Board container padding: `clamp(8px, 2vw, 14px)`.
- Board size: Max `460px` on desktop; `calc(100vw - 32px)` on mobile screens.

---

## 4. UI Components & Layout Architecture

### 4.1 Header & Control Bar
- **Top Row:**
  - Left: Logo `2048 FUSION` with glowing core icon.
  - Right: High-Score & Current Score pill containers with glassmorphic backgrounds.
- **Action Toolbar:**
  - `New Game` button (primary high-contrast button).
  - `Undo` button (accessible single-step rollback).
  - `Sound Toggle` button (speaker icon indicating muted/active).
  - `How to Play / Info` button (modal trigger).

### 4.2 Game Board Container
- Fixed 1:1 aspect ratio container.
- 16 background cell slots statically rendered in CSS Grid.
- Tile container positioned absolutely over the grid for smooth hardware-accelerated translation.

### 4.3 Dialogs & Modals
1. **Game Over Modal:**
   - Darkened translucent backdrop overlay (`rgba(11, 14, 20, 0.85)`).
   - "Fusion Depleted" headline with score summary and "Try Again" button.
2. **Win Modal (2048 Reached):**
   - Radiant particle glow animation.
   - "Fusion Core Achieved!" headline.
   - "Keep Playing" button (continues to 4096+) & "New Game" button.
3. **How to Play Modal:**
   - Visual movement diagram: Swipe or use Arrow keys to merge identical energy cores.
   - Explains anti-double-merge rule and scoring mechanics.
4. **Settings Modal:**
   - Sound FX toggle.
   - High-contrast toggle.
   - Reduced motion toggle.
   - Developer credit: Dulsan Vasantharaj.

---

## 5. Animation Language & Game Feel

- **Tile Slide:** `100ms ease-out` using `transform: translate3d(x, y, 0)` for silky 60/120 FPS performance.
- **Tile Spawn:** `scale(0)` to `scale(1)` spring pop over `120ms`.
- **Tile Merge:** `scale(1)` $\rightarrow$ `scale(1.18)` $\rightarrow$ `scale(1)` pulse over `140ms`.
- **Score Pop:** Floating badge `+X` fading upward and fading out over `400ms`.
- **Reduced Motion:** When `prefers-reduced-motion: reduce` is detected or toggled:
  - Slide duration is set to `0ms` (instant position update).
  - Scale pop animations are disabled.
