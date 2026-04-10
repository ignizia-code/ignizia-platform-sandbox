import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Cpu, 
  Lock, 
  User,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function AdminSettings() {
  const [aiInference, setAiInference] = useState(true);
  const [restrictedSkills, setRestrictedSkills] = useState(['Emotional Intelligence', 'Conflict Resolution']);
  const [isAddingRestricted, setIsAddingRestricted] = useState(false);
  const [newRestricted, setNewRestricted] = useState('');

  const handleAddRestricted = () => {
    if (newRestricted && !restrictedSkills.includes(newRestricted)) {
      setRestrictedSkills([...restrictedSkills, newRestricted]);
      setNewRestricted('');
      setIsAddingRestricted(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure platform-wide skill policies, AI inference rules, and privacy defaults.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI & Automation */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
              <Cpu size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">AI & Automation</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Skill Inference</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Allow AI to suggest skills based on operational signals.</p>
              </div>
              <button 
                onClick={() => setAiInference(!aiInference)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  aiInference ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  aiInference ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-900 dark:text-slate-100 mb-3">AI Restricted Skills</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Skills that should never be inferred by AI for privacy or sensitivity reasons.</p>
              <div className="flex flex-wrap gap-2">
                {restrictedSkills.map(skill => (
                  <span key={skill} className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-xs font-bold border border-red-100 dark:border-red-900/30">
                    {skill}
                    <button onClick={() => setRestrictedSkills(restrictedSkills.filter(s => s !== skill))}>
                      <X size={14} />
                    </button>
                  </span>
                ))}
                <button 
                  onClick={() => setIsAddingRestricted(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  + Add Restricted
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Visibility */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
              <Shield size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Privacy & Visibility</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Default Visibility</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Who can see employee skill profiles by default.</p>
              </div>
              <select className="text-sm border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 py-1.5 pl-3 pr-8 font-medium text-slate-700 dark:text-slate-300">
                <option>Organization Wide</option>
                <option>Managers Only</option>
                <option>Team Only</option>
                <option>Private</option>
              </select>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-900 dark:text-slate-100 mb-4">User Consent Defaults</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border border-indigo-600 bg-indigo-600 flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">Share confirmed skills automatically</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Share unconfirmed AI skills</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Allow AI to add skills to profile</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Restricted Modal */}
      {isAddingRestricted && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-slate-900 dark:text-slate-100">
            <h2 className="text-lg font-bold mb-4">Add Restricted Domain</h2>
            <input 
              type="text"
              value={newRestricted}
              onChange={(e) => setNewRestricted(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 mb-4 text-slate-900 dark:text-slate-100"
              placeholder="e.g. Personal Ethics"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddRestricted()}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setIsAddingRestricted(false)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddRestricted}
                className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
