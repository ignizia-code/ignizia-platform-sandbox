'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';

interface SystemBootOverlayProps {
  employeeName: string;
  roleName: string;
  onComplete: () => void;
}

const bootLines = [
  'Intelligence core connected',
  'Workspace modules loaded',
  'Operational data synchronized',
  'System ready',
];

export default function SystemBootOverlay({
  employeeName,
  roleName,
  onComplete,
}: SystemBootOverlayProps) {
  const [typedName, setTypedName] = useState('');
  const [showRole, setShowRole] = useState(false);
  const [showLine, setShowLine] = useState(false);
  const [visibleBootLines, setVisibleBootLines] = useState(0);
  const [phase, setPhase] = useState<'scan' | 'logo' | 'identity' | 'boot' | 'exit'>('scan');

  const startSequence = useCallback(() => {
    // Phase: scan (0-0.6s)
    setPhase('scan');

    // Phase: logo (0.6s)
    setTimeout(() => setPhase('logo'), 600);

    // Phase: identity — typewriter name (1.0s)
    setTimeout(() => {
      setPhase('identity');
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        charIndex++;
        setTypedName(employeeName.slice(0, charIndex));
        if (charIndex >= employeeName.length) {
          clearInterval(typeInterval);
          // Show role after name finishes
          setTimeout(() => {
            setShowRole(true);
            setShowLine(true);
          }, 200);
        }
      }, 40);
    }, 1000);

    // Phase: boot lines (1.8s)
    setTimeout(() => {
      setPhase('boot');
      bootLines.forEach((_, i) => {
        setTimeout(() => setVisibleBootLines(i + 1), i * 200);
      });
    }, 1800);

    // Phase: exit + complete (2.6s)
    setTimeout(() => {
      setPhase('exit');
    }, 2600);

    setTimeout(() => {
      onComplete();
    }, 2800);
  }, [employeeName, onComplete]);

  useEffect(() => {
    startSequence();
  }, [startSequence]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950"
      initial={{ opacity: 0 }}
      animate={phase === 'exit' ? { opacity: 0, scale: 1.05 } : { opacity: 1 }}
      transition={phase === 'exit' ? { duration: 0.4, ease: 'easeIn' } : { duration: 0.3 }}
    >
      {/* Scan line */}
      {phase === 'scan' && (
        <div
          className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-blue/30 to-transparent scan-line"
          aria-hidden="true"
        />
      )}

      {/* Subtle radial glow behind content */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_50%_45%,rgba(6,186,246,0.08),transparent)]"
        aria-hidden="true"
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={
          phase !== 'scan'
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: 0.8 }
        }
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-8"
      >
        <div className="absolute -inset-4 rounded-3xl bg-brand-blue/10 blur-2xl" />
        <div className="relative rounded-2xl bg-slate-900/90 backdrop-blur-sm p-4 border border-slate-700/50 logo-glow">
          <Image
            src="/ignizia-logo.png"
            alt="IGNIZIA"
            width={56}
            height={56}
            className="object-contain"
          />
        </div>
      </motion.div>

      {/* Employee name — typewriter */}
      <div className="text-center min-h-[80px]" role="status" aria-live="polite">
        {phase !== 'scan' && (
          <motion.h1
            className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {typedName}
            {typedName.length < employeeName.length && (
              <span className="cursor-blink" />
            )}
          </motion.h1>
        )}

        {/* Role name */}
        {showRole && (
          <motion.p
            className="mt-2 text-sm md:text-base text-brand-blue font-medium tracking-wider uppercase"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {roleName}
          </motion.p>
        )}
      </div>

      {/* Horizontal divider line */}
      {showLine && (
        <div className="my-8 w-full max-w-xs">
          <div className="h-px bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent line-expand origin-center" />
        </div>
      )}

      {/* Boot status lines */}
      <div className="space-y-2 min-h-[120px]">
        {bootLines.slice(0, visibleBootLines).map((line, i) => (
          <motion.div
            key={line}
            className="flex items-center gap-3 text-sm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <CheckCircle2
              size={14}
              className={
                i < visibleBootLines - 1
                  ? 'text-success shrink-0'
                  : 'text-brand-blue shrink-0 animate-pulse'
              }
            />
            <span className="text-slate-300">{line}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
