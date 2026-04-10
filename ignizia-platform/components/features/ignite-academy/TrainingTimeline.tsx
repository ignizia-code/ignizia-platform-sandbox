'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, FlaskConical, Users } from 'lucide-react';

const today = [
  { icon: FlaskConical, text: 'Simulation completed', color: 'text-brand-blue' },
  { icon: BookOpen, text: 'Micro lesson finished', color: 'text-brand-green' },
  { icon: Users, text: 'Team drill recorded', color: 'text-brand-orange' },
];

const yesterday = [
  { icon: BookOpen, text: 'Safety refresher', color: 'text-brand-pink' },
  { icon: FlaskConical, text: 'Calibration practice', color: 'text-brand-blue' },
];

export function TrainingTimeline() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Training Timeline
      </div>

      <div className="space-y-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Today</p>
          <div className="space-y-2">
            {today.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                  <span className="text-sm text-slate-700">{item.text}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Yesterday
          </p>
          <div className="space-y-2">
            {yesterday.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.05 }}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-2.5"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                  <span className="text-sm text-slate-600">{item.text}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
