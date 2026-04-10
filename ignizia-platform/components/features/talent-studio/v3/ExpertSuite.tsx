import React from 'react';
import { useApp } from './store/AppContext';
import SubLayout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RolesOverview from './pages/RolesOverview';
import RoleDetail from './pages/RoleDetail';
import EmployeesOverview from './pages/EmployeesOverview';
import EmployeeProfile from './pages/EmployeeProfile';
import LearningHub from './pages/LearningHub';
import IntegrationsOutbox from './pages/IntegrationsOutbox';
import ProjectResourcing from './pages/ProjectResourcing';
import ReadinessRisk from './pages/ReadinessRisk';
import WorkforcePlanning from './pages/WorkforcePlanning';
import CapabilityArchitecture from './pages/CapabilityArchitecture';
import AdminSettings from './pages/AdminSettings';
import WorkforceGaps from './pages/WorkforceGaps';
import OrgIntelligence from './pages/OrgIntelligence';

export default function ExpertSuite() {
  const { currentPage } = useApp();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'roles':
        return <RolesOverview />;
      case 'role-detail':
        return <RoleDetail />;
      case 'employees':
        return <EmployeesOverview />;
      case 'employee-profile':
        return <EmployeeProfile />;
      case 'learning':
        return <LearningHub />;
      case 'outbox':
        return <IntegrationsOutbox />;
      case 'resourcing':
        return <ProjectResourcing />;
      case 'readiness':
        return <ReadinessRisk />;
      case 'planning':
        return <WorkforcePlanning />;
      case 'architecture':
        return <CapabilityArchitecture />;
      case 'settings':
        return <AdminSettings />;
      case 'workforce-gaps':
        return <WorkforceGaps />;
      case 'org-intelligence':
        return <OrgIntelligence />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SubLayout>
      {renderPage()}
    </SubLayout>
  );
}
