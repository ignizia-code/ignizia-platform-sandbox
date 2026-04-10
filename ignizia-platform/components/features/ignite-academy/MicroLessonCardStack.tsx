'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import type { EmployeeCourse } from '@/lib/ignite/academyIntegration';

interface MicroLessonCardStackProps {
  courses: EmployeeCourse[];
  onToggleModuleStatus: (planId: string, stepId: string, markDone: boolean) => void;
}

export function MicroLessonCardStack({ courses, onToggleModuleStatus }: MicroLessonCardStackProps) {
  const modules = courses.flatMap((course) =>
    course.modules.map((module) => {
      const progress = module.status === 'done' ? 100 : module.status === 'doing' ? 50 : 0;
      return {
        planId: course.planId,
        stepId: module.stepId,
        title: module.title,
        courseTitle: course.title,
        progress,
        action: module.status === 'done' ? 'Undo' : module.status === 'doing' ? 'Resume' : 'Start',
        time: module.estimatedHours ? `${module.estimatedHours}h` : 'TBD',
      };
    })
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        Micro-Lesson Card Stack
      </div>
      {modules.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          No active learning modules for this employee yet.
        </div>
      ) : (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {modules.map((lesson, i) => {
          const barColors = ['bg-success', 'bg-brand-blue', 'bg-warning'] as const;
          const accentColors = ['border-success/30', 'border-brand-blue/30', 'border-warning/30'] as const;
          const accent = accentColors[i % 3];
          const barColor = barColors[i % 3];
          return (
          <motion.div
            key={lesson.title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className={`min-w-[200px] flex-1 rounded-xl border ${accent} bg-white p-4 shadow-sm`}
          >
            <h4 className="font-semibold text-slate-900">{lesson.title}</h4>
            <p className="mt-1 text-[11px] text-slate-500 truncate">{lesson.courseTitle}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {lesson.time}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${lesson.progress}%` }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                className={`h-full rounded-full ${barColor}`}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              className="mt-4 w-full gap-1.5"
              onClick={() =>
                onToggleModuleStatus(lesson.planId, lesson.stepId, lesson.action !== 'Undo')
              }
            >
              {lesson.action === 'Resume' || lesson.action === 'Undo' ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {lesson.action}
            </Button>
          </motion.div>
        );
        })}
      </div>
      )}
    </motion.div>
  );
}
