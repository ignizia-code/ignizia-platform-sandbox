import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Settings, 
  GraduationCap, 
  Share2, 
  Target, 
  ShieldCheck, 
  BarChart3, 
  Network,
  Building2,
  Scan
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useApp } from '../store/AppContext';
import { Link } from './Link';

export default function SubLayout({ children }: { children: React.ReactNode }) {
  const { currentPage } = useApp();

  const navGroups = [
    {
      label: 'Core',
      items: [
        { name: 'Dashboard', path: '/', id: 'dashboard', icon: LayoutDashboard },
        { name: 'Roles', path: '/roles', id: 'roles', icon: Briefcase },
        { name: 'Employees', path: '/employees', id: 'employees', icon: Users },
      ]
    },
    {
      label: 'Organization',
      items: [
        { name: 'Org Intelligence', path: '/org', id: 'org-intelligence', icon: Building2 },
        { name: 'Workforce Gaps', path: '/gaps', id: 'workforce-gaps', icon: Scan },
      ]
    },
    {
      label: 'Talent Studio',
      items: [
        { name: 'Learning Hub', path: '/learning', id: 'learning', icon: GraduationCap },
        { name: 'Project Resourcing', path: '/resourcing', id: 'resourcing', icon: Target },
        { name: 'Workforce Planning', path: '/planning', id: 'planning', icon: BarChart3 },
      ]
    },
    {
      label: 'Governance',
      items: [
        { name: 'Readiness & Risk', path: '/readiness', id: 'readiness', icon: ShieldCheck },
        { name: 'Capability Arch', path: '/architecture', id: 'architecture', icon: Network },
        { name: 'Integrations', path: '/outbox', id: 'outbox', icon: Share2 },
        { name: 'Settings', path: '/settings', id: 'settings', icon: Settings },
      ]
    }
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Mini Sidebar */}
      <aside className="w-full md:w-56 shrink-0">
        <div className="space-y-6 sticky top-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                {group.label}
              </h3>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id || (item.id === 'roles' && currentPage === 'role-detail') || (item.id === 'employees' && currentPage === 'employee-profile');
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                      )}
                    >
                      <Icon size={16} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
