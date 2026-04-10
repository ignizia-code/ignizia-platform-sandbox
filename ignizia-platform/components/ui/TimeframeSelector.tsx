'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Timeframe } from '@/types';

interface TimeframeSelectorProps {
  current: Timeframe;
  onChange: (timeframe: Timeframe) => void;
}

const timeframes: Timeframe[] = ['Day', 'Week', 'Month', 'Year'];

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ current, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 px-4 py-2 rounded-full text-[13px] font-semibold text-slate-700 dark:text-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] border-none outline-none hover:bg-slate-200 dark:hover:bg-slate-700/80 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 transition-all cursor-pointer"
      >
        {current}
        <svg
          className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50 w-28">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => {
                onChange(tf);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-xs font-medium text-left transition-colors ${
                current === tf
                  ? 'bg-action text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeframeSelector;
