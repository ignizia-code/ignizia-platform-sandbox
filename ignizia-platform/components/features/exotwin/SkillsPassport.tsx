'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Calendar, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui';
import { TRUSTED_SKILLS_PASSPORT_DEFAULT } from '@/lib/skills/trustedSkills';

type SkillPassportItem = {
  name: string;
  mastery: number;
  lastPracticed: string;
  nextPractice: string;
  decay: string | null;
};

const defaultSkills: SkillPassportItem[] = TRUSTED_SKILLS_PASSPORT_DEFAULT.map((skill, i) => {
  const mock = [
    { mastery: 80, lastPracticed: '2 days ago', nextPractice: 'Recommended: tomorrow', decay: null as string | null },
    { mastery: 100, lastPracticed: '1 week ago', nextPractice: 'Recert in 6 months', decay: null as string | null },
    { mastery: 40, lastPracticed: '3 weeks ago', nextPractice: 'Urgent: this week', decay: '15%' as string | null },
    { mastery: 65, lastPracticed: '5 days ago', nextPractice: 'In 4 days', decay: null as string | null },
    { mastery: 90, lastPracticed: 'Yesterday', nextPractice: 'Maintained', decay: null as string | null },
  ][i] ?? { mastery: 70, lastPracticed: '1 week ago', nextPractice: 'Maintained', decay: null as string | null };
  return { name: skill.name, ...mock };
});

interface SkillsPassportProps {
  skills?: SkillPassportItem[];
}

export function SkillsPassport({ skills = defaultSkills }: SkillsPassportProps) {
  const [selectedSkill, setSelectedSkill] = useState<SkillPassportItem | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-slate-200 bg-card-light p-6 shadow-lg"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            Skills Passport
          </div>
          <h3 className="mt-2 text-lg font-bold text-slate-900">Verified Capabilities</h3>
          <p className="text-sm text-slate-500">Real capability tracking with mastery rings</p>
        </div>
      </div>

      {skills.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          No verified skills available yet for this employee.
        </div>
      ) : (
      <div className="grid gap-3 md:grid-cols-2">
        {skills.map((skill, i) => (
          <motion.button
            key={skill.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            onClick={() => setSelectedSkill(selectedSkill?.name === skill.name ? null : skill)}
            className={`group flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
              selectedSkill?.name === skill.name
                ? 'border-brand-blue/50 bg-brand-blue/10'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-900">{skill.name}</span>
              {skill.decay && (
                <Badge variant="warning" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Decay {skill.decay}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${skill.mastery}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                  className={`h-full rounded-full ${
                    skill.mastery >= 80 ? 'bg-success' : skill.mastery >= 50 ? 'bg-brand-blue' : 'bg-warning'
                  }`}
                />
              </div>
              <span className="text-xs font-medium text-slate-500">{skill.mastery}%</span>
            </div>
          </motion.button>
        ))}
      </div>
      )}

      <AnimatePresence>
        {selectedSkill && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 overflow-hidden rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4"
          >
            <h4 className="mb-3 font-medium text-slate-900">{selectedSkill.name} – Details</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-4 w-4 text-brand-blue" />
                Last practiced: {selectedSkill.lastPracticed}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <BookOpen className="h-4 w-4 text-brand-green" />
                Next recommended: {selectedSkill.nextPractice}
              </div>
              {selectedSkill.decay && (
                <div className="flex items-center gap-2 text-warning">
                  <AlertCircle className="h-4 w-4" />
                  Skill decay prediction: {selectedSkill.decay} – practice soon
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
