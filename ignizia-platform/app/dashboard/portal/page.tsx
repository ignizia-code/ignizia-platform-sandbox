'use client';

import PortalPage from '@/components/features/portal/PortalPage';
import { useDashboard } from '../DashboardContext';
import { useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';

function PortalContent() {
  const { userRole, selectedPortalApp } = useDashboard();
  const params = useSearchParams();
  const appParam = params?.get('app') ?? undefined;
  const selected = appParam ?? (selectedPortalApp ?? 'talent-studio');

  return <PortalPage userRole={userRole || 'Leather Cutter'} selectedAppId={selected} />;
}

export default function PortalRoute() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-background-light dark:bg-background-dark" />}>
      <PortalContent />
    </Suspense>
  );
}
