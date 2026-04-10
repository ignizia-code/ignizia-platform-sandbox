'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, Cpu, Target, BookOpen, Zap, Award } from 'lucide-react';

const flow = [
  { label: 'Human Intent', icon: User },
  { label: 'ExoTwin Intelligence', icon: Cpu },
  { label: 'Guided Growth', icon: Target },
];

export function CollaborationVisualization() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-primary/5 to-slate-900 p-6 shadow-xl"
    >
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        Industry 5.0 • Human + Machine Collaboration
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
        {flow.map((step, i) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.label}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.15 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-brand-blue/30 bg-brand-blue/10">
                  <Icon className="h-7 w-7 text-brand-blue" />
                </div>
                <span className="text-sm font-medium text-slate-300">{step.label}</span>
              </motion.div>
              {i < flow.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.2 + i * 0.15 }}
                  className="hidden h-0.5 w-8 origin-center bg-gradient-to-r from-brand-blue/50 to-brand-blue/50 md:block"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 text-center text-sm text-slate-400"
      >
        Every worker has a digital twin that helps them grow.
      </motion.p>
    </motion.div>
  );
}
