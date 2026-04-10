'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Building2, Users, Briefcase, User, ChevronRight,
  Edit3, Trash2, ArrowUpRight, AlertCircle, Check, GitBranch,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { OrgNode, OrgEdge, OrgActivityLog } from '@/types/org';
import { useApp } from '../store/AppContext';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

interface OrgNodeDetailProps {
  node: OrgNode;
  allNodes: OrgNode[];
  edges: OrgEdge[];
  activityLog: OrgActivityLog[];
  departmentHealth?: { empCount: number; coverage: number; status: 'green' | 'amber' | 'red' } | null;
  onClose: () => void;
  onRefresh: () => void;
  onNavigate?: (nodeId: string) => void;
  onOpenGaps?: () => void;
  readOnly?: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  root: 'Organization',
  organization: 'Organization',
  department: 'Department',
  team: 'Team',
  role: 'Role',
  position: 'Employee',
  employee: 'Employee',
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  root: <Building2 size={16} />,
  organization: <Building2 size={16} />,
  department: <Building2 size={15} />,
  team: <Users size={15} />,
  role: <Briefcase size={15} />,
  position: <User size={15} />,
  employee: <User size={15} />,
};

export default function OrgNodeDetail({
  node,
  allNodes,
  edges,
  activityLog,
  departmentHealth,
  onClose,
  onRefresh,
  onNavigate,
  onOpenGaps,
  readOnly = false,
}: OrgNodeDetailProps) {
  const { employees, roles } = useApp();
  const visualType = node.entity_type ?? (node.node_type === 'root' ? 'organization' : node.node_type === 'position' ? 'employee' : node.node_type);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [editDescription, setEditDescription] = useState(node.description || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const parent = useMemo(() => allNodes.find((n) => n.id === node.parent_id), [allNodes, node.parent_id]);
  const children = useMemo(
    () => allNodes.filter((n) => n.parent_id === node.id).sort((a, b) => a.display_order - b.display_order),
    [allNodes, node.id],
  );
  const reportsTo = useMemo(() => {
    const edge = edges.find((e) => e.source_id === node.id && e.edge_type === 'reports_to');
    return edge ? allNodes.find((n) => n.id === edge.target_id) : null;
  }, [edges, allNodes, node.id]);

  const directReports = useMemo(() => {
    const reporterIds = edges
      .filter((e) => e.target_id === node.id && e.edge_type === 'reports_to')
      .map((e) => e.source_id);
    return allNodes.filter((n) => reporterIds.includes(n.id));
  }, [edges, allNodes, node.id]);

  const nodeActivity = useMemo(
    () => activityLog.filter((a) => a.node_id === node.id).slice(0, 5),
    [activityLog, node.id],
  );

  const linkedEmployee = useMemo(() => {
    if (node.talent_employee_id) {
      return employees.find((employee) => employee.id === node.talent_employee_id) ?? null;
    }
    if (node.node_type !== 'position') return null;
    return employees.find((employee) => employee.name.toLowerCase() === node.name.toLowerCase()) ?? null;
  }, [employees, node]);

  const linkedEmployeeRole = useMemo(() => {
    if (!linkedEmployee) return null;
    return roles.find((role) => role.id === linkedEmployee.roleId) ?? null;
  }, [linkedEmployee, roles]);

  const handleSave = async () => {
    setSaving(true);
    const response = await fetch(`/api/talent-studio/org-nodes/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-org-id': DEFAULT_ORG_ID },
      body: JSON.stringify({
        orgId: DEFAULT_ORG_ID,
        name: editName.trim() || node.name,
        description: editDescription.trim() || null,
      }),
    });
    if (response.ok) {
      onRefresh();
    }
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    const response = await fetch(`/api/talent-studio/org-nodes/${node.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-org-id': DEFAULT_ORG_ID },
      body: JSON.stringify({ orgId: DEFAULT_ORG_ID }),
    });
    if (response.ok) {
      onClose();
      onRefresh();
    }
  };

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute top-0 right-0 h-full w-[340px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-30 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-brand-blue">{TYPE_ICON[visualType]}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {TYPE_LABEL[visualType] ?? visualType}
          </span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <X size={14} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Title section */}
        <div className="px-4 pt-4 pb-3">
          {editing ? (
            <div className="space-y-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-base font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-action/50"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description..."
                rows={2}
                className="w-full text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-action/50 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-action text-white rounded-lg text-xs font-medium hover:bg-brand-blue transition-colors disabled:opacity-50">
                  <Check size={12} /> Save
                </button>
                <button onClick={() => { setEditing(false); setEditName(node.name); setEditDescription(node.description || ''); }} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">{node.name}</h2>
              {node.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{node.description}</p>
              )}
              {node.is_vacant && (
                <div className="flex items-center gap-1.5 mt-2 text-danger text-xs font-medium">
                  <AlertCircle size={12} /> Vacant Position
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {!editing && !readOnly && (
          <div className="px-4 pb-3 flex gap-2">
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <Edit3 size={11} /> Edit
            </button>
            {node.node_type !== 'root' && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 text-xs font-medium text-danger hover:bg-danger/20 transition-colors"
              >
                <Trash2 size={11} /> Delete
              </button>
            )}
          </div>
        )}

        {/* Delete confirmation */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-3 overflow-hidden"
            >
              <div className="p-3 rounded-lg bg-danger/5 border border-danger/20">
                <p className="text-xs text-danger font-medium mb-2">
                  Delete &quot;{node.name}&quot;? {children.length > 0 && `This will orphan ${children.length} child node(s).`}
                </p>
                <div className="flex gap-2">
                  <button onClick={handleDelete} className="px-3 py-1 bg-danger text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors">
                    Confirm Delete
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hierarchy info */}
        <div className="px-4 py-3 space-y-3 border-t border-slate-100 dark:border-slate-800">
          {linkedEmployee && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Employee Profile Link
              </span>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div><span className="text-slate-400">Employee:</span> {linkedEmployee.name}</div>
                <div><span className="text-slate-400">Role:</span> {linkedEmployeeRole?.name ?? linkedEmployee.roleId}</div>
                <div><span className="text-slate-400">Confirmed skills:</span> {linkedEmployee.assertions.filter((a) => a.status === 'confirmed').length}</div>
              </div>
              <div className="mt-2 text-[11px] text-action">
                Exotwin profile integration placeholder
              </div>
            </div>
          )}

          {visualType === 'department' && departmentHealth && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                Current Gap State
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    departmentHealth.status === 'green'
                      ? 'bg-success'
                      : departmentHealth.status === 'amber'
                        ? 'bg-warning'
                        : 'bg-danger',
                  )}
                />
                <span className="font-medium">{departmentHealth.coverage}% covered</span>
                <span className="text-slate-400">·</span>
                <span>{departmentHealth.empCount} people</span>
              </div>
              {departmentHealth.status !== 'green' && (
                <button
                  onClick={onOpenGaps}
                  className="mt-2 w-full rounded-lg bg-action text-white text-xs font-semibold py-1.5 hover:bg-brand-blue transition-colors"
                >
                  Close Gaps in Workforce Gaps
                </button>
              )}
            </div>
          )}

          {parent && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Parent</span>
              <button
                onClick={() => onNavigate?.(parent.id)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full text-left"
              >
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{parent.name}</span>
                <ChevronRight size={12} className="text-slate-400 ml-auto" />
              </button>
            </div>
          )}

          {reportsTo && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Reports To</span>
              <button
                onClick={() => onNavigate?.(reportsTo.id)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-brand-blue/5 dark:bg-brand-blue/10 hover:bg-brand-blue/10 dark:hover:bg-brand-blue/15 transition-colors w-full text-left border border-brand-blue/15"
              >
                <GitBranch size={12} className="text-brand-blue" />
                <span className="text-xs font-medium text-brand-blue">{reportsTo.name}</span>
                <ArrowUpRight size={11} className="text-brand-blue/60 ml-auto" />
              </button>
            </div>
          )}

          {directReports.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                Direct Reports ({directReports.length})
              </span>
              <div className="space-y-1">
                {directReports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onNavigate?.(r.id)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full text-left"
                  >
                    <span className="text-xs text-slate-600 dark:text-slate-300">{r.name}</span>
                    <ChevronRight size={11} className="text-slate-400 ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {children.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                Children ({children.length})
              </span>
              <div className="space-y-1">
                {children.map((c) => {
                  const childType = c.entity_type ?? (c.node_type === 'root' ? 'organization' : c.node_type === 'position' ? 'employee' : c.node_type);
                  return (
                    <button
                      key={c.id}
                      onClick={() => onNavigate?.(c.id)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full text-left"
                    >
                      <span className="text-slate-400">{TYPE_ICON[childType]}</span>
                      <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{c.name}</span>
                      {c.is_vacant && <AlertCircle size={10} className="text-danger flex-shrink-0" />}
                      <ChevronRight size={11} className="text-slate-400 ml-auto flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Activity */}
        {nodeActivity.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">Recent Activity</span>
            <div className="space-y-1.5">
              {nodeActivity.map((a) => (
                <div key={a.id} className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-600 dark:text-slate-300">{a.actor === 'ai' ? 'AI' : 'You'}</span>
                  {' '}{a.summary}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
