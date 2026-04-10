'use client';

import { useMemo } from 'react';
import {
  loadTalentStudioV2,
  buildDemoTalentStudioV2,
  computeSkillCoverage,
  computeAlerts,
  computeRoleRisk,
  SKILLS,
} from '@/components/features/talent-studio/TalentStudio';
import type {
  ProductionAlert,
  SkillItem,
  SkillCoverageMetric,
  FactorySkillsOverviewProps,
} from '@/components/features/talent-studio/shared';

export interface TalentStudioDataForControlTower {
  factorySkillsOverview: FactorySkillsOverviewProps;
  productionAlerts: ProductionAlert[];
  skillsIntelligence: {
    skills: SkillItem[];
    skillCoverage: SkillCoverageMetric[];
  };
}

/**
 * Loads Talent Studio V2 data from localStorage and computes values for Control Tower HR Manager lenses.
 * Uses demo data when no saved state exists.
 */
export function useTalentStudioDataForControlTower(): TalentStudioDataForControlTower {
  return useMemo(() => {
    const org = loadTalentStudioV2() ?? buildDemoTalentStudioV2();
    const { employees, roles, teams } = org;

    const teamNameById = Object.fromEntries(teams.map((t) => [t.id, t.name]));
    const canonicalSkillIds = new Set(roles.flatMap((r) => r.requirements.map((req) => req.skillId)));
    const skillsCanonical = SKILLS.filter((s) => canonicalSkillIds.has(s.id));
    const criticalSkills = skillsCanonical.filter((s) => s.criticality === 'Core' || s.criticality === 'Emerging');

    const skillCoverage = computeSkillCoverage(skillsCanonical, employees);
    const roleRisk = computeRoleRisk(employees, roles);
    const alerts = computeAlerts(employees, roles, skillsCanonical, teamNameById);

    const wellCoveredCritical = criticalSkills.filter((skill) => {
      const metric = skillCoverage.find((c) => c.skill.id === skill.id)!;
      return metric.holdersCount >= 2;
    });
    const overloadedCount = employees.filter((e) => e.workload === 'Overloaded').length;
    const underutilizedCount = employees.filter((e) => e.workload === 'Underutilized').length;
    const highRiskRoles = roleRisk.filter((r) => r.overallRisk === 'High');
    const mediumRiskRoles = roleRisk.filter((r) => r.overallRisk === 'Medium');

    const topEmergingSkills = skillsCanonical
      .filter((s) => s.trend === 'Rising' || s.criticality === 'Emerging')
      .slice(0, 6);

    const factorySkillsOverview: FactorySkillsOverviewProps = {
      totalEmployees: employees.length,
      teamsCount: teams.length,
      totalRoles: roles.length,
      highRiskCount: highRiskRoles.length,
      mediumRiskCount: mediumRiskRoles.length,
      criticalSkillsCoveragePct:
        criticalSkills.length > 0 ? Math.round((wellCoveredCritical.length / criticalSkills.length) * 100) : 0,
      criticalSkillsGapCount: criticalSkills.length - wellCoveredCritical.length,
      criticalSkillsExample: 'e.g. CNC',
      overloadedCount,
      underutilizedCount,
    };

    const productionAlerts: ProductionAlert[] = alerts.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      description: a.description,
      affectedRoles: a.affectedRoles,
      affectedEmployees: a.affectedEmployees,
      skillsInvolved: a.skillsInvolved,
    }));

    const skillsIntelligence = {
      skills: topEmergingSkills.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        trend: s.trend,
        criticality: s.criticality,
      })),
      skillCoverage: skillCoverage.map((m) => ({
        skill: { id: m.skill.id },
        holdersCount: m.holdersCount,
        strongHoldersCount: m.strongHoldersCount,
      })),
    };

    return {
      factorySkillsOverview,
      productionAlerts,
      skillsIntelligence,
    };
  }, []);
}
