export type OrgNodeType = 'root' | 'department' | 'team' | 'role' | 'position';
export type OrgEntityType = 'organization' | 'department' | 'role' | 'employee' | 'team' | 'position';

export type OrgEdgeType = 'reports_to' | 'manages' | 'dotted_line' | 'collaborates';

export interface OrgNode {
  id: string;
  org_id: string;
  parent_id: string | null;
  node_type: OrgNodeType;
  entity_type?: OrgEntityType | null;
  name: string;
  description: string | null;
  manager_id: string | null;
  talent_department_id?: string | null;
  talent_role_id?: string | null;
  talent_employee_id?: string | null;
  metadata: Record<string, unknown>;
  display_order: number;
  is_vacant: boolean;
  headcount: number;
  created_at: string;
  updated_at: string;
}

export interface OrgEdge {
  id: string;
  org_id: string;
  source_id: string;
  target_id: string;
  edge_type: OrgEdgeType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OrgActivityLog {
  id: string;
  org_id: string;
  action: string;
  actor: string;
  node_id: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  summary: string | null;
  created_at: string;
}

export interface OrgChatMessage {
  id: string;
  org_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OrgAction {
  type: 'create_node' | 'update_node' | 'move_node' | 'delete_node' | 'bulk_create' | 'create_edge';
  nodeId?: string;
  nodeIds?: string[];
  name?: string;
  summary: string;
}

export interface OrgBuilderResponse {
  text: string;
  actions: OrgAction[];
  highlights: string[];
  summary: string;
  requiresConfirmation?: boolean;
  pendingAction?: OrgAction;
}

export interface OrgTree {
  nodes: OrgNode[];
  edges: OrgEdge[];
}
