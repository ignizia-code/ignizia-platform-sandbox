import { supabase } from '@/lib/supabase/client';
import type { OrgNode, OrgEdge, OrgActivityLog, OrgChatMessage } from '@/types/org';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

// ---------------------------------------------------------------------------
// Org Nodes
// ---------------------------------------------------------------------------

export async function loadOrgNodes(orgId = DEFAULT_ORG_ID): Promise<OrgNode[]> {
  const { data, error } = await supabase
    .from('org_nodes')
    .select('*')
    .eq('org_id', orgId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Failed to load org nodes:', error);
    return [];
  }
  return (data ?? []) as OrgNode[];
}

export async function loadOrgEdges(orgId = DEFAULT_ORG_ID): Promise<OrgEdge[]> {
  const { data, error } = await supabase
    .from('org_edges')
    .select('*')
    .eq('org_id', orgId);

  if (error) {
    console.error('Failed to load org edges:', error);
    return [];
  }
  return (data ?? []) as OrgEdge[];
}

export async function loadOrgTree(orgId = DEFAULT_ORG_ID) {
  const [nodes, edges] = await Promise.all([
    loadOrgNodes(orgId),
    loadOrgEdges(orgId),
  ]);
  return { nodes, edges };
}

export async function createOrgNode(
  node: Omit<OrgNode, 'id' | 'created_at' | 'updated_at'>,
): Promise<OrgNode | null> {
  const { data, error } = await supabase
    .from('org_nodes')
    .insert(node)
    .select()
    .single();

  if (error) {
    console.error('Failed to create org node:', error);
    return null;
  }
  return data as OrgNode;
}

export async function createOrgNodes(
  nodes: Omit<OrgNode, 'id' | 'created_at' | 'updated_at'>[],
): Promise<OrgNode[]> {
  if (nodes.length === 0) return [];
  const { data, error } = await supabase
    .from('org_nodes')
    .insert(nodes)
    .select();

  if (error) {
    console.error('Failed to bulk create org nodes:', error);
    return [];
  }
  return (data ?? []) as OrgNode[];
}

export async function updateOrgNode(
  id: string,
  updates: Partial<Pick<OrgNode, 'name' | 'description' | 'parent_id' | 'manager_id' | 'is_vacant' | 'headcount' | 'display_order' | 'metadata'>>,
): Promise<OrgNode | null> {
  const { data, error } = await supabase
    .from('org_nodes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update org node:', error);
    return null;
  }
  return data as OrgNode;
}

interface ProjectionNodeBase {
  org_id: string;
  parent_id: string | null;
  node_type: OrgNode['node_type'];
  entity_type: OrgNode['entity_type'];
  name: string;
  description: string | null;
  metadata: Record<string, unknown>;
}

export async function upsertDepartmentNodeFromTalent(
  orgId: string,
  department: { id: string; name: string; description?: string | null },
  parentId: string | null,
): Promise<OrgNode | null> {
  const payload: ProjectionNodeBase & { talent_department_id: string } = {
    org_id: orgId,
    parent_id: parentId,
    node_type: 'department',
    entity_type: 'department',
    name: department.name,
    description: department.description ?? null,
    metadata: {},
    talent_department_id: department.id,
  };

  const { data, error } = await supabase
    .from('org_nodes')
    .upsert(payload, { onConflict: 'org_id,talent_department_id' })
    .select()
    .single();
  if (error) {
    console.error('Failed to upsert department projection node:', error);
    return null;
  }
  return data as OrgNode;
}

export async function upsertRoleNodeFromTalent(
  orgId: string,
  role: { id: string; name: string; description?: string | null },
  parentId: string | null,
): Promise<OrgNode | null> {
  const existingRoleNodes = await supabase
    .from('org_nodes')
    .select('*')
    .eq('org_id', orgId)
    .eq('talent_role_id', role.id)
    .limit(1);
  const existing = (existingRoleNodes.data?.[0] ?? null) as OrgNode | null;

  if (existing) {
    const { data, error } = await supabase
      .from('org_nodes')
      .update({
        parent_id: parentId,
        node_type: 'role',
        entity_type: 'role',
        name: role.name,
        description: role.description ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) {
      console.error('Failed to update role projection node:', error);
      return null;
    }
    return data as OrgNode;
  }

  const { data, error } = await supabase
    .from('org_nodes')
    .insert({
      org_id: orgId,
      parent_id: parentId,
      node_type: 'role',
      entity_type: 'role',
      name: role.name,
      description: role.description ?? null,
      talent_role_id: role.id,
      metadata: {},
    })
    .select()
    .single();
  if (error) {
    console.error('Failed to insert role projection node:', error);
    return null;
  }
  return data as OrgNode;
}

export async function upsertEmployeeNodeFromTalent(
  orgId: string,
  employee: { id: string; name: string },
  parentId: string | null,
): Promise<OrgNode | null> {
  const { data, error } = await supabase
    .from('org_nodes')
    .upsert(
      {
        org_id: orgId,
        parent_id: parentId,
        node_type: 'position',
        entity_type: 'employee',
        name: employee.name,
        description: null,
        talent_employee_id: employee.id,
        metadata: {},
      },
      { onConflict: 'org_id,talent_employee_id' },
    )
    .select()
    .single();
  if (error) {
    console.error('Failed to upsert employee projection node:', error);
    return null;
  }
  return data as OrgNode;
}

export async function deleteOrgNode(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('org_nodes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete org node:', error);
    return false;
  }
  return true;
}

export async function deleteOrgNodeCascade(id: string, orgId = DEFAULT_ORG_ID): Promise<string[]> {
  const allNodes = await loadOrgNodes(orgId);
  const toDelete = new Set<string>();

  function collectChildren(parentId: string) {
    toDelete.add(parentId);
    allNodes.filter((n) => n.parent_id === parentId).forEach((c) => collectChildren(c.id));
  }
  collectChildren(id);

  const ids = Array.from(toDelete);
  const { error } = await supabase
    .from('org_nodes')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Failed to cascade delete org nodes:', error);
    return [];
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Org Edges
// ---------------------------------------------------------------------------

export async function createOrgEdge(
  edge: Omit<OrgEdge, 'id' | 'created_at'>,
): Promise<OrgEdge | null> {
  const { data, error } = await supabase
    .from('org_edges')
    .insert(edge)
    .select()
    .single();

  if (error) {
    console.error('Failed to create org edge:', error);
    return null;
  }
  return data as OrgEdge;
}

export async function deleteOrgEdge(id: string): Promise<boolean> {
  const { error } = await supabase.from('org_edges').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete org edge:', error);
    return false;
  }
  return true;
}

export async function deleteEdgesByNode(nodeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('org_edges')
    .delete()
    .or(`source_id.eq.${nodeId},target_id.eq.${nodeId}`);

  if (error) {
    console.error('Failed to delete edges for node:', error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Activity Log
// ---------------------------------------------------------------------------

export async function logOrgActivity(
  entry: Omit<OrgActivityLog, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase.from('org_activity_log').insert(entry);
  if (error) console.error('Failed to log activity:', error);
}

export async function loadActivityLog(
  orgId = DEFAULT_ORG_ID,
  limit = 50,
): Promise<OrgActivityLog[]> {
  const { data, error } = await supabase
    .from('org_activity_log')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load activity log:', error);
    return [];
  }
  return (data ?? []) as OrgActivityLog[];
}

// ---------------------------------------------------------------------------
// Chat History
// ---------------------------------------------------------------------------

export async function loadChatHistory(
  orgId = DEFAULT_ORG_ID,
  limit = 100,
): Promise<OrgChatMessage[]> {
  const { data, error } = await supabase
    .from('org_chat_history')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Failed to load chat history:', error);
    return [];
  }
  return (data ?? []) as OrgChatMessage[];
}

export async function saveChatMessage(
  msg: Omit<OrgChatMessage, 'id' | 'created_at'>,
): Promise<OrgChatMessage | null> {
  const { data, error } = await supabase
    .from('org_chat_history')
    .insert(msg)
    .select()
    .single();

  if (error) {
    console.error('Failed to save chat message:', error);
    return null;
  }
  return data as OrgChatMessage;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function buildOrgSnapshot(nodes: OrgNode[], edges: OrgEdge[]): string {
  if (nodes.length === 0) return 'No organization structure defined yet.';

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const childMap = new Map<string | null, OrgNode[]>();
  nodes.forEach((n) => {
    const list = childMap.get(n.parent_id) ?? [];
    list.push(n);
    childMap.set(n.parent_id, list);
  });

  const lines: string[] = [];
  const reportsTo = new Map<string, string>();
  edges
    .filter((e) => e.edge_type === 'reports_to')
    .forEach((e) => reportsTo.set(e.source_id, e.target_id));

  function walk(parentId: string | null, indent: string) {
    const children = (childMap.get(parentId) ?? []).sort(
      (a, b) => a.display_order - b.display_order,
    );
    children.forEach((node, i) => {
      const isLast = i === children.length - 1;
      const prefix = indent + (isLast ? '└── ' : '├── ');
      const reportsToNode = reportsTo.get(node.id);
      const reportsLabel = reportsToNode
        ? `, reports to ${nodeMap.get(reportsToNode)?.name ?? 'unknown'}`
        : '';
      const vacantLabel = node.is_vacant ? ' [VACANT]' : '';
      lines.push(
        `${prefix}${node.name} (${node.node_type}${reportsLabel}${vacantLabel})`,
      );
      walk(node.id, indent + (isLast ? '    ' : '│   '));
    });
  }

  walk(null, '');
  return lines.length > 0 ? lines.join('\n') : 'Organization is empty.';
}

export function findNodeByName(
  nodes: OrgNode[],
  name: string,
): OrgNode | undefined {
  const lower = name.toLowerCase().trim();
  return (
    nodes.find((n) => n.name.toLowerCase() === lower) ??
    nodes.find((n) => n.name.toLowerCase().includes(lower))
  );
}

export { DEFAULT_ORG_ID };
