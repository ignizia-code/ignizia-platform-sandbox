import { SkillBucket, Role, Employee, LearningResource, Permit, Task, TaskRequirement, PermitSchema, CrewBlueprint, PersonPermit, Department } from '../types';

const rawSkillsData = [
  {
    name: "Analytical Thinking & Critical Analysis",
    skills: [
      "Logical reasoning",
      "Pattern recognition",
      "Data interpretation",
      "Root cause analysis",
      "Hypothesis formulation and testing",
      "Identifying assumptions and biases",
      "Distinguishing facts from opinions",
      "Quantitative reasoning",
      "Risk analysis",
      "Systems thinking",
      "Comparative analysis",
      "Gap analysis",
      "Argument evaluation",
      "Information synthesis"
    ]
  },
  {
    name: "Complex Problem-Solving",
    skills: [
      "Problem definition and scoping",
      "Breaking down complex issues",
      "Prioritization under constraints",
      "Scenario planning",
      "Trade-off analysis",
      "Decision tree analysis",
      "Solution modeling and simulation",
      "Cross-functional integration",
      "Resource optimization",
      "Risk mitigation planning",
      "Iterative problem-solving",
      "Contingency planning",
      "Multi-stakeholder alignment"
    ]
  },
  {
    name: "Creativity & Innovation",
    skills: [
      "Idea generation (brainstorming techniques)",
      "Divergent thinking",
      "Convergent thinking",
      "Design thinking",
      "Concept development",
      "Reframing problems",
      "Creative risk-taking",
      "Experimentation",
      "Prototyping",
      "Storyboarding",
      "Trend spotting",
      "Disruptive thinking",
      "Opportunity recognition",
      "Rapid iteration"
    ]
  },
  {
    name: "Resilience, Stress Tolerance & Flexibility",
    skills: [
      "Emotional regulation",
      "Adaptability to change",
      "Cognitive flexibility",
      "Stress management techniques",
      "Time management under pressure",
      "Maintaining focus during uncertainty",
      "Growth mindset",
      "Coping strategies",
      "Crisis response",
      "Workload balancing",
      "Positive reframing",
      "Recovery and self-care practices"
    ]
  },
  {
    name: "Curiosity & Lifelong Learning",
    skills: [
      "Self-directed learning",
      "Research skills",
      "Question framing",
      "Reflective practice",
      "Feedback seeking",
      "Knowledge integration",
      "Skill gap identification",
      "Continuous improvement mindset",
      "Experimentation mindset",
      "Intellectual humility",
      "Cross-disciplinary exploration",
      "Information literacy"
    ]
  },
  {
    name: "Leadership & Social Influence",
    skills: [
      "Vision setting",
      "Strategic thinking",
      "Inspiring and motivating others",
      "Delegation",
      "Coaching and mentoring",
      "Influence and persuasion",
      "Stakeholder management",
      "Change management",
      "Accountability setting",
      "Performance management",
      "Decision ownership",
      "Public speaking",
      "Ethical leadership"
    ]
  },
  {
    name: "Emotional Intelligence",
    skills: [
      "Self-awareness",
      "Self-regulation",
      "Empathy",
      "Social awareness",
      "Relationship management",
      "Active listening",
      "Nonverbal communication awareness",
      "Emotional perception",
      "Constructive feedback delivery",
      "Trust-building",
      "Managing difficult conversations"
    ]
  },
  {
    name: "Collaboration & Teamwork",
    skills: [
      "Clear communication",
      "Role clarity",
      "Shared goal alignment",
      "Cross-functional collaboration",
      "Knowledge sharing",
      "Constructive feedback exchange",
      "Dependability",
      "Inclusivity",
      "Collective problem-solving",
      "Meeting facilitation",
      "Remote collaboration skills",
      "Conflict prevention"
    ]
  },
  {
    name: "Conflict Resolution & Civility",
    skills: [
      "Mediation skills",
      "De-escalation techniques",
      "Active listening in tension",
      "Negotiation",
      "Perspective-taking",
      "Fairness and impartiality",
      "Assertive communication",
      "Boundary setting",
      "Consensus building",
      "Managing power dynamics",
      "Professional etiquette",
      "Restorative dialogue"
    ]
  },
  {
    name: "Evidence-Based Decision-Making (EBM)",
    skills: [
      "Data collection and validation",
      "Statistical literacy",
      "Research evaluation",
      "Hypothesis testing",
      "Cost-benefit analysis",
      "Performance metrics tracking",
      "Benchmarking",
      "Bias recognition and mitigation",
      "Experimental design",
      "A/B testing",
      "Data visualization",
      "Impact assessment",
      "Translating insights into action"
    ]
  },
  {
    name: "Sustainability Awareness",
    skills: [
      "Environmental literacy",
      "ESG understanding",
      "Systems thinking for sustainability",
      "Resource efficiency analysis",
      "Lifecycle assessment",
      "Ethical sourcing awareness",
      "Social impact evaluation",
      "Carbon footprint awareness",
      "Circular economy principles",
      "Sustainable innovation",
      "Regulatory awareness",
      "Stakeholder responsibility"
    ]
  },
  {
    name: "Manufacturing & Production Operations",
    skills: [
      "Industrial Sewing",
      "Leather Cutting",
      "Pattern Alignment",
      "CNC Operation",
      "Automated Cutting",
      "Adhesive Application",
      "Machine Maintenance",
      "Robotics Basic Maintenance",
      "Forklift Operation",
      "Inventory Management",
      "ERP System Usage",
      "Lean Manufacturing"
    ]
  },
  {
    name: "Quality Control & Safety",
    skills: [
      "Quality Inspection (ISO)",
      "Health & Safety (L2)",
      "Chemical Safety",
      "Shift Supervision",
      "Process Auditing",
      "Defect Root Cause Analysis",
      "Statistical Process Control",
      "Equipment Calibration"
    ]
  },
  {
    name: "Manufacturing & Production Operations",
    skills: [
      "Industrial Sewing",
      "Leather Cutting",
      "Pattern Alignment",
      "CNC Operation",
      "Automated Cutting",
      "Adhesive Application",
      "Machine Maintenance",
      "Robotics Basic Maintenance",
      "Forklift Operation",
      "Inventory Management",
      "ERP System Usage",
      "Lean Manufacturing"
    ]
  },
  {
    name: "Quality Control & Safety",
    skills: [
      "Quality Inspection (ISO)",
      "Health & Safety (L2)",
      "Chemical Safety",
      "Shift Supervision",
      "Process Auditing",
      "Defect Root Cause Analysis",
      "Statistical Process Control",
      "Equipment Calibration"
    ]
  }
];

export const SKILL_BUCKETS: SkillBucket[] = rawSkillsData.map((bucket, index) => {
  const bucketId = `bucket-${index + 1}`;
  return {
    id: bucketId,
    name: bucket.name,
    skills: bucket.skills.map((skillName, sIndex) => ({
      id: `${bucketId}-skill-${sIndex + 1}`,
      name: skillName,
      bucketId: bucketId
    }))
  };
});

export const ALL_SKILLS = SKILL_BUCKETS.flatMap(b => b.skills);

export const SEED_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: 'Production & Operations', description: 'Manufacturing lines, assembly, and production floor operations' },
  { id: 'dept-2', name: 'Quality & Safety', description: 'Quality control, inspections, compliance, and workplace safety' },
  { id: 'dept-3', name: 'Maintenance', description: 'Equipment maintenance, repair, and preventive upkeep' },
  { id: 'dept-4', name: 'Logistics & Warehousing', description: 'Inventory management, warehousing, and material flow' },
  { id: 'dept-5', name: 'Procurement', description: 'Vendor relations, purchasing, and supply chain planning' },
  { id: 'dept-6', name: 'HR & Administration', description: 'People operations, payroll, and corporate administration' },
];

export const SEED_ROLES: Role[] = [
  {
    id: 'role-1',
    name: 'Senior Product Manager',
    description: 'Leads product strategy and execution.',
    departmentId: 'dept-6',
    requirements: [
      { skillId: 'bucket-1-skill-1', minLevel: 4, weight: 1, required: true },
      { skillId: 'bucket-1-skill-2', minLevel: 3, weight: 1, required: true },
      { skillId: 'bucket-6-skill-1', minLevel: 4, weight: 1.5, required: true },
      { skillId: 'bucket-6-skill-2', minLevel: 4, weight: 1.5, required: true },
      { skillId: 'bucket-8-skill-1', minLevel: 4, weight: 1, required: true },
      { skillId: 'bucket-10-skill-1', minLevel: 4, weight: 1, required: true },
    ]
  },
  {
    id: 'role-2',
    name: 'Data Scientist',
    description: 'Analyzes complex data to drive insights.',
    departmentId: 'dept-6',
    requirements: [
      { skillId: 'bucket-1-skill-1', minLevel: 5, weight: 2, required: true },
      { skillId: 'bucket-1-skill-3', minLevel: 5, weight: 2, required: true },
      { skillId: 'bucket-10-skill-1', minLevel: 5, weight: 2, required: true },
      { skillId: 'bucket-10-skill-2', minLevel: 4, weight: 1, required: true },
    ]
  },
  {
    id: 'role-3',
    name: 'Junior Developer',
    description: 'Assists in building and maintaining software applications.',
    departmentId: 'dept-6',
    requirements: [
      { skillId: 'bucket-1-skill-1', minLevel: 2, weight: 1, required: true },
      { skillId: 'bucket-8-skill-1', minLevel: 2, weight: 1, required: true },
      { skillId: 'bucket-8-skill-2', minLevel: 2, weight: 1, required: true },
    ]
  },
  {
    id: 'role-4',
    name: 'Site Manager',
    description: 'Oversees daily operations and safety at specific locations.',
    departmentId: 'dept-1',
    requirements: [
      { skillId: 'bucket-6-skill-1', minLevel: 4, weight: 2, required: true },
      { skillId: 'bucket-6-skill-4', minLevel: 4, weight: 2, required: true },
      { skillId: 'bucket-11-skill-1', minLevel: 3, weight: 1, required: true },
    ]
  },
  {
    id: 'role-5',
    name: 'Compliance Officer',
    description: 'Ensures the organization adheres to legal and regulatory standards.',
    departmentId: 'dept-2',
    requirements: [
      { skillId: 'bucket-1-skill-9', minLevel: 5, weight: 2, required: true },
      { skillId: 'bucket-10-skill-1', minLevel: 5, weight: 2, required: true },
      { skillId: 'bucket-10-skill-8', minLevel: 4, weight: 1, required: true },
    ]
  },
  {
    id: 'role-6',
    name: 'Stitching Operator',
    description: 'Operates industrial sewing machines for leather and textile assembly.',
    departmentId: 'dept-1',
    requirements: [
      { skillId: 'bucket-12-skill-1', minLevel: 4, weight: 2, required: true },
      { skillId: 'bucket-12-skill-3', minLevel: 3, weight: 1, required: true },
      { skillId: 'bucket-13-skill-2', minLevel: 2, weight: 1, required: true },
    ]
  },
  {
    id: 'role-7',
    name: 'Cutting Machine Operator',
    description: 'Operates cutting machines for material preparation and pattern work.',
    departmentId: 'dept-1',
    requirements: [
      { skillId: 'bucket-12-skill-2', minLevel: 4, weight: 2, required: true },
      { skillId: 'bucket-12-skill-4', minLevel: 3, weight: 1.5, required: true },
      { skillId: 'bucket-12-skill-5', minLevel: 3, weight: 1, required: true },
    ]
  },
  {
    id: 'role-8',
    name: 'Quality Inspector',
    description: 'Inspects products and processes to ensure quality standards are met.',
    departmentId: 'dept-2',
    requirements: [
      { skillId: 'bucket-13-skill-1', minLevel: 4, weight: 2, required: true },
      { skillId: 'bucket-13-skill-5', minLevel: 3, weight: 1, required: true },
      { skillId: 'bucket-13-skill-6', minLevel: 3, weight: 1, required: true },
    ]
  },
  {
    id: 'role-9',
    name: 'Maintenance Technician',
    description: 'Performs preventive and corrective maintenance on production equipment.',
    departmentId: 'dept-3',
    requirements: [
      { skillId: 'bucket-12-skill-7', minLevel: 4, weight: 2, required: true },
      { skillId: 'bucket-12-skill-8', minLevel: 3, weight: 1.5, required: true },
      { skillId: 'bucket-13-skill-8', minLevel: 3, weight: 1, required: true },
    ]
  },
  {
    id: 'role-10',
    name: 'Production Supervisor',
    description: 'Supervises production line workers and ensures shift targets are met.',
    departmentId: 'dept-1',
    requirements: [
      { skillId: 'bucket-6-skill-1', minLevel: 3, weight: 1.5, required: true },
      { skillId: 'bucket-13-skill-4', minLevel: 4, weight: 2, required: true },
      { skillId: 'bucket-12-skill-12', minLevel: 3, weight: 1, required: true },
    ]
  },
  {
    id: 'role-11',
    name: 'Warehouse Operator',
    description: 'Manages inventory receiving, storage, and dispatch operations.',
    departmentId: 'dept-4',
    requirements: [
      { skillId: 'bucket-12-skill-9', minLevel: 3, weight: 2, required: true },
      { skillId: 'bucket-12-skill-10', minLevel: 4, weight: 2, required: true },
      { skillId: 'bucket-12-skill-11', minLevel: 3, weight: 1, required: true },
    ]
  },
  {
    id: 'role-12',
    name: 'Procurement Specialist',
    description: 'Manages vendor relationships and purchasing for materials and equipment.',
    departmentId: 'dept-5',
    requirements: [
      { skillId: 'bucket-9-skill-4', minLevel: 4, weight: 2, required: true },
      { skillId: 'bucket-1-skill-5', minLevel: 3, weight: 1, required: true },
      { skillId: 'bucket-10-skill-5', minLevel: 3, weight: 1, required: true },
    ]
  },
];

export const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Alice Chen',
    roleId: 'role-1',
    avatarUrl: 'https://picsum.photos/seed/alice/200/200',
    workload: 'At Capacity',
    allocation: 95,
    assertions: [
      { id: 'a1', personId: 'emp-1', skillId: 'bucket-1-skill-1', status: 'confirmed', source: 'manager_validated', level: 4, confidence: 0.9, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a2', personId: 'emp-1', skillId: 'bucket-1-skill-2', status: 'confirmed', source: 'manager_validated', level: 3, confidence: 0.8, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a3', personId: 'emp-1', skillId: 'bucket-6-skill-1', status: 'confirmed', source: 'manager_validated', level: 4, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a1-4', personId: 'emp-1', skillId: 'bucket-2-skill-1', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a1-5', personId: 'emp-1', skillId: 'bucket-3-skill-2', status: 'confirmed', source: 'training_completion', level: 4, confidence: 0.9, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a1-6', personId: 'emp-1', skillId: 'bucket-5-skill-1', status: 'confirmed', source: 'manager_validated', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a1-7', personId: 'emp-1', skillId: 'bucket-8-skill-1', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a1-8', personId: 'emp-1', skillId: 'bucket-10-skill-1', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a1-9', personId: 'emp-1', skillId: 'bucket-7-skill-1', status: 'proposed', source: 'ai_inferred', level: 3, confidence: 0.7, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: {
      shareConfirmedSkills: true,
      shareUnconfirmedAiSkills: false,
      shareUnconfirmedImportedSkills: false,
      allowAiToAddSkills: true,
      visibility: 'org_visible'
    }
  },
  {
    id: 'emp-2',
    name: 'Bob Smith',
    roleId: 'role-3',
    avatarUrl: 'https://picsum.photos/seed/bob/200/200',
    workload: 'Underutilized',
    allocation: 45,
    assertions: [
      { id: 'a4', personId: 'emp-2', skillId: 'bucket-1-skill-1', status: 'confirmed', source: 'assessment', level: 2, confidence: 0.95, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a4-2', personId: 'emp-2', skillId: 'bucket-8-skill-1', status: 'confirmed', source: 'assessment', level: 2, confidence: 0.9, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a4-3', personId: 'emp-2', skillId: 'bucket-8-skill-2', status: 'confirmed', source: 'training_completion', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a4-4', personId: 'emp-2', skillId: 'bucket-2-skill-2', status: 'proposed', source: 'ai_inferred', level: 2, confidence: 0.65, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: {
      shareConfirmedSkills: true,
      shareUnconfirmedAiSkills: true,
      shareUnconfirmedImportedSkills: true,
      allowAiToAddSkills: true,
      visibility: 'org_visible'
    }
  },
  {
    id: 'emp-3',
    name: 'Charlie Davis',
    roleId: 'role-4',
    avatarUrl: 'https://picsum.photos/seed/charlie/200/200',
    workload: 'Overloaded',
    allocation: 125,
    assertions: [
      { id: 'a5', personId: 'emp-3', skillId: 'bucket-6-skill-1', status: 'confirmed', source: 'performance_signal', level: 5, confidence: 0.9, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a6', personId: 'emp-3', skillId: 'bucket-6-skill-4', status: 'confirmed', source: 'training_completion', level: 4, confidence: 1.0, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a5-3', personId: 'emp-3', skillId: 'bucket-11-skill-1', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a5-4', personId: 'emp-3', skillId: 'bucket-1-skill-1', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.8, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a5-5', personId: 'emp-3', skillId: 'bucket-7-skill-1', status: 'proposed', source: 'ai_inferred', level: 4, confidence: 0.7, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: {
      shareConfirmedSkills: true,
      shareUnconfirmedAiSkills: false,
      shareUnconfirmedImportedSkills: false,
      allowAiToAddSkills: true,
      visibility: 'org_visible'
    }
  },
  {
    id: 'emp-4',
    name: 'Diana Prince',
    roleId: 'role-5',
    avatarUrl: 'https://picsum.photos/seed/diana/200/200',
    workload: 'Balanced',
    allocation: 80,
    assertions: [
      { id: 'a7', personId: 'emp-4', skillId: 'bucket-1-skill-9', status: 'confirmed', source: 'imported', level: 5, confidence: 0.8, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a8', personId: 'emp-4', skillId: 'bucket-10-skill-1', status: 'confirmed', source: 'manager_validated', level: 5, confidence: 0.9, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a7-3', personId: 'emp-4', skillId: 'bucket-10-skill-8', status: 'confirmed', source: 'manager_validated', level: 4, confidence: 0.9, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a7-4', personId: 'emp-4', skillId: 'bucket-5-skill-3', status: 'confirmed', source: 'training_completion', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: {
      shareConfirmedSkills: true,
      shareUnconfirmedAiSkills: false,
      shareUnconfirmedImportedSkills: false,
      allowAiToAddSkills: false,
      visibility: 'team_only'
    }
  },
  {
    id: 'emp-5',
    name: 'Eve Adams',
    roleId: 'role-2',
    avatarUrl: 'https://picsum.photos/seed/eve/200/200',
    workload: 'Balanced',
    allocation: 75,
    assertions: [
      { id: 'a9', personId: 'emp-5', skillId: 'bucket-1-skill-1', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a9-2', personId: 'emp-5', skillId: 'bucket-1-skill-3', status: 'confirmed', source: 'assessment', level: 4, confidence: 0.8, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a9-3', personId: 'emp-5', skillId: 'bucket-10-skill-1', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.8, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a9-4', personId: 'emp-5', skillId: 'bucket-10-skill-2', status: 'proposed', source: 'ai_inferred', level: 2, confidence: 0.6, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: { shareConfirmedSkills: true, shareUnconfirmedAiSkills: true, shareUnconfirmedImportedSkills: true, allowAiToAddSkills: true, visibility: 'org_visible' }
  },
  {
    id: 'emp-6',
    name: 'Marco Rossi',
    roleId: 'role-6',
    avatarUrl: 'https://picsum.photos/seed/marco/200/200',
    workload: 'Overloaded',
    allocation: 118,
    assertions: [
      { id: 'a10-1', personId: 'emp-6', skillId: 'bucket-12-skill-1', status: 'confirmed', source: 'manager_validated', level: 4, confidence: 0.95, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a10-2', personId: 'emp-6', skillId: 'bucket-12-skill-3', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a10-3', personId: 'emp-6', skillId: 'bucket-13-skill-2', status: 'confirmed', source: 'training_completion', level: 2, confidence: 0.8, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a10-4', personId: 'emp-6', skillId: 'bucket-12-skill-6', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.8, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: { shareConfirmedSkills: true, shareUnconfirmedAiSkills: true, shareUnconfirmedImportedSkills: true, allowAiToAddSkills: true, visibility: 'org_visible' }
  },
  {
    id: 'emp-7',
    name: 'Fatima Al-Rashid',
    roleId: 'role-8',
    avatarUrl: 'https://picsum.photos/seed/fatima/200/200',
    workload: 'Balanced',
    allocation: 85,
    assertions: [
      { id: 'a11-1', personId: 'emp-7', skillId: 'bucket-13-skill-1', status: 'confirmed', source: 'manager_validated', level: 4, confidence: 0.9, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a11-2', personId: 'emp-7', skillId: 'bucket-13-skill-5', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a11-3', personId: 'emp-7', skillId: 'bucket-13-skill-6', status: 'confirmed', source: 'training_completion', level: 2, confidence: 0.75, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: { shareConfirmedSkills: true, shareUnconfirmedAiSkills: false, shareUnconfirmedImportedSkills: false, allowAiToAddSkills: true, visibility: 'org_visible' }
  },
  {
    id: 'emp-8',
    name: 'David Kim',
    roleId: 'role-9',
    avatarUrl: 'https://picsum.photos/seed/davidk/200/200',
    workload: 'At Capacity',
    allocation: 100,
    assertions: [
      { id: 'a12-1', personId: 'emp-8', skillId: 'bucket-12-skill-7', status: 'confirmed', source: 'manager_validated', level: 5, confidence: 0.95, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a12-2', personId: 'emp-8', skillId: 'bucket-12-skill-8', status: 'confirmed', source: 'assessment', level: 4, confidence: 0.9, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a12-3', personId: 'emp-8', skillId: 'bucket-13-skill-8', status: 'confirmed', source: 'training_completion', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a12-4', personId: 'emp-8', skillId: 'bucket-12-skill-1', status: 'confirmed', source: 'project_evidence', level: 3, confidence: 0.7, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: { shareConfirmedSkills: true, shareUnconfirmedAiSkills: true, shareUnconfirmedImportedSkills: true, allowAiToAddSkills: true, visibility: 'org_visible' }
  },
  {
    id: 'emp-9',
    name: 'Sarah Nguyen',
    roleId: 'role-10',
    avatarUrl: 'https://picsum.photos/seed/sarahng/200/200',
    workload: 'At Capacity',
    allocation: 105,
    assertions: [
      { id: 'a13-1', personId: 'emp-9', skillId: 'bucket-6-skill-1', status: 'confirmed', source: 'manager_validated', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a13-2', personId: 'emp-9', skillId: 'bucket-13-skill-4', status: 'confirmed', source: 'assessment', level: 4, confidence: 0.9, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a13-3', personId: 'emp-9', skillId: 'bucket-12-skill-12', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a13-4', personId: 'emp-9', skillId: 'bucket-12-skill-1', status: 'confirmed', source: 'project_evidence', level: 2, confidence: 0.7, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: { shareConfirmedSkills: true, shareUnconfirmedAiSkills: true, shareUnconfirmedImportedSkills: true, allowAiToAddSkills: true, visibility: 'org_visible' }
  },
  {
    id: 'emp-10',
    name: 'James Okafor',
    roleId: 'role-11',
    avatarUrl: 'https://picsum.photos/seed/james/200/200',
    workload: 'Underutilized',
    allocation: 50,
    assertions: [
      { id: 'a14-1', personId: 'emp-10', skillId: 'bucket-12-skill-10', status: 'confirmed', source: 'manager_validated', level: 4, confidence: 0.9, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a14-2', personId: 'emp-10', skillId: 'bucket-12-skill-11', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: { shareConfirmedSkills: true, shareUnconfirmedAiSkills: true, shareUnconfirmedImportedSkills: true, allowAiToAddSkills: true, visibility: 'org_visible' }
  },
  {
    id: 'emp-11',
    name: 'Lena Petrova',
    roleId: 'role-12',
    avatarUrl: 'https://picsum.photos/seed/lena/200/200',
    workload: 'Balanced',
    allocation: 70,
    assertions: [
      { id: 'a15-1', personId: 'emp-11', skillId: 'bucket-9-skill-4', status: 'confirmed', source: 'manager_validated', level: 4, confidence: 0.9, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a15-2', personId: 'emp-11', skillId: 'bucket-1-skill-5', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a15-3', personId: 'emp-11', skillId: 'bucket-10-skill-5', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: { shareConfirmedSkills: true, shareUnconfirmedAiSkills: false, shareUnconfirmedImportedSkills: false, allowAiToAddSkills: true, visibility: 'org_visible' }
  },
  {
    id: 'emp-12',
    name: 'Tomás García',
    roleId: 'role-7',
    avatarUrl: 'https://picsum.photos/seed/tomas/200/200',
    workload: 'Balanced',
    allocation: 82,
    assertions: [
      { id: 'a16-1', personId: 'emp-12', skillId: 'bucket-12-skill-2', status: 'confirmed', source: 'manager_validated', level: 4, confidence: 0.9, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a16-2', personId: 'emp-12', skillId: 'bucket-12-skill-4', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.85, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a16-3', personId: 'emp-12', skillId: 'bucket-12-skill-5', status: 'confirmed', source: 'training_completion', level: 2, confidence: 0.75, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a16-4', personId: 'emp-12', skillId: 'bucket-12-skill-9', status: 'confirmed', source: 'project_evidence', level: 3, confidence: 0.7, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: { shareConfirmedSkills: true, shareUnconfirmedAiSkills: true, shareUnconfirmedImportedSkills: true, allowAiToAddSkills: true, visibility: 'org_visible' }
  },
  {
    id: 'emp-13',
    name: 'Aisha Mbeki',
    roleId: 'role-6',
    avatarUrl: 'https://picsum.photos/seed/aisha/200/200',
    workload: 'Underutilized',
    allocation: 55,
    assertions: [
      { id: 'a17-1', personId: 'emp-13', skillId: 'bucket-12-skill-1', status: 'confirmed', source: 'assessment', level: 3, confidence: 0.8, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a17-2', personId: 'emp-13', skillId: 'bucket-12-skill-3', status: 'confirmed', source: 'training_completion', level: 2, confidence: 0.75, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'a17-3', personId: 'emp-13', skillId: 'bucket-13-skill-1', status: 'proposed', source: 'ai_inferred', level: 2, confidence: 0.6, lastUsedAt: new Date().toISOString(), evidenceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    privacy: { shareConfirmedSkills: true, shareUnconfirmedAiSkills: true, shareUnconfirmedImportedSkills: true, allowAiToAddSkills: true, visibility: 'org_visible' }
  },
];

export const SEED_RESOURCES: LearningResource[] = [
  {
    id: 'res-1',
    type: 'course',
    title: 'Advanced Logical Reasoning',
    description: 'Master the art of logical deduction and induction.',
    skillTags: ['bucket-1-skill-1'],
    estimatedHours: 10,
    provider: 'Internal Academy'
  },
  {
    id: 'res-2',
    type: 'mentor',
    title: 'Leadership Mentorship with Sarah',
    description: 'One-on-one sessions focused on vision setting and influence.',
    skillTags: ['bucket-6-skill-1', 'bucket-6-skill-2'],
    provider: 'People Ops'
  },
  {
    id: 'res-3',
    type: 'simulation_drill',
    title: 'Data Privacy Crisis Simulation',
    description: 'Real-world scenarios for handling data breaches and privacy compliance.',
    skillTags: ['bucket-10-skill-1'],
    estimatedHours: 4,
    provider: 'Legal Dept'
  },
  {
    id: 'res-4',
    type: 'course',
    title: 'Site Safety Management 101',
    description: 'Comprehensive guide to managing site safety and emergency response.',
    skillTags: ['bucket-6-skill-4'],
    estimatedHours: 15,
    provider: 'HSE Dept'
  },
  {
    id: 'res-5',
    type: 'project',
    title: 'Junior Dev Onboarding Project',
    description: 'Hands-on project to learn the company stack and collaboration tools.',
    skillTags: ['bucket-8-skill-1', 'bucket-8-skill-2'],
    estimatedHours: 40,
    provider: 'Engineering'
  },
  {
    id: 'res-6',
    type: 'course',
    title: 'Industrial Sewing Certification',
    description: 'Comprehensive training on industrial sewing techniques for leather goods.',
    skillTags: ['bucket-12-skill-1', 'bucket-12-skill-3'],
    estimatedHours: 24,
    provider: 'Manufacturing Academy'
  },
  {
    id: 'res-7',
    type: 'course',
    title: 'CNC and Automated Cutting Operations',
    description: 'Master CNC programming and automated cutting systems.',
    skillTags: ['bucket-12-skill-4', 'bucket-12-skill-5'],
    estimatedHours: 30,
    provider: 'Technical Institute'
  },
  {
    id: 'res-8',
    type: 'course',
    title: 'Quality Inspection (ISO 9001)',
    description: 'ISO 9001 quality management systems training and inspection methodology.',
    skillTags: ['bucket-13-skill-1', 'bucket-13-skill-5'],
    estimatedHours: 16,
    provider: 'Quality Academy'
  },
  {
    id: 'res-9',
    type: 'simulation_drill',
    title: 'Machine Maintenance Workshop',
    description: 'Hands-on preventive maintenance techniques for production machinery.',
    skillTags: ['bucket-12-skill-7', 'bucket-12-skill-8'],
    estimatedHours: 20,
    provider: 'Maintenance Dept'
  },
  {
    id: 'res-10',
    type: 'course',
    title: 'Lean Manufacturing Fundamentals',
    description: 'Lean principles, waste reduction, and continuous improvement on the production floor.',
    skillTags: ['bucket-12-skill-12'],
    estimatedHours: 12,
    provider: 'Operations Academy'
  },
  {
    id: 'res-11',
    type: 'course',
    title: 'Forklift Operation & Safety',
    description: 'Certified forklift operator training and warehouse safety procedures.',
    skillTags: ['bucket-12-skill-9', 'bucket-13-skill-2'],
    estimatedHours: 8,
    provider: 'Logistics Training'
  },
  {
    id: 'res-12',
    type: 'course',
    title: 'Inventory & ERP System Training',
    description: 'Modern inventory management practices and ERP system operation.',
    skillTags: ['bucket-12-skill-10', 'bucket-12-skill-11'],
    estimatedHours: 14,
    provider: 'Supply Chain Academy'
  },
];

export const SEED_PERMITS: Permit[] = [
  { id: 'p-1', name: 'Safety Level 1', issuer: 'HSE Dept' },
  { id: 'p-2', name: 'Data Privacy Officer Cert', issuer: 'Legal' },
  { id: 'p-3', name: 'Site Access Level 2', issuer: 'Operations' },
  { id: 'p-4', name: 'Governance & Ethics Certification', issuer: 'Compliance' }
];

export const SEED_TASKS: Task[] = [
  { id: 't-1', name: 'Quarterly Strategy Planning', station: 'HQ', workflowId: 'w-1', domainTags: ['Strategy', 'Management'] },
  { id: 't-2', name: 'Production Line A Operation', station: 'Floor 1', workflowId: 'w-2', domainTags: ['Operations', 'Technical'] },
  { id: 't-3', name: 'Site Maintenance & Inspection', station: 'Site B', workflowId: 'w-3', domainTags: ['Maintenance', 'Safety'] },
  { id: 't-4', name: 'Annual Compliance Audit', station: 'HQ', workflowId: 'w-4', domainTags: ['Compliance', 'Legal'] }
];

export const SEED_TASK_REQUIREMENTS: TaskRequirement[] = [
  {
    taskId: 't-1',
    roleIds: ['role-1', 'role-5'],
    requiredSkills: [{ skillId: 'bucket-1-skill-1', minLevel: 4 }],
    requiredPermits: ['p-2']
  },
  {
    taskId: 't-2',
    roleIds: ['role-1', 'role-2', 'role-3'],
    requiredSkills: [{ skillId: 'bucket-1-skill-2', minLevel: 3 }],
    requiredPermits: ['p-1']
  },
  {
    taskId: 't-3',
    roleIds: ['role-4'],
    requiredSkills: [{ skillId: 'bucket-6-skill-4', minLevel: 4 }],
    requiredPermits: ['p-1', 'p-3']
  },
  {
    taskId: 't-4',
    roleIds: ['role-5'],
    requiredSkills: [{ skillId: 'bucket-10-skill-1', minLevel: 5 }],
    requiredPermits: ['p-4']
  }
];

export const SEED_PERMIT_SCHEMAS: PermitSchema[] = [
  {
    id: 'ps-1',
    name: 'Strategy Lead Authorization',
    appliesToTaskIds: ['t-1'],
    requiredPermits: ['p-2'],
    requiredSkills: [{ skillId: 'bucket-6-skill-1', minLevel: 4, weight: 1 }]
  },
  {
    id: 'ps-2',
    name: 'Site Management Permit',
    appliesToTaskIds: ['t-3'],
    requiredPermits: ['p-1', 'p-3'],
    requiredSkills: [{ skillId: 'bucket-6-skill-4', minLevel: 4, weight: 2 }]
  }
];

export const SEED_CREW_BLUEPRINTS: CrewBlueprint[] = [
  {
    id: 'cb-1',
    name: 'Strategy Taskforce',
    appliesToWorkflowId: 'w-1',
    requiredRoles: [{ roleId: 'role-1', count: 1 }, { roleId: 'role-5', count: 1 }],
    additionalConstraints: 'Requires valid Data Privacy Officer Cert.'
  },
  {
    id: 'cb-2',
    name: 'Site Operations Team',
    appliesToWorkflowId: 'w-3',
    requiredRoles: [{ roleId: 'role-4', count: 1 }, { roleId: 'role-3', count: 2 }],
    additionalConstraints: 'Site Manager must have Site Access Level 2.'
  }
];

export const SEED_PERSON_PERMITS: PersonPermit[] = [
  {
    id: 'pp-1',
    personId: 'emp-1',
    permitId: 'p-1',
    issuedAt: '2023-01-01',
    expiresAt: '2024-01-01',
    status: 'expired',
    notes: 'Needs renewal.'
  },
  {
    id: 'pp-2',
    personId: 'emp-1',
    permitId: 'p-2',
    issuedAt: '2023-06-01',
    expiresAt: '2026-06-01',
    status: 'valid',
    notes: 'Strategic planning access.'
  },
  {
    id: 'pp-3',
    personId: 'emp-3',
    permitId: 'p-1',
    issuedAt: '2024-01-01',
    expiresAt: '2025-01-01',
    status: 'valid',
    notes: 'Standard site safety.'
  },
  {
    id: 'pp-4',
    personId: 'emp-3',
    permitId: 'p-3',
    issuedAt: '2024-02-01',
    expiresAt: '2025-02-01',
    status: 'valid',
    notes: 'Site B manager access.'
  },
  {
    id: 'pp-5',
    personId: 'emp-4',
    permitId: 'p-4',
    issuedAt: '2024-03-01',
    expiresAt: '2027-03-01',
    status: 'valid',
    notes: 'Corporate governance lead.'
  },
  {
    id: 'pp-6',
    personId: 'emp-2',
    permitId: 'p-1',
    issuedAt: '2024-01-15',
    expiresAt: '2025-01-15',
    status: 'valid',
    notes: 'Basic safety for office/floor.'
  }
];
