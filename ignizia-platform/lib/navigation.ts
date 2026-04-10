/**
 * Navigation configuration for sidebar sections and sub-items.
 */

import type { UserRole } from '@/types';

export const LIVINGOPS_APPS = [
  { id: 'talent-studio', name: 'Talent Studio', icon: 'badge', color: 'bg-rose-500' },
  { id: 'strategy-studio', name: 'Strategy Studio', icon: 'timeline', color: 'bg-indigo-500' },
  { id: 'agent-studio', name: 'Agent Studio', icon: 'smart_toy', color: 'bg-emerald-500' },
  { id: 'workbench', name: 'Workbench', icon: 'construction', color: 'bg-amber-500' },
  { id: 'workflow', name: 'Workflow Builder', icon: 'route', color: 'bg-sky-500' },
  { id: 'enterprise-design-studio', name: 'Enterprise Design Studio', icon: 'architecture', color: 'bg-violet-500' },
  { id: 'intelligence', name: 'Intelligence', icon: 'psychology', color: 'bg-cyan-500' },
  { id: 'foundry', name: 'Foundry', icon: 'science', color: 'bg-orange-500' },
] as const;

export const FACTORYCORTEX_APPS = [
  { id: 'digitizer', name: 'Digitizer', icon: 'scanner', color: 'bg-slate-500' },
  { id: 'live-twin', name: 'Live Twin', icon: 'hub', color: 'bg-blue-500' },
  { id: 'orchestrator', name: 'Orchestrator', icon: 'account_tree', color: 'bg-teal-500' },
  { id: 'control-tower', name: 'Control Tower', icon: 'dashboard', color: 'bg-primary' },
] as const;

export const IGNITE_APPS = [
  { id: 'exotwin', name: 'ExoTwin', icon: 'public', color: 'bg-purple-500' },
  { id: 'academy', name: 'Academy', icon: 'school', color: 'bg-green-500' },
  { id: 'exchange', name: 'Exchange', icon: 'swap_horiz', color: 'bg-pink-500' },
] as const;

export const GOVERNANCE_APPS = [
  { id: 'registry', name: 'Registry', icon: 'list_alt', color: 'bg-slate-600' },
  { id: 'standards', name: 'Standards', icon: 'rule', color: 'bg-indigo-600' },
  { id: 'controls', name: 'Controls', icon: 'tune', color: 'bg-amber-600' },
  { id: 'assurance', name: 'Assurance', icon: 'verified', color: 'bg-emerald-600' },
] as const;

/** Filter LivingOps apps for Leather Cutter - hide Strategy Studio */
export function getLivingOpsAppsForRole(role: UserRole | null) {
  const apps = [...LIVINGOPS_APPS];
  if (role === 'Leather Cutter') {
    return apps.filter((a) => a.id !== 'strategy-studio');
  }
  return apps;
}
