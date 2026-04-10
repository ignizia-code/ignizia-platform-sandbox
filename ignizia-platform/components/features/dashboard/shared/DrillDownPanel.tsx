'use client';

import React, { useState } from 'react';

export interface DrillDownPanelProps {
  stationName: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

const MOCK_ROOT_CAUSES = [
  { id: '1', label: 'Conveyor speed mismatch', severity: 'High' },
  { id: '2', label: 'Packaging material shortage', severity: 'Medium' },
  { id: '3', label: 'Staff allocation gap', severity: 'Medium' },
];

const SIMULATION_ACTIONS = [
  { id: 'worker', label: 'Simulate adding worker', result: 'Bottleneck resolved — estimated -15min delay' },
  { id: 'conveyor', label: 'Simulate increasing conveyor speed', result: 'Throughput +8% — bottleneck shifted to Station 8' },
];

/**
 * Enhanced drill-down panel with root cause indicators and simulation actions.
 * Cosmetic only; mock results on action.
 */
export function DrillDownPanel({ stationName, onClose, children }: DrillDownPanelProps) {
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  const handleSimulationAction = (result: string) => {
    setSimulationResult(result);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">{stationName} - Details</h3>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <span className="material-icons-round text-lg">close</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Root cause indicators (mock) */}
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2">
            Root cause indicators
          </div>
          <div className="space-y-2">
            {MOCK_ROOT_CAUSES.map((rc) => (
              <div
                key={rc.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
              >
                <span className="text-sm text-slate-800 dark:text-slate-200">{rc.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    rc.severity === 'High'
                      ? 'bg-danger/10 text-danger'
                      : 'bg-warning/10 text-warning'
                  }`}
                >
                  {rc.severity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Simulation actions */}
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2">
            Simulation actions
          </div>
          <div className="space-y-2">
            {SIMULATION_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleSimulationAction(action.result)}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-action hover:bg-action/5 dark:hover:bg-action/10 transition-colors text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {simulationResult && (
          <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success dark:bg-success/20 dark:text-success">
            <div className="text-xs font-semibold uppercase mb-1">Simulated result</div>
            <div className="font-medium text-sm">{simulationResult}</div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
