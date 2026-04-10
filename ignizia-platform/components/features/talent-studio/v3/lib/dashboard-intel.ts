import { Employee, Role, Department, DetailedSkill, WorkloadLevel } from '../types';

export type RecommendationType = 'backup' | 'move' | 'upskill' | 'hire' | 'rebalance';
export type UrgencyLevel = 'critical' | 'high' | 'medium';

export interface SPOFSkill {
  skillId: string;
  skillName: string;
  bucketName: string;
  holderId: string;
  holderName: string;
  holderLevel: number;
  requiredByRoles: { roleId: string; roleName: string; minLevel: number }[];
  bestBackup: { employeeId: string; employeeName: string; currentLevel: number; relatedSkills: string[] } | null;
}

export interface RoleRisk {
  roleId: string;
  roleName: string;
  departmentId: string;
  departmentName: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  gapCount: number;
  spofCount: number;
  missingSkills: { skillId: string; skillName: string; gap: number }[];
  assignedEmployees: string[];
  coveragePercent: number;
}

export interface DashboardRecommendation {
  id: string;
  type: RecommendationType;
  urgency: UrgencyLevel;
  title: string;
  reasoning: string;
  impact: string;
  employeeId?: string;
  employeeName?: string;
  targetEmployeeId?: string;
  targetEmployeeName?: string;
  skillId?: string;
  skillName?: string;
  roleId?: string;
  roleName?: string;
  departmentId?: string;
  departmentName?: string;
  score: number;
}

export interface WorkloadDistribution {
  Overloaded: Employee[];
  'At Capacity': Employee[];
  Balanced: Employee[];
  Underutilized: Employee[];
}

export interface DepartmentHealth {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  coveragePercent: number;
  spofCount: number;
  riskLevel: 'healthy' | 'at-risk' | 'critical';
}

export interface DashboardIntel {
  totalEmployees: number;
  totalRoles: number;
  avgReadiness: number;
  orgCoverage: number;
  spofCount: number;
  overloadedCount: number;
  spofSkills: SPOFSkill[];
  roleRisks: RoleRisk[];
  recommendations: DashboardRecommendation[];
  workloadDistribution: WorkloadDistribution;
  departmentHealth: DepartmentHealth[];
}

export function computeDashboardIntel(
  employees: Employee[],
  roles: Role[],
  departments: Department[],
  allSkills: DetailedSkill[],
  getExpertRanking: (skillIds: string[]) => { employee: Employee; score: number }[],
): DashboardIntel {
  const skillMap = new Map(allSkills.map(s => [s.id, s]));
  const roleMap = new Map(roles.map(r => [r.id, r]));
  const deptMap = new Map(departments.map(d => [d.id, d]));

  const allRequiredSkillIds = new Set<string>();
  roles.forEach(r => r.requirements.forEach(req => allRequiredSkillIds.add(req.skillId)));

  // --- Skill coverage: per-skill holder counts ---
  const skillHolders = new Map<string, { employeeId: string; level: number }[]>();
  employees.forEach(emp => {
    emp.assertions.forEach(a => {
      if (a.status === 'confirmed' && a.level >= 3) {
        if (!skillHolders.has(a.skillId)) skillHolders.set(a.skillId, []);
        skillHolders.get(a.skillId)!.push({ employeeId: emp.id, level: a.level });
      }
    });
  });

  // --- SPOF detection ---
  const spofSkills: SPOFSkill[] = [];
  allRequiredSkillIds.forEach(skillId => {
    const holders = skillHolders.get(skillId) || [];
    if (holders.length === 1) {
      const holder = holders[0];
      const holderEmp = employees.find(e => e.id === holder.employeeId)!;
      const skill = skillMap.get(skillId);
      const requiredByRoles = roles
        .filter(r => r.requirements.some(req => req.skillId === skillId))
        .map(r => ({
          roleId: r.id,
          roleName: r.name,
          minLevel: r.requirements.find(req => req.skillId === skillId)!.minLevel,
        }));

      const ranking = getExpertRanking([skillId]);
      const backupCandidates = ranking.filter(r => r.employee.id !== holder.employeeId && r.score > 0);
      const bestBackupEntry = backupCandidates[0] || null;

      let bestBackup: SPOFSkill['bestBackup'] = null;
      if (bestBackupEntry) {
        const relatedSkills = bestBackupEntry.employee.assertions
          .filter(a => a.status === 'confirmed' && a.level >= 2)
          .map(a => skillMap.get(a.skillId)?.name || a.skillId)
          .slice(0, 3);
        bestBackup = {
          employeeId: bestBackupEntry.employee.id,
          employeeName: bestBackupEntry.employee.name,
          currentLevel: bestBackupEntry.employee.assertions.find(a => a.skillId === skillId)?.level || 0,
          relatedSkills,
        };
      }

      spofSkills.push({
        skillId,
        skillName: skill?.name || skillId,
        bucketName: allSkills.find(s => s.id === skillId)?.bucketId || '',
        holderId: holder.employeeId,
        holderName: holderEmp.name,
        holderLevel: holder.level,
        requiredByRoles,
        bestBackup,
      });
    }
  });

  // --- Role risk scoring ---
  const roleRisks: RoleRisk[] = roles.map(role => {
    const dept = deptMap.get(role.departmentId || '');
    const assignedEmployees = employees.filter(e => e.roleId === role.id);
    let totalReqs = role.requirements.length;
    let coveredReqs = 0;
    let spofCount = 0;
    const missingSkills: RoleRisk['missingSkills'] = [];

    role.requirements.forEach(req => {
      const holders = skillHolders.get(req.skillId) || [];
      const relevantHolders = holders.filter(h =>
        assignedEmployees.some(e => e.id === h.employeeId) && h.level >= req.minLevel
      );
      if (relevantHolders.length > 0) {
        coveredReqs++;
      } else {
        const anyHolder = holders.filter(h => h.level >= req.minLevel);
        if (anyHolder.length === 0) {
          const skill = skillMap.get(req.skillId);
          missingSkills.push({
            skillId: req.skillId,
            skillName: skill?.name || req.skillId,
            gap: req.minLevel,
          });
        }
      }
      if (spofSkills.some(s => s.skillId === req.skillId)) spofCount++;
    });

    const coveragePercent = totalReqs > 0 ? Math.round((coveredReqs / totalReqs) * 100) : 100;
    const gapCount = missingSkills.length;
    const riskLevel: RoleRisk['riskLevel'] =
      gapCount >= 2 || spofCount >= 2 ? 'High' :
      gapCount >= 1 || spofCount >= 1 ? 'Medium' : 'Low';

    return {
      roleId: role.id,
      roleName: role.name,
      departmentId: role.departmentId || '',
      departmentName: dept?.name || 'Unassigned',
      riskLevel,
      gapCount,
      spofCount,
      missingSkills,
      assignedEmployees: assignedEmployees.map(e => e.id),
      coveragePercent,
    };
  }).sort((a, b) => {
    const riskOrder = { High: 3, Medium: 2, Low: 1 };
    return riskOrder[b.riskLevel] - riskOrder[a.riskLevel] || a.coveragePercent - b.coveragePercent;
  });

  // --- Workload distribution ---
  const workloadDistribution: WorkloadDistribution = {
    Overloaded: [],
    'At Capacity': [],
    Balanced: [],
    Underutilized: [],
  };
  employees.forEach(emp => {
    const wl: WorkloadLevel = emp.workload || 'Balanced';
    workloadDistribution[wl].push(emp);
  });

  // --- Department health ---
  const departmentHealth: DepartmentHealth[] = departments.map(dept => {
    const deptRoles = roles.filter(r => r.departmentId === dept.id);
    const deptEmployees = employees.filter(e => deptRoles.some(r => r.id === e.roleId));
    const deptRoleRisks = roleRisks.filter(rr => rr.departmentId === dept.id);
    const avgCoverage = deptRoleRisks.length > 0
      ? Math.round(deptRoleRisks.reduce((s, rr) => s + rr.coveragePercent, 0) / deptRoleRisks.length)
      : 100;
    const deptSpofCount = spofSkills.filter(s =>
      s.requiredByRoles.some(rr => deptRoles.some(dr => dr.id === rr.roleId))
    ).length;
    const hasHighRisk = deptRoleRisks.some(rr => rr.riskLevel === 'High');
    const hasMediumRisk = deptRoleRisks.some(rr => rr.riskLevel === 'Medium');
    const riskLevel: DepartmentHealth['riskLevel'] =
      hasHighRisk || deptSpofCount >= 2 ? 'critical' :
      hasMediumRisk || deptSpofCount >= 1 ? 'at-risk' : 'healthy';

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      employeeCount: deptEmployees.length,
      coveragePercent: avgCoverage,
      spofCount: deptSpofCount,
      riskLevel,
    };
  });

  // --- Org-level metrics ---
  const orgCoverage = roleRisks.length > 0
    ? Math.round(roleRisks.reduce((s, rr) => s + rr.coveragePercent, 0) / roleRisks.length)
    : 100;

  const readinessValues = employees.map(emp => {
    const role = roleMap.get(emp.roleId);
    if (!role || role.requirements.length === 0) return 100;
    let met = 0;
    role.requirements.forEach(req => {
      const a = emp.assertions.find(x => x.skillId === req.skillId && x.status === 'confirmed');
      if (a && a.level >= req.minLevel) met++;
    });
    return Math.round((met / role.requirements.length) * 100);
  });
  const avgReadiness = readinessValues.length > 0
    ? Math.round(readinessValues.reduce((s, v) => s + v, 0) / readinessValues.length)
    : 0;

  // --- Generate ranked recommendations ---
  const recommendations: DashboardRecommendation[] = [];
  let recId = 0;

  // 1. Backup recommendations for SPOFs
  spofSkills.forEach(spof => {
    if (spof.bestBackup) {
      const urgency: UrgencyLevel = spof.requiredByRoles.length >= 2 ? 'critical' : 'high';
      const urgencyScore = urgency === 'critical' ? 3 : 2;
      recommendations.push({
        id: `rec-${recId++}`,
        type: 'backup',
        urgency,
        title: `Cross-train ${spof.bestBackup.employeeName} as backup for ${spof.skillName}`,
        reasoning: `Only ${spof.holderName} holds ${spof.skillName} at L${spof.holderLevel}. If they are unavailable, ${spof.requiredByRoles.map(r => r.roleName).join(', ')} lose${spof.requiredByRoles.length === 1 ? 's' : ''} this capability entirely. ${spof.bestBackup.employeeName} already has ${spof.bestBackup.relatedSkills.slice(0, 2).join(' and ')}, making them the fastest path to redundancy.`,
        impact: `Eliminates single-point-of-failure risk for ${spof.requiredByRoles.length} role${spof.requiredByRoles.length > 1 ? 's' : ''}`,
        employeeId: spof.bestBackup.employeeId,
        employeeName: spof.bestBackup.employeeName,
        targetEmployeeId: spof.holderId,
        targetEmployeeName: spof.holderName,
        skillId: spof.skillId,
        skillName: spof.skillName,
        score: urgencyScore * 10 + spof.requiredByRoles.length,
      });
    }
  });

  // 2. Upskill recommendations for partial-coverage gaps
  roleRisks.filter(rr => rr.riskLevel !== 'Low').forEach(rr => {
    rr.missingSkills.forEach(ms => {
      const ranking = getExpertRanking([ms.skillId]);
      const partialHolder = ranking.find(r =>
        r.score > 0 && r.employee.assertions.some(a => a.skillId === ms.skillId && a.level < ms.gap && a.level >= 2)
      );
      if (partialHolder) {
        const currentLevel = partialHolder.employee.assertions.find(a => a.skillId === ms.skillId)?.level || 0;
        recommendations.push({
          id: `rec-${recId++}`,
          type: 'upskill',
          urgency: rr.riskLevel === 'High' ? 'high' : 'medium',
          title: `Upskill ${partialHolder.employee.name} in ${ms.skillName} from L${currentLevel} to L${ms.gap}`,
          reasoning: `${rr.roleName} in ${rr.departmentName} requires ${ms.skillName} at L${ms.gap}, but no assigned employee meets this. ${partialHolder.employee.name} is closest at L${currentLevel} and needs ${ms.gap - currentLevel} level${ms.gap - currentLevel > 1 ? 's' : ''} of improvement.`,
          impact: `Closes ${rr.departmentName} gap and improves ${rr.roleName} coverage to ${Math.min(100, rr.coveragePercent + Math.round(100 / (rr.missingSkills.length + (rr.missingSkills.length > 0 ? rr.gapCount : 1))))}%`,
          employeeId: partialHolder.employee.id,
          employeeName: partialHolder.employee.name,
          skillId: ms.skillId,
          skillName: ms.skillName,
          roleId: rr.roleId,
          roleName: rr.roleName,
          departmentId: rr.departmentId,
          departmentName: rr.departmentName,
          score: (rr.riskLevel === 'High' ? 20 : 10) + (ms.gap - (partialHolder.employee.assertions.find(a => a.skillId === ms.skillId)?.level || 0)),
        });
      }
    });
  });

  // 3. Move talent recommendations for underutilized employees with needed skills
  const overloadedRoles = roleRisks.filter(rr => rr.riskLevel === 'High');
  workloadDistribution.Underutilized.forEach(emp => {
    overloadedRoles.forEach(rr => {
      const empSkills = emp.assertions.filter(a => a.status === 'confirmed');
      const matches = rr.missingSkills.filter(ms =>
        empSkills.some(a => a.skillId === ms.skillId && a.level >= ms.gap - 1)
      );
      if (matches.length > 0) {
        const role = roleMap.get(emp.roleId);
        const empDept = roles.find(r => r.id === emp.roleId);
        const sourceDeptName = deptMap.get(empDept?.departmentId || '')?.name || 'Unknown';
        recommendations.push({
          id: `rec-${recId++}`,
          type: 'move',
          urgency: 'high',
          title: `Move ${emp.name} to support ${rr.roleName}`,
          reasoning: `${emp.name} is underutilized at ${emp.allocation || 50}% in ${sourceDeptName} (${role?.name || 'Unknown'}). They have ${matches.map(m => m.skillName).join(', ')} which ${rr.departmentName} needs for ${rr.roleName}. This move addresses both underutilization and the critical gap.`,
          impact: `Resolves ${matches.length} skill gap${matches.length > 1 ? 's' : ''} in ${rr.departmentName} while improving workforce utilization`,
          employeeId: emp.id,
          employeeName: emp.name,
          roleId: rr.roleId,
          roleName: rr.roleName,
          departmentId: rr.departmentId,
          departmentName: rr.departmentName,
          score: 18 + matches.length * 3,
        });
      }
    });
  });

  // 4. External hire recommendations for skills with zero internal coverage
  roleRisks.filter(rr => rr.riskLevel === 'High').forEach(rr => {
    rr.missingSkills.forEach(ms => {
      const anyoneWithSkill = employees.some(e =>
        e.assertions.some(a => a.skillId === ms.skillId && a.status === 'confirmed' && a.level >= 2)
      );
      if (!anyoneWithSkill) {
        recommendations.push({
          id: `rec-${recId++}`,
          type: 'hire',
          urgency: 'high',
          title: `Hire for ${ms.skillName} (${rr.departmentName})`,
          reasoning: `No internal employee has ${ms.skillName} above L1. ${rr.roleName} requires L${ms.gap}. This is a capability blind spot that cannot be solved through training alone — external hire is the fastest path to coverage.`,
          impact: `Fills critical capability gap in ${rr.departmentName} and enables knowledge transfer to existing team`,
          skillId: ms.skillId,
          skillName: ms.skillName,
          roleId: rr.roleId,
          roleName: rr.roleName,
          departmentId: rr.departmentId,
          departmentName: rr.departmentName,
          score: 15,
        });
      }
    });
  });

  // 5. Rebalance workload recommendations
  const overloaded = workloadDistribution.Overloaded;
  const underutilized = workloadDistribution.Underutilized;
  overloaded.forEach(ol => {
    const olRole = roleMap.get(ol.roleId);
    const olSkillIds = ol.assertions.filter(a => a.status === 'confirmed').map(a => a.skillId);
    const candidate = underutilized.find(ul => {
      const sharedSkills = ul.assertions.filter(a =>
        a.status === 'confirmed' && olSkillIds.includes(a.skillId)
      );
      return sharedSkills.length >= 1;
    });
    if (candidate) {
      const sharedSkillNames = candidate.assertions
        .filter(a => a.status === 'confirmed' && olSkillIds.includes(a.skillId))
        .map(a => skillMap.get(a.skillId)?.name || a.skillId)
        .slice(0, 2);
      recommendations.push({
        id: `rec-${recId++}`,
        type: 'rebalance',
        urgency: 'medium',
        title: `Rebalance: shift tasks from ${ol.name} to ${candidate.name}`,
        reasoning: `${ol.name} is at ${ol.allocation || 120}% allocation (${olRole?.name || 'Unknown'}). ${candidate.name} is at ${candidate.allocation || 50}% and shares ${sharedSkillNames.join(', ')}. Redistributing responsibilities reduces burnout risk and improves overall efficiency.`,
        impact: `Reduces overload risk and improves team balance across ${deptMap.get(roles.find(r => r.id === ol.roleId)?.departmentId || '')?.name || 'team'}`,
        employeeId: ol.id,
        employeeName: ol.name,
        targetEmployeeId: candidate.id,
        targetEmployeeName: candidate.name,
        score: 12,
      });
    }
  });

  recommendations.sort((a, b) => b.score - a.score);

  return {
    totalEmployees: employees.length,
    totalRoles: roles.length,
    avgReadiness,
    orgCoverage,
    spofCount: spofSkills.length,
    overloadedCount: overloaded.length,
    spofSkills,
    roleRisks,
    recommendations,
    workloadDistribution,
    departmentHealth,
  };
}
