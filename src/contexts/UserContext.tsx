'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { AuthUser } from '@/types/todo';

// ============================================
// Types
// ============================================

interface UserContextType {
  currentUser: AuthUser;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// ============================================
// Provider Component
// ============================================

interface UserProviderProps {
  children: ReactNode;
  currentUser: AuthUser;
}

export function UserProvider({ children, currentUser }: UserProviderProps) {
  return (
    <UserContext.Provider value={{ currentUser }}>
      {children}
    </UserContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

/**
 * Access the current authenticated user, including their role.
 * Must be used within a UserProvider.
 */
export function useCurrentUser(): AuthUser {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within a UserProvider');
  }
  return context.currentUser;
}
