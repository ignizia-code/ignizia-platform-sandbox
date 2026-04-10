'use server';

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { UserProfile } from '../types';

const skillSchema = z.object({
  skills: z.array(z.string()).describe('List of 8-10 relevant skills for the job title'),
});

const rolesSchema = z.object({
  roles: z.array(z.object({
    id: z.string().describe('Unique identifier for the role'),
    title: z.string().describe('Job title'),
    category: z.enum(['adjacent', 'stretch', 'wildcard']).describe('Category of career transition'),
    matchScore: z.number().min(0).max(100).describe('Percentage match score'),
    reasoning: z.string().describe('One sentence explanation of why this role fits'),
  })).describe('6 career roles - 2 adjacent, 2 stretch, 2 wildcard'),
});

const deepDiveSchema = z.object({
  skillComparison: z.array(z.object({
    skill: z.string(),
    userLevel: z.number().min(0).max(100),
    requiredLevel: z.number().min(0).max(100),
  })).describe('Radar chart data comparing user skills vs role requirements'),
  roadmap: z.array(z.object({
    phase: z.string(),
    duration: z.string(),
    actions: z.array(z.string()),
  })).describe('3-phase transition roadmap'),
  dayInLife: z.array(z.object({
    time: z.string(),
    activity: z.string(),
  })).describe('Hour-by-hour schedule from 9 AM to 6 PM'),
  fiveYearProjection: z.array(z.object({
    year: z.number(),
    currentPath: z.object({
      salary: z.number(),
      marketDemand: z.string(),
    }),
    newPath: z.object({
      salary: z.number(),
      marketDemand: z.string(),
    }),
  })).describe('5-year salary and demand comparison'),
});

const getMockSkills = (jobTitle: string): string[] => {
  const commonSkills = [
    'Communication', 'Problem Solving', 'Leadership', 'Project Management',
    'Data Analysis', 'Strategic Thinking', 'Team Collaboration', 'Time Management',
    'Critical Thinking', 'Adaptability'
  ];
  return commonSkills;
};

const getMockRoles = (profile: UserProfile) => {
  const interests = profile.interests && profile.interests.length > 0 ? profile.interests : ['General'];
  
  const interestBasedRoles: Record<string, string[]> = {
    'Technology': ['Senior Software Engineer', 'Technical Lead', 'Solutions Architect'],
    'Healthcare': ['Health Tech Specialist', 'Clinical Systems Analyst', 'Healthcare Consultant'],
    'Finance': ['Financial Systems Engineer', 'FinTech Developer', 'Quantitative Analyst'],
    'Education': ['EdTech Product Manager', 'Technical Educator', 'Learning Experience Designer'],
  };

  const selectedRoles: string[] = [];
  interests.forEach(interest => {
    if (interestBasedRoles[interest]) {
      selectedRoles.push(...interestBasedRoles[interest]);
    }
  });

  if (selectedRoles.length < 6) {
    selectedRoles.push(
      `Senior ${profile.currentTitle}`,
      `${profile.currentTitle} Manager`,
      'Technical Lead',
      'Product Manager',
      'Solutions Architect',
      'Startup Founder'
    );
  }

  const uniqueRoles = [...new Set(selectedRoles)].slice(0, 6);
  
  return [
    {
      id: '1',
      title: uniqueRoles[0] || `Senior ${profile.currentTitle}`,
      category: 'adjacent' as const,
      matchScore: 85,
      reasoning: interests.length > 0 
        ? `Aligns with your interest in ${interests[0]} and builds on your current expertise.`
        : 'A natural progression leveraging your existing expertise and experience.',
    },
    {
      id: '2',
      title: uniqueRoles[1] || `${profile.currentTitle} Manager`,
      category: 'adjacent' as const,
      matchScore: 78,
      reasoning: interests.length > 1
        ? `Combines your ${interests[1]} interest with leadership opportunities.`
        : 'Move into leadership while staying in your domain.',
    },
    {
      id: '3',
      title: uniqueRoles[2] || 'Technical Lead',
      category: 'stretch' as const,
      matchScore: 72,
      reasoning: interests.length > 2
        ? `Leverages your passion for ${interests[2]} in a technical leadership role.`
        : 'Step up to guide technical decisions and mentor others.',
    },
    {
      id: '4',
      title: uniqueRoles[3] || 'Product Manager',
      category: 'stretch' as const,
      matchScore: 65,
      reasoning: 'Apply your technical background in a strategic product role.',
    },
    {
      id: '5',
      title: uniqueRoles[4] || 'Solutions Architect',
      category: 'wildcard' as const,
      matchScore: 58,
      reasoning: interests.length > 0
        ? `A creative pivot combining your skills with your ${interests[0]} interests.`
        : 'Design high-level solutions across various domains.',
    },
    {
      id: '6',
      title: uniqueRoles[5] || 'Industry Consultant',
      category: 'wildcard' as const,
      matchScore: 52,
      reasoning: 'Share your expertise across multiple organizations and industries.',
    },
  ];
};

const getMockDeepDive = () => {
  return {
    skillComparison: [
      { skill: 'Leadership', userLevel: 60, requiredLevel: 80 },
      { skill: 'Technical', userLevel: 85, requiredLevel: 75 },
      { skill: 'Communication', userLevel: 70, requiredLevel: 85 },
      { skill: 'Strategy', userLevel: 55, requiredLevel: 75 },
      { skill: 'Analytics', userLevel: 75, requiredLevel: 70 },
      { skill: 'Creativity', userLevel: 65, requiredLevel: 70 },
    ],
    roadmap: [
      {
        phase: 'Foundation Building',
        duration: '0-6 months',
        actions: [
          'Identify your skill gaps through self-assessment',
          'Take online courses in key areas',
          'Network with professionals in your target role',
          'Update your resume to highlight transferable skills',
        ],
      },
      {
        phase: 'Skill Development',
        duration: '6-12 months',
        actions: [
          'Complete certification programs',
          'Take on stretch assignments at your current job',
          'Find a mentor in your target field',
          'Build your portfolio of relevant projects',
        ],
      },
      {
        phase: 'Transition',
        duration: '12+ months',
        actions: [
          'Apply for roles in your target field',
          'Leverage your network for referrals',
          'Negotiate offers effectively',
          'Plan your exit from your current role',
        ],
      },
    ],
    dayInLife: [
      { time: '9:00 AM', activity: 'Team stand-up and daily planning' },
      { time: '10:00 AM', activity: 'Strategic meetings with stakeholders' },
      { time: '12:00 PM', activity: 'Lunch and networking' },
      { time: '1:00 PM', activity: 'Deep work on core projects' },
      { time: '3:00 PM', activity: 'Collaboration sessions with team' },
      { time: '4:00 PM', activity: 'Review and feedback sessions' },
      { time: '5:00 PM', activity: 'Wrap-up and planning for tomorrow' },
      { time: '6:00 PM', activity: 'End of day' },
    ],
    fiveYearProjection: [
      {
        year: 1,
        currentPath: { salary: 90000, marketDemand: 'Stable' },
        newPath: { salary: 85000, marketDemand: 'Growing' },
      },
      {
        year: 2,
        currentPath: { salary: 95000, marketDemand: 'Stable' },
        newPath: { salary: 100000, marketDemand: 'High Growth' },
      },
      {
        year: 3,
        currentPath: { salary: 100000, marketDemand: 'Moderate' },
        newPath: { salary: 120000, marketDemand: 'High Growth' },
      },
      {
        year: 4,
        currentPath: { salary: 105000, marketDemand: 'Slowing' },
        newPath: { salary: 145000, marketDemand: 'High Demand' },
      },
      {
        year: 5,
        currentPath: { salary: 110000, marketDemand: 'Declining' },
        newPath: { salary: 175000, marketDemand: 'Very High Demand' },
      },
    ],
  };
};

export async function suggestSkills(jobTitle: string) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: true, skills: getMockSkills(jobTitle) };
    }

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: skillSchema,
      prompt: `Based on the job title "${jobTitle}", return a JSON list of 8-10 highly relevant skills that someone in this role would typically have. Include both technical and soft skills.`,
    });
    
    return { success: true, skills: object.skills };
  } catch (error) {
    console.error('Error suggesting skills:', error);
    return { success: true, skills: getMockSkills(jobTitle) };
  }
}

export async function suggestCareerRoles(profile: UserProfile) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: true, roles: getMockRoles(profile) };
    }

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: rolesSchema,
      prompt: `Analyze this career profile and suggest 6 potential career transition roles:

Current Title: ${profile.currentTitle}
Years of Experience: ${profile.yearsOfExperience}
Past Roles: ${profile.pastRoles.map(r => `${r.title} at ${r.company}`).join(', ')}
Skills: ${profile.skills.join(', ')}
Interests: ${profile.interests.join(', ')}
Aspirations:
- Salary Priority: ${profile.aspirations.salary}%
- Work-Life Balance Priority: ${profile.aspirations.workLifeBalance}%
- Leadership Priority: ${profile.aspirations.leadership}%

CRITICAL: ALL reasoning text must use SECOND PERSON pronouns (you, your, yours). Address the user directly as "you".

IMPORTANT: Consider the user's INTERESTS heavily when suggesting roles.

Suggest exactly:
- 2 ADJACENT roles (similar to current path, logical next step)
- 2 STRETCH roles (requires skill development)
- 2 WILDCARD roles (creative pivots)

Return match scores (0-100) and brief reasoning for each using second person.`,
    });
    
    return { success: true, roles: object.roles };
  } catch (error) {
    console.error('Error suggesting roles:', error);
    return { success: true, roles: getMockRoles(profile) };
  }
}

export async function getRoleDeepDive(
  currentRole: string,
  targetRole: string,
  userSkills: string[],
  yearsOfExperience: number
) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: true, data: getMockDeepDive() };
    }

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: deepDiveSchema,
      prompt: `Create a detailed career transition plan from "${currentRole}" to "${targetRole}".

User Profile:
- Years of Experience: ${yearsOfExperience}
- Current Skills: ${userSkills.join(', ')}

Provide:
1. A skill comparison radar chart showing 6-8 key skills with user current level vs. role required level (0-100 scale)
2. A 3-phase roadmap (0-6 months, 6-12 months, 12+ months) with specific actions
3. A realistic day-in-the-life schedule from 9 AM to 6 PM for the target role
4. A 5-year projection comparing staying in current path vs. transitioning, including salary estimates and market demand trends`,
    });
    
    return { success: true, data: object };
  } catch (error) {
    console.error('Error getting deep dive:', error);
    return { success: true, data: getMockDeepDive() };
  }
}
