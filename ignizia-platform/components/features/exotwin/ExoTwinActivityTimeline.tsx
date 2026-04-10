'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Zap, Award, TrendingUp, Lightbulb, ChevronDown, ExternalLink } from 'lucide-react';

type TimeRange = 'today' | 'week' | 'month';

interface ActivityItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  color: string;
  detail?: string;
  linkLabel?: string;
  period: TimeRange;
}

const todayItems: ActivityItem[] = [
  {
    id: 't1',
    icon: BookOpen,
    text: 'Completed micro lesson',
    color: 'text-brand-blue',
    detail: 'Torque Safety refresher — 5 min. Score: 92%.',
    linkLabel: 'View lesson',
    period: 'today',
  },
  {
    id: 't2',
    icon: Zap,
    text: 'Simulation practiced',
    color: 'text-brand-green',
    detail: 'Robot arm calibration. Time: 12 min.',
    linkLabel: 'View simulation',
    period: 'today',
  },
  {
    id: 't3',
    icon: Award,
    text: 'New certification recorded',
    color: 'text-brand-orange',
    detail: 'Safety Compliance — valid until Dec 2025.',
    linkLabel: 'View credential',
    period: 'today',
  },
];

const weekItems: ActivityItem[] = [
  {
    id: 'w1',
    icon: TrendingUp,
    text: 'Skill improvement detected',
    color: 'text-brand-green',
    detail: 'Troubleshooting +3%. Based on last 5 sessions.',
    period: 'week',
  },
  {
    id: 'w2',
    icon: Lightbulb,
    text: 'Coaching module recommended',
    color: 'text-brand-blue',
    detail: 'ExoTwin suggested "Equipment Maintenance" — completed today.',
    period: 'week',
  },
];

const monthItems: ActivityItem[] = [
  {
    id: 'm1',
    icon: Award,
    text: 'Certification renewed',
    color: 'text-brand-orange',
    detail: 'Assembly Operations — renewed for 12 months.',
    period: 'month',
  },
  {
    id: 'm2',
    icon: BookOpen,
    text: '4 micro lessons completed',
    color: 'text-brand-blue',
    detail: 'Total time: 28 min. Topics: Safety, Calibration, Hydraulics.',
    period: 'month',
  },
];

const RANGES: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

export function ExoTwinActivityTimeline() {
  const [range, setRange] = useState<TimeRange>('today');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = useMemo(() => {
    if (range === 'today') return todayItems;
    if (range === 'week') return [...todayItems, ...weekItems];
    return [...todayItems, ...weekItems, ...monthItems];
  }, [range]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          Activity
        </div>
        <h3 className="mt-2 text-lg font-bold text-slate-900">ExoTwin Activity Timeline</h3>
        <p className="text-sm text-slate-500">Your twin learns continuously</p>
      </div>

      {/* Time range tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRange(r.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              range === r.value ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="wait">
          {items.map((item, i) => {
            const Icon = item.icon;
            const isExpanded = expandedId === item.id;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.03 }}
                className={`rounded-lg border overflow-hidden ${
                  isExpanded ? 'border-brand-blue/30 bg-brand-blue/5' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-100/80"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                  <span className="flex-1 text-sm text-slate-700">{item.text}</span>
                  {(item.detail || item.linkLabel) && (
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>
                <AnimatePresence>
                  {isExpanded && item.detail && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200/80 bg-white px-4 py-3"
                    >
                      <p className="text-sm text-slate-600">{item.detail}</p>
                      {item.linkLabel && (
                        <button
                          type="button"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {item.linkLabel}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
