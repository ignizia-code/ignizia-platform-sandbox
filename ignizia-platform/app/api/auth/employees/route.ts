import { NextResponse } from 'next/server';
import { DEFAULT_ORG_ID, loadTalentStudioState } from '@/lib/talentStudioStorage/supabase';

export async function GET() {
  const loaded = await loadTalentStudioState(DEFAULT_ORG_ID);
  if (!loaded) {
    return NextResponse.json([]);
  }

  const rolesById = new Map(loaded.roles.map((role) => [role.id, role.name]));
  const employees = loaded.employees
    .map((employee) => {
      const roleName = rolesById.get(employee.roleId) ?? 'Unknown role';
      return {
        id: employee.id,
        name: employee.name,
        roleId: employee.roleId,
        roleName,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(employees);
}

