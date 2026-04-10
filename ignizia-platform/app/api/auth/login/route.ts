import { NextRequest, NextResponse } from 'next/server';
import { getPersonaById, getDefaultPersonaIdForRole } from '@/lib/personas';
import type { User } from '@/types';
import type { UserRole } from '@/types';
import { DEFAULT_ORG_ID, loadTalentStudioState } from '@/lib/talentStudioStorage/supabase';
import { resolveAppRoleForEmployee } from '@/lib/auth/employeeAccess';

/** POST /api/auth/login — body: { employeeId: string } or legacy persona payload */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const employeeId = body.employeeId as string | undefined;
    const personaId = body.personaId as string | undefined;
    const role = body.role as UserRole | undefined;
    const email = body.email as string | undefined;

    if (employeeId) {
      const loaded = await loadTalentStudioState(DEFAULT_ORG_ID);
      if (!loaded) {
        return NextResponse.json(
          { error: 'Could not load employee directory' },
          { status: 500 }
        );
      }

      const employee = loaded.employees.find((item) => item.id === employeeId);
      if (!employee) {
        return NextResponse.json(
          { error: 'Employee not found' },
          { status: 404 }
        );
      }
      const roleName = loaded.roles.find((item) => item.id === employee.roleId)?.name ?? 'Unknown role';
      const appRole = resolveAppRoleForEmployee({
        id: employee.id,
        name: employee.name,
        roleId: employee.roleId,
        roleName,
      });

      const user: User = {
        id: email ?? `user-${employee.id}`,
        role: appRole,
        name: employee.name,
        email: email || undefined,
        employeeId: employee.id,
      };

      return NextResponse.json({
        user,
        employee: {
          id: employee.id,
          name: employee.name,
          roleId: employee.roleId,
          roleName,
        },
      });
    }

    const resolvedId = personaId ?? (role ? getDefaultPersonaIdForRole(role) : null);
    if (!resolvedId) {
      return NextResponse.json(
        { error: 'Missing employeeId (or legacy personaId/role)' },
        { status: 400 }
      );
    }

    const persona = getPersonaById(resolvedId);
    if (!persona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      );
    }

    const user: User = {
      id: email ?? `user-${persona.id}`,
      role: persona.appRole,
      name: persona.name,
      personaId: persona.id,
      email: email || undefined,
    };

    return NextResponse.json({ user, persona });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
