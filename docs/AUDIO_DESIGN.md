# Audio Design Document — 2048 Fusion

> **Author:** Dulsan Vasantharaj
> **Version:** 1.0.0
> **Status:** Production

---

## 1. Design Philosophy

2048 Fusion's audio experience follows one governing principle:

> *The player should feel more engaged because of the audio, without feeling that the music is demanding their attention.*

This means:
- **Sound supports gameplay, never competes with it.**
- **Audio cues reinforce player actions** (slide, merge, undo, win, lose) with immediate, satisfying feedback.
- **Ambient music creates atmosphere** without being memorable enough to become repetitive or distracting.
- **Every sound is optional.** Both music and SFX can be independently toggled off. The game functions identically without audio.

---

## 2. Technical Architecture

### 2.1 Synthesis Engine

All audio is **100% procedurally generated** using the Web Audio API. There are:
- **Zero external audio files** (no `.mp3`, `.wav`, `.ogg`, or `.aac` assets)
- **Zero third-party audio libraries**
- **Zero licensing obligations** (all sounds are original, generated at runtime)

This eliminates all copyright concerns and keeps the bundle size at zero bytes of audio data.

### 2.2 Gain Staging (Signal Flow)

```
OscillatorNode(s) → per-sound GainNode → sfxGain (submix) ─┐
                                                             ├→ masterGain → AudioContext.destination
AmbientOsc(s) → ambientFilter → musicGain (submix) ────────┘
```

| Node | Purpose | Default Gain |
|------|---------|-------------|
| `masterGain` | Global volume, platform mute override | 0.60 |
| `sfxGain` | SFX submix, user SFX toggle | 0.65 (or 0) |
| `musicGain` | Music submix, user music toggle | 0.45 (or 0) |
| Per-sound `GainNode` | Individual envelope shaping | Varies (0.08–0.30) |

### 2.3 AudioContext Lifecycle & Unlocking

1. **Creation:** Deferred until first user gesture (`pointerdown`, `keydown`, `touchstart`, or first move).
2. **Unlock & Auto-Resume:** `AudioContext.resume()` called on gesture and awaited to immediately kick off procedural music.
3. **Environment Resilience:** When running outside active YouTube Playables containers (e.g. standalone web, localhost, Vercel), mock/stub platform callbacks are handled gracefully without spurious mute overrides.
4. **Music Ducking:** During high-energy tile merges and milestone fanfares, `musicGain` dips by ~25% for 400ms and smoothly restores, keeping SFX clear and punchy.
5. **Suspend:** `AudioContext.suspend()` on platform pause (YouTube Playables `onPause`).
6. **Resume:** `AudioContext.resume()` on platform resume, if user hasn't muted.

---

## 3. Sound Palette

### 3.1 Sound Effects (SFX)

| Sound | Trigger | Waveform | Duration | Description |
|-------|---------|----------|----------|-------------|
| **Move** | Tile slide | Sine sweep 180→110 Hz | 80ms | Soft downward whoosh |
| **Merge** | Two tiles fuse | Triangle + sine harmonic | 200ms | Pitched chime scaled to tile value (C4 to C6) with octave overtone |
| **Merge Combo** | Multiple merges in one move | Triangle + shimmer | 220ms | Semitone-escalated pitch per combo; cascade arpeggio at combo ≥ 4 |
| **Milestone** | Score threshold crossed | Ascending major triad | 240–400ms | Celebratory arpeggio, more notes at higher milestones |
| **Win Fanfare** | Reaching 2048 tile | Sine arpeggio (C5-E5-G5-C6) | 400ms | Triumphant ascending major |
| **Game Over** | No moves remaining | Sine descending (A4-G4-E4-C4) | 480ms | Gentle descending minor tones |
| **New Game** | Game reset | Sine sweep 330→660 Hz | 160ms | Bright ascending two-tone |
| **Undo** | Move undone | Sine sweep 550→300 Hz | 130ms | Soft descending "rewind" |
| **Button Click** | UI interaction | Sine sweep 1000→400 Hz | 40ms | Quick percussive tap |

### 3.2 Merge Pitch Mapping

Merge tones follow a harmonic progression through the C major / pentatonic scale:

| Tile Value | Frequency | Note |
|------------|-----------|------|
| 4 | 261.63 Hz | C4 |
| 8 | 293.66 Hz | D4 |
| 16 | 329.63 Hz | E4 |
| 32 | 392.00 Hz | G4 |
| 64 | 440.00 Hz | A4 |
| 128 | 493.88 Hz | B4 |
| 256 | 523.25 Hz | C5 |
| 512 | 659.25 Hz | E5 |
| 1024 | 783.99 Hz | G5 |
| 2048 | 1046.50 Hz | C6 |

### 3.3 Ambient Soundtrack & Procedural Melody

The background music is a **cyber-lounge procedural soundtrack** blending lush chord pads with soft melodic bell chimes.

**Implementation:**
- **Lush Chord Pad:** 4 oscillators (alternating sine/triangle) forming rich 7th/9th chords across octaves 3 & 4 (Cmaj7, Am7, Fmaj7, G, Em7, Dm7)
- **Low-pass Filter:** Cutoff at ~1400 Hz with breathing LFO (0.1 Hz, ±300 Hz depth)
- **Procedural Chill Bells:** Every 2.0–3.5s, a soft pentatonic chime (C4–E5) plays with 1.2s bell-like decay, giving an immediately recognizable, calming melodic soundtrack
- **Smooth Crossfading:** 2.5s overlap between chord changes (transitioning every 7–10s)
- **Analog Warmth:** Slight random detuning (±6 cents) per pad voice
- **Chord progression:** 7 chords from C pentatonic, changing every 8–12 seconds with 2-second crossfade
- **Volume:** ~15% of master (sits well under SFX)

**Chord Palette:**

| Index | Notes | Quality |
|-------|-------|---------|
| 0 | C3, E3, G3 | C major |
| 1 | D3, G3, A3 | Dsus4 |
| 2 | E3, G3, C4 | Em/C |
| 3 | G3, C4, E4 | C (1st inversion) |
| 4 | A3, C4, E4 | Am |
| 5 | G3, B3, E4 | Em (1st inversion) |
| 6 | C3, G3, C4 | C5 power |

---

## 4. Engagement System

### 4.1 Combo Merges

When a single move produces multiple merges:
- **combo = 1:** Standard merge sound
- **combo = 2–3:** Pitch elevated by semitones + high-frequency shimmer overlay
- **combo ≥ 4:** Rapid ascending cascade arpeggio (4 notes) overlaid on elevated merge

### 4.2 Score Milestones

Celebratory fanfares trigger at these score thresholds (once per threshold per game):

| Milestone | Notes in Fanfare |
|-----------|-----------------|
| 500 | 3 notes (C5, E5, G5) |
| 1,000 | 3 notes |
| 2,500 | 4 notes (+C6) |
| 5,000 | 4 notes (+C6) |
| 10,000 | 5 notes (+C6, E6) |
| 25,000 | 5 notes |
| 50,000 | 5 notes |

Milestones reset on new game.

---

## 5. Platform Integration

### 5.1 YouTube Playables Compliance

| Requirement | Implementation |
|-------------|---------------|
| Respect platform mute | `ytgame.system.isAudioEnabled()` checked on init; `onAudioEnabledChange()` callback updates `platformAudioEnabled` flag → master gain to 0 |
| Pause audio on platform pause | `ytgame.system.onPause()` → `AudioContext.suspend()` |
| Resume audio on platform resume | `ytgame.system.onResume()` → `AudioContext.resume()` (only if user hasn't muted) |
| No autoplay audio | AudioContext created only on user gesture |
| Audio doesn't block interaction | All synthesis is non-blocking (Web Audio scheduling) |

### 5.2 Standalone Web Mode

When `window.ytgame` is not present:
- `platformAudioEnabled` defaults to `true`
- Page Visibility API (`visibilitychange`) triggers pause/resume
- User preferences persist via `localStorage`

---

## 6. Accessibility

- **Independent toggles:** Music and SFX can be disabled separately
- **No audio dependency:** The game is fully playable without any audio
- **Screen reader compatibility:** ARIA live region announcements are not affected by audio settings
- **Reduced Motion:** Does not affect audio (these are independent accessibility axes)
- **No flashing or rhythmic patterns:** Audio does not sync to visual strobing

---

## 7. Licensing

| Component | License | Source |
|-----------|---------|--------|
| All sound effects | Original work | Procedurally generated via Web Audio API |
| Ambient music | Original work | Procedurally generated via Web Audio API |
| Web Audio API | Built-in browser API | No dependency |

**Total third-party audio assets: 0**
**Total audio file size: 0 bytes**
