import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../store/AppContext';
import { 
  Network, 
  Layers, 
  FileText, 
  CheckCircle2, 
  ArrowRight,
  Plus,
  Settings,
  Database,
  Search,
  Filter,
  MapPin,
  Workflow,
  Tag,
  Trash2,
  Save,
  X,
  Users,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Task, TaskRequirement, ProficiencyLevel } from '../types';

export default function CapabilityArchitecture() {
  const { 
    tasks, 
    roles, 
    buckets, 
    allSkills, 
    taskRequirements,
    addTask,
    updateTask,
    updateTaskRequirement,
    publishCapabilityConfig,
    permits,
    publishedConfigs
  } = useApp();

  const [activeTab, setActiveTab] = useState<'matrix' | 'traceability'>('matrix');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isViewingGraph, setIsViewingGraph] = useState(false);
  const [isEditingMapping, setIsEditingMapping] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState('all');
  const [workflowFilter, setWorkflowFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');

  const [newTask, setNewTask] = useState({ 
    name: '', 
    station: '', 
    location: '', 
    workflowId: '', 
    domainTags: [] as string[] 
  });

  const [editingMapping, setEditingMapping] = useState<TaskRequirement | null>(null);

  // Graph State
  const [selectedNode, setSelectedNode] = useState<{ type: 'role' | 'task', id: string } | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStation = stationFilter === 'all' || t.station === stationFilter;
      const matchesWorkflow = workflowFilter === 'all' || t.workflowId === workflowFilter;
      const matchesDomain = domainFilter === 'all' || (t.domainTags && t.domainTags.includes(domainFilter));
      return matchesSearch && matchesStation && matchesWorkflow && matchesDomain;
    });
  }, [tasks, searchQuery, stationFilter, workflowFilter, domainFilter]);

  const stations = useMemo(() => Array.from(new Set(tasks.map(t => t.station).filter(Boolean))), [tasks]);
  const workflows = useMemo(() => Array.from(new Set(tasks.map(t => t.workflowId).filter(Boolean))), [tasks]);
  const domains = useMemo(() => Array.from(new Set(tasks.flatMap(t => t.domainTags || []))), [tasks]);

  const handleAddTask = () => {
    if (!newTask.name) return;
    const id = crypto.randomUUID();
    addTask({ ...newTask, id } as any);
    setIsAddingTask(false);
    setNewTask({ name: '', station: '', location: '', workflowId: '', domainTags: [] });
    // Open mapping editor immediately for the new task
    setIsEditingMapping(id);
    const existingReq = taskRequirements.find(r => r.taskId === id);
    setEditingMapping(existingReq || { taskId: id, roleIds: [], requiredSkills: [], requiredPermits: [] });
  };

  const handlePublishMatrix = () => {
    const config = {
      id: crypto.randomUUID(),
      version: `v${publishedConfigs.length + 1}.0`,
      publishedAt: new Date().toISOString(),
      tasks,
      requirements: taskRequirements
    };
    publishCapabilityConfig(config as any);
    alert(`Capability configuration ${config.version} published successfully.`);
  };

  const handleSaveMapping = () => {
    if (editingMapping) {
      updateTaskRequirement(editingMapping);
      setIsEditingMapping(null);
      setEditingMapping(null);
    }
  };

  const toggleRoleInMapping = (roleId: string) => {
    if (!editingMapping) return;
    const roleIds = editingMapping.roleIds.includes(roleId)
      ? editingMapping.roleIds.filter(id => id !== roleId)
      : [...editingMapping.roleIds, roleId];
    setEditingMapping({ ...editingMapping, roleIds });
  };

  const toggleSkillInMapping = (skillId: string, level: ProficiencyLevel) => {
    if (!editingMapping) return;
    const exists = editingMapping.requiredSkills.find(s => s.skillId === skillId);
    let requiredSkills;
    if (exists) {
      if (exists.minLevel === level) {
        requiredSkills = editingMapping.requiredSkills.filter(s => s.skillId !== skillId);
      } else {
        requiredSkills = editingMapping.requiredSkills.map(s => s.skillId === skillId ? { ...s, minLevel: level } : s);
      }
    } else {
      requiredSkills = [...editingMapping.requiredSkills, { skillId, minLevel: level }];
    }
    setEditingMapping({ ...editingMapping, requiredSkills });
  };

  const togglePermitInMapping = (permitId: string) => {
    if (!editingMapping) return;
    const requiredPermits = editingMapping.requiredPermits.includes(permitId)
      ? editingMapping.requiredPermits.filter(id => id !== permitId)
      : [...editingMapping.requiredPermits, permitId];
    setEditingMapping({ ...editingMapping, requiredPermits });
  };

  const handleGraphClick = (type: 'role' | 'task', id: string) => {
    if (!selectedNode) {
      setSelectedNode({ type, id });
    } else {
      // If we have a selected node and click another of different type, create/toggle connection
      if (selectedNode.type !== type) {
        const roleId = type === 'role' ? id : selectedNode.id;
        const taskId = type === 'task' ? id : selectedNode.id;
        
        const req = taskRequirements.find(r => r.taskId === taskId) || { taskId, roleIds: [], requiredSkills: [], requiredPermits: [] };
        const isConnected = req.roleIds.includes(roleId);
        
        const updatedReq = {
          ...req,
          roleIds: isConnected ? req.roleIds.filter(rid => rid !== roleId) : [...req.roleIds, roleId]
        };
        updateTaskRequirement(updatedReq);
        setSelectedNode(null);
      } else {
        // Same type, just switch selection
        setSelectedNode({ type, id });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Capability Architecture</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Define task requirements and role-to-task traceability for the platform registry.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('matrix')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'matrix' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              Requirements Matrix
            </button>
            <button 
              onClick={() => setActiveTab('traceability')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'traceability' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              Traceability
            </button>
          </div>
          <button 
            onClick={handlePublishMatrix}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 dark:shadow-none"
          >
            <Database size={16} />
            Publish Config
          </button>
        </div>
      </div>

      {activeTab === 'matrix' ? (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>
            <select 
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Stations</option>
              {stations.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={workflowFilter}
              onChange={(e) => setWorkflowFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Workflows</option>
              {workflows.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <button 
              onClick={() => {
                setSearchQuery('');
                setStationFilter('all');
                setWorkflowFilter('all');
                setDomainFilter('all');
              }}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear Filters"
            >
              <X size={20} />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">Task / Domain</th>
                    {buckets.map(b => (
                      <th key={b.id} className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center border-l border-slate-200 dark:border-slate-700">
                        {b.name}
                      </th>
                    ))}
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center border-l border-slate-200 dark:border-slate-700">Required Permits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTasks.map(task => {
                    const req = taskRequirements.find(r => r.taskId === task.id);
                    return (
                      <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-900 dark:text-slate-100">
                        <td className="px-6 py-4 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">{task.name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">{task.station} • {task.workflowId}</span>
                          </div>
                        </td>
                        {buckets.map(bucket => {
                          const bucketSkillIds = bucket.skills.map(s => s.id);
                          const reqsInBucket = req?.requiredSkills.filter(rs => bucketSkillIds.includes(rs.skillId)) || [];
                          const maxLevel = reqsInBucket.length > 0 ? Math.max(...reqsInBucket.map(r => r.minLevel)) : 0;

                          return (
                            <td key={bucket.id} className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-800">
                              {maxLevel > 0 ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">L{maxLevel}</span>
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(l => (
                                      <div key={l} className={cn("w-1 h-2 rounded-sm", l <= maxLevel ? "bg-indigo-400" : "bg-slate-100 dark:bg-slate-700")} />
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 dark:text-slate-600 uppercase font-bold">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-800">
                          <div className="flex flex-wrap justify-center gap-1">
                            {req?.requiredPermits.map(pid => {
                              const p = permits.find(perm => perm.id === pid);
                              return (
                                <span key={pid} className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[9px] font-bold border border-amber-100 dark:border-amber-900/50">
                                  {p?.name}
                                </span>
                              );
                            })}
                            {(!req?.requiredPermits || req.requiredPermits.length === 0) && (
                              <span className="text-[10px] text-slate-300 dark:text-slate-600 uppercase font-bold">None</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters Bar (Shared) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>
            <select 
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Stations</option>
              {stations.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={workflowFilter}
              onChange={(e) => setWorkflowFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Workflows</option>
              {workflows.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Operational Tasks</h2>
                <button 
                  onClick={() => setIsAddingTask(true)}
                  className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {filteredTasks.map(task => {
                  const req = taskRequirements.find(r => r.taskId === task.id);
                  return (
                    <div 
                      key={task.id} 
                      className={cn(
                        "bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all cursor-pointer group",
                        selectedNode?.id === task.id && selectedNode.type === 'task' ? "border-indigo-500 ring-2 ring-indigo-50 dark:ring-indigo-900/20" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 shadow-sm"
                      )}
                      onClick={() => handleGraphClick('task', task.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{task.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {task.station}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditingMapping(task.id);
                              setEditingMapping(req || { taskId: task.id, roleIds: [], requiredSkills: [], requiredPermits: [] });
                            }}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Settings size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {req?.roleIds.map(rid => {
                          const r = roles.find(role => role.id === rid);
                          return (
                            <span key={rid} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[9px] font-bold">
                              {r?.name}
                            </span>
                          );
                        })}
                        {(!req?.roleIds || req.roleIds.length === 0) && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-600 italic">No roles mapped</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Traceability Graph</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Click a Role and a Task to link them</span>
                  <button 
                    onClick={() => setIsViewingGraph(true)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <Network size={14} />
                    Fullscreen Editor
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 h-[60vh] relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                
                <div className="w-full h-full flex justify-between items-center max-w-2xl relative">
                  {/* Roles Column */}
                  <div className="flex flex-col gap-6 z-10">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-2">Roles</p>
                    {roles.slice(0, 5).map(role => (
                      <div 
                        key={role.id}
                        onClick={() => handleGraphClick('role', role.id)}
                        className={cn(
                          "w-40 p-3 bg-white dark:bg-slate-900 border rounded-xl shadow-sm cursor-pointer transition-all text-center",
                          selectedNode?.id === role.id && selectedNode.type === 'role' ? "border-indigo-500 ring-2 ring-indigo-50 dark:ring-indigo-900/30 scale-105" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500"
                        )}
                      >
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{role.name}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tasks Column */}
                  <div className="flex flex-col gap-6 z-10">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-2">Tasks</p>
                    {filteredTasks.slice(0, 5).map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => handleGraphClick('task', task.id)}
                        className={cn(
                          "w-40 p-3 bg-white dark:bg-slate-900 border rounded-xl shadow-sm cursor-pointer transition-all text-center",
                          selectedNode?.id === task.id && selectedNode.type === 'task' ? "border-indigo-500 ring-2 ring-indigo-50 dark:ring-indigo-900/30 scale-105" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500"
                        )}
                      >
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{task.name}</p>
                      </div>
                    ))}
                  </div>

                  {/* SVG Connections */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    {roles.slice(0, 5).map((role, rIdx) => {
                      return filteredTasks.slice(0, 5).map((task, tIdx) => {
                        const req = taskRequirements.find(r => r.taskId === task.id);
                        if (req?.roleIds.includes(role.id)) {
                          const rY = 65 + rIdx * 64; 
                          const tY = 65 + tIdx * 64;
                          return (
                            <path 
                              key={`${role.id}-${task.id}`}
                              d={`M 160 ${rY} C 336 ${rY}, 336 ${tY}, 512 ${tY}`}
                              stroke="#6366f1"
                              strokeWidth="1.5"
                              strokeOpacity="0.3"
                              fill="none"
                            />
                          );
                        }
                        return null;
                      });
                    })}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-900 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold">Create New Task</h2>
              <button onClick={() => setIsAddingTask(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Task Name</label>
                  <input 
                    type="text"
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Quality Inspection"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Station</label>
                  <input 
                    type="text"
                    value={newTask.station}
                    onChange={(e) => setNewTask({ ...newTask, station: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Assembly Line A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Location</label>
                  <input 
                    type="text"
                    value={newTask.location}
                    onChange={(e) => setNewTask({ ...newTask, location: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Floor 2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Workflow</label>
                  <input 
                    type="text"
                    value={newTask.workflowId}
                    onChange={(e) => setNewTask({ ...newTask, workflowId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="WF-102"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Domain Tags</label>
                  <input 
                    type="text"
                    placeholder="Comma separated"
                    onChange={(e) => setNewTask({ ...newTask, domainTags: e.target.value.split(',').map(s => s.trim()) })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsAddingTask(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddTask}
                  className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 dark:shadow-none"
                >
                  Create & Map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Editor Modal */}
      {isEditingMapping && editingMapping && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <div>
                <h2 className="text-xl font-bold">Edit Task Mapping</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Task: {tasks.find(t => t.id === isEditingMapping)?.name}</p>
              </div>
              <button onClick={() => setIsEditingMapping(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Roles Selection */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Users size={14} /> Involved Roles
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {roles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => toggleRoleInMapping(role.id)}
                      className={cn(
                        "p-3 rounded-xl border text-sm font-bold transition-all text-left",
                        editingMapping.roleIds.includes(role.id)
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500"
                      )}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              </section>

              {/* Skills Selection */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Layers size={14} /> Required Skills & Proficiency
                </h3>
                <div className="space-y-6">
                  {buckets.map(bucket => (
                    <div key={bucket.id} className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">{bucket.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {bucket.skills.slice(0, 4).map(skill => {
                          const currentReq = editingMapping.requiredSkills.find(s => s.skillId === skill.id);
                          return (
                            <div key={skill.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{skill.name}</span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(l => (
                                  <button
                                    key={l}
                                    onClick={() => toggleSkillInMapping(skill.id, l as ProficiencyLevel)}
                                    className={cn(
                                      "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all",
                                      currentReq?.minLevel === l 
                                        ? "bg-indigo-600 text-white" 
                                        : currentReq && currentReq.minLevel > l
                                          ? "bg-indigo-200 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                  >
                                    {l}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Permits Selection */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-amber-500" /> Required Permits
                </h3>
                <div className="flex flex-wrap gap-3">
                  {permits.map(permit => (
                    <button
                      key={permit.id}
                      onClick={() => togglePermitInMapping(permit.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl border text-xs font-bold transition-all",
                        editingMapping.requiredPermits.includes(permit.id)
                          ? "bg-amber-500 border-amber-500 text-white shadow-md"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300 dark:hover:border-amber-500"
                      )}
                    >
                      {permit.name}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditingMapping(null)}
                className="px-6 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all"
              >
                Discard
              </button>
              <button 
                onClick={handleSaveMapping}
                className="px-8 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-all flex items-center gap-2"
              >
                <Save size={16} /> Save Mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Graph Editor Modal */}
      {isViewingGraph && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-slate-900 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full h-full flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">Traceability Graph Editor</h2>
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  <Network size={12} /> Live Editing Mode
                </div>
              </div>
              <button onClick={() => setIsViewingGraph(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
              
              <div className="w-full max-w-5xl h-full flex justify-between items-center px-20 relative overflow-y-auto">
                {/* Roles Column */}
                <div className="flex flex-col gap-4 z-10 py-10">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-4">Roles</p>
                  {roles.map(role => (
                    <div 
                      key={role.id}
                      onClick={() => handleGraphClick('role', role.id)}
                      className={cn(
                        "w-48 p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer transition-all text-center",
                        selectedNode?.id === role.id && selectedNode.type === 'role' ? "border-indigo-500 ring-4 ring-indigo-50 dark:ring-indigo-900/20 scale-105" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500"
                      )}
                    >
                      <p className="text-sm font-bold">{role.name}</p>
                    </div>
                  ))}
                </div>

                {/* Tasks Column */}
                <div className="flex flex-col gap-4 z-10 py-10">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-4">Tasks</p>
                  {tasks.map(task => (
                    <div 
                      key={task.id} 
                      onClick={() => handleGraphClick('task', task.id)}
                      className={cn(
                        "w-48 p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer transition-all text-center",
                        selectedNode?.id === task.id && selectedNode.type === 'task' ? "border-indigo-500 ring-4 ring-indigo-50 dark:ring-indigo-900/20 scale-105" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500"
                      )}
                    >
                      <p className="text-sm font-bold">{task.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase mt-1">{task.station}</p>
                    </div>
                  ))}
                </div>

                {/* SVG Connections - Simplified for fullscreen to avoid complex dynamic positioning in this refactor */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  {/* Real implementation would need complex coord mapping */}
                </svg>
              </div>

              {/* Legend/Controls */}
              <div className="absolute bottom-8 left-8 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-xs">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Editor Controls</h4>
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Click a role then a task to link</li>
                  <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" /> Click an existing link to remove</li>
                  <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-100 dark:bg-indigo-900" /> Selection is highlighted in blue</li>
                </ul>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {roles.slice(0, 3).map(r => (
                    <div key={r.id} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      {r.name[0]}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Changes are saved automatically to the capability registry.</p>
              </div>
              <button 
                onClick={() => setIsViewingGraph(false)}
                className="px-8 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-all"
              >
                Close & Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
