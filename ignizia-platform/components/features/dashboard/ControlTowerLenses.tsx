'use client';

import React from 'react';
import type { UserRole } from '@/types';
import type { Timeframe } from '@/types';

/** Role-based lens config - for now we only have Plant Manager fully implemented */
export function getControlTowerRole(userRole: UserRole | null | undefined): UserRole | 'Plant Manager' {
  if (!userRole) return 'Plant Manager';
  return userRole;
}

/** Check if we have full lens implementation for this role */
export function hasControlTowerLenses(role: UserRole): boolean {
  return role === 'Plant Manager';
}
