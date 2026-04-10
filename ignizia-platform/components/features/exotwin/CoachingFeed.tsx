'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, Zap, AlertTriangle, BookOpen, Play, Calendar, X } from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';

export type CoachingItemType = 'refresher' | 'simulation' | 'challenge' | 'warning';

export interface CoachingItem {
  id: string;
  type: CoachingItemType;
  title: string;
  time: string;
  urgency: 'low' | 'medium' | 'high';
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  whyRecommended?: string;
  scenarioId?: string;
}

const items: CoachingItem[] = [
  {
    id: '1',
    type: 'refresher',
    title: '5 min refresher: Torque Safety',
    time: '5 min',
    urgency: 'low',
    icon: BookOpen,
    description: 'Quick recap of torque specs and safe handling procedures.',
    whyRecommended: 'You haven’t practiced this in 2 weeks; a short refresher keeps certification sharp.',
    scenarioId: undefined,
  },
  {
    id: '2',
    type: 'simulation',
    title: 'Simulation: Robot arm calibration',
    time: '12 min',
    urgency: 'medium',
    icon: Zap,
    description: 'Virtual robot arm calibration scenario with timed steps.',
    whyRecommended: 'Aligns with your target role and your last practice was 5 days ago.',
    scenarioId: 'robot-arm-calibration',
  },
  {
    id: '3',
    type: 'challenge',
    title: 'Practice challenge unlocked',
    time: '8 min',
    urgency: 'low',
    icon: Sparkles,
    description: 'New challenge based on your recent progress.',
    whyRecommended: 'You completed the previous challenge; this one is the next level.',
    scenarioId: undefined,
  },
  {
    id: '4',
    type: 'warning',
    title: 'Skill decay warning: Equipment Maintenance',
    time: '15 min',
    urgency: 'high',
    icon: AlertTriangle,
    description: 'Focused practice on equipment maintenance to prevent skill decay.',
    whyRecommended: 'Predicted 15% decay if not practiced this week.',
    scenarioId: 'equipment-maintenance',
  },
];

const FILTER_OPTIONS: { value: CoachingItemType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'refresher', label: 'Refreshers' },
  { value: 'simulation', label: 'Simulations' },
  { value: 'warning', label: 'Warnings' },
];

export interface CoachingFeedProps {
  onStartSimulation?: (scenarioId: string) => void;
}

export function CoachingFeed({ onStartSimulation }: CoachingFeedProps) {
  const [filter, setFilter] = useState<CoachingItemType | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [scheduledIds, setScheduledIds] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items.filter((i) => !dismissedIds.has(i.id));
    return items.filter((i) => i.type === filter && !dismissedIds.has(i.id));
  }, [filter, dismissedIds]);

  const handleStart = (item: CoachingItem) => {
    if (item.scenarioId) {
      onStartSimulation?.(item.scenarioId);
    }
    setExpandedId(null);
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    setExpandedId(null);
  };

  const handleSchedule = (id: string) => {
    setScheduledIds((prev) => new Set(prev).add(id));
    setExpandedId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Your ExoTwin Recommends
        </div>
        <h3 className="mt-2 text-lg font-bold text-slate-900">Personalized AI Coaching</h3>
        <p className="text-sm text-slate-500">Continuous micro-learning nudges</p>
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === opt.value
                ? 'bg-brand-blue text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, i) => {
            const Icon = item.icon;
            const isExpanded = expandedId === item.id;
            const isScheduled = scheduledIds.has(item.id);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ delay: 0.05 }}
                className={`rounded-xl border overflow-hidden transition-colors ${
                  item.urgency === 'high'
                    ? 'border-warning/40 bg-warning/5'
                    : 'border-slate-200 bg-slate-50'
                } ${isExpanded ? 'ring-2 ring-brand-blue/30' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className={`flex w-full items-center gap-4 p-4 text-left transition-colors ${
                    item.urgency === 'high' && !isExpanded ? 'hover:bg-warning/10' : 'hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      item.urgency === 'high' ? 'bg-warning/20 text-warning' : 'bg-brand-blue/20 text-brand-blue'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {item.time}
                      </span>
                      <Badge
                        variant={
                          item.urgency === 'high' ? 'warning' : item.urgency === 'medium' ? 'info' : 'neutral'
                        }
                      >
                        {item.urgency}
                      </Badge>
                      {isScheduled && (
                        <Badge variant="info" className="gap-1">
                          <Calendar className="h-3 w-3" />
                          Scheduled
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-200/80 bg-white"
                    >
                      <div className="p-4 pt-3 space-y-3">
                        {item.description && (
                          <p className="text-sm text-slate-600">{item.description}</p>
                        )}
                        {item.whyRecommended && (
                          <p className="text-xs text-slate-500">
                            <span className="font-medium text-slate-600">Why recommended:</span>{' '}
                            {item.whyRecommended}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {item.scenarioId && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStart(item);
                              }}
                            >
                              <Play className="h-4 w-4" />
                              Start
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSchedule(item.id);
                            }}
                          >
                            <Calendar className="h-4 w-4" />
                            Schedule
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-slate-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismiss(item.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredItems.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">No recommendations match this filter.</p>
      )}
    </motion.div>
  );
}
