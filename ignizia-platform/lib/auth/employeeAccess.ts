import type { UserRole } from '@/types';

export interface EmployeeLoginRecord {
  id: string;
  name: string;
  roleId: string;
  roleName: string;
}

export function resolveAppRoleForEmployee(employee: EmployeeLoginRecord): UserRole {
  const name = employee.name.trim().toLowerCase();
  const roleName = employee.roleName.trim().toLowerCase();

  // Explicit leadership identities for login behavior.
  if (name === 'alex') return 'Plant Manager';
  if (name === 'pedram') return 'Operations Manager';
  if (name === 'hana') return 'HR Manager';

  // Role-name-based resolution for non-leadership employees.
  if (roleName === 'manufacturing engineers') return 'Line Manager';
  if (roleName === 'human resources managers') return 'HR Manager';

  // Default for non-leadership workforce users.
  return 'Leather Cutter';
}

