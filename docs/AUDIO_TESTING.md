# Audio Testing Plan — 2048 Fusion

> **Author:** Dulsan Vasantharaj
> **Version:** 1.0.0

---

## 1. Automated Unit Tests

Run via: `npx vitest run`

### Test File: `tests/unit/AudioEngine.test.ts`

| Test Category | Tests | Coverage |
|---------------|-------|----------|
| State Management | 5 | SFX/music independent toggle, backward compat, isAudioAllowed |
| Milestone Detection | 4 | First trigger, no retrigger, progression, reset |
| Graceful Degradation | 9 | All play methods safe without AudioContext |
| Audio Unlock | 2 | Context creation, no duplicate creation |
| Combo Merge | 3 | Delegation (combo=1), escalation (combo=2), cascade (combo>3) |
| **Total** | **23** | |

---

## 2. Listening Test Checklist

Perform manually by running the dev server (`npm run dev`) and playing for 3+ minutes.

### 2.1 Fatigue Assessment

| # | Check | Pass Criteria |
|---|-------|--------------|
| L1 | Play continuously for 5 minutes | No audio element feels repetitive or annoying |
| L2 | Perform 20+ rapid moves | Move sound doesn't build up uncomfortably |
| L3 | Achieve multiple merges | Merge tones feel satisfying, not piercing |
| L4 | Leave game idle for 2 minutes | Ambient music evolves gently, doesn't loop obviously |
| L5 | Reach score > 1000 | Milestone fanfare feels rewarding, not startling |

### 2.2 Mixing & Masking

| # | Check | Pass Criteria |
|---|-------|--------------|
| M1 | Move with merge on first action | Move whoosh doesn't mask merge chime |
| M2 | Trigger milestone during merge | Milestone delayed 200ms, doesn't clash with merge |
| M3 | Win fanfare over ambient music | Fanfare clearly audible above pad |
| M4 | Game over over ambient music | Descending tones clearly audible |
| M5 | SFX with music at full volume | SFX cuts through music without effort |

### 2.3 Audio Artifacts

| # | Check | Pass Criteria |
|---|-------|--------------|
| A1 | First sound after page load | No pop or click on audio unlock |
| A2 | Toggle SFX off and on rapidly | No clicks or distortion |
| A3 | Toggle music off and on | Smooth fade-out (1s) and restart |
| A4 | Tab away and return | Audio resumes cleanly without artifacts |
| A5 | Ambient chord transition | Crossfade is smooth, no gap or overlap glitch |

---

## 3. Platform Compliance Tests

### 3.1 YouTube Playables Lifecycle

| # | Test | Expected Behavior |
|---|------|-------------------|
| P1 | Simulate `onPause` | AudioContext.suspend() called, all audio stops immediately |
| P2 | Simulate `onResume` | AudioContext.resume() called, audio resumes if user enabled |
| P3 | Simulate `onAudioEnabledChange(false)` | masterGain → 0, ambient scheduling pauses |
| P4 | Simulate `onAudioEnabledChange(true)` | masterGain → 0.35, ambient scheduling resumes |
| P5 | No audio before user gesture | AudioContext not created until first pointerdown/keydown/touchstart |

### 3.2 Standalone Web Mode

| # | Test | Expected Behavior |
|---|------|-------------------|
| S1 | Load without `window.ytgame` | No errors, audio fully functional |
| S2 | Tab to background (Page Visibility) | AudioContext.suspend() via visibilitychange |
| S3 | Return to tab | AudioContext.resume() |

---

## 4. Browser Compatibility Matrix

| Browser | Version | Touch Unlock | Keyboard Unlock | Ambient Music | SFX |
|---------|---------|-------------|----------------|---------------|-----|
| Chrome | 120+ | ✅ Required | ✅ Required | ✅ | ✅ |
| Firefox | 120+ | ✅ Required | ✅ Required | ✅ | ✅ |
| Safari | 17+ | ✅ Required | ✅ Required | ✅ | ✅ |
| Edge | 120+ | ✅ Required | ✅ Required | ✅ | ✅ |
| Samsung Internet | 24+ | ✅ Required | N/A | ✅ | ✅ |

> **Note:** All modern browsers require a user gesture before `AudioContext` can start playing. The AudioEngine's `setupUnlockListeners()` handles this automatically.

---

## 5. Settings Persistence Tests

| # | Test | Expected Behavior |
|---|------|-------------------|
| SP1 | Disable music, refresh page | Music toggle is OFF, ambient does not start |
| SP2 | Disable SFX, refresh page | SFX toggle is OFF, sound icon shows muted |
| SP3 | Disable both, refresh page | Both toggles OFF, no audio at all |
| SP4 | Enable both, refresh page | Both toggles ON, full audio experience |
| SP5 | Start new game after toggling | Settings preserved across new game |

---

## 6. Mobile-Specific Tests

| # | Test | Expected Behavior |
|---|------|-------------------|
| MB1 | First touch on mobile | Audio unlocks, ambient starts smoothly |
| MB2 | Swipe to move tiles | Move and merge sounds play correctly |
| MB3 | Switch apps and return | Audio resumes cleanly |
| MB4 | Low-power mode (iOS) | Audio may be throttled but no crashes |
| MB5 | Phone call interruption | Audio pauses, resumes after call |

---

## 7. Performance Benchmarks

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Audio latency (SFX) | < 20ms | Chrome DevTools Performance tab |
| Ambient CPU usage | < 2% | Chrome Task Manager |
| Memory (AudioContext) | < 5 MB | Chrome DevTools Memory |
| Oscillator node count | ≤ 12 active | Manual count during peak |
