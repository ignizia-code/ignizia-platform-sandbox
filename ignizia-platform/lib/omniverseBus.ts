/**
 * Omniverse command bus: sends messages to the streamed Kit app via WebRTC data channel.
 * Call markOmniReady() when the stream connects; commands are queued until then.
 * Uses dynamic import to avoid loading the NVIDIA library during SSR (window is not defined).
 */
let ready = false;
const pending: Record<string, unknown>[] = [];

async function getAppStreamer() {
  const { AppStreamer } = await import('@nvidia/omniverse-webrtc-streaming-library');
  return AppStreamer;
}

export function markOmniReady(): void {
  ready = true;
  console.info('[Omniverse] Stream connected — ready to receive commands');
  const msgs = [...pending];
  pending.length = 0;
  getAppStreamer().then((AppStreamer) => {
    for (const msg of msgs) {
      try {
        console.info('[Omniverse] Sending to Omniverse (queued):', msg);
        AppStreamer.sendMessage(JSON.stringify(msg));
      } catch (e) {
        console.warn('[Omniverse] sendMessage failed for queued msg:', e);
      }
    }
  }).catch((e) => console.warn('[Omniverse] markOmniReady: failed to load library', e));
}

export function markOmniNotReady(): void {
  ready = false;
  console.info('[Omniverse] Stream disconnected');
}

function sendOmni(message: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (!ready) {
    console.info('[Omniverse] Queuing (stream not ready):', message);
    pending.push(message);
    return;
  }
  getAppStreamer().then((AppStreamer) => {
    try {
      console.info('[Omniverse] Sending to Omniverse:', message);
      // Send JSON string so Kit receives flat {"event_type","payload"} without library wrapper
      AppStreamer.sendMessage(JSON.stringify(message));
    } catch (e) {
      console.warn('[Omniverse] sendMessage failed:', e);
    }
  }).catch((e) => console.warn('[Omniverse] sendOmni: failed to load library', e));
}

/** Default conveyor prim path for the Ignizia scene. */
export const DEFAULT_CONVEYOR_PATH = '/World/ConveyorBelt_A25_PR_NVD_01/Geometry/SM_ConveyorBelt_A25_Belt02_01';

/**
 * Send conveyor speed command to Omniverse.
 * Kit extension handles event_type "set_speed" and applies payload.value to the conveyor.
 * @param value - Speed value (e.g. 1.8)
 * @param conveyorPath - Optional prim path; uses DEFAULT_CONVEYOR_PATH if omitted
 */
export function setConveyorSpeed(value: number, conveyorPath?: string): void {
  const payload: Record<string, unknown> = { value };
  if (conveyorPath != null) payload.conveyorPath = conveyorPath;
  sendOmni({ event_type: 'set_speed', payload });
}

export function isOmniReady(): boolean {
  return ready;
}
