'use client';

import React from 'react';

export type SkillTrend = 'Rising' | 'Stable' | 'Declining';
export type SkillCriticality = 'Emerging' | 'Core' | 'Legacy';

export interface SkillItem {
  id: string;
  name: string;
  category: string;
  trend: SkillTrend;
  criticality: SkillCriticality;
}

export interface SkillCoverageMetric {
  skill: { id: string };
  holdersCount: number;
  strongHoldersCount: number;
}

export interface SkillsIntelligenceProps {
  skills: SkillItem[];
  skillCoverage: SkillCoverageMetric[];
  /** When true, render only inner content (no card wrapper); for use inside Control Tower lens cards. */
  embedded?: boolean;
  /** Limit how many skills are shown. */
  maxItems?: number;
  /** Compact variant for dense dashboard cards. */
  compact?: boolean;
}

const criticalityPillColor: Record<SkillCriticality, string> = {
  Emerging: 'bg-action/10 text-action border-action/20 dark:bg-action/30 dark:text-action dark:border-action/50',
  Core: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/60 dark:text-slate-100 dark:border-slate-600',
  Legacy: 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800',
};

const trendPillColor: Record<SkillTrend, string> = {
  Rising: 'bg-success/10 text-success border-success/20 dark:bg-success/20 dark:text-success dark:border-success/40',
  Stable: 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700',
  Declining: 'bg-danger/10 text-danger border-danger/20 dark:bg-danger/20 dark:text-danger dark:border-danger/40',
};

/**
 * Skills Intelligence widget.
 * Shared between Talent Studio (IGNIZIA View) and Control Tower HR Manager lenses.
 */
export function SkillsIntelligence({
  skills,
  skillCoverage,
  embedded,
  maxItems,
  compact,
}: SkillsIntelligenceProps) {
  const visibleSkills = typeof maxItems === 'number' ? skills.slice(0, maxItems) : skills;

  const content = (
    <>
      {!embedded && (
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
              Skills Intelligence
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Production-Critical Skills
            </div>
          </div>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-action/10 text-action dark:bg-action/20 dark:text-action">
            <span className="material-icons-round text-[18px]">psychology</span>
          </span>
        </div>
      )}

      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
        Tracking capabilities for new machines and critical processes.
      </div>

      <div
        className={`space-y-2 overflow-y-auto pr-1 ${
          embedded ? (compact ? 'max-h-72' : 'max-h-[28rem]') : ''
        }`}
      >
        {visibleSkills.map((skill) => {
          const metric = skillCoverage.find((m) => m.skill.id === skill.id);
          if (!metric) return null;

          const coverageLabel =
            metric.holdersCount === 0
              ? 'No coverage'
              : metric.holdersCount === 1
              ? 'Single operator'
              : metric.holdersCount <= 3
              ? 'Thin coverage'
              : 'Good depth';

          const coverageColor =
            metric.holdersCount === 0
              ? 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-danger'
              : metric.holdersCount === 1
              ? 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-danger'
              : metric.holdersCount <= 3
              ? 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning'
              : 'bg-success/10 text-success dark:bg-success/20 dark:text-success';

          return (
            <div
              key={skill.id}
              className={`rounded-xl border px-3 py-2.5 flex flex-col gap-1.5 min-w-0 ${
                compact
                  ? 'border-brand-blue/15 dark:border-brand-blue/25 bg-brand-blue/5 dark:bg-brand-blue/10'
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-50 truncate">
                      {skill.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full border ${criticalityPillColor[skill.criticality]}`}
                    >
                      {skill.criticality}
                    </span>
                    {!compact && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${trendPillColor[skill.trend]}`}
                      >
                        <span className="material-icons-round text-[12px]">
                          {skill.trend === 'Rising'
                            ? 'trending_up'
                            : skill.trend === 'Stable'
                            ? 'trending_flat'
                            : 'south_east'}
                        </span>
                        {skill.trend}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 truncate">
                    {skill.category}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${coverageColor}`}
                  >
                    {coverageLabel}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {metric.holdersCount} with skill · {metric.strongHoldersCount} experts
                  </span>
                </div>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    metric.holdersCount === 0
                      ? 'bg-slate-400'
                      : metric.holdersCount === 1
                      ? 'bg-danger'
                      : metric.holdersCount <= 3
                      ? 'bg-warning'
                      : 'bg-success'
                  }`}
                  style={{ width: `${Math.min(metric.holdersCount * 15, 100)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {!compact && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
          Upskill operators on <span className="font-semibold">Emerging</span> technologies to future-proof production.
        </div>
      )}
      {compact && (
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Investor view: top capability gaps and readiness trend in one glance.
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="flex flex-col h-full">{content}</div>;
  }

  return (
    <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-5 flex flex-col h-full">
      {content}
    </div>
  );
}
