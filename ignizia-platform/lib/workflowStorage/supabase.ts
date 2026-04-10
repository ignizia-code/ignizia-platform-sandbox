import { supabase } from '@/lib/supabase/client';
import type { Workflow } from '@/types';
import type { WorkflowMeta } from '@/types/workflow';

const TABLE = 'workflows';

export interface WorkflowRow {
  id: string;
  name: string;
  owner: string;
  shared_with: string[];
  updated_by_role: string;
  updated_at: string;
  revision: number;
  payload: { nodes: Workflow['nodes']; edges: Workflow['edges'] };
}

function rowToWorkflow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner as Workflow['owner'],
    sharedWith: row.shared_with as Workflow['sharedWith'],
    updatedByRole: row.updated_by_role,
    updatedAt: row.updated_at,
    revision: row.revision,
    nodes: row.payload?.nodes ?? [],
    edges: row.payload?.edges ?? [],
  };
}

function workflowToRow(w: Workflow): Omit<WorkflowRow, 'updated_at'> & { updated_at?: string } {
  return {
    id: w.id,
    name: w.name,
    owner: w.owner,
    shared_with: w.sharedWith ?? [],
    updated_by_role: w.updatedByRole,
    updated_at: w.updatedAt,
    revision: w.revision,
    payload: { nodes: w.nodes, edges: w.edges },
  };
}

export async function loadWorkflowsList(): Promise<WorkflowMeta[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, owner, shared_with, updated_at, payload')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load workflows list:', error);
    return [];
  }

  return (data ?? []).map((row) => {
    // attempt to grab node/edge counts from payload if available
    const payload = row.payload || {};
    const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
    const edges = Array.isArray(payload.edges) ? payload.edges : [];
    return {
      id: row.id,
      name: row.name,
      owner: row.owner as WorkflowMeta['owner'],
      sharedWith: (row.shared_with ?? []) as WorkflowMeta['sharedWith'],
      updatedAt: row.updated_at,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    };
  });
}

export async function loadWorkflowById(id: string): Promise<Workflow | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no rows
    console.error('Failed to load workflow:', error);
    return null;
  }

  if (!data) return null;
  return rowToWorkflow(data as WorkflowRow);
}

export async function saveWorkflow(workflow: Workflow): Promise<void> {
  const row = workflowToRow(workflow);
  const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'id' });

  if (error) {
    console.error('Failed to save workflow:', error);
    throw error;
  }
}

export async function deleteWorkflow(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);

  if (error) {
    console.error('Failed to delete workflow:', error);
    throw error;
  }
}
