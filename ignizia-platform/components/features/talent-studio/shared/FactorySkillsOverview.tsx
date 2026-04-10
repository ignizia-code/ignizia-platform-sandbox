'use client';

import React from 'react';

export interface FactorySkillsOverviewProps {
  totalEmployees: number;
  teamsCount: number;
  totalRoles: number;
  highRiskCount: number;
  mediumRiskCount: number;
  criticalSkillsCoveragePct: number;
  criticalSkillsGapCount: number;
  criticalSkillsExample?: string;
  overloadedCount: number;
  underutilizedCount: number;
  /** When true, render only inner content (no card wrapper); for use inside Control Tower lens cards. */
  embedded?: boolean;
  /** Compact variant for dense dashboard cards. */
  compact?: boolean;
}

/**
 * Factory Skills & Production Readiness widget.
 * Shared between Talent Studio (IGNIZIA View) and Control Tower HR Manager lenses.
 */
export function FactorySkillsOverview({
  totalEmployees,
  teamsCount,
  totalRoles,
  highRiskCount,
  mediumRiskCount,
  criticalSkillsCoveragePct,
  criticalSkillsGapCount,
  criticalSkillsExample = 'e.g. CNC',
  overloadedCount,
  underutilizedCount,
  embedded,
  compact,
}: FactorySkillsOverviewProps) {
  const metricsGrid = (
    <div className={`grid grid-cols-2 ${compact ? 'gap-2.5' : 'xl:grid-cols-4 gap-3'}`}>
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 flex flex-col gap-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Factory Employees
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {totalEmployees}
            </div>
            <div className="text-[11px] text-slate-400">active staff</div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Across {teamsCount} shifts/areas
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 flex flex-col gap-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Production Roles
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {totalRoles}
            </div>
            <div className="text-[11px] text-slate-400">key functions</div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-0.5">
              <span className="h-1.5 w-4 rounded-full bg-danger"></span>
              {highRiskCount} high risk
            </span>
            <span className="inline-flex items-center gap-0.5">
              <span className="h-1.5 w-4 rounded-full bg-warning"></span>
              {mediumRiskCount} medium
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 flex flex-col gap-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Production Critical Skills
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {criticalSkillsCoveragePct}%
            </div>
            <div className="text-[11px] text-slate-400">fully covered</div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {criticalSkillsGapCount} critical skills have gaps ({criticalSkillsExample})
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 flex flex-col gap-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Shift Balance
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {overloadedCount}
            </div>
            <div className="text-[11px] text-slate-400">overloaded</div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {underutilizedCount} available for redeployment
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-3">
        <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-xs text-slate-400 dark:text-slate-500 ${compact ? 'pb-1 border-b border-brand-blue/10 dark:border-brand-blue/25' : ''}`}>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Real-time view of shop floor coverage, machine operator allocation, and critical skill gaps.
          </p>
          <span className={`inline-flex items-center gap-1 ${compact ? 'text-[10px] px-2 py-1 rounded-full bg-brand-green/10 text-brand-green' : 'text-[10px] sm:text-[11px]'}`}>
            <span className="h-2 w-2 rounded-full bg-success"></span>
            Status: Production Normal · Data refreshed: Today, 06:00 AM
          </span>
        </div>
        {metricsGrid}
        {compact && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {criticalSkillsGapCount} critical skills are below safe coverage threshold.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-6 lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wide mb-3">
            <span className="material-icons-round text-xs">precision_manufacturing</span>
            Ignizia Workforce Intelligence
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight mb-1">
            Factory Skills & Production Readiness
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
            Real-time view of shop floor coverage, machine operator allocation, and critical skill gaps.
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success"></span>
            Status: Production Normal
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="material-icons-round text-[14px]">info</span>
            Data refreshed: Today, 06:00 AM
          </span>
        </div>
      </div>
      <div className="mt-5">{metricsGrid}</div>
    </div>
  );
}
