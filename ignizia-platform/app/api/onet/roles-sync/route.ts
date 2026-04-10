import { NextResponse } from 'next/server';
import { runSelectedOnetRoleSync } from '@/lib/onet/rolesSync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await runSelectedOnetRoleSync();
    return NextResponse.json({
      ok: true,
      message: 'O*NET roles synced successfully.',
      roleCount: result.roleCount,
      employeeCount: result.employeeCount,
      roles: result.roles,
      employees: result.employees,
      taskRequirements: result.taskRequirements,
      crewBlueprints: result.crewBlueprints,
      teamBuilds: result.teamBuilds,
      plans: result.plans,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      message: 'Use POST /api/onet/roles-sync to run an O*NET role synchronization.',
    },
    { status: 200 }
  );
}
