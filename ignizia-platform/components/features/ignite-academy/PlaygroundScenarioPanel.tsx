'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';

const metrics = [
  { label: 'Temperature', value: 60 },
  { label: 'Load', value: 80 },
  { label: 'Alignment', value: 35 },
];

const actions = ['Recalibrate', 'Inspect sensor', 'Pause line'];

export function PlaygroundScenarioPanel() {
  const [active, setActive] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Playground Mode
      </div>

      <AnimatePresence mode="wait">
        {!active ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scenario</p>
              <p className="mt-1 font-medium text-slate-900">Robot Arm Misalignment</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Difficulty</span>
                <span className="flex gap-0.5">
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-2 w-2 rounded-full ${i <= 2 ? 'bg-warning' : 'bg-slate-200'}`}
                    />
                  ))}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Time</span>{' '}
                <span className="font-medium text-slate-900">5 min</span>
              </div>
            </div>
            <Button onClick={() => setActive(true)} variant="primary" size="lg" className="w-full gap-2">
              <Play className="h-5 w-5" />
              Run Simulation
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Machine State
            </p>
            <div className="space-y-3">
              {metrics.map((m, idx) => {
                const barColors = ['bg-warning', 'bg-success', 'bg-brand-blue'] as const;
                return (
                  <div key={m.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-600">{m.label}</span>
                      <span className="font-medium text-slate-900">{m.value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${m.value}%` }}
                        className={`h-full rounded-full ${barColors[idx]}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Actions
            </p>
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <Button key={a} variant="secondary" size="sm">
                  {a}
                </Button>
              ))}
            </div>
            <Button onClick={() => setActive(false)} variant="ghost" size="sm" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Exit
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
