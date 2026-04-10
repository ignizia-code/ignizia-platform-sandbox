'use client';

import React from 'react';
import type { UserRole } from '@/types';
import { useTalentStudioDataForControlTower } from './useTalentStudioData';
import {
  FactorySkillsOverview,
  ProductionAlerts,
  SkillsIntelligence,
} from '@/components/features/talent-studio/shared';

interface ControlTowerRoleViewProps {
  userRole: UserRole | null | undefined;
  children: React.ReactNode;
}

/**
 * All roles use the same advanced lens design. Children (Dashboard content) is always rendered.
 * The Dashboard is role-aware and renders appropriate content.
 */
export function ControlTowerRoleView({ userRole, children }: ControlTowerRoleViewProps) {
  return <>{children}</>;
}

/** Shared card shell and header for HR lenses - matches AdvancedLensCards design */
function HRLensCard({
  index,
  title,
  onSimulateScenario,
  children,
  className = '',
}: {
  index: number;
  title: string;
  onSimulateScenario: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br from-white via-brand-blue/5 to-brand-green/5 dark:from-card-dark dark:via-brand-blue/10 dark:to-card-dark rounded-2xl p-5 xl:p-6 shadow-sm border border-brand-blue/20 dark:border-brand-blue/25 hover:shadow-md transition-shadow flex flex-col min-w-0 h-full ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shadow-md shadow-slate-200 dark:shadow-none">
            {index}
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide leading-tight">
            {title}
          </h3>
        </div>
        <button
          onClick={onSimulateScenario}
          className="text-[10px] font-bold bg-action/10 hover:bg-action/20 text-action px-2.5 py-1 rounded-full transition-colors shrink-0 whitespace-nowrap"
        >
          Simulate Scenario
        </button>
      </div>
      {children}
    </div>
  );
}

/** HR Manager Control Tower - 5 lenses with Talent Studio widgets, same card design and grid as other personas */
export function HRManagerControlTower({
  onSimulateScenario,
}: {
  onSimulateScenario: () => void;
}) {
  const data = useTalentStudioDataForControlTower();

  return (
    <>
      {/* 1. Workforce Readiness - same card and grid as AdvancedLensCards card 1 */}
      <HRLensCard
        index={1}
        title="Workforce Readiness"
        onSimulateScenario={onSimulateScenario}
        className="col-span-12 lg:col-span-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5 tracking-wide">
              Crew Ready
            </div>
            <div className="text-2xl font-bold text-primary">{92}%</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5 tracking-wide">
              Trust Index
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">0.71</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5 tracking-wide">
              Roles At Risk
            </div>
            <div className="text-xl font-bold text-warning">{data.factorySkillsOverview.highRiskCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">high-risk production roles</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5 tracking-wide">
              Skills Gap Load
            </div>
            <div className="text-xl font-bold text-danger">{data.factorySkillsOverview.criticalSkillsGapCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">critical capabilities to close</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-brand-blue/15 dark:border-brand-blue/25">
          <div className="text-[10px] uppercase tracking-wide font-semibold text-brand-blue mb-2">
            What To Act On
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <p>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {data.factorySkillsOverview.overloadedCount}
              </span>{' '}
              overloaded employees are creating near-term redeployment pressure.
            </p>
            <p>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {data.factorySkillsOverview.underutilizedCount}
              </span>{' '}
              employees can support rapid cross-training for exposed roles.
            </p>
          </div>
        </div>
      </HRLensCard>

      {/* 2. Skills Intelligence */}
      <HRLensCard
        index={2}
        title="Skills Intelligence"
        onSimulateScenario={onSimulateScenario}
        className="col-span-12 lg:col-span-4"
      >
        <div className="flex-1 min-h-0 flex flex-col">
          <SkillsIntelligence
            skills={data.skillsIntelligence.skills}
            skillCoverage={data.skillsIntelligence.skillCoverage}
            embedded
            compact
            maxItems={4}
          />
        </div>
      </HRLensCard>

      {/* 3. Factory Skills & Production Readiness (includes Production Alerts) - wide card like AdvancedLensCards card 4 */}
      <HRLensCard
        index={3}
        title="Factory Skills & Production Readiness"
        onSimulateScenario={onSimulateScenario}
        className="col-span-12 lg:col-span-4"
      >
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <FactorySkillsOverview {...data.factorySkillsOverview} embedded compact />
          <div className="border-t border-brand-blue/15 dark:border-brand-blue/25 pt-3.5">
            <div className="text-[10px] uppercase font-bold text-brand-blue mb-2 tracking-wider">
              Production Alerts
            </div>
            <ProductionAlerts alerts={data.productionAlerts} showCount={2} embedded compact />
          </div>
        </div>
      </HRLensCard>

      {/* 4. Psychological Safety & Trust - col-span-7 to match AdvancedLensCards layout */}
      <HRLensCard
        index={4}
        title="Psychological Safety & Trust"
        onSimulateScenario={onSimulateScenario}
        className="col-span-12 lg:col-span-7"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5">
              Psych Safety
            </div>
            <div className="text-2xl font-bold text-primary">69%</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5">
              Trust Sentiment
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">Stable</div>
          </div>
        </div>
      </HRLensCard>

      {/* 5. Learning Impact - col-span-5 to match AdvancedLensCards layout */}
      <HRLensCard
        index={5}
        title="Learning Impact"
        onSimulateScenario={onSimulateScenario}
        className="col-span-12 lg:col-span-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5">
              Retention
            </div>
            <div className="text-2xl font-bold text-primary">78%</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5">
              Soft Skill Growth
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">+10%</div>
          </div>
        </div>
      </HRLensCard>
    </>
  );
}
