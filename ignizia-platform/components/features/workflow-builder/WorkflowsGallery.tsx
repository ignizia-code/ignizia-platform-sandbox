'use client';

import React, { useState } from 'react';
import type { WorkflowMeta } from '@/types/workflow';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  workflow: Omit<WorkflowMeta, 'id'> & {
    description?: string; // templates may include a description
    nodes: any[]; // placeholder, templates can include minimal structure
    edges: any[];
  };
}

// a small set of templates for demonstration
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'order-readiness',
    name: 'Order Readiness',
    description: 'Track leather order through inventory, quality, and approval',
    icon: 'checklist',
    category: 'Operations',
    workflow: {
      name: 'Order Readiness',
      description: 'Basic order readiness flow',
      owner: 'Plant Manager',
      sharedWith: ['Line Manager'],
      nodes: [
        {
          id: 'n1',
          name: 'Receive Order',
          position: { x: 100, y: 100 }
        },
        {
          id: 'n2',
          name: 'Check Inventory',
          position: { x: 300, y: 100 }
        }
      ],
      edges: [
        {
          id: 'e1',
          name: 'to inventory',
          startNodeId: 'n1',
          endNodeId: 'n2'
        }
      ]
    }
  }
];

interface WorkflowCardProps {
  workflow: WorkflowMeta;
  isSelected?: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  isSelected,
  onSelect,
  onRename,
  onDuplicate,
  onDelete
}) => {
  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = prompt('New name', workflow.name);
    if (newName && newName.trim() && newName !== workflow.name) {
      onRename(workflow.id, newName.trim());
    }
  };

  return (
    <div
      onClick={() => onSelect(workflow.id)}
      className={`group relative p-4 rounded-xl border transition-all cursor-pointer bg-white dark:bg-slate-800 
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-slate-200 dark:border-slate-700 hover:border-accent hover:shadow-lg'}`}
    >
      <h4 className="font-semibold text-slate-900 dark:text-white mb-1 truncate">
        {workflow.name}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Owner: {workflow.owner}
      </p>
      {workflow.updatedAt && (
        <p className="text-xs text-slate-400 mt-1">
          {new Date(workflow.updatedAt).toLocaleDateString()}
        </p>
      )}
      {(workflow.nodeCount != null || workflow.edgeCount != null) && (
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex gap-2">
          {workflow.nodeCount != null && <span>{workflow.nodeCount} nodes</span>}
          {workflow.edgeCount != null && <span>{workflow.edgeCount} edges</span>}
        </div>
      )}

      {/* hover actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        <button
          onClick={handleRename}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          title="Rename"
        >
          <span className="material-icons-round text-sm">edit</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(workflow.id);
          }}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          title="Duplicate"
        >
          <span className="material-icons-round text-sm">content_copy</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Delete this workflow?')) {
              onDelete(workflow.id);
            }
          }}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-red-500"
          title="Delete"
        >
          <span className="material-icons-round text-sm">delete</span>
        </button>
      </div>
    </div>
  );
};

interface WorkflowsGalleryProps {
  workflows: WorkflowMeta[];
  loading: boolean;
  error: string | null;
  visibleWorkflows: WorkflowMeta[];
  selectedWorkflowId?: string | null;
  onSelectWorkflow: (id: string) => void;
  onRenameWorkflow: (id: string, newName: string) => void;
  onDuplicateWorkflow: (id: string) => void;
  onDeleteWorkflow: (id: string) => void;
  onCreateFromScratch: () => void;
  onCreateWithAI: () => void;
  onCreateDemo: () => void;
  onSelectTemplate: (template: WorkflowTemplate) => void;
}

const WorkflowsGallery: React.FC<WorkflowsGalleryProps> = ({
  workflows,
  loading,
  error,
  visibleWorkflows,
  selectedWorkflowId,
  onSelectWorkflow,
  onRenameWorkflow,
  onDuplicateWorkflow,
  onDeleteWorkflow,
  onCreateFromScratch,
  onCreateWithAI,
  onCreateDemo,
  onSelectTemplate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(WORKFLOW_TEMPLATES.map(t => t.category))];
  const filteredTemplates = WORKFLOW_TEMPLATES.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col p-8 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Workflow Builder</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Build and manage your process workflows. Start from scratch, a template, or let AI help.
        </p>
      </div>

      {/* create options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={onCreateFromScratch}
          className="group p-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-accent dark:hover:border-accent transition-all hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <span className="material-icons-round text-2xl">add</span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Create from Scratch</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Start with a blank canvas
          </p>
        </button>

        <button
          onClick={onCreateWithAI}
          className="group p-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-cyan-500 dark:hover:border-cyan-500 transition-all hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
        >
          <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <span className="material-icons-round text-2xl">auto_awesome</span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Build with AI</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Describe your process and I’ll draft a workflow
          </p>
        </button>

        <button
          onClick={onCreateDemo}
          className="group p-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-amber-500 dark:hover:border-amber-500 transition-all hover:bg-amber-50 dark:hover:bg-amber-950/30"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <span className="material-icons-round text-2xl">science</span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Use Demo</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Load a sample workflow
          </p>
        </button>
      </div>

      {/* templates section */}
      <div className="flex flex-col mb-16">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Templates</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
              !selectedCategory
                ? 'bg-accent/20 dark:bg-accent/30 text-accent'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-accent/20 dark:bg-accent/30 text-accent'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(t => (
            <div
              key={t.id}
              className="group bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-accent dark:hover:border-accent hover:shadow-lg transition-all cursor-pointer"
              onClick={() => onSelectTemplate(t)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                  <span className="material-icons-round">{t.icon}</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                  {t.category}
                </span>
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{t.name}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                {t.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {t.workflow.nodes?.length ?? 0} nodes
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTemplate(t);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* workflows grid */}
      <div className="mt-8 pb-12">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 px-2 py-4 text-center">
            Loading workflows…
          </p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400 px-2 py-4 text-center">
            {error}
          </p>
        ) : visibleWorkflows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 px-2 py-4 text-center">
            No workflows yet. Create one to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleWorkflows.map(w => (
              <WorkflowCard
                key={w.id}
                workflow={w}
                isSelected={selectedWorkflowId === w.id}
                onSelect={onSelectWorkflow}
                onRename={onRenameWorkflow}
                onDuplicate={onDuplicateWorkflow}
                onDelete={onDeleteWorkflow}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowsGallery;
