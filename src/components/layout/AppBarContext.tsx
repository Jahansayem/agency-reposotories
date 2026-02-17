'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AppBarContextType {
  content: ReactNode | null;
  setContent: (content: ReactNode | null) => void;
}

const AppBarContext = createContext<AppBarContextType | null>(null);

export function AppBarProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode | null>(null);

  return (
    <AppBarContext.Provider value={{ content, setContent }}>
      {children}
    </AppBarContext.Provider>
  );
}

export function useAppBar() {
  const context = useContext(AppBarContext);
  if (!context) {
    throw new Error('useAppBar must be used within AppBarProvider');
  }
  return {
    setAppBarContent: context.setContent,
    content: context.content,
  };
}
