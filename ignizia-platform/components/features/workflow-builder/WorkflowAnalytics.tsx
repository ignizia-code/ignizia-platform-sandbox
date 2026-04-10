/**
 * Workflow Analytics UI Component
 * 
 * Displays bottleneck and responsibility intelligence for workflows.
 * Passive analytics only - does not modify workflow behavior.
 */

'use client';

import React, { useMemo, useState } from 'react';
import { Workflow } from '@/types';
import {
  computeWorkflowAnalytics,
  PersonBottleneck,
  NodeResponsibility,
  WorkflowAnalytics as AnalyticsData,
} from '@/lib/workflowAnalytics';

interface WorkflowAnalyticsProps {
  workflow: Workflow;
}

type PersonSortKey = keyof PersonBottleneck;
type NodeSortKey = 'nodeId' | 'nodeName' | 'dependencies' | 'assignee' | 'approver' | 'blockedBy' | 'blocksNodes';

const WorkflowAnalytics: React.FC<WorkflowAnalyticsProps> = ({ workflow }) => {
  const [personSortKey, setPersonSortKey] = useState<PersonSortKey>('downstreamImpact');
  const [personSortAsc, setPersonSortAsc] = useState(false);
  const [nodeSortKey, setNodeSortKey] = useState<NodeSortKey>('nodeId');
  const [nodeSortAsc, setNodeSortAsc] = useState(true);
  const [personFilter, setPersonFilter] = useState('');
  const [nodeFilter, setNodeFilter] = useState('');

  // Compute analytics (memoized)
  const analytics: AnalyticsData = useMemo(() => {
    return computeWorkflowAnalytics(workflow);
  }, [workflow]);

  // Sort and filter person bottlenecks
  const sortedPersonBottlenecks = useMemo(() => {
    let filtered = analytics.personBottlenecks;

    if (personFilter) {
      const lower = personFilter.toLowerCase();
      filtered = filtered.filter((p) => p.person.toLowerCase().includes(lower));
    }

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[personSortKey];
      const bVal = b[personSortKey];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return personSortAsc
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return personSortAsc ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });

    return sorted;
  }, [analytics.personBottlenecks, personSortKey, personSortAsc, personFilter]);

  // Sort and filter node responsibilities
  const sortedNodeResponsibilities = useMemo(() => {
    let filtered = analytics.nodeResponsibilities;

    if (nodeFilter) {
      const lower = nodeFilter.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.nodeName.toLowerCase().includes(lower) ||
          n.nodeId.toLowerCase().includes(lower)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[nodeSortKey];
      const bVal = b[nodeSortKey];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return nodeSortAsc
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (Array.isArray(aVal) && Array.isArray(bVal)) {
        return nodeSortAsc
          ? aVal.length - bVal.length
          : bVal.length - aVal.length;
      }
      
      return 0;
    });

    return sorted;
  }, [analytics.nodeResponsibilities, nodeSortKey, nodeSortAsc, nodeFilter]);

  const handlePersonSort = (key: PersonSortKey) => {
    if (personSortKey === key) {
      setPersonSortAsc(!personSortAsc);
    } else {
      setPersonSortKey(key);
      setPersonSortAsc(false);
    }
  };

  const handleNodeSort = (key: NodeSortKey) => {
    if (nodeSortKey === key) {
      setNodeSortAsc(!nodeSortAsc);
    } else {
      setNodeSortKey(key);
      setNodeSortAsc(true);
    }
  };

  const SortIcon: React.FC<{ active: boolean; ascending: boolean }> = ({ active, ascending }) => {
    if (!active) return <span className="text-slate-400">⇅</span>;
    return <span>{ascending ? '↑' : '↓'}</span>;
  };

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-slate-800">
      {/* Structural Risk Summary Banner */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
          Structural Risk Summary
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {/* Most Critical Bottleneck */}
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2" title="Person with the highest downstream impact - their delays affect the most tasks">
            <div className="text-[10px] font-medium text-red-600 dark:text-red-400 mb-0.5">
              Critical Bottleneck
            </div>
            {analytics.structuralRisk.mostCriticalBottleneck ? (
              <>
                <div className="text-xs font-bold text-red-700 dark:text-red-300 truncate">
                  {analytics.structuralRisk.mostCriticalBottleneck.person}
                </div>
                <div className="text-[10px] text-red-600 dark:text-red-400">
                  {analytics.structuralRisk.mostCriticalBottleneck.downstreamImpact} downstream
                </div>
              </>
            ) : (
              <div className="text-[10px] text-slate-500 dark:text-slate-400">None</div>
            )}
          </div>

          {/* Longest Approval Chain */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2" title="Maximum number of sequential approval nodes in any workflow path - indicates approval overhead">
            <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mb-0.5">
              Approval Chain
            </div>
            <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
              {analytics.structuralRisk.longestApprovalChain.length} layers
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400">
              {analytics.structuralRisk.longestApprovalChain.path.length} nodes
            </div>
          </div>

          {/* Single Points of Failure */}
          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded p-2" title="People who touch ≥50% of workflow nodes - concentration risk indicators">
            <div className="text-[10px] font-medium text-orange-600 dark:text-orange-400 mb-0.5">
              Single Points
            </div>
            <div className="text-xs font-bold text-orange-700 dark:text-orange-300">
              {analytics.structuralRisk.singlePointsOfFailure.length}
            </div>
            {analytics.structuralRisk.singlePointsOfFailure.length > 0 && (
              <div className="text-[10px] text-orange-600 dark:text-orange-400 truncate">
                {analytics.structuralRisk.singlePointsOfFailure[0].person} (
                {analytics.structuralRisk.singlePointsOfFailure[0].pathCoverage.toFixed(0)}%)
              </div>
            )}
          </div>

          {/* Total Approval Layers */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2" title="Maximum sequential depth of approval nodes - indicates bureaucratic complexity">
            <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-0.5">
              Approval Layers
            </div>
            <div className="text-xs font-bold text-blue-700 dark:text-blue-300">
              {analytics.structuralRisk.totalApprovalLayers}
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400">
              Sequential
            </div>
          </div>
        </div>
      </div>

      {/* Person Bottleneck Table */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="p-2 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            Person Bottleneck Analysis
          </h2>
          <input
            type="text"
            placeholder="Filter by person..."
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              <tr>
                <th
                  className="px-2 py-1.5 text-left font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handlePersonSort('person')}
                  title="Person (role) involved in the workflow"
                >
                  <div className="flex items-center gap-1">
                    Person
                    <SortIcon active={personSortKey === 'person'} ascending={personSortAsc} />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 text-right font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handlePersonSort('executionTaskCount')}
                  title="Number of nodes where this person executes the task (assignedTo)"
                >
                  <div className="flex items-center justify-end gap-1">
                    Exec
                    <SortIcon active={personSortKey === 'executionTaskCount'} ascending={personSortAsc} />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 text-right font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handlePersonSort('approvalTaskCount')}
                  title="Number of nodes where this person approves the task (approver)"
                >
                  <div className="flex items-center justify-end gap-1">
                    Appr
                    <SortIcon active={personSortKey === 'approvalTaskCount'} ascending={personSortAsc} />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 text-right font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handlePersonSort('totalTouchpoints')}
                  title="Total nodes touched (execution + approval) - overall involvement"
                >
                  <div className="flex items-center justify-end gap-1">
                    Total
                    <SortIcon active={personSortKey === 'totalTouchpoints'} ascending={personSortAsc} />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 text-right font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handlePersonSort('directBlockingCount')}
                  title="Direct Blocking: Number of immediate downstream nodes (one hop away) blocked by this person's tasks"
                >
                  <div className="flex items-center justify-end gap-1">
                    Block
                    <SortIcon active={personSortKey === 'directBlockingCount'} ascending={personSortAsc} />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 text-right font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handlePersonSort('downstreamImpact')}
                  title="Downstream Impact: ALL nodes affected by this person (including cascading effects). Higher = greater bottleneck risk. This is the key metric!"
                >
                  <div className="flex items-center justify-end gap-1">
                    Impact ⭐
                    <SortIcon active={personSortKey === 'downstreamImpact'} ascending={personSortAsc} />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 text-right font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handlePersonSort('maxChainDepth')}
                  title="Longest sequential path from this person's nodes to workflow end - delay propagation risk"
                >
                  <div className="flex items-center justify-end gap-1">
                    Depth
                    <SortIcon active={personSortKey === 'maxChainDepth'} ascending={personSortAsc} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {sortedPersonBottlenecks.map((bottleneck) => (
                <tr
                  key={bottleneck.person}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <td className="px-2 py-1.5 font-medium text-slate-900 dark:text-white">
                    {bottleneck.person}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-700 dark:text-slate-300">
                    {bottleneck.executionTaskCount}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-700 dark:text-slate-300">
                    {bottleneck.approvalTaskCount}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-700 dark:text-slate-300">
                    {bottleneck.totalTouchpoints}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-700 dark:text-slate-300">
                    {bottleneck.directBlockingCount}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold text-slate-900 dark:text-white">
                    {bottleneck.downstreamImpact}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-700 dark:text-slate-300">
                    {bottleneck.maxChainDepth}
                  </td>
                </tr>
              ))}
              {sortedPersonBottlenecks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No person assignments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Node Responsibility Table */}
      <div>
        <div className="p-2 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            Node Responsibility Clarity
          </h2>
          <input
            type="text"
            placeholder="Filter by node name..."
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              <tr>
                <th
                  className="px-2 py-1.5 text-left font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handleNodeSort('nodeName')}
                  title="Task/activity name in the workflow"
                >
                  <div className="flex items-center gap-1">
                    Node
                    <SortIcon active={nodeSortKey === 'nodeName'} ascending={nodeSortAsc} />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 text-left font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handleNodeSort('dependencies')}
                  title="Upstream nodes that must complete before this node can start"
                >
                  <div className="flex items-center gap-1">
                    Deps
                    <SortIcon active={nodeSortKey === 'dependencies'} ascending={nodeSortAsc} />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 text-left font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handleNodeSort('assignee')}
                  title="Person responsible for executing this task"
                >
                  <div className="flex items-center gap-1">
                    Assignee
                    <SortIcon active={nodeSortKey === 'assignee'} ascending={nodeSortAsc} />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 text-left font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handleNodeSort('approver')}
                  title="Person responsible for reviewing and approving this task"
                >
                  <div className="flex items-center gap-1">
                    Approver
                    <SortIcon active={nodeSortKey === 'approver'} ascending={nodeSortAsc} />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 text-left font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handleNodeSort('blockedBy')}
                  title="People from upstream nodes currently blocking this node (hover to see all)"
                >
                  <div className="flex items-center gap-1">
                    Blocked By
                    <SortIcon active={nodeSortKey === 'blockedBy'} ascending={nodeSortAsc} />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 text-left font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handleNodeSort('blocksNodes')}
                  title="Downstream nodes that depend on this node completing"
                >
                  <div className="flex items-center gap-1">
                    Blocks
                    <SortIcon active={nodeSortKey === 'blocksNodes'} ascending={nodeSortAsc} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {sortedNodeResponsibilities.map((node) => (
                <tr
                  key={node.nodeId}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <td className="px-2 py-1.5 font-medium text-slate-900 dark:text-white">
                    {node.nodeName}
                  </td>
                  <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">
                    {node.dependencies.length > 0 ? (
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        {node.dependencies.length}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                    {node.assignee || <span className="text-slate-400 dark:text-slate-500">—</span>}
                  </td>
                  <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                    {node.approver || <span className="text-slate-400 dark:text-slate-500">—</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    {node.blockedBy.length > 0 ? (
                      <span 
                        className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded cursor-help"
                        title={node.blockedBy.length > 1 ? `All blockers: ${node.blockedBy.join(', ')}` : node.blockedBy[0]}
                      >
                        {node.blockedBy[0]}
                        {node.blockedBy.length > 1 && ` +${node.blockedBy.length - 1}`}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">
                    {node.blocksNodes.length > 0 ? (
                      <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded">
                        {node.blocksNodes.length}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {sortedNodeResponsibilities.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No nodes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WorkflowAnalytics;
