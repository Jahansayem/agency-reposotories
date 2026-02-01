'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isFeatureEnabled } from '@/lib/featureFlags';
import type {
  Agency,
  AgencyMembership,
  AgencyRole,
  AgencyPermissions,
} from '@/types/agency';

// ============================================
// Types
// ============================================

interface AgencyContextType {
  /** Currently selected agency */
  currentAgency: Agency | null;
  /** Current agency ID (convenience accessor) */
  currentAgencyId: string | null;
  /** User's role in the current agency */
  currentRole: AgencyRole | null;
  /** User's permissions in the current agency */
  currentPermissions: AgencyPermissions | null;
  /** All agencies the user belongs to */
  agencies: AgencyMembership[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether multi-tenancy is enabled */
  isMultiTenancyEnabled: boolean;
  /** Switch to a different agency */
  switchAgency: (agencyId: string) => Promise<void>;
  /** Refresh agencies list from server */
  refreshAgencies: () => Promise<void>;
  /** Check if user has a specific permission */
  hasPermission: (permission: keyof AgencyPermissions) => boolean;
  /** Check if user is owner of current agency */
  isAgencyOwner: boolean;
  /** Check if user is admin (owner or admin) of current agency */
  isAgencyAdmin: boolean;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

const CURRENT_AGENCY_KEY = 'bealer-current-agency';

// ============================================
// Provider Component
// ============================================

interface AgencyProviderProps {
  children: ReactNode;
  userId?: string;
}

export function AgencyProvider({ children, userId }: AgencyProviderProps) {
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(null);
  const [currentMembership, setCurrentMembership] = useState<AgencyMembership | null>(null);
  const [agencies, setAgencies] = useState<AgencyMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMultiTenancyEnabled = isFeatureEnabled('multi_tenancy');

  // Load agencies on mount or when userId changes
  useEffect(() => {
    if (!isMultiTenancyEnabled) {
      setIsLoading(false);
      return;
    }

    if (!userId) {
      setIsLoading(false);
      setAgencies([]);
      setCurrentAgency(null);
      setCurrentMembership(null);
      return;
    }

    loadUserAgencies(userId);
  }, [userId, isMultiTenancyEnabled]);

  // Load saved agency selection from localStorage
  useEffect(() => {
    if (!isMultiTenancyEnabled || agencies.length === 0) return;

    const savedAgencyId = localStorage.getItem(CURRENT_AGENCY_KEY);

    if (savedAgencyId) {
      // Verify user still has access to this agency
      const membership = agencies.find(a => a.agency_id === savedAgencyId);
      if (membership) {
        loadAgencyDetails(savedAgencyId, membership);
        return;
      }
    }

    // Default to the user's default agency or first agency
    const defaultAgency = agencies.find(a => a.is_default) || agencies[0];
    if (defaultAgency) {
      loadAgencyDetails(defaultAgency.agency_id, defaultAgency);
    }
  }, [agencies, isMultiTenancyEnabled]);

  /**
   * Load all agencies the user belongs to
   */
  const loadUserAgencies = useCallback(async (uid: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('agency_members')
        .select(`
          agency_id,
          role,
          permissions,
          is_default_agency,
          agencies!inner (
            id,
            name,
            slug,
            is_active
          )
        `)
        .eq('user_id', uid)
        .eq('status', 'active');

      if (fetchError) {
        throw fetchError;
      }

      // Transform the data - Supabase returns joined data as nested objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = data as any[];
      const memberships: AgencyMembership[] = (rawData || [])
        .filter((m) => m.agencies?.is_active)
        .map((m) => ({
          agency_id: m.agency_id,
          agency_name: m.agencies.name,
          agency_slug: m.agencies.slug,
          role: m.role as AgencyRole,
          permissions: m.permissions as AgencyPermissions,
          is_default: m.is_default_agency,
        }));

      setAgencies(memberships);
    } catch (err) {
      console.error('Failed to load agencies:', err);
      setError('Failed to load agencies');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load full agency details
   */
  const loadAgencyDetails = useCallback(async (
    agencyId: string,
    membership: AgencyMembership
  ) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', agencyId)
        .eq('is_active', true)
        .single();

      if (fetchError || !data) {
        throw fetchError || new Error('Agency not found');
      }

      setCurrentAgency(data as Agency);
      setCurrentMembership(membership);
      localStorage.setItem(CURRENT_AGENCY_KEY, agencyId);

      // Set cookie for server-side access
      document.cookie = `current_agency_id=${agencyId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    } catch (err) {
      console.error('Failed to load agency details:', err);
      setError('Failed to load agency');
    }
  }, []);

  /**
   * Switch to a different agency
   */
  const switchAgency = useCallback(async (agencyId: string) => {
    const membership = agencies.find(a => a.agency_id === agencyId);
    if (!membership) {
      setError('You are not a member of this agency');
      return;
    }

    await loadAgencyDetails(agencyId, membership);
  }, [agencies, loadAgencyDetails]);

  /**
   * Refresh agencies list
   */
  const refreshAgencies = useCallback(async () => {
    if (userId) {
      await loadUserAgencies(userId);
    }
  }, [userId, loadUserAgencies]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((permission: keyof AgencyPermissions): boolean => {
    if (!isMultiTenancyEnabled) return true;
    if (!currentMembership?.permissions) return false;
    return currentMembership.permissions[permission] === true;
  }, [currentMembership, isMultiTenancyEnabled]);

  // Computed values
  const isAgencyOwner = currentMembership?.role === 'owner';
  const isAgencyAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'admin';

  // Subscribe to real-time agency updates
  useEffect(() => {
    if (!isMultiTenancyEnabled || !userId) return;

    const channel = supabase
      .channel('agency-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agency_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refresh agencies when membership changes
          refreshAgencies();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agencies',
          filter: currentAgency ? `id=eq.${currentAgency.id}` : undefined,
        },
        (payload) => {
          // Update current agency if it changed
          if (currentAgency && payload.new) {
            setCurrentAgency(payload.new as Agency);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, currentAgency, refreshAgencies, isMultiTenancyEnabled]);

  const value: AgencyContextType = {
    currentAgency,
    currentAgencyId: currentAgency?.id || null,
    currentRole: currentMembership?.role || null,
    currentPermissions: currentMembership?.permissions || null,
    agencies,
    isLoading,
    error,
    isMultiTenancyEnabled,
    switchAgency,
    refreshAgencies,
    hasPermission,
    isAgencyOwner,
    isAgencyAdmin,
  };

  return (
    <AgencyContext.Provider value={value}>
      {children}
    </AgencyContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useAgency() {
  const context = useContext(AgencyContext);
  if (context === undefined) {
    throw new Error('useAgency must be used within an AgencyProvider');
  }
  return context;
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Hook to get current agency ID, safe to use without checking
 * Returns null if no agency is selected or multi-tenancy is disabled
 */
export function useCurrentAgencyId(): string | null {
  const { currentAgencyId, isMultiTenancyEnabled } = useAgency();
  if (!isMultiTenancyEnabled) return null;
  return currentAgencyId;
}

/**
 * Hook to check if user has permission
 */
export function useAgencyPermission(permission: keyof AgencyPermissions): boolean {
  const { hasPermission, isMultiTenancyEnabled } = useAgency();
  if (!isMultiTenancyEnabled) return true;
  return hasPermission(permission);
}

/**
 * Hook to get agency-scoped query params for Supabase queries
 * Returns an object with agency_id if multi-tenancy is enabled
 */
export function useAgencyScope(): { agency_id?: string } {
  const { currentAgencyId, isMultiTenancyEnabled } = useAgency();

  if (!isMultiTenancyEnabled || !currentAgencyId) {
    return {};
  }

  return { agency_id: currentAgencyId };
}
