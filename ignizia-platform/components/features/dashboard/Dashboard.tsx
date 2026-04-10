'use client';

import React, { useState, useEffect } from 'react';
import { Timeframe, DashboardView, UserRole } from '@/types';
import ModelViewer from '@/components/ui/ModelViewer';
import { ControlTowerRoleView, HRManagerControlTower } from './lenses/ControlTowerRoleView';
import { AdvancedLensCards } from './lenses/AdvancedLensCards';
import { getRoleLensData } from './lenses/roleMockData';
import { SimulationModal, DrillDownPanel } from './shared';

interface DashboardProps {
  timeframe?: Timeframe;
  view?: DashboardView;
  userRole?: UserRole | null;
}

const Dashboard: React.FC<DashboardProps> = ({ timeframe = 'Week', view = 'Dashboard', userRole }) => {
  const [isPaneOpen, setIsPaneOpen] = useState(false);
  const [paneWidth, setPaneWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = 100 - (e.clientX / window.innerWidth) * 100;
      setPaneWidth(Math.max(20, Math.min(80, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);
  if (view === 'Scene') {
    return (
      <div className="h-full w-full animate-in zoom-in-95 duration-500">
        <ModelViewer cameraPosition={[-7.319515104922967, 3.83965209039651, -7.357595453987889]} />
      </div>
    );
  }

  const effectiveRole = userRole ?? 'Leather Cutter';

  return (
    <ControlTowerRoleView userRole={effectiveRole}>
      <div className="flex h-full">
        <div
          className={`flex-1 overflow-auto ${isPaneOpen ? 'pr-2' : ''}`}
          style={isPaneOpen ? { width: `${100 - paneWidth}%` } : {}}
        >
          <div className="p-6 xl:p-8 pb-24 w-full max-w-none min-h-full space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-12 gap-6 items-stretch auto-rows-fr">
              {effectiveRole === 'HR Manager' ? (
                <HRManagerControlTower onSimulateScenario={() => setSimulationModalOpen(true)} />
              ) : (
                <AdvancedLensCards
                  data={getRoleLensData(effectiveRole, timeframe)}
                  timeframe={timeframe}
                  onSimulateScenario={() => setSimulationModalOpen(true)}
                  onDrillDown={() => setIsPaneOpen(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {isPaneOpen && (
        <div
          className="bg-white dark:bg-card-dark border-l border-slate-200 dark:border-slate-700 flex flex-col relative"
          style={{ width: `${paneWidth}%` }}
        >
          <DrillDownPanel stationName="Station 7 - Packaging" onClose={() => setIsPaneOpen(false)}>
            <div className="mt-4 h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <ModelViewer cameraPosition={[-8.246290942631015, 0.8080335052064804, 6.469860509694243]} />
            </div>
          </DrillDownPanel>
          <div
            className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300 dark:bg-slate-600 cursor-col-resize hover:bg-action"
            onMouseDown={() => setIsResizing(true)}
          />
        </div>
      )}
      <SimulationModal
        isOpen={simulationModalOpen}
        onClose={() => setSimulationModalOpen(false)}
        title="Simulate Scenario"
      />
    </ControlTowerRoleView>
  );
};

export default Dashboard;
