/**
 * Role-specific mock data for Control Tower advanced lenses.
 * All roles use the same data structure so the same card layout applies.
 */

import type { UserRole } from '@/types';
import type { Timeframe } from '@/types';

export interface LensMetric {
  label: string;
  value: string;
  change?: string;
  subLabel?: string;
}

export interface LensChartData {
  name: string;
  value: number;
}

export interface RoleLensData {
  lens1: {
    title: string;
    primary1: LensMetric;
    primary2: LensMetric;
    secondary1: LensMetric;
    secondary2: LensMetric;
    chartData: LensChartData[];
    chartLabel: string;
  };
  lens2: {
    title: string;
    mainMetric: LensMetric;
    mainMetricStatus?: string;
    sub1: LensMetric;
    sub2: LensMetric;
    hasAlert: boolean;
    alertTitle?: string;
    alertSubtitle?: string;
    chartData: LensChartData[];
  };
  lens3: {
    title: string;
    items: { label: string; value: string; subLabel?: string }[];
    footerLabel: string;
    footerValue: string;
  };
  lens4: {
    title: string;
    primary1: LensMetric;
    primary2: LensMetric;
    overrideLabel: string;
    overrideValue: string;
    overrideSubtext: string;
    modeMixData: { name: string; value: number; color: string }[];
  };
  lens5: {
    title: string;
    effectLabel: string;
    effectValue: string;
    strategyReferenceId?: string;
    strategyTitle?: string;
    metric1: LensMetric;
    metric2: LensMetric;
    growthLabel: string;
    growthValue: string;
    barValues: number[];
  };
}

function baseLensData(timeframe: Timeframe): Partial<RoleLensData['lens1']> {
  const tf = timeframe.toLowerCase();
  return {
    chartData:
      timeframe === 'Day'
        ? [
            { name: 'H1', value: 65 },
            { name: 'H2', value: 78 },
            { name: 'H3', value: 62 },
            { name: 'H4', value: 75 },
          ]
        : timeframe === 'Week'
          ? [
              { name: 'W1', value: 65 },
              { name: 'W2', value: 68 },
              { name: 'W3', value: 70 },
              { name: 'W4', value: 72 },
            ]
          : [
              { name: 'Q1', value: 58 },
              { name: 'Q2', value: 62 },
              { name: 'Q3', value: 66 },
              { name: 'Q4', value: 70 },
            ],
    chartLabel: `${timeframe}ly Trend`,
  };
}

export function getRoleLensData(role: UserRole, timeframe: Timeframe): RoleLensData {
  const tf = timeframe.toLowerCase();

  if (role === 'Operations Manager') {
    return {
      lens1: {
        title: 'Throughput & Line Performance',
        primary1: { label: 'Throughput', value: '48', change: '+5', subLabel: `box/min vs last ${tf}` },
        primary2: { label: 'Line Util', value: '87%', change: '-2', subLabel: 'Action required' },
        secondary1: { label: 'Recognition', value: '+12%', subLabel: 'Growth' },
        secondary2: { label: 'Uptime', value: 'Stable' },
        chartData: baseLensData(timeframe).chartData ?? [],
        chartLabel: `${timeframe}ly Trend`,
      },
      lens2: {
        title: 'Bottlenecks & Coordination Latency',
        mainMetric: { label: 'First-Time-Right %', value: '91%' },
        mainMetricStatus: 'Optimal',
        sub1: { label: 'Latency', value: '2.1h' },
        sub2: { label: 'Bottlenecks', value: '1' },
        hasAlert: true,
        alertTitle: 'Bottleneck Detected',
        alertSubtitle: 'Station 7 - Packaging',
        chartData: [
          { name: 'M', value: 40 },
          { name: 'T', value: 50 },
          { name: 'W', value: 45 },
          { name: 'F', value: 60 },
        ],
      },
      lens3: {
        title: 'Decision to Execution Lag',
        items: [
          { label: 'Decision → Execution Lag', value: '18h', subLabel: `Target for ${timeframe}` },
          { label: 'Meeting → Action Ratio', value: '62%', subLabel: `Current ${timeframe}` },
          { label: 'Briefing Adoption', value: '78%', subLabel: 'Status' },
        ],
        footerLabel: 'Interventions',
        footerValue: '24 Total',
      },
      lens4: {
        title: 'Crew Readiness',
        primary1: { label: 'Crew Ready', value: '94%', change: '+2', subLabel: `vs previous ${tf}` },
        primary2: { label: 'Trust Index', value: '0.73', subLabel: 'Steady' },
        overrideLabel: 'Override Rate',
        overrideValue: '12%',
        overrideSubtext: `Decreasing trend over the last ${tf}.`,
        modeMixData: [
          { name: 'Co-pilot', value: 64, color: '#06b6d4' },
          { name: 'Manual', value: 26, color: '#ec4899' },
          { name: 'Auto', value: 10, color: '#10b981' },
        ],
      },
      lens5: {
        title: 'Experiment Impact',
        effectLabel: 'Effect Size',
        effectValue: '+11% ROI',
        strategyReferenceId: 'experiment-initiative',
        strategyTitle: 'Conveyor Optimization Trial',
        metric1: { label: 'Retention', value: '82%', subLabel: `Avg this ${tf}` },
        metric2: { label: 'Adoption', value: '+9%', subLabel: 'via trials' },
        growthLabel: 'Experiment Impact',
        growthValue: '+11%',
        barValues: [70, 50, 30],
      },
    };
  }

  if (role === 'Line Manager') {
    return {
      lens1: {
        title: 'Line Output KPIs',
        primary1: { label: 'Output', value: '92%', change: '+2', subLabel: `vs target ${tf}` },
        primary2: { label: 'Target', value: '95%', change: '-1', subLabel: 'Gap' },
        secondary1: { label: 'Throughput', value: '+8%', subLabel: 'Growth' },
        secondary2: { label: 'Status', value: 'On Track' },
        chartData: baseLensData(timeframe).chartData ?? [],
        chartLabel: `${timeframe}ly Trend`,
      },
      lens2: {
        title: 'Handoff Quality',
        mainMetric: { label: 'First-Time-Right %', value: '91%' },
        mainMetricStatus: 'Optimal',
        sub1: { label: 'Rework', value: '9%' },
        sub2: { label: 'Coord. Latency', value: '2.1h' },
        hasAlert: true,
        alertTitle: 'Quality Alert',
        alertSubtitle: 'Line A - Stitching',
        chartData: [
          { name: 'M', value: 45 },
          { name: 'T', value: 52 },
          { name: 'W', value: 48 },
          { name: 'F', value: 55 },
        ],
      },
      lens3: {
        title: 'Decision Execution Speed',
        items: [
          { label: 'Execution Lag', value: '14h', subLabel: `Target for ${timeframe}` },
          { label: 'Action Ratio', value: '82%', subLabel: `Current ${timeframe}` },
          { label: 'Briefing Adoption', value: '85%', subLabel: 'Status' },
        ],
        footerLabel: 'Interventions',
        footerValue: '18 Total',
      },
      lens4: {
        title: 'Crew Readiness',
        primary1: { label: 'Ready', value: '96%', change: '+1', subLabel: `vs previous ${tf}` },
        primary2: { label: 'Trust', value: '0.75', subLabel: 'Strong' },
        overrideLabel: 'Override Rate',
        overrideValue: '10%',
        overrideSubtext: `Decreasing trend over the last ${tf}.`,
        modeMixData: [
          { name: 'Co-pilot', value: 68, color: '#06b6d4' },
          { name: 'Manual', value: 22, color: '#ec4899' },
          { name: 'Auto', value: 10, color: '#10b981' },
        ],
      },
      lens5: {
        title: 'Training Coverage',
        effectLabel: 'Soft Skill Growth',
        effectValue: '+15%',
        metric1: { label: 'Retention', value: '85%', subLabel: `Avg this ${tf}` },
        metric2: { label: 'Adoption', value: '+12%', subLabel: 'via training' },
        growthLabel: 'Training Impact',
        growthValue: '+15%',
        barValues: [75, 55, 35],
      },
    };
  }

  if (role === 'Procurement') {
    return {
      lens1: {
        title: 'Material Availability',
        primary1: { label: 'Availability', value: '94%', change: '+1', subLabel: `vs last ${tf}` },
        primary2: { label: 'Stock', value: 'OK', change: '0', subLabel: 'Status' },
        secondary1: { label: 'On-Time', value: '+5%', subLabel: 'Growth' },
        secondary2: { label: 'Lead Time', value: 'Stable' },
        chartData: baseLensData(timeframe).chartData ?? [],
        chartLabel: `${timeframe}ly Trend`,
      },
      lens2: {
        title: 'Supplier Reliability',
        mainMetric: { label: 'On-Time %', value: '96%' },
        mainMetricStatus: 'Optimal',
        sub1: { label: 'Score', value: 'A' },
        sub2: { label: 'Variance', value: '-2%' },
        hasAlert: true,
        alertTitle: 'Supply Risk',
        alertSubtitle: 'Vendor X - Delay risk',
        chartData: [
          { name: 'Wk1', value: 92 },
          { name: 'Wk2', value: 95 },
          { name: 'Wk3', value: 94 },
          { name: 'Wk4', value: 96 },
        ],
      },
      lens3: {
        title: 'Cost vs Budget',
        items: [
          { label: 'Spend vs Budget', value: '98%', subLabel: `Target for ${timeframe}` },
          { label: 'Variance', value: '-2%', subLabel: `Current ${timeframe}` },
          { label: 'Cycle Time', value: '4.2d', subLabel: 'Status' },
        ],
        footerLabel: 'Orders',
        footerValue: '42 Total',
      },
      lens4: {
        title: 'Procurement Cycle Time',
        primary1: { label: 'Cycle', value: '4.2d', change: '-0.3', subLabel: `vs previous ${tf}` },
        primary2: { label: 'Lead', value: '3.1d', subLabel: 'Avg' },
        overrideLabel: 'Efficiency',
        overrideValue: '92%',
        overrideSubtext: `Improving over the last ${tf}.`,
        modeMixData: [
          { name: 'Local', value: 60, color: '#06b6d4' },
          { name: 'Regional', value: 30, color: '#ec4899' },
          { name: 'Global', value: 10, color: '#10b981' },
        ],
      },
      lens5: {
        title: 'Supply Risk Alerts',
        effectLabel: 'Risk Status',
        effectValue: '2 Mitigated',
        strategyReferenceId: 'supply-risk-strategy',
        strategyTitle: 'Vendor Diversification',
        metric1: { label: 'Risks', value: '2', subLabel: `Active ${tf}` },
        metric2: { label: 'Mitigated', value: '1', subLabel: 'Resolved' },
        growthLabel: 'Risk Trend',
        growthValue: '-1',
        barValues: [60, 40, 20],
      },
    };
  }

  if (role === 'Leather Cutter') {
    return {
      lens1: {
        title: 'Machine KPIs',
        primary1: { label: 'Uptime', value: '94%', change: '+1', subLabel: `vs last ${tf}` },
        primary2: { label: 'Util', value: '78%', change: '-2', subLabel: 'Action required' },
        secondary1: { label: 'OEE', value: '+3%', subLabel: 'Growth' },
        secondary2: { label: 'Status', value: 'Normal' },
        chartData: baseLensData(timeframe).chartData ?? [],
        chartLabel: `${timeframe}ly Trend`,
      },
      lens2: {
        title: 'Production Rate',
        mainMetric: { label: 'Units/hr', value: '48' },
        mainMetricStatus: 'On Target',
        sub1: { label: 'Throughput', value: '92%' },
        sub2: { label: 'Defect Rate', value: '2.1%' },
        hasAlert: true,
        alertTitle: 'Safety Alert',
        alertSubtitle: 'Near-miss at Station 3',
        chartData: [
          { name: '8a', value: 45 },
          { name: '10a', value: 48 },
          { name: '12p', value: 46 },
          { name: '2p', value: 50 },
        ],
      },
      lens3: {
        title: 'Quality Defects',
        items: [
          { label: 'Defect Rate', value: '2.1%', subLabel: `Target for ${timeframe}` },
          { label: 'Rework', value: '1.2%', subLabel: `Current ${timeframe}` },
          { label: 'First-Pass Yield', value: '96%', subLabel: 'Status' },
        ],
        footerLabel: 'Inspections',
        footerValue: '156 Total',
      },
      lens4: {
        title: 'Safety Alerts',
        primary1: { label: 'Incidents', value: '0', change: '0', subLabel: `vs previous ${tf}` },
        primary2: { label: 'Near-Miss', value: '1', subLabel: 'Logged' },
        overrideLabel: 'Safety Score',
        overrideValue: '98%',
        overrideSubtext: `Strong over the last ${tf}.`,
        modeMixData: [
          { name: 'Safe', value: 98, color: '#10b981' },
          { name: 'Caution', value: 2, color: '#feea22' },
          { name: 'Incident', value: 0, color: '#eb2d7c' },
        ],
      },
      lens5: {
        title: 'Shift Task Queue',
        effectLabel: 'Queue Status',
        effectValue: '12 Pending',
        metric1: { label: 'Queue', value: '12', subLabel: `Depth ${tf}` },
        metric2: { label: 'Backlog', value: '3', subLabel: 'Overdue' },
        growthLabel: 'Throughput',
        growthValue: '92%',
        barValues: [80, 60, 40],
      },
    };
  }

  // Plant Manager (default)
  return {
    lens1: {
      title: 'Team Cohesion & Psych Safety',
      primary1: { label: 'Cohesion Index', value: '72', change: '+5', subLabel: `vs last ${tf}` },
      primary2: { label: 'Psych Safety', value: '68', change: '-3', subLabel: 'Action required' },
      secondary1: { label: 'Recognition', value: '+18%', subLabel: 'Growth' },
      secondary2: { label: 'Trust Sentiment', value: 'Stable' },
      chartData: baseLensData(timeframe).chartData ?? [],
      chartLabel: `${timeframe}ly Trend`,
    },
    lens2: {
      title: 'Handoff & Coordination',
      mainMetric: { label: 'First-Time-Right %', value: '91%' },
      mainMetricStatus: 'Optimal',
      sub1: { label: 'Rework Rate', value: '9%' },
      sub2: { label: 'Coord. Latency', value: '2.1h' },
      hasAlert: true,
      alertTitle: 'Bottleneck Detected',
      alertSubtitle: 'Station 7 - Packaging',
      chartData: [
        { name: 'M', value: 40 },
        { name: 'T', value: 50 },
        { name: 'W', value: 45 },
        { name: 'F', value: 60 },
      ],
    },
    lens3: {
      title: 'Decision Cadence',
      items: [
        { label: 'Decision → Execution Lag', value: '18h', subLabel: `Target for ${timeframe}` },
        { label: 'Meeting → Action Ratio', value: '62%', subLabel: `Current ${timeframe}` },
        { label: 'Briefing Routine Adoption', value: '78%', subLabel: 'Status' },
      ],
      footerLabel: 'Mentoring Interventions',
      footerValue: '24 Total',
    },
    lens4: {
      title: 'Workforce Readiness & Trust',
      primary1: { label: 'Crew Ready', value: '94%', change: '+2', subLabel: `vs previous ${tf}` },
      primary2: { label: 'Trust Index', value: '0.73', subLabel: 'Steady' },
      overrideLabel: 'Override Rate',
      overrideValue: '12%',
      overrideSubtext: `Decreasing trend over the last ${tf}.`,
      modeMixData: [
        { name: 'Co-pilot', value: 64, color: '#06b6d4' },
        { name: 'Manual', value: 26, color: '#ec4899' },
        { name: 'Auto', value: 10, color: '#10b981' },
      ],
    },
    lens5: {
      title: 'Learning Impact & ROI',
      effectLabel: 'Effect Size (SOP x Drill)',
      effectValue: '+14% Throughput',
      strategyReferenceId: 'sop-drill-initiative',
      strategyTitle: 'SOP Drill Initiative',
      metric1: { label: 'Retention Curve', value: '82%', subLabel: `Avg this ${tf}` },
      metric2: { label: 'Adoption Lift', value: '+11%', subLabel: 'via coaching nudges' },
      growthLabel: 'Soft Skill Growth',
      growthValue: '+12%',
      barValues: [70, 50, 30],
    },
  };
}
