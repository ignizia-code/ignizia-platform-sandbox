'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';

const choices = [
  { id: 'a', label: 'Reset calibration', correct: true },
  { id: 'b', label: 'Inspect sensor', correct: false },
  { id: 'c', label: 'Override system', correct: false },
];

const SCENARIO_LABELS: Record<string, string> = {
  'robot-arm-calibration': 'Robot Arm Calibration',
  'hydraulic-repair': 'Hydraulic Repair',
  'robot-line-failure': 'Robot Line Failure',
};

export interface PrivatePlaygroundProps {
  /** When set (e.g. from Coaching Feed "Start"), show this scenario and optionally auto-scroll. */
  preselectedScenarioId?: string | null;
}

export function PrivatePlayground({ preselectedScenarioId }: PrivatePlaygroundProps) {
  const [phase, setPhase] = useState<'intro' | 'question' | 'outcome'>('intro');
  const [selected, setSelected] = useState<string | null>(null);
  const scenarioLabel =
    preselectedScenarioId && SCENARIO_LABELS[preselectedScenarioId]
      ? SCENARIO_LABELS[preselectedScenarioId]
      : 'Robot Line Failure';

  const handleStart = () => setPhase('question');
  const handleSelect = (id: string) => {
    setSelected(id);
    setTimeout(() => setPhase('outcome'), 600);
  };
  const handleReset = () => {
    setPhase('intro');
    setSelected(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          <Play className="h-3.5 w-3.5" />
          Private Playground
        </div>
        <h3 className="mt-2 text-lg font-bold text-slate-900">Safe Experimentation</h3>
        <p className="text-sm text-slate-500">Practice in simulation before the floor</p>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-slate-200 bg-slate-50 p-6"
          >
            <h4 className="mb-2 font-medium text-slate-900">Simulation: {scenarioLabel}</h4>
            {preselectedScenarioId && (
              <p className="mb-2 text-xs text-brand-blue">Started from recommendation</p>
            )}
            <p className="mb-4 text-sm text-slate-500">
              Scenario Difficulty: Medium • Estimated Time: 6 min
            </p>
            <Button onClick={handleStart} variant="primary" size="lg" className="gap-2">
              <Play className="h-5 w-5" />
              Start Simulation
            </Button>
          </motion.div>
        )}

        {phase === 'question' && (
          <motion.div
            key="question"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
              <p className="text-sm font-medium text-warning">System Failure: Robot Arm Misalignment</p>
              <p className="mt-1 text-sm text-slate-600">What would you do?</p>
            </div>
            <div className="space-y-2">
              {choices.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  disabled={!!selected}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                    selected === c.id
                      ? 'border-brand-blue bg-brand-blue/20'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 disabled:opacity-60'
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 font-medium text-slate-600">
                    {c.id.toUpperCase()}
                  </span>
                  <span className="text-slate-900">{c.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {phase === 'outcome' && (
          <motion.div
            key="outcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-success/30 bg-success/5 p-6"
          >
            <div className="mb-4 flex items-center gap-2 text-success">
              <CheckCircle className="h-6 w-6" />
              <span className="font-semibold">Simulation Outcome</span>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p>Confidence gained: <span className="font-medium text-brand-green">+8%</span></p>
              <p>Skill practiced: <span className="font-medium text-brand-blue">Troubleshooting</span></p>
            </div>
            <Button onClick={handleReset} variant="secondary" size="sm" className="mt-4 gap-2">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
