import { useApp } from '../store/AppContext';
import { Plus, ChevronRight, User } from 'lucide-react';
import { Link } from '../components/Link';

export default function EmployeesOverview() {
  const { employees, roles, runGapAnalysis, addEmployee, setCurrentPage, setParams } = useApp();

  const handleAddEmployee = () => {
    const newId = crypto.randomUUID();
    const newEmp = {
      id: newId,
      name: 'New Talent',
      roleId: roles[0]?.id || '',
      avatarUrl: `https://picsum.photos/seed/${Math.random()}/200/200`,
      assertions: [],
      privacy: {
        shareConfirmedSkills: true,
        shareUnconfirmedAiSkills: false,
        shareUnconfirmedImportedSkills: false,
        allowAiToAddSkills: true,
        visibility: 'org_visible' as const
      }
    };
    addEmployee(newEmp as any);
    setCurrentPage('employee-profile');
    setParams({ empId: newId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Employees</h1>
          <p className="text-slate-500 mt-1">View workforce skills and readiness.</p>
        </div>
        <button 
          onClick={handleAddEmployee}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {employees.map((emp) => {
          const role = roles.find(r => r.id === emp.roleId);
          const analysis = runGapAnalysis(emp.id);
          const readiness = analysis ? analysis.overallReadiness : 0;

          // Color code readiness
          let readinessColor = "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400";
          if (readiness >= 80) readinessColor = "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400";
          else if (readiness >= 50) readinessColor = "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400";

          return (
            <Link 
              key={emp.id} 
              to={`/employees/${emp.id}`}
              className="block bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                     {emp.avatarUrl ? (
                       <img src={emp.avatarUrl} alt={emp.name} className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-slate-400">
                         <User size={24} />
                       </div>
                     )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {emp.name}
                    </h3>
                    <p className="text-slate-500 text-sm">{role?.name || 'No Role Assigned'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role Readiness</p>
                    <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${readinessColor}`}>
                      {readiness}%
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
