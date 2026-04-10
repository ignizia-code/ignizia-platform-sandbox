/**
 * Workflow Builder Types
 */

import { UserRole } from './user';
import { SensitivityTag, ReviewCategory } from './governance';

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

// Node optional meta (v2)
export type NodeCadence = 'once' | 'recurring';
export type NodeRecurrence = 'perOrder' | 'daily' | 'weekly' | 'monthly';
export type NodeMode = 'sync' | 'async';

export interface WorkflowNodeMeta {
  inputs?: string[];
  outputs?: string[];
  cadence?: NodeCadence;
  recurrence?: NodeRecurrence;
  mode?: NodeMode;
  durationMins?: number;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  blockers?: string[];
  tags?: string[];
  /** Roles (people) assigned to complete this task; only from workflow owner + sharedWith */
  assignedTo?: UserRole[];
  /** Roles (people) who need to approve this node; only from workflow owner + sharedWith */
  approver?: UserRole[];
  /** Governance: sensitivity tagging from keyword detection */
  sensitivityTag?: SensitivityTag;
  sensitivityCategories?: ReviewCategory[];
  sensitivityConfirmed?: boolean;
  detectedKeywords?: string[];
}

export interface WorkflowNode {
  id: string;
  name: string;
  position?: WorkflowNodePosition;
  meta?: WorkflowNodeMeta;
}

// Edge optional meta (v2)
export type EdgeHandoffType = 'sync' | 'async';
export type EdgeChannel = 'inPerson' | 'slack' | 'email' | 'system';

export interface WorkflowEdgeMeta {
  handoffType?: EdgeHandoffType;
  channel?: EdgeChannel;
  slaMins?: number;
  notes?: string;
}

export interface WorkflowEdge {
  id: string;
  name: string;
  startNodeId: string;
  endNodeId: string;
  meta?: WorkflowEdgeMeta;
}

export interface WorkflowMeta {
  id: string;
  name: string;
  owner: UserRole;
  sharedWith: UserRole[];
  /** optional human description */
  description?: string;
  /** when the workflow was last updated (ISO string) */
  updatedAt?: string;
  /** convenience for gallery display */
  nodeCount?: number;
  edgeCount?: number;
}

export interface Workflow {
  id: string;
  name: string;
  owner: UserRole;
  sharedWith: UserRole[];
  /** optional description of the workflow purpose */
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  updatedByRole: string;
  updatedAt: string;
  revision: number;
}
