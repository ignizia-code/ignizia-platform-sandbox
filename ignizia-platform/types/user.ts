/**
 * User Types
 */

export type UserRole =
  | 'Plant Manager'
  | 'Operations Manager'
  | 'Line Manager'
  | 'HR Manager'
  | 'Leather Cutter'
  | 'Procurement';

export const USER_ROLES: UserRole[] = [
  'Plant Manager',
  'Operations Manager',
  'Line Manager',
  'HR Manager',
  'Leather Cutter',
  'Procurement',
];

// Leadership roles that can access governance dashboard
export const LEADERSHIP_ROLES: UserRole[] = ['Plant Manager', 'Operations Manager', 'HR Manager'];

export function isLeadershipRole(role: UserRole): boolean {
  return LEADERSHIP_ROLES.includes(role);
}

export interface User {
  id: string;
  role: UserRole;
  name?: string;
  avatar?: string;
  /** Authenticated employee id for employee-based login */
  employeeId?: string;
  /** Optional: linked persona id for welcome and personalization */
  personaId?: string;
  /** Optional: for future auth lookup */
  email?: string;
}
