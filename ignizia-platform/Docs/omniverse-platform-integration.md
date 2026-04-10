````markdown
# Omniverse Platform Integration

This document describes how the Omniverse Kit extension sends run metrics to the Ignizia platform and how the platform handles them.

---

## Overview

On each run completion, the Omniverse extension POSTs a JSON payload to the platform. The platform receives it at `POST /api/omniverse/run-metrics` and can store, broadcast, or display the data.

---

## Request / Response Format

### Endpoint

```
POST http://127.0.0.1:3000/api/omniverse/run-metrics
Content-Type: application/json
```

### Request Body (JSON)

| Field | Type | Description |
|-------|------|--------------|
| `runId` | string | Unique identifier for the run |
| `durationSeconds` | number | Total run duration in seconds |
| `boxTotal` | number | Total boxes processed |
| `boxSuccess` | number | Successfully processed boxes |
| `boxDropped` | number | Dropped boxes |
| `errorRate` | number | Error rate (0–1) |
| `throughputBoxesPerMinute` | number | Throughput metric |
| `dropsPerMinute` | number | Drop rate per minute |
| `conveyorSpeedAvg` | number | Average conveyor speed |
| *(additional)* | * | Extension may send extra fields |

### Response (Success)

```json
{ "ok": true }
```

### Response (Error)

```json
{
  "ok": false,
  "error": "Failed to process run metrics",
  "details": "..."
}
```

---

## Extension Configuration

In the Omniverse extension (`extension.py`):

- **`PLATFORM_METRICS_URL`** – Set to `http://127.0.0.1:3000/api/omniverse/run-metrics` to enable POST.
- Set to `None` or `""` to disable POST.

---

## Platform Implementation

### API Route (Next.js App Router)

The route is implemented at:

```
app/api/omniverse/run-metrics/route.ts
```

It:

1. Parses the JSON body
2. Logs the payload to the console
3. Returns `{ ok: true }`

### Extending the Handler

To store, broadcast, or display metrics:

1. **Store in DB** – Add a database call in the route handler.
2. **Broadcast via WebSocket** – Use your WebSocket server to push metrics to connected dashboards.
3. **Update React state** – Use Server-Sent Events (SSE) or polling from the Omniverse page to fetch latest metrics.

---

## Troubleshooting

### POST not reaching the platform

- Ensure the platform is running on port 3000 (`npm run dev` or `next dev`).
- Check that `PLATFORM_METRICS_URL` in the extension points to `http://127.0.0.1:3000/api/omniverse/run-metrics`.
- Verify CORS: the extension runs in the Kit app; requests from `127.0.0.1` to `127.0.0.1` are same-origin.

### 404 on the route

- Confirm the file exists at `app/api/omniverse/run-metrics/route.ts`.
- Restart the Next.js dev server after adding the route.

### 500 or parse errors

- Ensure the extension sends valid JSON with `Content-Type: application/json`.
- Check the server logs for `[Omniverse] Run metrics:` or `[Omniverse] Run metrics error:`.

### Kit app not running

- Rebuild the Kit app with `.\repo.bat build` and run it.
- The extension must be enabled for metrics to be sent.

---

## Platform → Omniverse: Sending Commands

The platform can send commands to the streamed Kit app via the WebRTC data channel. Use this to control conveyor speed, start/stop runs, or other scene parameters.

### Message Format

All commands use the NVIDIA custom message format:

```json
{
  "event_type": "set_speed",
  "payload": { "value": 1.25 }
}
```

### Platform API

- **`setConveyorSpeed(value: number)`** – Sends `{ event_type: "set_speed", payload: { value } }` to Omniverse.
- Commands are queued until the stream is ready; they are sent automatically when the connection is established.

### Kit Extension: Receive and Apply Commands

Add a Kit extension that subscribes to custom events from the streaming client. When it receives `event_type: "set_speed"`, apply `payload.value` to the conveyor prim.

**Prim path and attribute:** Use the same prim path and attribute that your metrics extension uses to read conveyor speed. Replace `CONVEYOR_PRIM_PATH` and `conveyor:speed` below with the actual values from your scene.

```python
# In your Kit extension that handles streaming custom events
def _on_custom_message(self, message: dict):
    if message.get("event_type") != "set_speed":
        return

    payload = message.get("payload") or {}
    try:
        value = float(payload.get("value", 0.0))
    except (TypeError, ValueError):
        return

    def apply():
        self._set_conveyor_speed(value)

    omni.kit.app.get_app().post_to_main_thread(apply)

def _set_conveyor_speed(self, value: float):
    import omni.usd
    from pxr import Usd

    stage = omni.usd.get_context().get_stage()
    if not stage:
        return

    # Replace with your conveyor prim path (same as in metrics extension)
    CONVEYOR_PRIM_PATH = "/World/Conveyor"  # or e.g. /World/Stage/ConveyorBelt
    prim = stage.GetPrimAtPath(CONVEYOR_PRIM_PATH)
    if not prim.IsValid():
        return

    attr = prim.GetAttribute("conveyor:speed")
    if not attr:
        attr = prim.CreateAttribute("conveyor:speed", Usd.ValueTypeNames.Float)

    attr.Set(value)
```

**Subscription:** The exact event stream name depends on your Kit/streaming build. Search for `onCustomEvent`, `custom_event`, or `data_channel` in the streaming extension to find where received messages are emitted, then subscribe there.

### Strategy Studio Flow

1. User creates a strategy and goes to Trial step.
2. User clicks **Launch Omniverse Session** – the platform sends the current form speed (e.g. 1.8 m/s) to Omniverse and navigates to `/Omniverse`.
3. The stream connects; the queued command is sent; the Kit extension applies the speed.
4. User runs the scene in Omniverse; metrics POST to the platform when the run completes.
5. Future: AI can call `setConveyorSpeed(newValue)` to run optimization trials.
- Rebuild the Kit app with `.
repo.bat build` and run it.
- The extension must be enabled for metrics to be sent.
