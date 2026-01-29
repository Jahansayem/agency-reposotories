'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ModalState {
  openModals: Map<string, any>;
}

interface ModalContextValue {
  openModal: (name: string, props?: any) => void;
  closeModal: (name: string) => void;
  isOpen: (name: string) => boolean;
  getProps: (name: string) => any;
  closeAll: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [openModals, setOpenModals] = useState<Map<string, any>>(new Map());

  const openModal = useCallback((name: string, props?: any) => {
    setOpenModals(prev => new Map(prev).set(name, props ?? {}));
  }, []);

  const closeModal = useCallback((name: string) => {
    setOpenModals(prev => { const next = new Map(prev); next.delete(name); return next; });
  }, []);

  const isOpen = useCallback((name: string) => openModals.has(name), [openModals]);
  const getProps = useCallback((name: string) => openModals.get(name), [openModals]);
  const closeAll = useCallback(() => setOpenModals(new Map()), []);

  return <ModalContext.Provider value={{ openModal, closeModal, isOpen, getProps, closeAll }}>{children}</ModalContext.Provider>;
}

export function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModalContext must be used within ModalProvider');
  return ctx;
}
