/**
 * Trusted set of 35 skills used across Ignite Intelligence Studio (Exotwin, Academy, Exchange).
 * Single source of truth for skill display names in those pages.
 */

export interface TrustedSkill {
  id: string;
  name: string;
}

export const TRUSTED_SKILLS: TrustedSkill[] = [
  { id: 'trusted-skill-1', name: 'Active Learning' },
  { id: 'trusted-skill-2', name: 'Active Listening' },
  { id: 'trusted-skill-3', name: 'Complex Problem Solving' },
  { id: 'trusted-skill-4', name: 'Coordination' },
  { id: 'trusted-skill-5', name: 'Critical Thinking' },
  { id: 'trusted-skill-6', name: 'Equipment Maintenance' },
  { id: 'trusted-skill-7', name: 'Equipment Selection' },
  { id: 'trusted-skill-8', name: 'Installation' },
  { id: 'trusted-skill-9', name: 'Instructing' },
  { id: 'trusted-skill-10', name: 'Judgment and Decision Making' },
  { id: 'trusted-skill-11', name: 'Learning Strategies' },
  { id: 'trusted-skill-12', name: 'Management of Financial Resources' },
  { id: 'trusted-skill-13', name: 'Management of Material Resources' },
  { id: 'trusted-skill-14', name: 'Management of Personnel Resources' },
  { id: 'trusted-skill-15', name: 'Mathematics' },
  { id: 'trusted-skill-16', name: 'Monitoring' },
  { id: 'trusted-skill-17', name: 'Negotiation' },
  { id: 'trusted-skill-18', name: 'Operation and Control' },
  { id: 'trusted-skill-19', name: 'Operations Analysis' },
  { id: 'trusted-skill-20', name: 'Operations Monitoring' },
  { id: 'trusted-skill-21', name: 'Persuasion' },
  { id: 'trusted-skill-22', name: 'Programming' },
  { id: 'trusted-skill-23', name: 'Quality Control Analysis' },
  { id: 'trusted-skill-24', name: 'Reading Comprehension' },
  { id: 'trusted-skill-25', name: 'Repairing' },
  { id: 'trusted-skill-26', name: 'Science' },
  { id: 'trusted-skill-27', name: 'Service Orientation' },
  { id: 'trusted-skill-28', name: 'Social Perceptiveness' },
  { id: 'trusted-skill-29', name: 'Speaking' },
  { id: 'trusted-skill-30', name: 'Systems Analysis' },
  { id: 'trusted-skill-31', name: 'Systems Evaluation' },
  { id: 'trusted-skill-32', name: 'Technology Design' },
  { id: 'trusted-skill-33', name: 'Time Management' },
  { id: 'trusted-skill-34', name: 'Troubleshooting' },
  { id: 'trusted-skill-35', name: 'Writing' },
];

/** Get display name by trusted skill id. */
export function getTrustedSkillNameById(id: string): string | undefined {
  return TRUSTED_SKILLS.find((s) => s.id === id)?.name;
}

/** Normalize a string for name matching (lowercase, trim). */
function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * If the given name (e.g. from ALL_SKILLS or role requirement) matches a trusted skill name
 * (case-insensitive, trimmed), return the trusted skill name for display; otherwise undefined.
 */
export function getTrustedSkillNameByName(resolvedName: string): string | undefined {
  if (!resolvedName) return undefined;
  const normalized = normalizeName(resolvedName);
  const found = TRUSTED_SKILLS.find((s) => normalizeName(s.name) === normalized);
  return found?.name;
}

/**
 * Resolve display name: if resolvedName matches a trusted skill, use it; otherwise return resolvedName.
 * Use after resolving from ALL_SKILLS or skillName so Passport shows trusted names when they align.
 */
export function resolveSkillDisplayName(resolvedName: string | undefined, fallback: string): string {
  const fromTrusted = resolvedName ? getTrustedSkillNameByName(resolvedName) : undefined;
  if (fromTrusted) return fromTrusted;
  return resolvedName ?? fallback;
}

/** Subset of trusted skills for mock UI (team map, impact panel, evidence panel). */
export const TRUSTED_SKILLS_ACADEMY_MOCK = [
  TRUSTED_SKILLS.find((s) => s.name === 'Equipment Maintenance')!,
  TRUSTED_SKILLS.find((s) => s.name === 'Troubleshooting')!,
  TRUSTED_SKILLS.find((s) => s.name === 'Quality Control Analysis')!,
];

/** Subset for Exotwin default Skills Passport fallback (5 items). */
export const TRUSTED_SKILLS_PASSPORT_DEFAULT = [
  TRUSTED_SKILLS.find((s) => s.name === 'Equipment Maintenance')!,
  TRUSTED_SKILLS.find((s) => s.name === 'Quality Control Analysis')!,
  TRUSTED_SKILLS.find((s) => s.name === 'Troubleshooting')!,
  TRUSTED_SKILLS.find((s) => s.name === 'Active Learning')!,
  TRUSTED_SKILLS.find((s) => s.name === 'Critical Thinking')!,
];
