'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie,
  ResponsiveContainer,
} from 'recharts';
import type { RoleLensData } from './roleMockData';

interface AdvancedLensCardsProps {
  data: RoleLensData;
  timeframe: string;
  onSimulateScenario: () => void;
  onDrillDown?: () => void;
}

/**
 * Renders 5 advanced lens cards with consistent design across all roles.
 * Same card structure, charts, and interaction patterns as Plant Manager.
 */
export function AdvancedLensCards({
  data,
  timeframe,
  onSimulateScenario,
  onDrillDown,
}: AdvancedLensCardsProps) {
  const tf = timeframe.toLowerCase();

  return (
    <>
      {/* Card 1 */}
      <div className="col-span-12 lg:col-span-4 h-full bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50 hover:shadow-md transition-shadow flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shadow-md shadow-slate-200 dark:shadow-none">1</div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide">{data.lens1.title}</h3>
          </div>
          <button
            onClick={onSimulateScenario}
            className="text-[10px] font-bold bg-action/10 hover:bg-action/20 text-action px-2.5 py-1 rounded-full transition-colors shrink-0"
          >
            Simulate Scenario
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 relative border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <span className="material-icons-round text-sky-500 bg-sky-100 dark:bg-sky-900/30 p-1 rounded-md text-sm">show_chart</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">↑ {data.lens1.primary1.change}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5">{data.lens1.primary1.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{data.lens1.primary1.value}</span>
              <span className="text-[10px] text-slate-400">{data.lens1.primary1.subLabel}</span>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 relative border border-yellow-100 dark:border-yellow-900/30">
            <div className="flex justify-between items-start mb-2">
              <span className="material-icons-round text-yellow-600 bg-white dark:bg-slate-800 p-1 rounded-md text-sm">verified_user</span>
              <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">{data.lens1.primary2.change}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5">{data.lens1.primary2.label}</div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{data.lens1.primary2.value}</span>
              <span className="text-[10px] text-yellow-600 flex items-center gap-1 mt-0.5 font-bold">
                <span className="material-icons-round text-[10px]">warning</span> {data.lens1.primary2.subLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl p-4">
            <img
              src="/ignizia-flame.svg"
              alt="IGNIZIA Flame"
              className="w-6 h-6 mb-2 text-primary"
              draggable={false}
            />
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">{data.lens1.secondary1.label}</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{data.lens1.secondary1.value} <span className="text-[10px] font-normal text-slate-400">{data.lens1.secondary1.subLabel}</span></div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl p-4">
            <span className="material-icons-round text-sky-500 mb-2 text-lg">ssid_chart</span>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">{data.lens1.secondary2.label}</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{data.lens1.secondary2.value}</div>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">{data.lens1.chartLabel}</div>
          <div className="h-24 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.lens1.chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Card 2 */}
      <div className="col-span-12 lg:col-span-4 h-full bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50 hover:shadow-md transition-shadow flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shadow-md shadow-slate-200 dark:shadow-none">2</div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide">{data.lens2.title}</h3>
        </div>
        <div className="mb-5">
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{data.lens2.mainMetric.label}</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{data.lens2.mainMetric.value}</div>
            </div>
            {data.lens2.mainMetricStatus && (
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
                <span className="material-icons-round text-sm mr-1">north_east</span> {data.lens2.mainMetricStatus}
              </div>
            )}
          </div>
          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[91%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">{data.lens2.sub1.label}</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{data.lens2.sub1.value}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">{data.lens2.sub2.label}</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{data.lens2.sub2.value}</div>
          </div>
        </div>
        {data.lens2.hasAlert && data.lens2.alertTitle && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl p-4 flex items-center justify-between mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white dark:bg-slate-800 text-red-600 rounded-lg flex items-center justify-center">
                <span className="material-icons-round text-lg">warning</span>
              </div>
              <div>
                <div className="text-[10px] text-red-600 font-bold uppercase">{data.lens2.alertTitle}</div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{data.lens2.alertSubtitle}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onSimulateScenario} className="text-[10px] font-bold bg-action/10 hover:bg-action/20 text-action px-3 py-1.5 rounded-full transition-colors">
                Simulate Scenario
              </button>
              {onDrillDown && (
                <button onClick={onDrillDown} className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 px-3 py-1.5 rounded-full transition-colors text-red-600 dark:text-red-400">
                  Drill Down
                </button>
              )}
            </div>
          </div>
        )}
        <div className="h-20 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.lens2.chartData} margin={{ bottom: 0, left: -20, right: -20 }}>
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {data.lens2.chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill="#10b981" fillOpacity={0.6 + index * 0.1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Card 3 */}
      <div className="col-span-12 lg:col-span-4 h-full bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50 flex flex-col hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shadow-md shadow-slate-200 dark:shadow-none">3</div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide">{data.lens3.title}</h3>
          </div>
          <button onClick={onSimulateScenario} className="text-[10px] font-bold bg-action/10 hover:bg-action/20 text-action px-2.5 py-1 rounded-full transition-colors shrink-0">
            Simulate Scenario
          </button>
        </div>
        <div className="space-y-6 flex-1">
          {data.lens3.items.map((item, i) => (
            <div key={i} className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-0.5">{item.label}</div>
                <div className="text-[10px] text-slate-400">{item.subLabel}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-slate-900 dark:text-white">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{data.lens3.footerLabel} ({timeframe})</div>
            <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
              <span className="material-icons-round text-[12px]">north_east</span> {data.lens3.footerValue}
            </div>
          </div>
          <div className="flex -space-x-3 overflow-hidden p-1">
            {[1, 2, 3, 4].map((i) => (
              <img key={i} alt="Avatar" className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-800 shadow-sm" src={`https://picsum.photos/seed/${i + 10}/100/100`} />
            ))}
            <div className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-800 bg-primary flex items-center justify-center text-white text-[10px] font-bold shadow-sm z-10">+19</div>
          </div>
        </div>
      </div>

      {/* Card 4 */}
      <div className="col-span-12 lg:col-span-7 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shadow-md shadow-slate-200 dark:shadow-none">4</div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide">{data.lens4.title}</h3>
          </div>
          <button onClick={onSimulateScenario} className="text-[10px] font-bold bg-action/10 hover:bg-action/20 text-action px-2.5 py-1 rounded-full transition-colors shrink-0">
            Simulate Scenario
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 bg-sky-50 dark:bg-sky-900/20 p-4 rounded-xl border border-sky-100 dark:border-sky-800/30">
                <div className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 mb-1 tracking-wide">{data.lens4.primary1.label}</div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{data.lens4.primary1.value}</div>
                <div className="text-[10px] font-medium text-sky-600 dark:text-sky-400 mt-1">{data.lens4.primary1.change} {data.lens4.primary1.subLabel}</div>
              </div>
              <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 tracking-wide">{data.lens4.primary2.label}</div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{data.lens4.primary2.value}</div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">{data.lens4.primary2.subLabel}</div>
              </div>
            </div>
            <div className="bg-primary dark:bg-slate-950 p-5 rounded-xl text-white relative overflow-hidden shadow-inner">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-sm">{data.lens4.overrideLabel} ({timeframe})</div>
                  <span className="material-icons-round text-blue-400 text-sm">bolt</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold tracking-tight">{data.lens4.overrideValue}</div>
                  <div className="text-[10px] text-slate-400 leading-tight max-w-[150px]">{data.lens4.overrideSubtext}</div>
                </div>
                <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-4 overflow-hidden backdrop-blur-sm">
                  <div className="bg-blue-500 w-[30%] h-full rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                </div>
              </div>
              <div className="absolute right-0 top-0 h-full w-2/3 opacity-20 bg-gradient-to-l from-blue-600 to-transparent"></div>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-6 w-full text-center tracking-wide">Mode Mix ({timeframe})</div>
            <div className="relative w-48 h-32 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.lens4.modeMixData} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {data.lens4.modeMixData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 w-full mt-4">
              {data.lens4.modeMixData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <div className="flex flex-col leading-none">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">{item.name}</span>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card 5 */}
      <div className="col-span-12 lg:col-span-5 bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shadow-md shadow-slate-200 dark:shadow-none">5</div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide">{data.lens5.title}</h3>
          </div>
          <button onClick={onSimulateScenario} className="text-[10px] font-bold bg-action/10 hover:bg-action/20 text-action px-2.5 py-1 rounded-full transition-colors shrink-0">
            Simulate Scenario
          </button>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 flex items-center justify-between mb-5 border border-emerald-100 dark:border-emerald-900/30">
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1 tracking-wide">{data.lens5.effectLabel}</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{data.lens5.effectValue}</div>
            {data.lens5.strategyReferenceId && data.lens5.strategyTitle && (
              <Link
                href={`/dashboard/portal?app=strategy-studio&strategyId=${data.lens5.strategyReferenceId}`}
                className="text-[11px] text-action hover:text-action/80 font-medium mt-1 inline-flex items-center gap-1"
              >
                <span className="material-icons-round text-[14px]">link</span>
                Linked strategy: {data.lens5.strategyTitle}
              </Link>
            )}
          </div>
          <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-emerald-500 shadow-sm">
            <span className="material-icons-round text-lg">north_east</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wide">{data.lens5.metric1.label}</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{data.lens5.metric1.value}</div>
            <div className="text-[9px] text-slate-400 mt-1">{data.lens5.metric1.subLabel}</div>
          </div>
          <div className="p-4 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wide">{data.lens5.metric2.label}</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{data.lens5.metric2.value}</div>
            <div className="text-[9px] text-slate-400 mt-1">{data.lens5.metric2.subLabel}</div>
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{data.lens5.growthLabel}</div>
            <div className="text-[10px] font-bold text-blue-500 flex items-center gap-1 uppercase">
              <span className="material-icons-round text-[12px]">arrow_upward</span> Consented Data
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              {data.lens5.barValues.map((pct, i) => (
                <div key={i} className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                </div>
              ))}
            </div>
            <div className="text-right min-w-[60px]">
              <div className="flex justify-end gap-1 font-bold text-lg text-slate-900 dark:text-white">
                <span className="text-sm font-normal text-slate-400">↑</span> {data.lens5.growthValue}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">Aggregated</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
