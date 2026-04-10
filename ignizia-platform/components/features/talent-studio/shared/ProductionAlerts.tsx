'use client';

import React from 'react';

export type AlertSeverity = 'Low' | 'Medium' | 'High';
export type AlertType =
  | 'Skill Gap'
  | 'Single Point of Failure'
  | 'Emerging Need'
  | 'Understaffed Shift'
  | 'Overload Risk';

export interface ProductionAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  affectedRoles?: string[];
  affectedEmployees?: string[];
  skillsInvolved?: string[];
}

export interface ProductionAlertsProps {
  alerts: ProductionAlert[];
  showCount?: number;
  /** When true, render only inner content (no card wrapper); for use inside Control Tower lens cards. */
  embedded?: boolean;
  /** Compact variant for dense dashboard cards. */
  compact?: boolean;
}

const severityColor: Record<AlertSeverity, string> = {
  High: 'bg-danger/10 text-danger border-danger/20 dark:bg-danger/20 dark:text-danger dark:border-danger/40',
  Medium: 'bg-warning/10 text-warning border-warning/20 dark:bg-warning/20 dark:text-warning dark:border-warning/40',
  Low: 'bg-success/10 text-success border-success/20 dark:bg-success/20 dark:text-success dark:border-success/40',
};

/**
 * Production Alerts widget.
 * Shared between Talent Studio (IGNIZIA View) and Control Tower HR Manager lenses.
 */
export function ProductionAlerts({
  alerts,
  showCount = 5,
  embedded,
  compact,
}: ProductionAlertsProps) {
  const topAlerts = alerts.slice(0, showCount);
  const highSeverityCount = alerts.filter((a) => a.severity === 'High').length;

  const alertList = (
    <div
      className={`space-y-2.5 overflow-y-auto pr-1 ${
        embedded ? 'max-h-72' : ''
      }`}
    >
      {topAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-xl border px-3 py-2.5 text-xs flex gap-3 items-start min-w-0 ${severityColor[alert.severity]}`}
        >
          <div className="mt-0.5">
            <span className="material-icons-round text-[16px]">
              {alert.type === 'Skill Gap'
                ? 'engineering'
                : alert.type === 'Single Point of Failure'
                ? 'report_problem'
                : alert.type === 'Emerging Need'
                ? 'new_releases'
                : alert.type === 'Understaffed Shift'
                ? 'nightlight'
                : 'battery_alert'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="font-semibold truncate">{alert.title}</div>
              {!compact && (
                <span className="text-[10px] uppercase tracking-wide opacity-80">
                  {alert.type}
                </span>
              )}
            </div>
            <p className={`text-[11px] opacity-95 ${compact ? 'max-h-8 overflow-hidden' : ''}`}>
              {alert.description}
            </p>
            {!compact && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {alert.skillsInvolved?.slice(0, 3).map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/40 border border-current/10 text-[10px]"
                  >
                    {s}
                  </span>
                ))}
                {alert.affectedRoles?.slice(0, 2).map((r) => (
                  <span
                    key={r}
                    className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/40 border border-current/10 text-[10px]"
                  >
                    {r}
                  </span>
                ))}
                {alert.affectedEmployees?.slice(0, 2).map((e) => (
                  <span
                    key={e}
                    className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/40 border border-current/10 text-[10px]"
                  >
                    {e}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  if (embedded) {
    return (
      <div className="flex flex-col h-full">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
          {alerts.length} operational signals · {highSeverityCount} high-severity alerts need intervention.
        </p>
        {alertList}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
            Production Alerts
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {alerts.length} operational signals
          </div>
        </div>
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-danger/10 text-danger dark:bg-danger/20 dark:text-danger">
          <span className="material-icons-round text-[20px]">warning_amber</span>
        </span>
      </div>
      <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-3">
        Issues affecting production capacity, safety, or compliance.
      </p>
      {alertList}
    </div>
  );
}
