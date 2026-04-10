/**
 * Objective Storage — Strategic planning data
 *
 * Stores strategic objectives, KPI targets, adoption goals, and initiative definitions.
 * Separated from strategyStorage which holds execution artifacts (runs, verdicts, run history).
 */

import type { Objective, Initiative } from '@/types';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const OBJECTIVES_KEY = 'strategy:objectives';
const INITIATIVES_KEY = 'strategy:initiatives';

function get<T>(key: string): T | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function set(key: string, value: unknown): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.error(`Failed to save ${key}:`, e);
  }
}

// ---------------------------------------------------------------------------
// Migration from legacy single-object storage
// ---------------------------------------------------------------------------

function migrateFromLegacyStorage(): void {
  if (typeof window === 'undefined') return;
  const obj = localStorage.getItem('strategy:objective');
  const init = localStorage.getItem('strategy:initiative');
  if (obj || init) {
    const objectives: Record<string, Objective> = get(OBJECTIVES_KEY) ?? {};
    const initiatives: Record<string, Initiative> = get(INITIATIVES_KEY) ?? {};
    if (obj) {
      try {
        const o = JSON.parse(obj) as Objective;
        if (o?.id) objectives[o.id] = o;
      } catch {
        // ignore
      }
      localStorage.removeItem('strategy:objective');
    }
    if (init) {
      try {
        const i = JSON.parse(init) as Initiative;
        if (i?.id) initiatives[i.id] = i;
      } catch {
        // ignore
      }
      localStorage.removeItem('strategy:initiative');
    }
    set(OBJECTIVES_KEY, objectives);
    set(INITIATIVES_KEY, initiatives);
  }
}

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------

export function loadObjectiveById(id: string): Objective | null {
  migrateFromLegacyStorage();
  const record = get<Record<string, Objective>>(OBJECTIVES_KEY) ?? {};
  return record[id] ?? null;
}

export function loadAllObjectives(): Objective[] {
  migrateFromLegacyStorage();
  const record = get<Record<string, Objective>>(OBJECTIVES_KEY) ?? {};
  return Object.values(record).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveObjective(obj: Objective): void {
  migrateFromLegacyStorage();
  const record = get<Record<string, Objective>>(OBJECTIVES_KEY) ?? {};
  record[obj.id] = obj;
  set(OBJECTIVES_KEY, record);
}

// ---------------------------------------------------------------------------
// Initiatives
// ---------------------------------------------------------------------------

export function loadInitiativeById(id: string): Initiative | null {
  migrateFromLegacyStorage();
  const record = get<Record<string, Initiative>>(INITIATIVES_KEY) ?? {};
  return record[id] ?? null;
}

export function loadInitiativesByObjectiveId(objectiveId: string): Initiative[] {
  migrateFromLegacyStorage();
  const record = get<Record<string, Initiative>>(INITIATIVES_KEY) ?? {};
  return Object.values(record)
    .filter((i) => i.objectiveId === objectiveId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveInitiative(init: Initiative): void {
  migrateFromLegacyStorage();
  const record = get<Record<string, Initiative>>(INITIATIVES_KEY) ?? {};
  record[init.id] = init;
  set(INITIATIVES_KEY, record);
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetAllObjectiveData(): void {
  const keys = [OBJECTIVES_KEY, INITIATIVES_KEY, 'strategy:objective', 'strategy:initiative'];
  keys.forEach((k) => {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem(k);
    } catch {
      // ignore
    }
  });
}
