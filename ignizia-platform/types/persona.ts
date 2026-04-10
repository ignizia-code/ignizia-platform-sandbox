/**
 * Persona types for role-based profiles (e.g. Maria — Frontline Operator).
 * Stored in DB and shown on welcome screen after login.
 */

import type { UserRole } from './user';

export interface Persona {
  id: string;
  /** Display name, e.g. "Maria" */
  name: string;
  /** Role label, e.g. "Frontline Operator (Assembly Line)" */
  roleLabel: string;
  /** Maps to app permission role */
  appRole: UserRole;
  /** Short context blurb */
  context: string;
  /** Bullet points */
  responsibilities: string[];
  goals: string[];
  painPoints: string[];
  /** How IGNIZIA supports this persona */
  igniziaSupport: string[];
  /** Optional: digital literacy, tools used, etc. */
  meta?: Record<string, string>;
}
