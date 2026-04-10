import React from 'react';
import { useApp } from '../store/AppContext';

interface LinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Link({ to, children, className, onClick }: LinkProps) {
  const { setCurrentPage, setParams } = useApp();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Parse path and params
    // Example: /roles/123 -> page: 'role-detail', params: { roleId: '123' }
    if (to === '/') {
      setCurrentPage('dashboard');
      setParams({});
    } else if (to.startsWith('/roles/')) {
      setCurrentPage('role-detail');
      setParams({ roleId: to.replace('/roles/', '') });
    } else if (to === '/roles') {
      setCurrentPage('roles');
      setParams({});
    } else if (to.startsWith('/employees/')) {
      setCurrentPage('employee-profile');
      setParams({ empId: to.replace('/employees/', '') });
    } else if (to === '/employees') {
      setCurrentPage('employees');
      setParams({});
    } else if (to === '/learning') {
      setCurrentPage('learning');
      setParams({});
    } else if (to === '/outbox') {
      setCurrentPage('outbox');
      setParams({});
    } else if (to === '/resourcing') {
      setCurrentPage('resourcing');
      setParams({});
    } else if (to === '/readiness') {
      setCurrentPage('readiness');
      setParams({});
    } else if (to === '/planning') {
      setCurrentPage('planning');
      setParams({});
    } else if (to === '/architecture') {
      setCurrentPage('architecture');
      setParams({});
    } else if (to === '/settings') {
      setCurrentPage('settings');
      setParams({});
    } else if (to === '/org') {
      setCurrentPage('org-intelligence');
      setParams({});
    } else if (to === '/gaps') {
      setCurrentPage('workforce-gaps');
      setParams({});
    }
    
    if (onClick) onClick();
  };

  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
