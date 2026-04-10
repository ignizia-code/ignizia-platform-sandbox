'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TRUSTED_SKILLS_ACADEMY_MOCK } from '@/lib/skills/trustedSkills';

const skills = TRUSTED_SKILLS_ACADEMY_MOCK.map((s) => s.name);
const lines = [
  { id: 'A', values: [100, 67, 100] },
  { id: 'B', values: [100, 33, 67] },
  { id: 'C', values: [100, 83, 67] },
];

export function SkillCortexTeamMap() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        SkillCortex Team Map
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px]">
          <thead>
            <tr>
              <th className="pb-2 pr-4 text-left text-xs font-semibold text-slate-500"></th>
              {skills.map((s) => (
                <th key={s} className="pb-2 text-left text-xs font-semibold text-slate-600">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={line.id}>
                <td className="py-2 pr-4 text-sm font-medium text-slate-900">Line {line.id}</td>
                {line.values.map((val, j) => {
                  const barColors = ['bg-success', 'bg-brand-blue', 'bg-brand-orange'] as const;
                  return (
                    <td key={j} className="py-2">
                      <div className="h-4 w-24 overflow-hidden rounded bg-slate-200">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${val}%` }}
                          transition={{ delay: 0.1 + i * 0.05 + j * 0.02 }}
                          className={`h-full rounded ${barColors[j]}`}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
