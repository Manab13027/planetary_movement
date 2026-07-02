# Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a self-contained Windows installer and a macOS `.dmg` from the single `electron-app` codebase, so the app satisfies "must run independently on Windows" without requiring Node/Python/dev tooling on the target machine.

**Architecture:** `electron-builder` builds from `electron-vite`'s `out/` directory (main + preload + renderer, including the `public/unity` and `public/content` static assets Vite copies into the renderer output). Two targets are configured: `nsis` for Windows, `dmg` for macOS. Building both can be done from this Mac dev machine; a real-device run on Windows is still required before calling the app release-ready, since emulated cross-builds can't verify runtime behavior (mic permissions, webview rendering, file paths) on the actual target OS.

**Tech Stack:** `electron-builder`, `electron-vite build`.

---

## File Structure

```
planetary_movement/
└── electron-app/
    ├── electron-builder.yml        # new: build targets and packaging config
    └── package.json                 # modified: build:win / build:mac scripts
```

---

### Task 1: Confirm electron-builder is installed

**Files:**
- Verify: `electron-app/package.json`

- [ ] **Step 1: Check for the dependency**

Run: `cd electron-app && npm ls electron-builder`
Expected: prints an installed version (the `electron-vite` React-TS scaffold used in the App Shell plan includes it by default).

- [ ] **Step 2: If missing, install it**

```bash
npm install -D electron-builder
```

(Only run this if Step 1 reported "empty" / not found.)

---

### Task 2: Write `electron-builder.yml`

**Files:**
- Create: `electron-app/electron-builder.yml`

- [ ] **Step 1: Write the config**

```yaml
appId: com.planetarymovement.explorer
productName: Planetary Movement Explorer
directories:
  output: release
files:
  - out/**/*
  - package.json
win:
  target: nsis
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
mac:
  target: dmg
  category: public.app-category.education
```

- [ ] **Step 2: Commit**

```bash
cd /Users/fighter/Documents/Projects_Folder/planetary_movement
git add electron-app/electron-builder.yml
git commit -m "chore: add electron-builder packaging config"
```

---

### Task 3: Add build scripts

**Files:**
- Modify: `electron-app/package.json`

- [ ] **Step 1: Add scripts**

In `electron-app/package.json`, inside `"scripts"`, add:

```json
"build:win": "electron-vite build && electron-builder --win",
"build:mac": "electron-vite build && electron-builder --mac"
```

- [ ] **Step 2: Commit**

```bash
git add electron-app/package.json
git commit -m "chore: add build:win and build:mac scripts"
```

---

### Task 4: Build and verify the macOS package (buildable directly on this dev machine)

**Files:** none (build output only, git-ignored)

- [ ] **Step 1: Ignore build output**

Add to the root `.gitignore` (near the existing `electron-app/dist/` line):

```
electron-app/release/
electron-app/out/
```

- [ ] **Step 2: Run the build**

Make sure at least one narration/fallback manifest exists first (from the Narration Pipeline and Voice Q&A plans — `npm run generate:narration` for both content scripts), and the Unity WebGL build has been copied into `public/unity` (from the Unity Scene plan), so the packaged app has real content to show.

Run: `cd electron-app && npm run build:mac`
Expected: completes without error; `electron-app/release/` contains a `.dmg` file.

- [ ] **Step 3: Manually verify the packaged app**

Open the produced `.dmg`, drag the app to Applications (or run it directly from the mounted volume), and launch it. Expected: the app opens, shows the Spinning World module with the Unity scene and narration exactly as it did under `npm run dev` — this confirms packaging didn't break asset paths (Unity build assets, narration audio, manifests).

- [ ] **Step 4: Commit**

```bash
git add ../.gitignore
git commit -m "chore: ignore packaging build output"
```

---

### Task 5: Build the Windows installer (cross-build from Mac, verify on real Windows device before release)

**Files:** none (build output only, git-ignored)

- [ ] **Step 1: Run the cross-build**

Run: `cd electron-app && npm run build:win`
Expected: completes without error; `electron-app/release/` contains an NSIS `.exe` installer (e.g. `Planetary Movement Explorer Setup 1.0.0.exe`). electron-builder bundles its own NSIS tooling, so this does not require a Windows machine or Wine to be pre-installed.

- [ ] **Step 2: Real-device verification (required before release, cannot be automated here)**

Copy the `.exe` to an actual Windows machine (not a VM substitute for this check, since mic permission prompts and file-path casing issues are exactly what this step exists to catch) and run the installer standalone — no Node, Python, or other dev tooling should be present on that machine. Confirm:
- Installer completes and creates a desktop/start-menu shortcut.
- App launches and shows the Spinning World module with working Unity scene and narration audio.
- Clicking "Ask a question" prompts for microphone permission and the voice Q&A flow works end-to-end (requires an internet connection and a Claude API key entered into the first-run settings form).
- Closing and reopening the app does not ask for the API key again (confirms `userData`-scoped config persists across launches on Windows).

- [ ] **Step 3: No commit** — build artifacts are git-ignored; record the verification result in the PR/handoff notes instead of in git.

---

## Self-Review Notes

- **Spec coverage**: covers "Packaging: electron-builder... NSIS Windows installer and a macOS .dmg from one codebase" and the explicit requirement that a real Windows device test pass happens before release.
- **Type consistency**: n/a — this plan is config/build only, no application types introduced.
- **No placeholders**: all config is concrete and complete. Task 5 Step 2 is manual because it requires physical access to a Windows machine, which cannot be scripted from this environment — that limitation is stated explicitly rather than glossed over.
