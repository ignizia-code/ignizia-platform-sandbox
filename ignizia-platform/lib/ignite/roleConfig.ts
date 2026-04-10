/**
 * Role-based configuration for Ignite Intelligence Studio (Exotwin, Academy, Exchange).
 * Used to show/hide panels and control employee context switching by appRole from login.
 */

import type { UserRole } from '@/types';

/** Roles that can switch employee context and see manager-only panels (team views). */
export const IGNITE_MANAGER_ROLES: UserRole[] = [
  'Line Manager',
  'Operations Manager',
  'Plant Manager',
  'HR Manager',
];

export function isIgniteManagerRole(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return IGNITE_MANAGER_ROLES.includes(role);
}

export interface IgniteRoleConfig {
  canSwitchEmployee: boolean;
  academy: {
    showTeamSessionBoard: boolean;
    showSkillCortexTeamMap: boolean;
  };
  exchange: {
    showStrategyInfluenceBoard: boolean;
    showOrganizationSentimentMap: boolean;
  };
}

const DEFAULT_CONFIG: IgniteRoleConfig = {
  canSwitchEmployee: false,
  academy: {
    showTeamSessionBoard: false,
    showSkillCortexTeamMap: false,
  },
  exchange: {
    showStrategyInfluenceBoard: false,
    showOrganizationSentimentMap: false,
  },
};

const MANAGER_CONFIG: IgniteRoleConfig = {
  canSwitchEmployee: true,
  academy: {
    showTeamSessionBoard: true,
    showSkillCortexTeamMap: true,
  },
  exchange: {
    showStrategyInfluenceBoard: true,
    showOrganizationSentimentMap: true,
  },
};

export function getIgniteConfigForRole(role: UserRole | null | undefined): IgniteRoleConfig {
  return isIgniteManagerRole(role) ? MANAGER_CONFIG : DEFAULT_CONFIG;
}

export type IgniteAppId = 'exotwin' | 'academy' | 'exchange';

/** Default Ignite app to open when entering Ignite Intelligence Studio by role. */
export function getDefaultIgniteAppForRole(role: UserRole | null | undefined): IgniteAppId {
  if (!role) return 'exotwin';
  if (isIgniteManagerRole(role)) return 'academy';
  return 'exotwin';
}
