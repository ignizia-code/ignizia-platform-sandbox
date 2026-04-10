'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui';

const ideas = [
  {
    title: 'Sensor Calibration Shortcut',
    author: 'Maria',
    likes: 34,
    comments: 12,
    steps: ['Review', 'Simulation', 'Validation'],
    currentStep: 0,
  },
  {
    title: 'Torque Check Automation',
    author: 'Chen',
    likes: 21,
    comments: 8,
    steps: ['Review', 'Simulation', 'Validation'],
    currentStep: 1,
  },
];

export function IdeaPostCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Ideas
      </div>

      <div className="space-y-4">
        {ideas.map((idea, i) => (
          <motion.div
            key={idea.title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <h4 className="font-semibold text-slate-900">{idea.title}</h4>
            <p className="mt-1 text-xs text-slate-500">Proposed by: {idea.author}</p>
            <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-4 w-4 text-brand-blue" />
                {idea.likes}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4 text-brand-green" />
                {idea.comments}
              </span>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </p>
              <div className="flex items-center gap-2">
                {idea.steps.map((step, j) => (
                  <React.Fragment key={step}>
                    <span
                      className={`text-xs font-medium ${
                        j <= idea.currentStep ? 'text-brand-blue' : 'text-slate-400'
                      }`}
                    >
                      {step}
                    </span>
                    {j < idea.steps.length - 1 && (
                      <span className="flex items-center gap-1">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            j < idea.currentStep ? 'bg-brand-blue' : 'bg-slate-200'
                          }`}
                        />
                        <span className="text-slate-300">→</span>
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
