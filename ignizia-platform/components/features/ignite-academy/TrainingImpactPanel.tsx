'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TRUSTED_SKILLS_ACADEMY_MOCK } from '@/lib/skills/trustedSkills';

const activity = [
  { label: 'Simulations', value: 70 },
  { label: 'Lessons', value: 50 },
  { label: 'Team Drills', value: 30 },
];

const growth = TRUSTED_SKILLS_ACADEMY_MOCK.map((s, i) => ({
  skill: s.name,
  value: [12, 18, 9][i] ?? 10,
}));

export function TrainingImpactPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Training Activity
      </div>

      <div className="mb-6 space-y-3">
        {activity.map((a, i) => {
          const barColors = ['bg-brand-blue', 'bg-success', 'bg-brand-orange'] as const;
          return (
          <div key={a.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-600">{a.label}</span>
              <span className="font-medium text-slate-900">{a.value}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${a.value}%` }}
                transition={{ delay: 0.45 + i * 0.05 }}
                className={`h-full rounded-full ${barColors[i]}`}
              />
            </div>
          </div>
          );
        })}
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Skill Growth
        </p>
        <div className="space-y-2">
          {growth.map((g, i) => {
            const growthColors = ['text-brand-blue', 'text-success', 'text-brand-orange'] as const;
            return (
            <div key={g.skill} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{g.skill}</span>
              <span className={`text-sm font-semibold ${growthColors[i]}`}>+{g.value}%</span>
            </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
