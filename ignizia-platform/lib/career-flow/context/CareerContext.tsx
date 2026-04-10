'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, CareerRole, RoleDeepDive, ChosenCareerPath } from '../types';

interface CareerContextType {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  suggestedRoles: CareerRole[];
  setSuggestedRoles: (roles: CareerRole[]) => void;
  selectedRole: CareerRole | null;
  setSelectedRole: (role: CareerRole | null) => void;
  roleDeepDive: RoleDeepDive | null;
  setRoleDeepDive: (deepDive: RoleDeepDive | null) => void;
  chosenPath: ChosenCareerPath | null;
  setChosenPath: (path: ChosenCareerPath | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const defaultProfile: UserProfile = {
  name: '',
  currentTitle: '',
  yearsOfExperience: 0,
  pastRoles: [],
  skills: [],
  interests: [],
  aspirations: {
    salary: 50,
    workLifeBalance: 50,
    leadership: 50,
  },
};

const CareerContext = createContext<CareerContextType | undefined>(undefined);

export function CareerProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(defaultProfile);
  const [suggestedRoles, setSuggestedRolesState] = useState<CareerRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<CareerRole | null>(null);
  const [roleDeepDive, setRoleDeepDive] = useState<RoleDeepDive | null>(null);
  const [chosenPath, setChosenPathState] = useState<ChosenCareerPath | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const savedProfile = localStorage.getItem('careerflow_profile');
    const savedRoles = localStorage.getItem('careerflow_roles');
    
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfileState({
          ...defaultProfile,
          ...parsed,
          pastRoles: parsed.pastRoles || [],
          skills: parsed.skills || [],
          interests: parsed.interests || [],
          aspirations: {
            ...defaultProfile.aspirations,
            ...parsed.aspirations,
          },
        });
      } catch (e) {
        console.error('Failed to parse saved profile', e);
      }
    }
    
    if (savedRoles) {
      try {
        setSuggestedRolesState(JSON.parse(savedRoles));
      } catch (e) {
        console.error('Failed to parse saved roles', e);
      }
    }

    const savedPath = localStorage.getItem('ignizia_career_aspiration');
    if (savedPath) {
      try {
        setChosenPathState(JSON.parse(savedPath));
      } catch (e) {
        console.error('Failed to parse saved career path', e);
      }
    }
  }, []);

  const setProfile = (newProfile: UserProfile) => {
    setProfileState(newProfile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('careerflow_profile', JSON.stringify(newProfile));
    }
  };

  const setSuggestedRoles = (roles: CareerRole[]) => {
    setSuggestedRolesState(roles);
    if (typeof window !== 'undefined') {
      localStorage.setItem('careerflow_roles', JSON.stringify(roles));
    }
  };

  const setChosenPath = (path: ChosenCareerPath | null) => {
    setChosenPathState(path);
    if (typeof window !== 'undefined') {
      if (path) {
        localStorage.setItem('ignizia_career_aspiration', JSON.stringify(path));
      } else {
        localStorage.removeItem('ignizia_career_aspiration');
      }
    }
  };

  if (!isHydrated) {
    return null;
  }

  return (
    <CareerContext.Provider
      value={{
        profile,
        setProfile,
        suggestedRoles,
        setSuggestedRoles,
        selectedRole,
        setSelectedRole,
        roleDeepDive,
        setRoleDeepDive,
        chosenPath,
        setChosenPath,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </CareerContext.Provider>
  );
}

export function useCareer() {
  const context = useContext(CareerContext);
  if (context === undefined) {
    throw new Error('useCareer must be used within a CareerProvider');
  }
  return context;
}
