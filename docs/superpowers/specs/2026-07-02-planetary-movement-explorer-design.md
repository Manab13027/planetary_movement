# Planetary Movement Explorer — Design

## Purpose

A narrated, voice-interactive 3D desktop app that teaches 11-13 year olds how Earth's
motion causes day/night and seasons, how that connects to climate and weather, and how
tsunamis are a *different* phenomenon (plate tectonics, not planetary motion) — a common
misconception this app explicitly corrects.

Audience: kids aged 11-13. One depth track (real vocabulary: axis, orbit, tilt, tectonic
plates — explained simply, not dumbed down).

Platform: standalone desktop app, self-contained installer, must run independently on
Windows (and macOS). Internet required only for the live voice Q&A feature; narration and
3D visuals work offline.

## Architecture

```
Electron Shell (Windows .exe / Mac .app)
├── React UI — module nav, subtitles, mic button, "ask a question" panel, transcript
├── Unity WebGL build (embedded via <webview>) — solar system scene, realistic/
│   NASA-documentary art style, animated orbits/tilt, tsunami wave sim
├── Bundled narration audio (pre-generated TTS .mp3 per module) — plays fully offline
└── Voice Q&A path (internet required):
    mic capture → speech-to-text → Claude API (topic-scoped system prompt)
    → text-to-speech → spoken answer + message to Unity to trigger a relevant
    camera move / animation
```

- **Unity ↔ Electron bridge**: Unity WebGL build communicates with the React shell via
  `postMessage` (e.g. "user asked about seasons" → Unity animates axial tilt + orbit).
- **Narration**: authored as scripts, converted to audio once during development via a
  TTS tool, shipped as static files. Zero runtime cost, no internet dependency.
- **Voice Q&A**: only this path needs internet/API access.
- **Packaging**: `electron-builder`, producing an NSIS Windows installer and a macOS
  `.dmg` from a single codebase. Building the Windows installer does not require a
  Windows machine, but a real-device test pass on Windows is required before release.

## Art Direction

Realistic / NASA-documentary style: true-to-life planet textures, real lighting, accurate
scale feel — chosen over a stylized-textbook or cartoon look to preserve scientific
credibility for this age group while remaining visually impressive.

## Curriculum — 6 Modules

Each module = Unity scene + narrated walkthrough + module-scoped voice Q&A + a short
"check your understanding" prompt (kid asks a question, or picks from 2-3 suggested
prompts).

1. **Spinning World** — Earth's rotation → day/night cycle, why the sun appears to move
   across the sky, time zones.
2. **The Tilted Orbit** — revolution around the sun + 23.5° axial tilt → seasons, why
   hemispheres flip summer/winter.
3. **Climate Patterns** — season + latitude + ocean currents + atmosphere → long-term
   climate (why the equator is hot, poles are cold, monsoon-type patterns).
4. **Weather in Motion** — shorter-term atmosphere/ocean interactions → storms, wind,
   rain; explicitly contrasted with "climate" from module 3.
5. **Earth's Restless Crust** — plate tectonics & earthquakes → tsunamis. Explicitly
   states this is **not** caused by planetary motion — corrects the likely misconception
   that ties tsunamis to orbital/rotational mechanics.
6. **Moon & Tides** (bridge module) — the one case where orbital mechanics *does* affect
   the ocean: the Moon's gravity causing tides, explicitly distinguished from tsunamis.

## Voice Q&A Design & Safety

- **System prompt**: locks Claude to Earth/space science only, vocabulary appropriate for
  11-13, short spoken-friendly answers (2-4 sentences, no markdown/lists since answers are
  read aloud), and a fixed redirect for off-topic or inappropriate questions ("That's not
  something I can help with here — want to ask about {current module topic} instead?").
- **Context per question**: current module is passed with each question so "why does it
  happen here?" resolves without the kid needing to restate context.
- **No cross-session memory**: each question answered fresh using only current-module
  context — avoids drift and avoids storing a persistent transcript of a child's
  conversations.
- **Visible transcript**: question and answer shown as on-screen text while spoken (aids
  reading, lets a parent glance at what was asked/answered).
- **Offline/failure fallback**: if mic/STT fails or there's no internet, show a friendly
  inline message and fall back to suggested-question buttons that trigger pre-written,
  pre-recorded answers for the most common questions per module.
- **API key**: Claude API key entered once by a parent into a local config file on first
  run — never hardcoded, never committed.

## Project Structure

```
planetary_movement/
├── unity-scene/              # Unity project; builds to WebGL, output copied into electron-app/public
├── electron-app/
│   ├── src/                   # React UI, voice Q&A logic, Unity<->JS bridge
│   ├── public/unity/          # Unity WebGL build output (git-ignored, generated)
│   ├── content/                # per-module scripts + pre-generated narration .mp3
│   └── electron/                # main process, packaging config
├── docs/superpowers/specs/       # design docs + implementation plans
└── .superpowers/                  # brainstorm session files (gitignored)
```

## Testing Approach

Content-heavy interactive app, not logic-heavy — testing is weighted accordingly:

- **Manual pass per module**: visuals load, narration plays, mic Q&A round-trips
  correctly, offline fallback works.
- **Automated tests**: the Claude prompt/response contract (topic redirection, response
  shape/length) and the Unity↔Electron message bridge. Not the 3D rendering itself.

## Delivery Plan

Ship module 1 (Spinning World) end-to-end first — Unity scene, narration, voice Q&A,
Windows-packaged build — to validate the full architecture cheaply before replicating the
pattern across the remaining 5 modules.

## Out of Scope (for this spec)

- Mobile/tablet builds (may be revisited later as a separate spec).
- Fully offline voice Q&A (local STT/LLM/TTS) — explicitly deferred per user decision.
- Cross-session conversation memory / user accounts.
- Content for ages outside 11-13.
