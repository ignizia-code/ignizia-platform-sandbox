import { NextRequest, NextResponse } from 'next/server';

/**
 * Omniverse run metrics payload from the Kit app extension.
 * POSTed on each run completion when PLATFORM_METRICS_URL is set.
 */
export interface OmniverseRunMetricsPayload {
  runId?: string;
  initiativeId?: string;
  timestamp?: string;
  durationSeconds?: number;
  conveyorSpeedSetpoint?: number;
  conveyorSpeedAvg?: number;
  conveyorSpeedMax?: number;
  boxTotal?: number;
  boxSuccess?: number;
  boxDropped?: number;
  errorRate?: number;
  throughputBoxesPerMinute?: number;
  dropsPerMinute?: number;
  [key: string]: unknown;
}

/** In-memory store for latest run metrics (Strategy Studio polls this via GET). */
let latestMetrics: OmniverseRunMetricsPayload | null = null;

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as OmniverseRunMetricsPayload;
    console.log('[Omniverse] Run metrics:', payload);

    latestMetrics = payload;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Omniverse] Run metrics error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to process run metrics', details: String(error) },
      { status: 500 }
    );
  }
}

/** Returns the latest run metrics from Omniverse for the Strategy Studio form. */
export async function GET() {
  return NextResponse.json(latestMetrics ?? {});
}
