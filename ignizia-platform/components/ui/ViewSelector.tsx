'use client';

import React from 'react';
import { DashboardView } from '@/types';

interface ViewSelectorProps {
  current: DashboardView;
  onChange: (view: DashboardView) => void;
}

const views: DashboardView[] = ['Dashboard', 'Scene'];

const ViewSelector: React.FC<ViewSelectorProps> = ({ current, onChange }) => {
  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800/60 p-1 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] mr-2">
      {views.map((v) => {
        const isActive = current === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`
              relative px-5 py-1.5 text-[13px] font-semibold rounded-full transition-all duration-300 ease-out
              ${isActive 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-900/10 dark:border-slate-500' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }
            `}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
};

export default ViewSelector;
