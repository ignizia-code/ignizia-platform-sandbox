'use client';

import React, { useState } from 'react';
import PolicySnapshot from './PolicySnapshot';
import ApprovalQueue from './ApprovalQueue';
import AuditTrail from './AuditTrail';
import ComplianceHealth from './ComplianceHealth';

const LeadershipDashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leadership Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Governance, compliance, and approval oversight</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-1">
          <PolicySnapshot />
        </div>
        <div className="lg:col-span-1">
          <ComplianceHealth key={refreshKey} />
        </div>
        <div className="lg:col-span-2">
          <ApprovalQueue key={refreshKey} onRefresh={handleRefresh} />
        </div>
        <div className="lg:col-span-2">
          <AuditTrail key={refreshKey} />
        </div>
      </div>
    </div>
  );
};

export default LeadershipDashboard;
