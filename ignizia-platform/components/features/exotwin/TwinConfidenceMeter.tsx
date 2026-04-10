'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';

interface Metric {
  id: string;
  label: string;
  value: number;
  color: 'brand-blue' | 'success' | 'warning';
  tooltip: string;
  factors: string[];
}

const metrics: Metric[] = [
  {
    id: 'robotics',
    label: 'Troubleshooting',
    value: 71,
    color: 'brand-blue',
    tooltip: 'Based on recent practice, simulations, and certifications.',
    factors: [
      'Troubleshooting sessions (last 30 days)',
      'Simulation scores: Equipment diagnostics',
      'Certification: Quality Control Analysis',
      'Micro-lesson completion rate',
    ],
  },
  {
    id: 'safety',
    label: 'Safety Readiness',
    value: 92,
    color: 'success',
    tooltip: 'Safety certifications and refresher completion.',
    factors: [
      'Safety Compliance certification current',
      'Torque Safety refresher completed',
      'No overdue safety modules',
      'Incident record: none',
    ],
  },
  {
    id: 'leadership',
    label: 'Leadership Potential',
    value: 45,
    color: 'warning',
    tooltip: 'Early signal from mentoring and peer support activity.',
    factors: [
      'Mentoring credits: 2 sessions',
      'Peer help in forum: 3 replies',
      'No formal leadership training yet',
      'Suggested: Team lead shadowing module',
    ],
  },
];

const colorClasses = {
  'brand-blue': 'text-brand-blue bg-brand-blue',
  success: 'text-success bg-success',
  warning: 'text-warning bg-warning',
};

export function TwinConfidenceMeter() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [modalMetric, setModalMetric] = useState<Metric | null>(null);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
      >
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            ExoTwin Confidence
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">AI Signal Visualization</h3>
        </div>

        <div className="space-y-4">
          {metrics.map((m, i) => {
            const isHovered = hoveredId === m.id;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="relative"
              >
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-slate-600">{m.label}</span>
                  <span className={`font-bold ${colorClasses[m.color].split(' ')[0]}`}>
                    {m.value}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalMetric(m)}
                  onMouseEnter={() => setHoveredId(m.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="group relative w-full rounded-lg p-1 -m-1 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-1"
                  aria-label={`${m.label}: ${m.value}%. ${m.tooltip} Click for details.`}
                >
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.value}%` }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                      className={`h-full rounded-full ${colorClasses[m.color].split(' ')[1]}`}
                    />
                  </div>
                  {/* Hover tooltip */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute bottom-full left-0 z-10 mb-1 w-48 rounded-lg bg-slate-800 px-2.5 py-2 text-xs text-white shadow-lg"
                      >
                        {m.tooltip}
                        <span className="mt-1 block text-slate-300">Click for details</span>
                        <div className="absolute left-3 top-full h-0 w-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-800" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Drill-down modal */}
      <AnimatePresence>
        {modalMetric && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalMetric(null)}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confidence-modal-title"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-card-light p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 id="confidence-modal-title" className="text-lg font-bold text-slate-900">
                  {modalMetric.label}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalMetric(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-4 text-sm text-slate-600">{modalMetric.tooltip}</p>
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${modalMetric.value}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full ${
                      modalMetric.color === 'success'
                        ? 'bg-success'
                        : modalMetric.color === 'warning'
                          ? 'bg-warning'
                          : 'bg-brand-blue'
                    }`}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700">{modalMetric.value}%</span>
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Contributing factors
              </p>
              <ul className="space-y-2">
                {modalMetric.factors.map((factor, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
                    {factor}
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 w-full"
                onClick={() => setModalMetric(null)}
              >
                Close
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
