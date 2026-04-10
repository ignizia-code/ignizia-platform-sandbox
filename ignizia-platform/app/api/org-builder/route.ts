import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { OrgNode, OrgEdge } from '@/types/org';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let supabaseSingleton: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  }
  if (!supabaseSingleton) {
    supabaseSingleton = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseSingleton;
}

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findNodeByName(nodes: OrgNode[], name: string): OrgNode | undefined {
  const lower = name.toLowerCase().trim();
  return (
    nodes.find((n) => n.name.toLowerCase() === lower) ??
    nodes.find((n) => n.name.toLowerCase().includes(lower))
  );
}

function buildOrgSnapshot(nodes: OrgNode[], edges: OrgEdge[]): string {
  if (nodes.length === 0) return 'No organization structure defined yet.';

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const childMap = new Map<string | null, OrgNode[]>();
  nodes.forEach((n) => {
    const list = childMap.get(n.parent_id) ?? [];
    list.push(n);
    childMap.set(n.parent_id, list);
  });

  const reportsTo = new Map<string, string>();
  edges.filter((e) => e.edge_type === 'reports_to').forEach((e) => reportsTo.set(e.source_id, e.target_id));

  const lines: string[] = [];
  function walk(parentId: string | null, indent: string) {
    const children = (childMap.get(parentId) ?? []).sort((a, b) => a.display_order - b.display_order);
    children.forEach((node, i) => {
      const isLast = i === children.length - 1;
      const prefix = indent + (isLast ? '└── ' : '├── ');
      const rt = reportsTo.get(node.id);
      const rtLabel = rt ? `, reports to ${nodeMap.get(rt)?.name ?? 'unknown'}` : '';
      const vLabel = node.is_vacant ? ' [VACANT]' : '';
      lines.push(`${prefix}${node.name} (${node.node_type}${rtLabel}${vLabel})`);
      walk(node.id, indent + (isLast ? '    ' : '│   '));
    });
  }
  walk(null, '');
  return lines.length > 0 ? lines.join('\n') : 'Organization is empty.';
}

function isCircular(nodes: OrgNode[], nodeId: string, newParentId: string): boolean {
  let current: string | null = newParentId;
  const visited = new Set<string>();
  while (current) {
    if (current === nodeId) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    const node = nodes.find((n) => n.id === current);
    current = node?.parent_id ?? null;
  }
  return false;
}

function findAncestorDepartmentId(nodes: OrgNode[], startNodeId: string | null): string | null {
  let currentId: string | null = startNodeId;
  const visited = new Set<string>();
  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const node = nodes.find((n) => n.id === currentId);
    if (!node) break;
    if (typeof node.talent_department_id === 'string' && node.talent_department_id) {
      return node.talent_department_id;
    }
    currentId = node.parent_id;
  }
  return null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// OpenAI tool definitions
// ---------------------------------------------------------------------------

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_node',
      description: 'Create a new org node (department, team, role, or position). Use when the user asks to add a new element to the org.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the new node' },
          node_type: { type: 'string', enum: ['department', 'team', 'role', 'position'] },
          parent_name: { type: 'string', description: 'Name of the parent node to place this under' },
          description: { type: 'string', description: 'Brief description of the node' },
          is_vacant: { type: 'boolean', description: 'Whether this position is currently vacant' },
          reports_to_name: { type: 'string', description: 'Name of the node this reports to (creates a reporting edge)' },
        },
        required: ['name', 'node_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_node',
      description: 'Update an existing org node — rename, change description, or toggle vacancy.',
      parameters: {
        type: 'object',
        properties: {
          target_name: { type: 'string', description: 'Current name of the node to update' },
          new_name: { type: 'string' },
          new_description: { type: 'string' },
          is_vacant: { type: 'boolean' },
        },
        required: ['target_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_node',
      description: 'Move a node to a new parent and/or change its reporting line.',
      parameters: {
        type: 'object',
        properties: {
          target_name: { type: 'string', description: 'Name of the node to move' },
          new_parent_name: { type: 'string', description: 'Name of the new parent node' },
          new_reports_to_name: { type: 'string', description: 'Name of the new manager node' },
        },
        required: ['target_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_node',
      description: 'Delete a node. Use cascade=true to also remove all children.',
      parameters: {
        type: 'object',
        properties: {
          target_name: { type: 'string' },
          cascade: { type: 'boolean', description: 'Also delete all child nodes' },
        },
        required: ['target_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bulk_create',
      description: 'Create multiple nodes at once. Use for initial org setup or adding several elements at once.',
      parameters: {
        type: 'object',
        properties: {
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                node_type: { type: 'string', enum: ['department', 'team', 'role', 'position'] },
                parent_name: { type: 'string' },
                description: { type: 'string' },
                reports_to_name: { type: 'string' },
                is_vacant: { type: 'boolean' },
              },
              required: ['name', 'node_type'],
            },
          },
        },
        required: ['nodes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'answer_question',
      description: 'Answer a question about the org structure, diagnose issues, summarize, or provide analysis. Use when the user asks about the current state without requesting changes.',
      parameters: {
        type: 'object',
        properties: {
          answer: { type: 'string', description: 'The answer to the user question' },
          highlight_nodes: { type: 'array', items: { type: 'string' }, description: 'Names of nodes to highlight in the chart' },
        },
        required: ['answer'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_changes',
      description: 'Suggest org improvements without applying them.',
      parameters: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                affected_nodes: { type: 'array', items: { type: 'string' } },
              },
              required: ['description', 'impact'],
            },
          },
        },
        required: ['suggestions'],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are the IGNIZIA Org Intelligence assistant — an expert organizational designer that helps leaders build, refine, and analyze their organizational structures through natural conversation.

## YOUR CAPABILITIES
You have access to tools for creating, updating, moving, and deleting org nodes (departments, teams, roles, positions) as well as answering questions about the current org structure.

## DECISION RULES
- If the user wants to ADD, CREATE, BUILD, or SETUP anything → use create_node or bulk_create
- If the user wants to RENAME, UPDATE, CHANGE description, or toggle vacancy → use update_node
- If the user wants to MOVE a node or CHANGE reporting lines → use move_node
- If the user wants to REMOVE or DELETE → use delete_node
- If the user ASKS a QUESTION about the org (who reports to whom, gaps, analysis) → use answer_question
- If the user wants SUGGESTIONS or RECOMMENDATIONS → use suggest_changes
- When building an org from scratch, use bulk_create to create all departments and key roles at once
- When creating roles, always specify a parent_name so they go under the right department

## HIERARCHY CONVENTIONS
- A 'root' node is the top-level company. Usually there's one already.
- Departments go under root (or under other departments for sub-divisions)
- Teams go under departments
- Roles go under departments or teams
- Positions go under roles (for individual seats)

## BEHAVIOR
- Be proactive: after creating structure, suggest what to add next
- Be executive-friendly: concise, structured, clear
- When referencing existing nodes, use their exact names
- After mutations, briefly summarize what was changed
- If the org is empty, encourage the user to describe their company so you can build the initial structure
- Use bulk_create when building 3+ nodes at once for efficiency`;

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

interface ActionResult {
  type: string;
  nodeId?: string;
  nodeIds?: string[];
  name?: string;
  summary: string;
}

const MUTATION_TOOLS = new Set(['create_node', 'update_node', 'move_node', 'delete_node', 'bulk_create']);

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  nodes: OrgNode[],
  edges: OrgEdge[],
  orgId: string,
): Promise<{ result: string; action?: ActionResult; updatedNodes?: OrgNode[]; updatedEdges?: OrgEdge[] }> {
  switch (toolName) {
    case 'create_node': {
      const { name, node_type, parent_name, description, is_vacant, reports_to_name } = args as {
        name: string; node_type: string; parent_name?: string; description?: string; is_vacant?: boolean; reports_to_name?: string;
      };

      let parentId: string | null = null;
      if (parent_name) {
        const parent = findNodeByName(nodes, parent_name);
        if (!parent) return { result: `Could not find parent node "${parent_name}". Available nodes: ${nodes.map(n => n.name).join(', ')}` };
        parentId = parent.id;
      }

      let talentDepartmentId: string | null = null;
      let talentRoleId: string | null = null;
      let talentEmployeeId: string | null = null;

      if (node_type === 'department') {
        talentDepartmentId = `dept-${slugify(name)}`;
        await getSupabase().from('talent_departments').upsert({
          org_id: orgId,
          dept_id: talentDepartmentId,
          name,
          description: description || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,dept_id' });
      }

      if (node_type === 'role') {
        const parentNode = parentId ? nodes.find((n) => n.id === parentId) : undefined;
        const parentDeptId =
          (typeof parentNode?.talent_department_id === 'string' && parentNode.talent_department_id) ||
          (parentNode ? findAncestorDepartmentId(nodes, parentNode.id) : null) ||
          (parentNode?.node_type === 'department' ? `dept-${slugify(parentNode.name)}` : null);
        talentRoleId = `role-${slugify(name)}`;
        await getSupabase().from('talent_roles').upsert({
          org_id: orgId,
          role_id: talentRoleId,
          department_id: parentDeptId,
          name,
          description: description || '',
          is_hiring: false,
          source: 'manual',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,role_id' });
        if (parentDeptId) {
          await getSupabase().from('talent_role_department_links').upsert({
            org_id: orgId,
            role_id: talentRoleId,
            dept_id: parentDeptId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'org_id,role_id,dept_id' });
        }
      }

      if (node_type === 'position') {
        const parentNode = parentId ? nodes.find((n) => n.id === parentId) : undefined;
        const parentRoleId =
          (typeof parentNode?.talent_role_id === 'string' && parentNode.talent_role_id) ||
          (parentNode?.node_type === 'role' ? `role-${slugify(parentNode.name)}` : null);
        if (!parentRoleId) {
          return { result: 'Employee/position nodes must be created under a role node.' };
        }
        talentEmployeeId = `emp-${slugify(name)}-${Date.now().toString().slice(-6)}`;
        await getSupabase().from('talent_employees').upsert({
          org_id: orgId,
          employee_id: talentEmployeeId,
          role_id: parentRoleId,
          name,
          privacy: {
            shareConfirmedSkills: true,
            shareUnconfirmedAiSkills: false,
            shareUnconfirmedImportedSkills: false,
            allowAiToAddSkills: true,
            visibility: 'org_visible',
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,employee_id' });
      }

      const { data: created, error } = await getSupabase()
        .from('org_nodes')
        .insert({
          org_id: orgId,
          parent_id: parentId,
          node_type,
          entity_type: node_type === 'root' ? 'organization' : node_type === 'position' ? 'employee' : node_type,
          name,
          description: description || null,
          is_vacant: is_vacant ?? false,
          metadata: {},
          talent_department_id: talentDepartmentId,
          talent_role_id: talentRoleId,
          talent_employee_id: talentEmployeeId,
          display_order: nodes.filter(n => n.parent_id === parentId).length,
          headcount: 1,
        })
        .select()
        .single();

      if (error) return { result: `Failed to create node: ${error.message}` };

      const newNode = created as OrgNode;
      const updatedNodes = [...nodes, newNode];
      let updatedEdges = [...edges];

      if (reports_to_name) {
        const reportsToNode = findNodeByName(nodes, reports_to_name);
        if (reportsToNode) {
          const { data: edge } = await getSupabase()
            .from('org_edges')
            .insert({ org_id: orgId, source_id: newNode.id, target_id: reportsToNode.id, edge_type: 'reports_to', metadata: {} })
            .select()
            .single();
          if (edge) updatedEdges = [...updatedEdges, edge as OrgEdge];
        }
      }

      await getSupabase().from('org_activity_log').insert({
        org_id: orgId, action: 'create_node', actor: 'ai', node_id: newNode.id,
        before_state: null, after_state: newNode, summary: `Created ${node_type} "${name}"`,
      });

      return {
        result: `Created ${node_type} "${name}" successfully.`,
        action: { type: 'create_node', nodeId: newNode.id, name, summary: `Created ${node_type} "${name}"` },
        updatedNodes,
        updatedEdges,
      };
    }

    case 'update_node': {
      const { target_name, new_name, new_description, is_vacant } = args as {
        target_name: string; new_name?: string; new_description?: string; is_vacant?: boolean;
      };

      const target = findNodeByName(nodes, target_name);
      if (!target) return { result: `Could not find node "${target_name}". Available nodes: ${nodes.map(n => n.name).join(', ')}` };

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (new_name) updates.name = new_name;
      if (new_description !== undefined) updates.description = new_description;
      if (is_vacant !== undefined) updates.is_vacant = is_vacant;

      const { data: updated, error } = await getSupabase()
        .from('org_nodes')
        .update(updates)
        .eq('id', target.id)
        .select()
        .single();

      if (error) return { result: `Failed to update: ${error.message}` };

      if (new_name) {
        if (target.talent_department_id) {
          await getSupabase().from('talent_departments')
            .update({ name: new_name, updated_at: new Date().toISOString() })
            .eq('org_id', orgId)
            .eq('dept_id', target.talent_department_id);
        }
        if (target.talent_role_id) {
          await getSupabase().from('talent_roles')
            .update({ name: new_name, updated_at: new Date().toISOString() })
            .eq('org_id', orgId)
            .eq('role_id', target.talent_role_id);
        }
        if (target.talent_employee_id) {
          await getSupabase().from('talent_employees')
            .update({ name: new_name, updated_at: new Date().toISOString() })
            .eq('org_id', orgId)
            .eq('employee_id', target.talent_employee_id);
        }
      }

      const updatedNode = updated as OrgNode;
      const updatedNodes = nodes.map(n => n.id === updatedNode.id ? updatedNode : n);

      await getSupabase().from('org_activity_log').insert({
        org_id: orgId, action: 'update_node', actor: 'ai', node_id: target.id,
        before_state: target, after_state: updatedNode,
        summary: new_name ? `Renamed "${target.name}" to "${new_name}"` : `Updated "${target.name}"`,
      });

      return {
        result: `Updated "${target.name}" successfully.`,
        action: { type: 'update_node', nodeId: target.id, name: new_name || target.name, summary: new_name ? `Renamed "${target.name}" to "${new_name}"` : `Updated "${target.name}"` },
        updatedNodes,
      };
    }

    case 'move_node': {
      const { target_name, new_parent_name, new_reports_to_name } = args as {
        target_name: string; new_parent_name?: string; new_reports_to_name?: string;
      };

      const target = findNodeByName(nodes, target_name);
      if (!target) return { result: `Could not find node "${target_name}".` };

      let updatedNodes = [...nodes];
      let updatedEdges = [...edges];
      const summaryParts: string[] = [];

      if (new_parent_name) {
        const newParent = findNodeByName(nodes, new_parent_name);
        if (!newParent) return { result: `Could not find parent node "${new_parent_name}".` };
        if (isCircular(nodes, target.id, newParent.id)) return { result: `Cannot move "${target.name}" under "${newParent.name}" — it would create a circular hierarchy.` };

        let effectiveParent = newParent;
        // Employee nodes must ultimately live under a role so canonical talent_employees.role_id remains valid.
        if (target.talent_employee_id && !effectiveParent.talent_role_id) {
          if (effectiveParent.node_type === 'department') {
            const fallbackRole = nodes
              .filter((n) => n.parent_id === effectiveParent.id && n.node_type === 'role')
              .sort((a, b) => a.display_order - b.display_order)[0];
            if (!fallbackRole?.talent_role_id) {
              return { result: `Cannot move employee "${target.name}" under "${effectiveParent.name}" because that department has no role node. Move the employee to a specific role.` };
            }
            effectiveParent = fallbackRole;
            summaryParts.push(`placed under role "${fallbackRole.name}" in "${newParent.name}"`);
          } else {
            return { result: `Employee nodes can only be moved under role nodes (or departments that contain at least one role).` };
          }
        }

        const { data: updated } = await getSupabase()
          .from('org_nodes')
          .update({ parent_id: effectiveParent.id, updated_at: new Date().toISOString() })
          .eq('id', target.id)
          .select()
          .single();

        if (updated) updatedNodes = updatedNodes.map(n => n.id === target.id ? updated as OrgNode : n);
        if (!summaryParts.some((part) => part.includes('placed under role'))) {
          summaryParts.push(`moved under "${effectiveParent.name}"`);
        }

        if (target.talent_role_id) {
          const derivedDeptId =
            effectiveParent.talent_department_id ??
            findAncestorDepartmentId(updatedNodes, effectiveParent.id);
          if (derivedDeptId) {
            await getSupabase().from('talent_roles')
              .update({ department_id: derivedDeptId, updated_at: new Date().toISOString() })
              .eq('org_id', orgId)
              .eq('role_id', target.talent_role_id);
            await getSupabase().from('talent_role_department_links').upsert({
              org_id: orgId,
              role_id: target.talent_role_id,
              dept_id: derivedDeptId,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id,role_id,dept_id' });
          }
        }

        if (target.talent_employee_id && effectiveParent.talent_role_id) {
          await getSupabase().from('talent_employees')
            .update({ role_id: effectiveParent.talent_role_id, updated_at: new Date().toISOString() })
            .eq('org_id', orgId)
            .eq('employee_id', target.talent_employee_id);
        }
      }

      if (new_reports_to_name) {
        const reportsTo = findNodeByName(nodes, new_reports_to_name);
        if (!reportsTo) return { result: `Could not find reports-to node "${new_reports_to_name}".` };

        await getSupabase().from('org_edges').delete()
          .eq('source_id', target.id).eq('edge_type', 'reports_to');
        updatedEdges = updatedEdges.filter(e => !(e.source_id === target.id && e.edge_type === 'reports_to'));

        const { data: edge } = await getSupabase()
          .from('org_edges')
          .insert({ org_id: orgId, source_id: target.id, target_id: reportsTo.id, edge_type: 'reports_to', metadata: {} })
          .select()
          .single();
        if (edge) updatedEdges = [...updatedEdges, edge as OrgEdge];
        summaryParts.push(`now reports to "${reportsTo.name}"`);
      }

      const summary = `"${target.name}" ${summaryParts.join(' and ')}`;
      await getSupabase().from('org_activity_log').insert({
        org_id: orgId, action: 'move_node', actor: 'ai', node_id: target.id,
        before_state: target, after_state: null, summary,
      });

      return {
        result: `Moved: ${summary}`,
        action: { type: 'move_node', nodeId: target.id, name: target.name, summary },
        updatedNodes,
        updatedEdges,
      };
    }

    case 'delete_node': {
      const { target_name, cascade } = args as { target_name: string; cascade?: boolean };
      const target = findNodeByName(nodes, target_name);
      if (!target) return { result: `Could not find node "${target_name}".` };

      const childCount = nodes.filter(n => n.parent_id === target.id).length;

      if (cascade || childCount === 0) {
        const toDelete = new Set<string>();
        function collectChildren(pid: string) {
          toDelete.add(pid);
          nodes.filter(n => n.parent_id === pid).forEach(c => collectChildren(c.id));
        }
        collectChildren(target.id);
        const ids = Array.from(toDelete);

        const nodesToDelete = nodes.filter((n) => ids.includes(n.id));

        // Canonical-first deletes for linked entities
        for (const n of nodesToDelete) {
          if (n.talent_employee_id) {
            await getSupabase().from('talent_employees')
              .delete()
              .eq('org_id', orgId)
              .eq('employee_id', n.talent_employee_id);
          }
        }

        for (const n of nodesToDelete) {
          if (n.talent_role_id) {
            const { data: assignedEmployees } = await getSupabase()
              .from('talent_employees')
              .select('employee_id')
              .eq('org_id', orgId)
              .eq('role_id', n.talent_role_id)
              .limit(1);
            if ((assignedEmployees ?? []).length > 0) {
              return { result: `Cannot delete role "${n.name}" while employees are assigned. Move or delete employees first.` };
            }
            await getSupabase().from('talent_roles')
              .delete()
              .eq('org_id', orgId)
              .eq('role_id', n.talent_role_id);
          }
        }

        for (const n of nodesToDelete) {
          if (n.talent_department_id) {
            const { data: deptRoles } = await getSupabase()
              .from('talent_roles')
              .select('role_id')
              .eq('org_id', orgId)
              .eq('department_id', n.talent_department_id)
              .limit(1);
            if ((deptRoles ?? []).length > 0) {
              return { result: `Cannot delete department "${n.name}" while roles are assigned. Move roles first.` };
            }
            await getSupabase().from('talent_departments')
              .delete()
              .eq('org_id', orgId)
              .eq('dept_id', n.talent_department_id);
          }
        }

        await getSupabase().from('org_edges').delete().or(ids.map(id => `source_id.eq.${id}`).join(','));
        await getSupabase().from('org_edges').delete().or(ids.map(id => `target_id.eq.${id}`).join(','));
        await getSupabase().from('org_nodes').delete().in('id', ids);

        const updatedNodes = nodes.filter(n => !toDelete.has(n.id));
        const updatedEdges = edges.filter(e => !toDelete.has(e.source_id) && !toDelete.has(e.target_id));

        const summary = `Deleted "${target.name}" and ${ids.length - 1} child node(s)`;
        await getSupabase().from('org_activity_log').insert({
          org_id: orgId, action: 'delete_node', actor: 'ai', node_id: target.id,
          before_state: target, after_state: null, summary,
        });

        return { result: summary, action: { type: 'delete_node', nodeId: target.id, nodeIds: ids, name: target.name, summary }, updatedNodes, updatedEdges };
      }

      return { result: `"${target.name}" has ${childCount} child node(s). Set cascade=true to delete them all, or move them first.` };
    }

    case 'bulk_create': {
      const { nodes: nodeSpecs } = args as {
        nodes: { name: string; node_type: string; parent_name?: string; description?: string; reports_to_name?: string; is_vacant?: boolean }[];
      };

      let currentNodes = [...nodes];
      let currentEdges = [...edges];
      const createdIds: string[] = [];
      const createdNames: string[] = [];

      for (const spec of nodeSpecs) {
        let parentId: string | null = null;
        if (spec.parent_name) {
          const parent = findNodeByName(currentNodes, spec.parent_name);
          if (parent) parentId = parent.id;
        }

        let talentDepartmentId: string | null = null;
        let talentRoleId: string | null = null;
        let talentEmployeeId: string | null = null;
        const parentNode = parentId ? currentNodes.find((n) => n.id === parentId) : undefined;

        if (spec.node_type === 'department') {
          talentDepartmentId = `dept-${slugify(spec.name)}`;
          await getSupabase().from('talent_departments').upsert({
            org_id: orgId,
            dept_id: talentDepartmentId,
            name: spec.name,
            description: spec.description || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'org_id,dept_id' });
        } else if (spec.node_type === 'role') {
          const deptId =
            parentNode?.talent_department_id ??
            (parentNode ? findAncestorDepartmentId(currentNodes, parentNode.id) : null) ??
            (parentNode?.node_type === 'department' ? `dept-${slugify(parentNode.name)}` : null);
          talentRoleId = `role-${slugify(spec.name)}`;
          await getSupabase().from('talent_roles').upsert({
            org_id: orgId,
            role_id: talentRoleId,
            department_id: deptId,
            name: spec.name,
            description: spec.description || '',
            source: 'manual',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'org_id,role_id' });
          if (deptId) {
            await getSupabase().from('talent_role_department_links').upsert({
              org_id: orgId,
              role_id: talentRoleId,
              dept_id: deptId,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id,role_id,dept_id' });
          }
        } else if (spec.node_type === 'position') {
          const roleId = parentNode?.talent_role_id ?? (parentNode?.node_type === 'role' ? `role-${slugify(parentNode.name)}` : null);
          if (roleId) {
            talentEmployeeId = `emp-${slugify(spec.name)}-${Date.now().toString().slice(-6)}`;
            await getSupabase().from('talent_employees').upsert({
              org_id: orgId,
              employee_id: talentEmployeeId,
              role_id: roleId,
              name: spec.name,
              privacy: {
                shareConfirmedSkills: true,
                shareUnconfirmedAiSkills: false,
                shareUnconfirmedImportedSkills: false,
                allowAiToAddSkills: true,
                visibility: 'org_visible',
              },
              updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id,employee_id' });
          }
        }

        const { data: created, error } = await getSupabase()
          .from('org_nodes')
          .insert({
            org_id: orgId,
            parent_id: parentId,
            node_type: spec.node_type,
            entity_type: spec.node_type === 'root' ? 'organization' : spec.node_type === 'position' ? 'employee' : spec.node_type,
            name: spec.name,
            description: spec.description || null,
            is_vacant: spec.is_vacant ?? false,
            talent_department_id: talentDepartmentId,
            talent_role_id: talentRoleId,
            talent_employee_id: talentEmployeeId,
            metadata: {},
            display_order: currentNodes.filter(n => n.parent_id === parentId).length,
            headcount: 1,
          })
          .select()
          .single();

        if (error) continue;

        const newNode = created as OrgNode;
        currentNodes = [...currentNodes, newNode];
        createdIds.push(newNode.id);
        createdNames.push(spec.name);

        if (spec.reports_to_name) {
          const reportsToNode = findNodeByName(currentNodes, spec.reports_to_name);
          if (reportsToNode) {
            const { data: edge } = await getSupabase()
              .from('org_edges')
              .insert({ org_id: orgId, source_id: newNode.id, target_id: reportsToNode.id, edge_type: 'reports_to', metadata: {} })
              .select()
              .single();
            if (edge) currentEdges = [...currentEdges, edge as OrgEdge];
          }
        }
      }

      const summary = `Created ${createdIds.length} nodes: ${createdNames.join(', ')}`;
      await getSupabase().from('org_activity_log').insert({
        org_id: orgId, action: 'bulk_create', actor: 'ai', node_id: null,
        before_state: null, after_state: { createdIds, createdNames }, summary,
      });

      return {
        result: summary,
        action: { type: 'bulk_create', nodeIds: createdIds, summary },
        updatedNodes: currentNodes,
        updatedEdges: currentEdges,
      };
    }

    case 'answer_question': {
      const { answer, highlight_nodes } = args as { answer: string; highlight_nodes?: string[] };
      const highlightIds = (highlight_nodes ?? [])
        .map(name => findNodeByName(nodes, name)?.id)
        .filter(Boolean) as string[];
      return {
        result: answer,
        action: { type: 'create_node', summary: '' },
        updatedNodes: undefined,
      };
    }

    case 'suggest_changes': {
      const { suggestions } = args as { suggestions: { description: string; impact: string; affected_nodes?: string[] }[] };
      const formatted = suggestions.map((s, i) => `${i + 1}. [${s.impact.toUpperCase()}] ${s.description}`).join('\n');
      return { result: `Here are my suggestions:\n${formatted}` };
    }

    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { messages, orgId = DEFAULT_ORG_ID, actorRole = 'read_only' } = (await request.json()) as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      orgId?: string;
      actorRole?: string;
    };
    const canMutate = actorRole === 'HR Manager';

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    const { data: nodeRows } = await getSupabase().from('org_nodes').select('*').eq('org_id', orgId).order('display_order');
    const { data: edgeRows } = await getSupabase().from('org_edges').select('*').eq('org_id', orgId);

    let nodes = (nodeRows ?? []) as OrgNode[];
    let edges = (edgeRows ?? []) as OrgEdge[];

    const orgSnapshot = buildOrgSnapshot(nodes, edges);
    const contextBlock = `\n\nCURRENT ORGANIZATION STRUCTURE:\n${orgSnapshot}\n\nTotal: ${nodes.length} nodes, ${edges.length} edges.`;

    const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT + contextBlock },
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: apiMessages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.3,
    });

    const choice = completion.choices[0];
    const responseMessage = choice.message;
    const allActions: ActionResult[] = [];
    const allHighlights: string[] = [];
    let toolResults: string[] = [];

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      for (const toolCall of responseMessage.tool_calls) {
        const fn = (toolCall as unknown as { function: { name: string; arguments: string } }).function;
        const toolName = fn.name;
        if (!canMutate && MUTATION_TOOLS.has(toolName)) {
          toolResults.push('This user is in read-only mode for Org Intelligence. Only HR Manager can apply changes.');
          continue;
        }
        const toolArgs = JSON.parse(fn.arguments);

        const { result, action, updatedNodes, updatedEdges } = await executeTool(
          toolName,
          toolArgs,
          nodes,
          edges,
          orgId,
        );

        toolResults.push(result);
        if (action && action.summary) allActions.push(action);
        if (updatedNodes) nodes = updatedNodes;
        if (updatedEdges) edges = updatedEdges;

        if (toolName === 'answer_question' && toolArgs.highlight_nodes) {
          const hIds = (toolArgs.highlight_nodes as string[])
            .map((name: string) => findNodeByName(nodes, name)?.id)
            .filter(Boolean) as string[];
          allHighlights.push(...hIds);
        }
      }

      const followUpMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        ...apiMessages,
        responseMessage as OpenAI.Chat.Completions.ChatCompletionMessageParam,
        ...responseMessage.tool_calls.map((tc, i) => ({
          role: 'tool' as const,
          tool_call_id: tc.id,
          content: toolResults[i] || 'Done.',
        })),
      ];

      const followUp = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: followUpMessages,
        temperature: 0.3,
      });

      const responseText = followUp.choices[0].message.content || '';
      const summary = allActions.map(a => a.summary).filter(Boolean).join('. ');

      return NextResponse.json({
        text: responseText,
        actions: allActions,
        highlights: allHighlights,
        summary: summary || null,
      });
    }

    return NextResponse.json({
      text: responseMessage.content || '',
      actions: [],
      highlights: [],
      summary: null,
    });
  } catch (error) {
    console.error('Org Builder error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: String(error) },
      { status: 500 },
    );
  }
}
