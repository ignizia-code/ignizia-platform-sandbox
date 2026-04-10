'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TRUSTED_SKILLS_ACADEMY_MOCK } from '@/lib/skills/trustedSkills';

const stats = [
  { label: 'Simulation Runs', value: 12 },
  { label: 'Micro Lessons', value: 8 },
  { label: 'Team Drills', value: 3 },
];

const gains = TRUSTED_SKILLS_ACADEMY_MOCK.map((s, i) => ({
  skill: s.name,
  value: [14, 5, 8][i] ?? 5,
}));

export function TrainingEvidencePanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Learning Evidence
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {stats.map((s, i) => {
          const cardColors = [
            'border-brand-blue/30 bg-brand-blue/5',
            'border-success/30 bg-success/5',
            'border-brand-orange/30 bg-brand-orange/5',
          ] as const;
          const textColors = ['text-brand-blue', 'text-success', 'text-brand-orange'] as const;
          return (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 + i * 0.05 }}
            className={`rounded-xl border p-3 text-center ${cardColors[i]}`}
          >
            <p className={`text-2xl font-bold ${textColors[i]}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </motion.div>
          );
        })}
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Skill Gains
        </p>
        <div className="space-y-3">
          {gains.map((g, i) => {
            const barColors = ['bg-brand-blue', 'bg-success', 'bg-brand-orange'] as const;
            return (
            <div key={g.skill}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-700">{g.skill}</span>
                <span className={`font-medium ${i === 0 ? 'text-brand-blue' : i === 1 ? 'text-success' : 'text-brand-orange'}`}>+{g.value}</span>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((k) => {
                  const filled = Math.min(5, Math.ceil(g.value / 4));
                  return (
                    <span
                      key={k}
                      className={`h-3 flex-1 rounded-sm ${k <= filled ? barColors[i] : 'bg-slate-200'}`}
                    />
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
