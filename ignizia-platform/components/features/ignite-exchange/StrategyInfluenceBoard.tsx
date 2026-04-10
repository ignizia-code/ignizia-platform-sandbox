'use client';

import React from 'react';
import { motion } from 'framer-motion';

const signals = [
  { title: 'Safety Protocol Update', workerIdeas: 70 },
  { title: 'Maintenance SOP Revision', workerIdeas: 45 },
  { title: 'Line Calibration Standard', workerIdeas: 88 },
];

export function StrategyInfluenceBoard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Frontline Signals
      </div>

      <div className="space-y-4">
        {signals.map((s, i) => {
          const barColors = ['bg-brand-blue', 'bg-success', 'bg-brand-orange'] as const;
          return (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.05 }}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="mb-2 font-medium text-slate-900">{s.title}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Worker Ideas Used</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.workerIdeas}%` }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className={`h-full rounded-full ${barColors[i]}`}
                  />
                </div>
                <span className="text-sm font-bold text-slate-900">{s.workerIdeas}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
