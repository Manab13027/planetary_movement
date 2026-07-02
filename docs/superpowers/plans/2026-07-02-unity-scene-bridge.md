# Unity Scene + Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Module 1 ("Spinning World") Unity WebGL scene — a realistic, lit Earth rotating around its axis with a directional-light sun — and wire a two-way JSON message bridge between it and the React shell (from `2026-07-02-app-shell.md`).

**Architecture:** Unity project with pure, unit-testable C# logic (`RotationCalculator`, `BridgeCommandParser`) driving thin `MonoBehaviour` wrappers. A `.jslib` plugin sends Unity→React messages via `postMessage`; React sends React→Unity messages via `unityInstance.SendMessage('Bridge', 'ReceiveCommand', json)`. Day/night is achieved with real-time lighting (one directional light as the sun) rather than a custom shader — matches the realistic/NASA-documentary art direction with minimal complexity. 3D rendering itself is verified manually per the spec's testing approach; only the pure logic and the bridge are automated.

**Tech Stack:** Unity 2022 LTS (Built-in Render Pipeline), Unity Test Framework (NUnit, EditMode tests), WebGL build target, Vitest for the React-side bridge utilities.

---

## File Structure

```
planetary_movement/
├── unity-scene/                                  # Unity project root
│   └── Assets/
│       ├── Scripts/
│       │   ├── RotationCalculator.cs              # pure logic
│       │   ├── EarthRotation.cs                   # MonoBehaviour wrapper
│       │   ├── BridgeCommand.cs                    # data + parser (pure logic)
│       │   ├── BridgeMessenger.cs                  # MonoBehaviour, receives React→Unity
│       │   └── BridgeSender.cs                     # sends Unity→React
│       ├── Plugins/WebGL/
│       │   └── BridgePlugin.jslib                  # postMessage interop
│       ├── Tests/EditMode/
│       │   ├── RotationCalculatorTests.cs
│       │   └── BridgeCommandParserTests.cs
│       └── Scenes/
│           └── SpinningWorld.unity
└── electron-app/
    └── src/renderer/src/bridge/
        ├── buildUnityCommand.ts
        ├── buildUnityCommand.test.ts
        ├── useUnityBridge.ts
        └── useUnityBridge.test.ts
```

---

### Task 1: Create the Unity project

- [ ] **Step 1: Install Unity 2022 LTS**

Via Unity Hub, install the latest **2022 LTS** release with the **WebGL Build Support** module checked.

- [ ] **Step 2: Create the project**

In Unity Hub: New Project → **3D (Built-in Render Pipeline)** template → name `unity-scene` → location `/Users/fighter/Documents/Projects_Folder/planetary_movement`.

- [ ] **Step 3: Create the folder structure**

Inside the Unity Editor's Project window, create these folders under `Assets/`:
`Scripts`, `Plugins/WebGL`, `Tests/EditMode`, `Scenes`.

- [ ] **Step 4: Create the EditMode test assembly**

Right-click `Assets/Tests/EditMode` → Create → Testing → **Tests Assembly Folder**. Unity generates `Tests/EditMode/Tests.EditMode.asmdef` — confirm it exists and its "Platforms" includes Editor only.

- [ ] **Step 5: Save the scene**

File → Save As → `Assets/Scenes/SpinningWorld.unity`.

- [ ] **Step 6: Commit**

```bash
cd /Users/fighter/Documents/Projects_Folder/planetary_movement
git add unity-scene
git commit -m "chore: scaffold Unity project for Spinning World scene"
```

---

### Task 2: Rotation logic (TDD)

**Files:**
- Create: `unity-scene/Assets/Scripts/RotationCalculator.cs`
- Test: `unity-scene/Assets/Tests/EditMode/RotationCalculatorTests.cs`

- [ ] **Step 1: Write the failing test**

```csharp
// unity-scene/Assets/Tests/EditMode/RotationCalculatorTests.cs
using NUnit.Framework;
using PlanetaryMovement;

public class RotationCalculatorTests
{
    [Test]
    public void ZeroElapsedSeconds_ReturnsZeroDegrees()
    {
        Assert.AreEqual(0f, RotationCalculator.DegreesForElapsedSeconds(0f, 60f));
    }

    [Test]
    public void HalfOfSecondsPerDay_ReturnsHalfRotation()
    {
        Assert.AreEqual(180f, RotationCalculator.DegreesForElapsedSeconds(30f, 60f), 0.001f);
    }

    [Test]
    public void FullSecondsPerDay_WrapsToZero()
    {
        Assert.AreEqual(0f, RotationCalculator.DegreesForElapsedSeconds(60f, 60f), 0.001f);
    }

    [Test]
    public void ZeroSecondsPerDay_ReturnsZeroDegrees()
    {
        Assert.AreEqual(0f, RotationCalculator.DegreesForElapsedSeconds(10f, 0f));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Open **Window → General → Test Runner** in Unity, switch to the **EditMode** tab, click **Run All**.
Expected: FAIL to compile — `RotationCalculator` does not exist.

- [ ] **Step 3: Write the implementation**

```csharp
// unity-scene/Assets/Scripts/RotationCalculator.cs
namespace PlanetaryMovement
{
    public static class RotationCalculator
    {
        /// <summary>
        /// secondsPerDay: how many real seconds represent one full 360-degree rotation.
        /// </summary>
        public static float DegreesForElapsedSeconds(float elapsedSeconds, float secondsPerDay)
        {
            if (secondsPerDay <= 0f) return 0f;
            float fractionOfDay = elapsedSeconds / secondsPerDay;
            return (fractionOfDay * 360f) % 360f;
        }
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Test Runner → EditMode → Run All.
Expected: PASS (4 tests) in `RotationCalculatorTests`.

- [ ] **Step 5: Commit**

```bash
git add unity-scene/Assets/Scripts/RotationCalculator.cs unity-scene/Assets/Tests
git commit -m "feat: add RotationCalculator with unit tests"
```

---

### Task 3: Earth GameObject + rotation MonoBehaviour (manual verification)

**Files:**
- Create: `unity-scene/Assets/Scripts/EarthRotation.cs`

- [ ] **Step 1: Write the MonoBehaviour**

```csharp
// unity-scene/Assets/Scripts/EarthRotation.cs
using UnityEngine;

namespace PlanetaryMovement
{
    public class EarthRotation : MonoBehaviour
    {
        [SerializeField] private float secondsPerDay = 20f;
        private float elapsed;

        private void Update()
        {
            elapsed += Time.deltaTime;
            float degrees = RotationCalculator.DegreesForElapsedSeconds(elapsed, secondsPerDay);
            transform.localRotation = Quaternion.Euler(0f, degrees, 0f);
        }
    }
}
```

- [ ] **Step 2: Build the scene in the Unity Editor**

- Create a Sphere (GameObject → 3D Object → Sphere), rename it `Earth`, scale/position at origin.
- Apply a simple Earth-like material (a blue/green/brown lit material is enough for this milestone; a real texture can be swapped in later without touching code).
- Add a Directional Light (GameObject → Light → Directional Light), rename it `Sun`, rotate it so it lights one hemisphere of `Earth` — this is what produces the day/night terminator, no shader needed.
- Set the Skybox to a dark/space `Lighting` setting (Window → Rendering → Lighting → Environment → Skybox Material → a black/starfield material, or `None` with a solid dark camera background) so the lit hemisphere reads clearly against space.
- Attach the `EarthRotation` component to the `Earth` GameObject via the Inspector.

- [ ] **Step 3: Manually verify rotation**

Press Play in the Unity Editor. Expected: `Earth` visibly rotates over ~20 seconds, and the lit/unlit hemispheres (day/night) are clearly visible as it turns. Stop Play mode.

- [ ] **Step 4: Commit**

```bash
git add unity-scene/Assets/Scripts/EarthRotation.cs unity-scene/Assets/Scenes
git commit -m "feat: add rotating Earth with directional-light day/night"
```

---

### Task 4: Bridge command parsing (TDD)

**Files:**
- Create: `unity-scene/Assets/Scripts/BridgeCommand.cs`
- Test: `unity-scene/Assets/Tests/EditMode/BridgeCommandParserTests.cs`

- [ ] **Step 1: Write the failing test**

```csharp
// unity-scene/Assets/Tests/EditMode/BridgeCommandParserTests.cs
using NUnit.Framework;
using PlanetaryMovement;

public class BridgeCommandParserTests
{
    [Test]
    public void Parse_ExtractsCommandAndModuleId()
    {
        string json = "{\"command\":\"focus-module\",\"payload\":{\"moduleId\":\"spinning-world\"}}";
        BridgeCommand result = BridgeCommandParser.Parse(json);
        Assert.AreEqual("focus-module", result.command);
        Assert.AreEqual("spinning-world", result.payload.moduleId);
    }

    [Test]
    public void Parse_HandlesMissingPayload()
    {
        string json = "{\"command\":\"ping\"}";
        BridgeCommand result = BridgeCommandParser.Parse(json);
        Assert.AreEqual("ping", result.command);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Test Runner → EditMode → Run All.
Expected: FAIL to compile — `BridgeCommand` / `BridgeCommandParser` do not exist.

- [ ] **Step 3: Write the implementation**

```csharp
// unity-scene/Assets/Scripts/BridgeCommand.cs
using UnityEngine;

namespace PlanetaryMovement
{
    [System.Serializable]
    public class FocusModulePayload
    {
        public string moduleId;
    }

    [System.Serializable]
    public class BridgeCommand
    {
        public string command;
        public FocusModulePayload payload;
    }

    public static class BridgeCommandParser
    {
        public static BridgeCommand Parse(string json)
        {
            return JsonUtility.FromJson<BridgeCommand>(json);
        }
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Test Runner → EditMode → Run All.
Expected: PASS (2 tests) in `BridgeCommandParserTests`, plus the 4 from `RotationCalculatorTests` still passing (6 total).

- [ ] **Step 5: Commit**

```bash
git add unity-scene/Assets/Scripts/BridgeCommand.cs unity-scene/Assets/Tests/EditMode/BridgeCommandParserTests.cs
git commit -m "feat: add BridgeCommand parsing with unit tests"
```

---

### Task 5: Bridge MonoBehaviour + WebGL send/receive plumbing (manual verification)

**Files:**
- Create: `unity-scene/Assets/Scripts/BridgeMessenger.cs`
- Create: `unity-scene/Assets/Scripts/BridgeSender.cs`
- Create: `unity-scene/Assets/Plugins/WebGL/BridgePlugin.jslib`

- [ ] **Step 1: Write `BridgeSender.cs`**

```csharp
// unity-scene/Assets/Scripts/BridgeSender.cs
using System.Runtime.InteropServices;
using UnityEngine;

namespace PlanetaryMovement
{
    public static class BridgeSender
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern void SendToReact(string json);
#endif

        public static void Send(string eventName)
        {
            string json = "{\"event\":\"" + eventName + "\"}";
#if UNITY_WEBGL && !UNITY_EDITOR
            SendToReact(json);
#else
            Debug.Log($"[BridgeSender] (editor no-op) {json}");
#endif
        }
    }
}
```

- [ ] **Step 2: Write `BridgeMessenger.cs`**

```csharp
// unity-scene/Assets/Scripts/BridgeMessenger.cs
using UnityEngine;

namespace PlanetaryMovement
{
    public class BridgeMessenger : MonoBehaviour
    {
        private void Start()
        {
            BridgeSender.Send("scene-ready");
        }

        public void ReceiveCommand(string json)
        {
            BridgeCommand cmd = BridgeCommandParser.Parse(json);
            switch (cmd.command)
            {
                case "focus-module":
                    Debug.Log($"Focusing module: {cmd.payload?.moduleId}");
                    break;
                default:
                    Debug.LogWarning($"Unknown bridge command: {cmd.command}");
                    break;
            }
        }
    }
}
```

- [ ] **Step 3: Write `BridgePlugin.jslib`**

```javascript
// unity-scene/Assets/Plugins/WebGL/BridgePlugin.jslib
mergeInto(LibraryManager.library, {
  SendToReact: function (jsonPtr) {
    var json = UTF8ToString(jsonPtr)
    var payload = JSON.parse(json)
    window.parent.postMessage({ source: 'unity', payload: payload }, '*')
  }
})
```

- [ ] **Step 4: Wire up the GameObject**

In the Unity Editor: create an empty GameObject named exactly `Bridge` (this exact name is required — `SendMessage('Bridge', ...)` from React targets it by name). Attach the `BridgeMessenger` component to it.

- [ ] **Step 5: Commit**

```bash
git add unity-scene/Assets/Scripts/BridgeMessenger.cs unity-scene/Assets/Scripts/BridgeSender.cs unity-scene/Assets/Plugins unity-scene/Assets/Scenes
git commit -m "feat: add Unity<->React bridge messenger and WebGL plugin"
```

---

### Task 6: Build WebGL output into the Electron app

**Files:**
- Generates: `electron-app/public/unity/` (git-ignored, already covered by root `.gitignore`)

- [ ] **Step 1: Configure WebGL build settings**

File → Build Settings → select **WebGL** platform → Switch Platform. In Player Settings → Publishing Settings, set **Compression Format** to **Disabled** (simplifies local `file://`/dev-server serving; revisit for production in the Packaging plan).

- [ ] **Step 2: Build**

Build Settings → Build → output folder: `/Users/fighter/Documents/Projects_Folder/planetary_movement/electron-app/public/unity`.

- [ ] **Step 3: Verify build output**

Run: `ls electron-app/public/unity`
Expected: an `index.html`, a `Build/` folder, and a `TemplateData/` folder are present.

- [ ] **Step 4: No commit** — this output is git-ignored (regenerated by anyone from the Unity project). Nothing to commit here.

---

### Task 7: React-side bridge utilities (TDD)

**Files:**
- Create: `electron-app/src/renderer/src/bridge/buildUnityCommand.ts`
- Test: `electron-app/src/renderer/src/bridge/buildUnityCommand.test.ts`
- Create: `electron-app/src/renderer/src/bridge/useUnityBridge.ts`
- Test: `electron-app/src/renderer/src/bridge/useUnityBridge.test.ts`

- [ ] **Step 1: Write the failing test for `buildUnityCommand`**

```typescript
// electron-app/src/renderer/src/bridge/buildUnityCommand.test.ts
import { describe, it, expect } from 'vitest'
import { buildUnityCommand } from './buildUnityCommand'

describe('buildUnityCommand', () => {
  it('serializes a command with a payload', () => {
    const json = buildUnityCommand('focus-module', { moduleId: 'spinning-world' })
    expect(JSON.parse(json)).toEqual({
      command: 'focus-module',
      payload: { moduleId: 'spinning-world' }
    })
  })

  it('defaults to an empty payload object', () => {
    const json = buildUnityCommand('ping')
    expect(JSON.parse(json)).toEqual({ command: 'ping', payload: {} })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- buildUnityCommand.test.ts` (from `electron-app/`)
Expected: FAIL — cannot find module `./buildUnityCommand`

- [ ] **Step 3: Implement `buildUnityCommand.ts`**

```typescript
// electron-app/src/renderer/src/bridge/buildUnityCommand.ts
export function buildUnityCommand(
  command: string,
  payload: Record<string, unknown> = {}
): string {
  return JSON.stringify({ command, payload })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- buildUnityCommand.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for `useUnityBridge`**

```typescript
// electron-app/src/renderer/src/bridge/useUnityBridge.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUnityBridge } from './useUnityBridge'

describe('useUnityBridge', () => {
  it('invokes the callback for messages from unity', () => {
    const onMessage = vi.fn()
    renderHook(() => useUnityBridge(onMessage))

    window.dispatchEvent(
      new MessageEvent('message', { data: { source: 'unity', payload: { event: 'scene-ready' } } })
    )

    expect(onMessage).toHaveBeenCalledWith({ event: 'scene-ready' })
  })

  it('ignores messages that are not from unity', () => {
    const onMessage = vi.fn()
    renderHook(() => useUnityBridge(onMessage))

    window.dispatchEvent(new MessageEvent('message', { data: { source: 'other' } }))

    expect(onMessage).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test -- useUnityBridge.test.ts`
Expected: FAIL — cannot find module `./useUnityBridge`

- [ ] **Step 7: Implement `useUnityBridge.ts`**

```typescript
// electron-app/src/renderer/src/bridge/useUnityBridge.ts
import { useEffect } from 'react'

export interface UnityMessage {
  event: string
  [key: string]: unknown
}

export function useUnityBridge(onMessage: (message: UnityMessage) => void): void {
  useEffect(() => {
    function handleMessage(e: MessageEvent): void {
      if (!e.data || e.data.source !== 'unity') return
      onMessage(e.data.payload as UnityMessage)
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onMessage])
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm run test -- useUnityBridge.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add electron-app/src/renderer/src/bridge
git commit -m "feat: add React-side Unity bridge utilities"
```

---

### Task 8: Embed the Unity build in ModuleView (manual verification)

**Files:**
- Modify: `electron-app/src/main/index.ts`
- Modify: `electron-app/src/renderer/src/components/ModuleView.tsx`

- [ ] **Step 1: Enable the `<webview>` tag**

In `electron-app/src/main/index.ts`, find the `new BrowserWindow({...})` call and ensure `webPreferences` includes:

```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: false,
  webviewTag: true
}
```

- [ ] **Step 2: Mount the webview for the implemented module**

In `electron-app/src/renderer/src/components/ModuleView.tsx`, replace the empty `module-scene-slot` div with:

```tsx
{module.implemented && (
  <div data-testid="module-scene-slot">
    <webview
      src="unity/index.html"
      style={{ width: '100%', height: '480px' }}
      webpreferences="webSecurity=no"
    />
  </div>
)}
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev` (from `electron-app/`)
Expected: the app window shows the Spinning World module with the Unity scene rendering and the Earth rotating inside the embedded view. Check the devtools console (View → Toggle Developer Tools) for a `message` event log confirming the `scene-ready` event arrived from Unity (add a temporary `console.log` in `useUnityBridge`'s callback usage to confirm, then remove it).

- [ ] **Step 4: Commit**

```bash
git add electron-app/src/main/index.ts electron-app/src/renderer/src/components/ModuleView.tsx
git commit -m "feat: embed Unity WebGL scene in ModuleView via webview"
```

---

## Self-Review Notes

- **Spec coverage**: covers "Unity WebGL build embedded", the postMessage bridge in both directions, and the realistic/NASA-documentary day/night visual via real-time lighting (no shader work required).
- **Type consistency**: `moduleId` values match `2026-07-02-app-shell.md`'s `CurriculumModule.id`. The `Bridge` GameObject name, `ReceiveCommand` method name, and `{command, payload}` / `{source: 'unity', payload}` message shapes are the canonical bridge contract — the Voice Q&A plan reuses `buildUnityCommand` for any future scene commands.
- **No placeholders**: all code is complete; GUI-only Unity Editor steps are described with exact menu paths and names since they cannot be expressed as runnable commands.
