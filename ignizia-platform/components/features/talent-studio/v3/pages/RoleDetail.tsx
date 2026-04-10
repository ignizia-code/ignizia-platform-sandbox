import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { ArrowLeft, Filter, Gauge, Search, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

type FocusProgressMap = Record<string, number>;

function initialsFromSkill(label: string): string {
  const parts = label.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function formatNumber(value: number | undefined): string {
  return typeof value === 'number' ? value.toFixed(2) : 'N/A';
}

export default function RoleDetail() {
  const { roles, setCurrentPage, params } = useApp();
  const { roleId } = params;

  const [showNonRelevant, setShowNonRelevant] = useState(false);
  const [skillQuery, setSkillQuery] = useState('');
  const [focusedSkillId, setFocusedSkillId] = useState<string | null>(null);
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [motionTick, setMotionTick] = useState(0);
  const [focusProgressById, setFocusProgressById] = useState<FocusProgressMap>({});

  const role = roles.find((r) => r.id === roleId);
  const requirements = role?.requirements ?? [];

  useEffect(() => {
    const timer = window.setTimeout(() => setEntered(true), 30);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMotionTick((prev) => prev + 1);
    }, 16);
    return () => window.clearInterval(interval);
  }, []);

  const mergedRequirements = useMemo(() => {
    const bySkillId = new Map<string, (typeof requirements)[number]>();
    for (const requirement of requirements) {
      const existing = bySkillId.get(requirement.skillId);
      if (!existing) {
        bySkillId.set(requirement.skillId, requirement);
        continue;
      }
      bySkillId.set(requirement.skillId, {
        ...existing,
        importance: Math.max(existing.importance ?? 0, requirement.importance ?? 0),
        level: Math.max(existing.level ?? 0, requirement.level ?? 0),
        weight: Math.max(existing.weight, requirement.weight),
        notRelevant: existing.notRelevant && requirement.notRelevant,
        onetUpdatedAt: existing.onetUpdatedAt ?? requirement.onetUpdatedAt,
      });
    }

    return Array.from(bySkillId.values()).sort((a, b) => {
      const aImportance = a.importance ?? -1;
      const bImportance = b.importance ?? -1;
      if (aImportance !== bImportance) return bImportance - aImportance;
      return (a.skillName ?? a.skillId).localeCompare(b.skillName ?? b.skillId);
    });
  }, [requirements]);

  const relevantRequirements = useMemo(
    () => mergedRequirements.filter((req) => !req.notRelevant),
    [mergedRequirements]
  );
  const nonRelevantCount = mergedRequirements.length - relevantRequirements.length;

  const filteredRequirements = useMemo(() => {
    const source = showNonRelevant ? mergedRequirements : relevantRequirements;
    const query = skillQuery.trim().toLowerCase();
    if (!query) return source;
    return source.filter((req) => {
      const name = (req.skillName ?? req.skillId).toLowerCase();
      const element = (req.elementId ?? '').toLowerCase();
      return name.includes(query) || element.includes(query);
    });
  }, [mergedRequirements, relevantRequirements, showNonRelevant, skillQuery]);

  useEffect(() => {
    if (filteredRequirements.length === 0) {
      setFocusedSkillId(null);
      return;
    }
    if (!focusedSkillId) {
      setFocusedSkillId(filteredRequirements[0].skillId);
      return;
    }
    if (!filteredRequirements.some((req) => req.skillId === focusedSkillId)) {
      setFocusedSkillId(filteredRequirements[0].skillId);
    }
  }, [filteredRequirements, focusedSkillId]);

  const focusedSkill =
    filteredRequirements.find((req) => req.skillId === focusedSkillId) ??
    filteredRequirements[0] ??
    null;

  useEffect(() => {
    const allowed = new Set(filteredRequirements.map((req) => req.skillId));
    setFocusProgressById((prev) => {
      const next: FocusProgressMap = {};
      for (const req of filteredRequirements) {
        next[req.skillId] = prev[req.skillId] ?? 0;
      }
      // keep shape aligned with rendered skills only
      if (Object.keys(prev).length === Object.keys(next).length) {
        return prev;
      }
      for (const key of Object.keys(prev)) {
        if (!allowed.has(key)) continue;
      }
      return next;
    });
  }, [filteredRequirements]);

  useEffect(() => {
    if (filteredRequirements.length === 0) return;

    setFocusProgressById((prev) => {
      const next: FocusProgressMap = { ...prev };

      for (const req of filteredRequirements) {
        const current = prev[req.skillId] ?? 0;
        const speedLinear = 0.06;
        const shouldMoveToCenter = req.skillId === focusedSkillId;
        const target = shouldMoveToCenter ? 1 : 0;

        if (target > current) {
          next[req.skillId] = Math.min(target, current + speedLinear);
        } else if (target < current) {
          next[req.skillId] = Math.max(target, current - speedLinear);
        } else {
          next[req.skillId] = current;
        }
      }

      return next;
    });
  }, [filteredRequirements, focusedSkillId, motionTick]);

  const avgImportance =
    relevantRequirements.length > 0
      ? relevantRequirements.reduce((sum, req) => sum + (req.importance ?? 0), 0) / relevantRequirements.length
      : 0;
  const avgLevel =
    relevantRequirements.length > 0
      ? relevantRequirements.reduce((sum, req) => sum + (req.level ?? 0), 0) / relevantRequirements.length
      : 0;

  const orbitNodes = useMemo(() => {
    const count = filteredRequirements.length;
    if (count === 0) return [];

    const center = 500;
    const baseRadius = count > 34 ? 360 : count > 24 ? 340 : 320;

    return filteredRequirements.map((skill, index) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
      const importance = skill.importance ?? 3;
      const size = Math.max(38, Math.min(56, 34 + importance * 3.8));
      const amp = 3 + (index % 5);
      const freq = 0.45 + ((index % 7) * 0.08);
      const phase = (index * 1.91) % (Math.PI * 2);
      return {
        skill,
        angle,
        size,
        radius: baseRadius + ((index % 3) - 1) * 16,
        amp,
        freq,
        phase,
        zBase: 10 + (index % 5),
      };
    });
  }, [filteredRequirements]);

  const t = (motionTick * 0.08) % 1000;

  const positionedNodes = useMemo(() => {
    return orbitNodes.map((node) => {
      const isFocused = node.skill.skillId === focusedSkillId;
      const isHovered = node.skill.skillId === hoveredSkillId;
      const focusProgress = focusProgressById[node.skill.skillId] ?? 0;

      const driftX = Math.sin(t * node.freq + node.phase) * node.amp;
      const driftY = Math.cos(t * (node.freq * 0.92) + node.phase) * node.amp;
      const orbitX = 500 + Math.cos(node.angle) * node.radius + driftX;
      const orbitY = 500 + Math.sin(node.angle) * node.radius + driftY;

      const selectedRadius = 92;
      const selectedAngle = node.angle + Math.sin(t * 1.15 + node.phase) * 0.12;
      const selectedX = 500 + Math.cos(selectedAngle) * selectedRadius;
      const selectedY = 500 + Math.sin(selectedAngle) * selectedRadius;

      const x = orbitX + (selectedX - orbitX) * focusProgress;
      const y = orbitY + (selectedY - orbitY) * focusProgress;

      return {
        ...node,
        x,
        y,
        isFocused,
        isHovered,
        focusProgress,
        zIndex: isFocused ? 85 : isHovered ? 70 : node.zBase,
      };
    });
  }, [orbitNodes, focusedSkillId, hoveredSkillId, focusProgressById, t]);

  if (!role) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-200 bg-card-light dark:border-slate-700 dark:bg-card-dark">
        <p className="text-slate-500 dark:text-slate-400">Role not found</p>
      </div>
    );
  }

  const onetCredit = role.onetSocCode ? `Synced from O*NET occupation ${role.onetSocCode}.` : null;
  const shouldShowDescription =
    Boolean(role.description) &&
    role.description.trim().toLowerCase() !== (onetCredit ?? '').toLowerCase();

  return (
    <div className="space-y-6 pb-16">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage('roles')}
            className="rounded-full p-2"
            aria-label="Back to roles"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-bold tracking-tight text-primary dark:text-slate-100">
              {role.name}
            </h1>
            {onetCredit && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {onetCredit}
              </p>
            )}
          </div>
          {role.onetLastUpdatedAt && (
            <span className="shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
              Updated {role.onetLastUpdatedAt}
            </span>
          )}
        </div>
        {shouldShowDescription && (
          <p className="max-w-2xl text-slate-600 dark:text-slate-300">
            {role.description}
          </p>
        )}
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-card-light px-4 py-3 dark:border-slate-700 dark:bg-card-dark">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Relevant skills</p>
          <p className="mt-1 font-display text-2xl font-bold text-primary dark:text-slate-100">{relevantRequirements.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-card-light px-4 py-3 dark:border-slate-700 dark:bg-card-dark">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg importance</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">{avgImportance.toFixed(1)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-card-light px-4 py-3 dark:border-slate-700 dark:bg-card-dark">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg level</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">{avgLevel.toFixed(1)}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-card-light p-4 dark:border-slate-700 dark:bg-card-dark">
            <p className="mb-3 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Focused skill</p>

            {focusedSkill ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                    {focusedSkill.skillName ?? focusedSkill.skillId}
                  </p>
                  <Badge variant={focusedSkill.notRelevant ? 'warning' : 'success'}>
                    {focusedSkill.notRelevant ? 'Not relevant' : 'Relevant'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{focusedSkill.elementId ?? focusedSkill.skillId}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Importance</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{formatNumber(focusedSkill.importance)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Level</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{formatNumber(focusedSkill.level)}</p>
                  </div>
                </div>

                <p className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Sparkles size={12} className="text-action" />
                  Selected skill transitions into the inner focus orbit.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No skills match this filter.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-card-light p-4 dark:border-slate-700 dark:bg-card-dark">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium text-slate-800 dark:text-slate-200">Skill quick switch</h3>
              {nonRelevantCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowNonRelevant((prev) => !prev)}
                  className="inline-flex items-center gap-2"
                >
                  <Filter size={14} />
                  {showNonRelevant ? 'Relevant only' : `Include ${nonRelevantCount} non-relevant`}
                </Button>
              )}
            </div>

            <label className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
              <Search size={14} className="text-slate-400" />
              <input
                value={skillQuery}
                onChange={(event) => setSkillQuery(event.target.value)}
                placeholder="Search skill name or element..."
                className="w-full border-0 bg-transparent p-0 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100"
              />
            </label>

            <div className="max-h-[260px] overflow-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {filteredRequirements.map((skill) => {
                  const isFocused = focusedSkillId === skill.skillId;
                  return (
                    <button
                      key={`quick-${skill.skillId}`}
                      type="button"
                      onClick={() => setFocusedSkillId(skill.skillId)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs transition',
                        isFocused
                          ? 'border-action bg-action/10 text-primary'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-action/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      )}
                    >
                      {skill.skillName ?? skill.skillId}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-8">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-card-light p-4 dark:border-slate-700 dark:bg-card-dark">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-blue/10 via-transparent to-brand-green/10" />

            <div className="relative mx-auto aspect-square w-full max-w-[760px]">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-action/20" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-action/30" />

              {positionedNodes.map((node, index) => {
                const label = node.skill.skillName ?? node.skill.skillId;
                return (
                  <button
                    key={`orbit-${node.skill.skillId}`}
                    type="button"
                    onMouseEnter={() => setHoveredSkillId(node.skill.skillId)}
                    onMouseLeave={() => setHoveredSkillId(null)}
                    onFocus={() => setHoveredSkillId(node.skill.skillId)}
                    onBlur={() => setHoveredSkillId(null)}
                    onClick={() => setFocusedSkillId(node.skill.skillId)}
                    className={cn(
                      'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border text-[10px] font-semibold transition-[border-color,box-shadow,background-color] duration-200',
                      node.isFocused
                        ? 'border-action bg-white text-primary shadow-lg shadow-action/20 ring-2 ring-action/30'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-action/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
                      entered ? 'opacity-100' : 'opacity-0'
                    )}
                    style={{
                      left: `${(node.x / 1000) * 100}%`,
                      top: `${(node.y / 1000) * 100}%`,
                      width: `${node.size}px`,
                      height: `${node.size}px`,
                      transform: `translate(-50%, -50%) scale(${node.isFocused ? 1.12 + node.focusProgress * 0.08 : node.isHovered ? 1.07 : 1})`,
                      zIndex: node.zIndex,
                      transitionProperty: 'left, top, transform, border-color, box-shadow, background-color',
                      transitionDuration: '46ms, 46ms, 120ms, 200ms, 200ms, 200ms',
                      transitionTimingFunction: 'linear, linear, ease-out, ease, ease, ease',
                    }}
                    aria-label={label}
                    title={label}
                  >
                    {initialsFromSkill(label)}
                  </button>
                );
              })}

              {(hoveredSkillId || focusedSkillId) && (
                <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {filteredRequirements.find((req) => req.skillId === (hoveredSkillId ?? focusedSkillId))
                    ?.skillName ?? (hoveredSkillId ?? focusedSkillId)}
                </div>
              )}

              {positionedNodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                    No skills match your search.
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              <Gauge size={13} className="text-action" />
              Dynamic entity motion active.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
