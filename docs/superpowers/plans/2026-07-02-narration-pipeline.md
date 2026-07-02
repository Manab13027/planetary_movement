# Narration Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author the Module 1 narration script, generate offline-playable audio for it via a one-time TTS build step, and play it back in the app with synced subtitles — fully offline at runtime.

**Architecture:** Narration is authored once as a JSON script (`content/scripts/module-1-spinning-world.json`), converted to `.mp3` files + a timing manifest by a Node build script (`scripts/generate-narration.mjs`, using the OpenAI TTS API), and the generated manifest+audio are shipped as static assets under `public/content/`. The React `NarrationPlayer` component plays segments back-to-back using a plain `<audio>` element, driven by a pure, unit-tested reducer that tracks which segment is active — no network or TTS API calls happen at app runtime.

**Tech Stack:** Node.js (`fetch`, `music-metadata` for duration probing), React `useReducer`, HTMLAudioElement, Vitest.

---

## File Structure

```
planetary_movement/
└── electron-app/
    ├── content/
    │   └── scripts/
    │       └── module-1-spinning-world.json      # authored narration script (input, committed)
    ├── scripts/
    │   └── generate-narration.mjs                 # TTS generation tool (run manually/offline)
    ├── public/content/                             # generated output (git-ignored)
    │   ├── audio/spinning-world/*.mp3
    │   └── spinning-world.manifest.json
    └── src/renderer/src/
        ├── narration/
        │   ├── narrationPlayback.ts                # pure reducer + types
        │   ├── narrationPlayback.test.ts
        │   ├── loadManifest.ts
        │   └── loadManifest.test.ts
        └── components/
            ├── NarrationPlayer.tsx
            └── NarrationPlayer.test.tsx
```

---

### Task 1: Author the Module 1 narration script

**Files:**
- Create: `electron-app/content/scripts/module-1-spinning-world.json`

- [ ] **Step 1: Write the script**

```json
{
  "moduleId": "spinning-world",
  "title": "Spinning World",
  "segments": [
    {
      "id": "intro",
      "text": "Right now, while you're sitting there, you are spinning. Not in your chair — the whole Earth is turning, carrying you around in a giant circle every single day.",
      "voice": "alloy"
    },
    {
      "id": "axis",
      "text": "Earth spins around an invisible line called its axis, running from the North Pole to the South Pole. One full spin takes about twenty-four hours — that's one day.",
      "voice": "alloy"
    },
    {
      "id": "day-night",
      "text": "The Sun doesn't move around us. Instead, Earth's spin carries you into sunlight, and later, away from it. When your side of Earth faces the Sun, it's daytime. When it turns away, it's night.",
      "voice": "alloy"
    },
    {
      "id": "misconception",
      "text": "It's easy to think the Sun rises and sets because it's moving. But the Sun barely moves at all — it's Earth that's doing all the spinning.",
      "voice": "alloy"
    },
    {
      "id": "outro",
      "text": "Try spinning the Earth yourself in this scene, and watch day turn into night. Then ask me anything you're curious about!",
      "voice": "alloy"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/fighter/Documents/Projects_Folder/planetary_movement
git add electron-app/content/scripts/module-1-spinning-world.json
git commit -m "content: author Spinning World narration script"
```

---

### Task 2: Playback reducer (TDD)

**Files:**
- Create: `electron-app/src/renderer/src/narration/narrationPlayback.ts`
- Test: `electron-app/src/renderer/src/narration/narrationPlayback.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// electron-app/src/renderer/src/narration/narrationPlayback.test.ts
import { describe, it, expect } from 'vitest'
import { initialPlaybackState, playbackReducer } from './narrationPlayback'

describe('playbackReducer', () => {
  it('starts paused at segment 0, not finished', () => {
    expect(initialPlaybackState).toEqual({ segmentIndex: 0, isPlaying: false, isFinished: false })
  })

  it('play sets isPlaying true', () => {
    const state = playbackReducer(initialPlaybackState, { type: 'play' }, 5)
    expect(state.isPlaying).toBe(true)
  })

  it('pause sets isPlaying false', () => {
    const playing = { ...initialPlaybackState, isPlaying: true }
    const state = playbackReducer(playing, { type: 'pause' }, 5)
    expect(state.isPlaying).toBe(false)
  })

  it('segment-ended advances to the next segment and keeps playing', () => {
    const playing = { ...initialPlaybackState, isPlaying: true }
    const state = playbackReducer(playing, { type: 'segment-ended' }, 5)
    expect(state).toEqual({ segmentIndex: 1, isPlaying: true, isFinished: false })
  })

  it('segment-ended on the last segment marks playback finished', () => {
    const lastSegment = { segmentIndex: 4, isPlaying: true, isFinished: false }
    const state = playbackReducer(lastSegment, { type: 'segment-ended' }, 5)
    expect(state).toEqual({ segmentIndex: 4, isPlaying: false, isFinished: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- narrationPlayback.test.ts` (from `electron-app/`)
Expected: FAIL — cannot find module `./narrationPlayback`

- [ ] **Step 3: Write the implementation**

```typescript
// electron-app/src/renderer/src/narration/narrationPlayback.ts
export interface NarrationSegment {
  id: string
  text: string
  audioFile: string
  durationMs: number
}

export interface NarrationManifest {
  moduleId: string
  title: string
  segments: NarrationSegment[]
}

export interface PlaybackState {
  segmentIndex: number
  isPlaying: boolean
  isFinished: boolean
}

export const initialPlaybackState: PlaybackState = {
  segmentIndex: 0,
  isPlaying: false,
  isFinished: false
}

export type PlaybackAction = { type: 'play' } | { type: 'pause' } | { type: 'segment-ended' }

export function playbackReducer(
  state: PlaybackState,
  action: PlaybackAction,
  totalSegments: number
): PlaybackState {
  switch (action.type) {
    case 'play':
      return { ...state, isPlaying: true }
    case 'pause':
      return { ...state, isPlaying: false }
    case 'segment-ended': {
      const nextIndex = state.segmentIndex + 1
      if (nextIndex >= totalSegments) {
        return { ...state, isPlaying: false, isFinished: true }
      }
      return { ...state, segmentIndex: nextIndex }
    }
    default:
      return state
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- narrationPlayback.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add electron-app/src/renderer/src/narration/narrationPlayback.ts electron-app/src/renderer/src/narration/narrationPlayback.test.ts
git commit -m "feat: add narration playback reducer"
```

---

### Task 3: Manifest loader (TDD)

**Files:**
- Create: `electron-app/src/renderer/src/narration/loadManifest.ts`
- Test: `electron-app/src/renderer/src/narration/loadManifest.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// electron-app/src/renderer/src/narration/loadManifest.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadManifest } from './loadManifest'

describe('loadManifest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches and returns the manifest for a module', async () => {
    const manifest = {
      moduleId: 'spinning-world',
      title: 'Spinning World',
      segments: [{ id: 'intro', text: 'Hi', audioFile: 'content/audio/spinning-world/intro.mp3', durationMs: 1000 }]
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(manifest) })
    )

    const result = await loadManifest('spinning-world')
    expect(result).toEqual(manifest)
    expect(fetch).toHaveBeenCalledWith('content/spinning-world.manifest.json')
  })

  it('throws when the fetch response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(loadManifest('spinning-world')).rejects.toThrow(/Failed to load/)
  })

  it('throws when the manifest has no segments', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ moduleId: 'spinning-world', title: 'x', segments: [] })
      })
    )
    await expect(loadManifest('spinning-world')).rejects.toThrow(/no segments/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- loadManifest.test.ts`
Expected: FAIL — cannot find module `./loadManifest`

- [ ] **Step 3: Write the implementation**

```typescript
// electron-app/src/renderer/src/narration/loadManifest.ts
import type { NarrationManifest } from './narrationPlayback'

export async function loadManifest(moduleId: string): Promise<NarrationManifest> {
  const response = await fetch(`content/${moduleId}.manifest.json`)
  if (!response.ok) {
    throw new Error(`Failed to load narration manifest for module "${moduleId}"`)
  }
  const manifest = (await response.json()) as NarrationManifest
  if (!Array.isArray(manifest.segments) || manifest.segments.length === 0) {
    throw new Error(`Narration manifest for module "${moduleId}" has no segments`)
  }
  return manifest
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- loadManifest.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add electron-app/src/renderer/src/narration/loadManifest.ts electron-app/src/renderer/src/narration/loadManifest.test.ts
git commit -m "feat: add narration manifest loader"
```

---

### Task 4: NarrationPlayer component (TDD with media mocks)

**Files:**
- Modify: `electron-app/vitest.setup.ts`
- Create: `electron-app/src/renderer/src/components/NarrationPlayer.tsx`
- Test: `electron-app/src/renderer/src/components/NarrationPlayer.test.tsx`

- [ ] **Step 1: Add HTMLMediaElement mocks (jsdom doesn't implement audio playback)**

Append to `electron-app/vitest.setup.ts`:

```typescript
Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: () => Promise.resolve()
})
Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: () => {}
})
```

- [ ] **Step 2: Write the failing test**

```typescript
// electron-app/src/renderer/src/components/NarrationPlayer.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NarrationPlayer } from './NarrationPlayer'

const manifest = {
  moduleId: 'spinning-world',
  title: 'Spinning World',
  segments: [
    { id: 'intro', text: 'Segment one text.', audioFile: 'content/audio/spinning-world/intro.mp3', durationMs: 1000 },
    { id: 'axis', text: 'Segment two text.', audioFile: 'content/audio/spinning-world/axis.mp3', durationMs: 1000 }
  ]
}

describe('NarrationPlayer', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the first segment subtitle once the manifest loads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(manifest) }))
    render(<NarrationPlayer moduleId="spinning-world" />)
    await waitFor(() => expect(screen.getByText('Segment one text.')).toBeInTheDocument())
  })

  it('advances to the next subtitle when the audio element fires "ended"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(manifest) }))
    render(<NarrationPlayer moduleId="spinning-world" />)
    await waitFor(() => expect(screen.getByText('Segment one text.')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /play/i }))
    const audio = screen.getByTestId('narration-audio') as HTMLAudioElement
    audio.dispatchEvent(new Event('ended'))

    await waitFor(() => expect(screen.getByText('Segment two text.')).toBeInTheDocument())
  })

  it('shows a finished message after the last segment ends', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(manifest) }))
    render(<NarrationPlayer moduleId="spinning-world" />)
    await waitFor(() => expect(screen.getByText('Segment one text.')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /play/i }))
    const audio = screen.getByTestId('narration-audio') as HTMLAudioElement
    audio.dispatchEvent(new Event('ended'))
    await waitFor(() => expect(screen.getByText('Segment two text.')).toBeInTheDocument())
    audio.dispatchEvent(new Event('ended'))

    await waitFor(() => expect(screen.getByText(/Narration finished/)).toBeInTheDocument())
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- NarrationPlayer.test.tsx`
Expected: FAIL — cannot find module `./NarrationPlayer`

- [ ] **Step 4: Write the implementation**

```tsx
// electron-app/src/renderer/src/components/NarrationPlayer.tsx
import { useEffect, useReducer, useRef, useState } from 'react'
import { loadManifest } from '../narration/loadManifest'
import {
  initialPlaybackState,
  playbackReducer,
  type NarrationManifest
} from '../narration/narrationPlayback'

interface NarrationPlayerProps {
  moduleId: string
}

export function NarrationPlayer({ moduleId }: NarrationPlayerProps): JSX.Element {
  const [manifest, setManifest] = useState<NarrationManifest | null>(null)
  const [state, dispatch] = useReducer(
    (s: typeof initialPlaybackState, a: Parameters<typeof playbackReducer>[1]) =>
      playbackReducer(s, a, manifest?.segments.length ?? 0),
    initialPlaybackState
  )
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    let cancelled = false
    loadManifest(moduleId).then((m) => {
      if (!cancelled) setManifest(m)
    })
    return () => {
      cancelled = true
    }
  }, [moduleId])

  useEffect(() => {
    if (state.isPlaying) {
      audioRef.current?.play()
    } else {
      audioRef.current?.pause()
    }
  }, [state.isPlaying, state.segmentIndex])

  if (!manifest) {
    return <p>Loading narration...</p>
  }

  if (state.isFinished) {
    return <p>Narration finished.</p>
  }

  const currentSegment = manifest.segments[state.segmentIndex]

  return (
    <div>
      <audio
        ref={audioRef}
        data-testid="narration-audio"
        src={currentSegment.audioFile}
        onEnded={() => dispatch({ type: 'segment-ended' })}
      />
      <p>{currentSegment.text}</p>
      <button type="button" onClick={() => dispatch({ type: state.isPlaying ? 'pause' : 'play' })}>
        {state.isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- NarrationPlayer.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add electron-app/vitest.setup.ts electron-app/src/renderer/src/components/NarrationPlayer.tsx electron-app/src/renderer/src/components/NarrationPlayer.test.tsx
git commit -m "feat: add NarrationPlayer component"
```

---

### Task 5: TTS generation script (manual run, not unit tested)

**Files:**
- Create: `electron-app/scripts/generate-narration.mjs`
- Modify: `electron-app/package.json`
- Modify: root `.gitignore`

- [ ] **Step 1: Install the duration-probing dependency**

```bash
cd electron-app && npm install -D music-metadata
```

- [ ] **Step 2: Write the generation script**

```javascript
// electron-app/scripts/generate-narration.mjs
#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseBuffer } from 'music-metadata'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const scriptArg = process.argv[2]

if (!scriptArg) {
  console.error('Usage: node scripts/generate-narration.mjs content/scripts/<module>.json')
  process.exit(1)
}

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error('OPENAI_API_KEY environment variable is required')
  process.exit(1)
}

async function synthesizeSegment(text, voice) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: 'tts-1', voice, input: text, response_format: 'mp3' })
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`TTS request failed (${response.status}): ${detail}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  const scriptJson = JSON.parse(await readFile(path.resolve(ROOT, scriptArg), 'utf-8'))
  const { moduleId, title, segments } = scriptJson

  const audioDir = path.join(ROOT, 'public', 'content', 'audio', moduleId)
  await mkdir(audioDir, { recursive: true })

  const manifestSegments = []

  for (const segment of segments) {
    console.log(`Synthesizing segment "${segment.id}"...`)
    const audioBuffer = await synthesizeSegment(segment.text, segment.voice ?? 'alloy')
    const fileName = `${segment.id}.mp3`
    await writeFile(path.join(audioDir, fileName), audioBuffer)

    const metadata = await parseBuffer(audioBuffer, 'audio/mpeg')
    const durationMs = Math.round((metadata.format.duration ?? 0) * 1000)

    manifestSegments.push({
      id: segment.id,
      text: segment.text,
      audioFile: `content/audio/${moduleId}/${fileName}`,
      durationMs
    })
  }

  const manifest = { moduleId, title, segments: manifestSegments }
  const manifestPath = path.join(ROOT, 'public', 'content', `${moduleId}.manifest.json`)
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`Wrote manifest: ${manifestPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 3: Add the npm script**

In `electron-app/package.json`, inside `"scripts"`, add:

```json
"generate:narration": "node scripts/generate-narration.mjs"
```

- [ ] **Step 4: Ignore generated output**

Add to the root `.gitignore` (already has an entry for `electron-app/public/unity/` from the previous plan; add this line near it):

```
electron-app/public/content/
```

- [ ] **Step 5: Run the generator and verify manually**

```bash
cd electron-app
OPENAI_API_KEY=sk-... npm run generate:narration -- content/scripts/module-1-spinning-world.json
```

Expected: 5 `.mp3` files under `public/content/audio/spinning-world/`, and `public/content/spinning-world.manifest.json` with 5 segment entries each carrying a non-zero `durationMs`.

- [ ] **Step 6: Commit**

```bash
git add electron-app/scripts/generate-narration.mjs electron-app/package.json electron-app/package-lock.json ../.gitignore
git commit -m "feat: add narration TTS generation script"
```

---

### Task 6: Wire NarrationPlayer into ModuleView (manual verification)

**Files:**
- Modify: `electron-app/src/renderer/src/components/ModuleView.tsx`

- [ ] **Step 1: Add NarrationPlayer alongside the Unity scene**

In `ModuleView.tsx`, inside the `module.implemented` block (below the `<webview>` added in the Unity plan), add:

```tsx
<NarrationPlayer moduleId={module.id} />
```

Add the import at the top of the file:

```typescript
import { NarrationPlayer } from './NarrationPlayer'
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev` (from `electron-app/`, after Task 5's generator has been run at least once so `public/content/` exists)
Expected: the Spinning World module shows the Unity scene, a subtitle line, and a Play button. Clicking Play plays audio and advances subtitles through all 5 segments, ending with "Narration finished."

- [ ] **Step 3: Commit**

```bash
git add electron-app/src/renderer/src/components/ModuleView.tsx
git commit -m "feat: wire NarrationPlayer into ModuleView"
```

---

## Self-Review Notes

- **Spec coverage**: covers "Bundled narration audio" (pre-generated, offline playback) from the architecture section, using the module 1 script content specific to the "Spinning World" curriculum entry.
- **Type consistency**: `NarrationManifest`/`NarrationSegment` shapes match exactly what `generate-narration.mjs` writes to `<moduleId>.manifest.json`. `moduleId` values match `2026-07-02-app-shell.md`'s module ids.
- **No placeholders**: all code complete; the one manual, non-testable step (calling a real TTS API) is clearly marked and has an explicit expected-output check instead of an automated test.
