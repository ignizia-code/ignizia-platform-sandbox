````markdown
# Omniverse Web Viewer Integration Plan

## Goal
Merge the existing Omniverse web viewer sample into the Ignizia prototype so the Omniverse scene is visible at `/Omniverse`. The Omniverse Kit app is assumed to be already running in the background; no changes to how it is launched.

---

## 1. Overview of What Gets Merged

### 1.1 Web viewer sample (source)
- **Entry**: `web-viewer-sample` – standalone Vite + React app.
- **Connection**: For “already running” Kit app, the viewer uses **local** mode in `stream.config.json`: `source: "local"`, `server: "127.0.0.1"`, `signalingPort: 49100`, `mediaPort: null`.
- **“UI for any streaming app”**: In the sample UI this is the option that uses **StreamOnlyWindow** (viewport only, no USD Viewer forms). That is the flow we replicate inside Ignizia.

### 1.2 Ignizia prototype (target)
- **Stack**: Vite + React, no router today; navigation is by sidebar section state (`MainSection`).
- **Change**: Add URL-based route `/Omniverse` and embed the viewer so that visiting `/Omniverse` shows the same streaming behavior as the sample’s “UI for any streaming app” with local config.

---

## 2. Step-by-step implementation plan

### Step 0: NVIDIA package registry (optional)

If `@nvidia/omniverse-webrtc-streaming-library` is not on the default npm registry, add an `.npmrc` at the Ignizia repo root with the same content as in `web-viewer-sample` (e.g. `@nvidia:registry=...`). The implementation adds this file so `npm install` can resolve the NVIDIA package.

---

### Step 1: Add dependencies (Ignizia `package.json`)

Add only what the embedded viewer needs:

- `@nvidia/omniverse-webrtc-streaming-library@5.6.0` – same version as web-viewer-sample; required for WebRTC streaming.
- `prop-types` – used by the viewer’s `AppStream` component.
- `react-router-dom` – for the `/Omniverse` URL (and optional future routes).
- `vite-plugin-externals` (dev) – so the build can treat `GFN` as external if needed (viewer library can reference it); optional for local-only but keeps build aligned with the sample.

Do **not** add bootstrap/react-bootstrap unless you later embed the full viewer forms; the “stream only” path does not need them.

---

### Step 2: Add `stream.config.json` (Ignizia root)

Copy the **local** configuration from the web-viewer-sample so the embedded viewer connects to the already running Kit app:

- **File**: `ignizia-demo-dashboard/stream.config.json`
- **Content**: Same structure as the sample, with `source: "local"` and the same `local` block:

```json
{
  "$comment": "source can be 'gfn', 'local' or 'stream'",
  "source": "local",
  "stream": { "appServer": "", "streamServer": "" },
  "gfn": { "catalogClientId": "", "clientId": "", "cmsId": 0 },
  "local": {
    "$comment": "Required when source is 'local'. Matches Kit app streaming.",
    "server": "127.0.0.1",
    "signalingPort": 49100,
    "mediaPort": null
  }
}
```

No changes to how the Kit app is started; this file only tells the **browser** viewer where to connect.

---

### Step 3: Copy and adapt viewer modules (minimal set)

Reuse the viewer’s streaming logic without redesigning it. Copy only what is needed for **local + stream-only**:

| File in web-viewer-sample     | Action in Ignizia |
|-------------------------------|-------------------|
| `src/AppStream.tsx`           | Copy into e.g. `components/omniverse/AppStream.tsx`. Fix import of `stream.config.json` to a path that resolves from the new location (e.g. `../../stream.config.json` if config is at repo root). |
| `src/StreamOnlyWindow.tsx`    | Copy into `components/omniverse/StreamOnlyWindow.tsx`. Remove dependency on `App.tsx` (e.g. `headerHeight` from parent). For embedding, pass `headerHeight={0}` or make it an optional prop so the stream fills the main content area. |
| `src/AppStream.css`           | Copy to `components/omniverse/AppStream.css` and import it in `AppStream.tsx` so video/stream layout is correct. |
| `src/App.css` (optional)      | Only if you need styles for loading/buttons (e.g. `.loading-indicator-label`, `#remote-video`). For stream-only, the critical part is the video/stream container; minimal need is `AppStream.css`. |

**Do not copy**: `App.tsx`, `Forms.tsx`, `Window.tsx`, `Endpoints.tsx`, `http.ts`, `USDAsset.tsx`, `USDStage.tsx`, or the full form flow. Those are for “stream” source or USD Viewer UI; for “already running” Kit + viewport only we only need the **local** path and **StreamOnlyWindow** + **AppStream**.

**AppStream behavior (do not change)**:
- In `componentDidMount`, when `StreamConfig.source === 'local'` it uses `StreamConfig.local.server`, `signalingPort`, `mediaPort` and connects via `AppStreamer.connect()` with `StreamType.DIRECT`. No backend URL or session ID is used for local.
- Keep this logic intact; only fix the path to `stream.config.json`.

**StreamOnlyWindow behavior**:
- It renders `AppStream` with props. For local, AppStream ignores `sessionId`, `backendUrl`, etc., and reads from config. So you can pass dummy/empty values for those props from the Ignizia page that renders StreamOnlyWindow.
- Ensure the wrapper div uses `headerHeight` as a prop (e.g. default 60, or 0 when embedded) so the stream area fills the main content area.

---

### Step 4: Create a single “Omniverse viewer” page component

- **File**: e.g. `components/OmniverseViewerPage.tsx` (or `components/omniverse/OmniverseViewerPage.tsx`).
- **Responsibility**:
  - Render **StreamOnlyWindow** with the props it expects (`sessionId`, `backendUrl`, `signalingserver`, `signalingport`, `mediaserver`, `mediaport`, `accessToken`, `onStreamFailed`). For local mode these can be placeholders (e.g. empty string, 0); AppStream does not use them when `source === 'local'`.
  - Pass **headerHeight** appropriate for embedding (e.g. 0) so the stream uses the full main content area.
  - Optionally show a short “Connecting to Omniverse…” or reuse the viewer’s loading state if exposed; do not remove or simplify the existing streaming behavior.
- This component is the only place in Ignizia that imports StreamOnlyWindow and the Omniverse-specific config/components.

---

### Step 5: Expose `/Omniverse` via React Router

- Install `react-router-dom` and wrap the app in `BrowserRouter`.
- **Routing design**:
  - Keep the existing app shell (sidebar, header, main content area) for both `/` and `/Omniverse`.
  - **Route `/`**: Render the current section-based content (Dashboard, Portal, Analytics, etc.) as today.
  - **Route `/Omniverse`**: Render the Omniverse viewer page (the component that renders StreamOnlyWindow) in the **same** main content area.
- **Exact files to touch**:
  - **`index.tsx`**: Wrap the root in `<BrowserRouter>` (or `<Router>` with the chosen router type).
  - **`App.tsx`**: Use `<Routes>` and `<Route>` so that:
    - The layout (sidebar + header + main) is shared.
    - Inside the main content: if path is `/Omniverse`, render the Omniverse viewer page; otherwise render the existing `renderMainContent()` (section-based).
  - Ensure that when the user opens `https://<host>/Omniverse` (e.g. after login), they see the layout and the viewer in the main area. No assumptions about a separate backend; the viewer runs entirely in the browser and connects to the Kit app using `stream.config.json`.

---

### Step 6: Sidebar and navigation

- **Sidebar**: Add an entry for “Omniverse” (e.g. label “Omniverse”, icon such as `view_in_ar` or `videocam`).
- **Behavior**:
  - Clicking “Omniverse” should **navigate to `/Omniverse`** (e.g. `navigate('/Omniverse')`) so the URL is exactly `/Omniverse`.
  - When the URL is `/Omniverse`, the sidebar should show “Omniverse” as the active item (e.g. use `useLocation().pathname` and treat pathname `=== '/Omniverse'` as the Omniverse section).
- **Types**: Extend `MainSection` (or equivalent) with `'Omniverse'` only if you use it for highlighting; the actual content is driven by the route, not by section state, so you can either add `'Omniverse'` to the type and set it when pathname is `/Omniverse`, or derive “active section” from pathname for the Omniverse case.
- **Other items**: Keep existing behavior (e.g. set section and navigate to `/` when clicking Dashboard, Portal, etc., so the app stays on `/` with the correct section).

---

### Step 7: Vite and TypeScript

- **vite.config.ts**: Add `vite-plugin-externals` and the same `GFN` external as in the web-viewer-sample so the Omniverse library does not break the build. This is minimal and does not change how the Kit app or any backend runs.
- **tsconfig.json**: Ensure `"resolveJsonModule": true` so that `import StreamConfig from '../../stream.config.json'` (or similar) compiles.

---

### Step 8: No backend or launch changes

- **Do not** add or change any backend service for streaming; the viewer talks directly from the browser to the Kit app (signaling on 127.0.0.1:49100 for local).
- **Do not** change how the Omniverse Kit app is launched (`repo.bat launch ...`). The prototype only hosts the viewer UI and assumes the Kit app is already running.

---

## 3. Files and parts to change (summary)

| Location | Change |
|----------|--------|
| `package.json` | Add `@nvidia/omniverse-webrtc-streaming-library@5.6.0`, `prop-types`, `react-router-dom`; optionally `vite-plugin-externals` in devDependencies. |
| `stream.config.json` (new, repo root) | Add file with `source: "local"` and `local: { server, signalingPort, mediaPort }` as above. |
| `components/omniverse/AppStream.tsx` | Copy from sample; fix `stream.config.json` import path; import `AppStream.css`. |
| `components/omniverse/StreamOnlyWindow.tsx` | Copy from sample; take `headerHeight` as optional prop (default 60); use it for layout so embedded use can pass 0. |
| `components/omniverse/AppStream.css` | Copy from sample. |
| `components/OmniverseViewerPage.tsx` | New; render StreamOnlyWindow with placeholder props and headerHeight 0. |
| `App.tsx` | Integrate `BrowserRouter`, `Routes`, `Route path="/Omniverse"` and `Route path="/"`; in main content, render Omniverse viewer when pathname is `/Omniverse`, else `renderMainContent()`. |
| `index.tsx` | Wrap root in `BrowserRouter`. |
| `components/Sidebar.tsx` | Add Omniverse item; on click navigate to `/Omniverse`; use pathname to mark Omniverse active when at `/Omniverse`. |
| `types.ts` | Add `'Omniverse'` to `MainSection` if used for sidebar highlight. |
| `vite.config.ts` | Add externals plugin and `GFN` external. |
| `tsconfig.json` | Add `"resolveJsonModule": true`. |

---

## 4. How the viewer connects (unchanged behavior)

- The browser loads the Ignizia app; user goes to `/Omniverse`.
- The Omniverse viewer page mounts and renders **StreamOnlyWindow** → **AppStream**.
- **AppStream** reads `stream.config.json`; sees `source: 'local'`; uses `StreamConfig.local.server` (127.0.0.1), `signalingPort` (49100), `mediaPort` (null).
- It calls `AppStreamer.connect()` with `StreamType.DIRECT` and that config. The already running Kit app is listening on that signaling port; the WebRTC connection is established the same way as in the standalone web-viewer-sample.
- No backend or proxy is required; no changes to the Kit app launch process.

---

## 5. Non-goals (out of scope)

- Changing how the Omniverse Kit app is launched.
- Redesigning UI or making it production-ready.
- Reimplementing or optimizing streaming logic.
- Adding new backend services or assumptions beyond “Kit app already running and stream.config.json points to it.”

This plan is limited to **functionality only**: embed the existing viewer and expose it at `/Omniverse` with the same connection behavior as the working sample.