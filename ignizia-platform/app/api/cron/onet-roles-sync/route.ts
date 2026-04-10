import { NextRequest, NextResponse } from 'next/server';
import { runSelectedOnetRoleSync } from '@/lib/onet/rolesSync';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) return true;
  const receivedSecret =
    request.headers.get('x-cron-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';
  return receivedSecret === configuredSecret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runSelectedOnetRoleSync();
    return NextResponse.json({
      ok: true,
      message: 'Scheduled O*NET role sync completed.',
      roleCount: result.roleCount,
      employeeCount: result.employeeCount,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
