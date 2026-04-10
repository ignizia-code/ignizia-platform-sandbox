/**
 * Dashboard Types
 */

export type Timeframe = 'Day' | 'Week' | 'Month' | 'Year';
export type DashboardView = 'Dashboard' | 'Scene';

// Top-level main sections controlled by the left sidebar
export type MainSection = 
  | 'Dashboard' 
  | 'LivingOps' 
  | 'Community' 
  | 'Analytics' 
  | 'LearningHub' 
  | 'TeamPulse' 
  | 'Governance' 
  | 'Omniverse'
  | 'FactoryCortexStudio'
  | 'IgniteIntelligenceStudio'
  | 'IntelligenceGovernanceStudio'
  | 'CareerFlow';

export interface MetricData {
  label: string;
  value: string | number;
  change?: number;
  status?: 'optimal' | 'warning' | 'critical' | 'stable';
  subtext?: string;
}

export interface ChartPoint {
  x: string;
  y: number;
}
