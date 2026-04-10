'use client';

import React from 'react';
import { motion } from 'framer-motion';

const scenarios = [
  { title: 'Robot Diagnostics', difficulty: 3, duration: '6 min', participants: '1-3' },
  { title: 'Line Shutdown Drill', difficulty: 2, duration: '4 min', participants: '2-6' },
  { title: 'Sensor Failure', difficulty: 2, duration: '5 min', participants: '1-2' },
  { title: 'Safety Response', difficulty: 1, duration: '3 min', participants: '1-4' },
  { title: 'Emergency Reset', difficulty: 3, duration: '7 min', participants: '1-2' },
];

export function ScenarioLibrary() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Scenario Library
      </div>

      <div className="space-y-3">
        {scenarios.map((s, i) => {
          const accentColors = [
            'border-l-brand-blue',
            'border-l-success',
            'border-l-warning',
            'border-l-brand-pink',
            'border-l-brand-orange',
          ] as const;
          return (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50 ${accentColors[i % 5]}`}
          >
            <p className="font-medium text-slate-900">{s.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                Difficulty{' '}
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3].map((d) => (
                    <img
                      key={d}
                      src="/flame-nobg.png"
                      alt={d <= s.difficulty ? 'Flame on' : 'Flame off'}
                      className={`h-3.5 w-3.5 object-contain ${d <= s.difficulty ? 'opacity-100' : 'opacity-30'}`}
                    />
                  ))}
                </span>
              </span>
              <span>Duration {s.duration}</span>
              <span>Participants {s.participants}</span>
            </div>
          </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
