'use client';

import React from 'react';
import { motion } from 'framer-motion';

const badges = [
  { name: 'Safety Champion', color: 'bg-warning/20 text-warning border-warning/30', count: 3 },
  { name: 'Mentor', color: 'bg-brand-blue/20 text-brand-blue border-brand-blue/30', count: 5 },
  { name: 'Workflow Fix', color: 'bg-success/20 text-success border-success/30', count: 2 },
  { name: 'Knowledge Share', color: 'bg-brand-pink/20 text-brand-pink border-brand-pink/30', count: 7 },
];

export function RecognitionBadgesPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Recognition
      </div>

      <div className="space-y-3">
        {badges.map((b, i) => (
          <motion.div
            key={b.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${b.color}`}
            >
              {b.name}
            </span>
            <span className="text-lg font-bold text-slate-900">{b.count}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
