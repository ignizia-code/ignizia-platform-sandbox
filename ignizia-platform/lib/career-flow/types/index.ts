export interface PastRole {
  title: string;
  company: string;
}

export interface UserProfile {
  name: string;
  employeeId?: string;
  currentTitle: string;
  yearsOfExperience: number;
  pastRoles: PastRole[];
  skills: string[];
  interests: string[];
  aspirations: {
    salary: number;
    workLifeBalance: number;
    leadership: number;
  };
}

export interface CareerRole {
  id: string;
  title: string;
  category: 'adjacent' | 'stretch' | 'wildcard';
  matchScore: number;
  reasoning: string;
}

export interface RoleDeepDive {
  roleId: string;
  skillComparison: {
    skill: string;
    userLevel: number;
    requiredLevel: number;
  }[];
  roadmap: {
    phase: string;
    duration: string;
    actions: string[];
  }[];
  dayInLife: {
    time: string;
    activity: string;
  }[];
  fiveYearProjection: {
    year: number;
    currentPath: {
      salary: number;
      marketDemand: string;
    };
    newPath: {
      salary: number;
      marketDemand: string;
    };
  }[];
}

export interface ChosenCareerPath {
  employeeId: string;
  role: CareerRole;
  deepDive: RoleDeepDive;
  chosenAt: string;
}

export interface AppState {
  profile: UserProfile;
  suggestedRoles: CareerRole[];
  selectedRole: CareerRole | null;
  roleDeepDive: RoleDeepDive | null;
}
