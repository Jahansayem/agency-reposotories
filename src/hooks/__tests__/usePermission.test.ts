import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermission, usePermissions } from '../usePermission';
import type { AuthUser } from '@/types/todo';

// Mock dependencies
vi.mock('@/contexts/AgencyContext', () => {
  let mockHasPermission = vi.fn(() => true);

  return {
    useAgency: () => ({
      hasPermission: mockHasPermission,
    }),
    __setMockHasPermission: (fn: any) => {
      mockHasPermission = fn;
    },
  };
});

vi.mock('@/contexts/UserContext', () => {
  let mockUser: AuthUser | null = {
    id: 'user-1',
    name: 'Derrick',
    pin_hash: 'hash',
    color: '#0033A0',
    created_at: '2026-01-01T00:00:00Z',
    role: 'owner',
  };

  return {
    useCurrentUser: () => mockUser,
    __setMockUser: (user: AuthUser | null) => {
      mockUser = user;
    },
  };
});

vi.mock('@/lib/featureFlags', () => {
  let multiTenancyEnabled = true;

  return {
    isFeatureEnabled: (flag: string) => {
      if (flag === 'multi_tenancy') return multiTenancyEnabled;
      return false;
    },
    __setMultiTenancy: (enabled: boolean) => {
      multiTenancyEnabled = enabled;
    },
  };
});

// Import mocked modules to access __set functions
import * as AgencyContext from '@/contexts/AgencyContext';
import * as UserContext from '@/contexts/UserContext';
import * as featureFlags from '@/lib/featureFlags';

describe('usePermission', () => {
  beforeEach(() => {
    // Reset to default state
    (featureFlags as any).__setMultiTenancy(true);
    (UserContext as any).__setMockUser({
      id: 'user-1',
      name: 'Derrick',
      pin_hash: 'hash',
      color: '#0033A0',
      created_at: '2026-01-01T00:00:00Z',
      role: 'owner',
    });
    (AgencyContext as any).__setMockHasPermission(vi.fn(() => true));
  });

  describe('multi-tenancy mode', () => {
    it('should return true for allowed permission', () => {
      (AgencyContext as any).__setMockHasPermission(vi.fn(() => true));

      const { result } = renderHook(() => usePermission('can_create_tasks'));

      expect(result.current).toBe(true);
    });

    it('should return false for denied permission', () => {
      (AgencyContext as any).__setMockHasPermission(vi.fn(() => false));

      const { result } = renderHook(() => usePermission('can_delete_all_tasks'));

      expect(result.current).toBe(false);
    });

    it('should delegate to AgencyContext hasPermission', () => {
      const mockHasPermission = vi.fn(() => true);
      (AgencyContext as any).__setMockHasPermission(mockHasPermission);

      renderHook(() => usePermission('can_edit_all_tasks'));

      expect(mockHasPermission).toHaveBeenCalledWith('can_edit_all_tasks');
    });
  });

  describe('single-tenant mode', () => {
    beforeEach(() => {
      (featureFlags as any).__setMultiTenancy(false);
    });

    it('should use DEFAULT_PERMISSIONS for owner role', () => {
      (UserContext as any).__setMockUser({
        id: 'user-1',
        name: 'Derrick',
        pin_hash: 'hash',
        color: '#0033A0',
        created_at: '2026-01-01T00:00:00Z',
        role: 'owner',
      });

      const { result } = renderHook(() => usePermission('can_delete_all_tasks'));

      // Owners have all permissions by default
      expect(result.current).toBe(true);
    });

    it('should use DEFAULT_PERMISSIONS for manager role', () => {
      (UserContext as any).__setMockUser({
        id: 'user-2',
        name: 'Manager',
        pin_hash: 'hash',
        color: '#72B5E8',
        created_at: '2026-01-01T00:00:00Z',
        role: 'manager',
      });

      // Managers can create tasks
      const createResult = renderHook(() => usePermission('can_create_tasks'));
      expect(createResult.result.current).toBe(true);

      // But cannot delete all tasks (only their own)
      const deleteResult = renderHook(() => usePermission('can_delete_all_tasks'));
      expect(deleteResult.result.current).toBe(false);
    });

    it('should use DEFAULT_PERMISSIONS for staff role', () => {
      (UserContext as any).__setMockUser({
        id: 'user-3',
        name: 'Staff',
        pin_hash: 'hash',
        color: '#C9A227',
        created_at: '2026-01-01T00:00:00Z',
        role: 'staff',
      });

      // Staff can create tasks
      const createResult = renderHook(() => usePermission('can_create_tasks'));
      expect(createResult.result.current).toBe(true);

      // But cannot edit all tasks
      const editResult = renderHook(() => usePermission('can_edit_all_tasks'));
      expect(editResult.result.current).toBe(false);

      // And cannot view all tasks (staff data scoping)
      const viewResult = renderHook(() => usePermission('can_view_all_tasks'));
      expect(viewResult.result.current).toBe(false);
    });

    it('should return false if user has no role', () => {
      (UserContext as any).__setMockUser({
        id: 'user-4',
        name: 'NoRole',
        pin_hash: 'hash',
        color: '#0033A0',
        created_at: '2026-01-01T00:00:00Z',
        // No role property
      });

      const { result } = renderHook(() => usePermission('can_create_tasks'));

      expect(result.current).toBe(false);
    });

    it('should return false if user is null', () => {
      (UserContext as any).__setMockUser(null);

      const { result } = renderHook(() => usePermission('can_create_tasks'));

      expect(result.current).toBe(false);
    });
  });
});

describe('usePermissions', () => {
  beforeEach(() => {
    (featureFlags as any).__setMultiTenancy(true);
    (UserContext as any).__setMockUser({
      id: 'user-1',
      name: 'Derrick',
      pin_hash: 'hash',
      color: '#0033A0',
      created_at: '2026-01-01T00:00:00Z',
      role: 'owner',
    });
  });

  describe('multi-tenancy mode', () => {
    it('should check multiple permissions', () => {
      const mockHasPermission = vi.fn((perm: string) => {
        return perm === 'can_create_tasks' || perm === 'can_edit_all_tasks';
      });
      (AgencyContext as any).__setMockHasPermission(mockHasPermission);

      const { result } = renderHook(() =>
        usePermissions(['can_create_tasks', 'can_edit_all_tasks', 'can_delete_all_tasks'])
      );

      expect(result.current).toEqual({
        can_create_tasks: true,
        can_edit_all_tasks: true,
        can_delete_all_tasks: false,
      });
    });

    it('should call hasPermission for each permission', () => {
      const mockHasPermission = vi.fn(() => true);
      (AgencyContext as any).__setMockHasPermission(mockHasPermission);

      renderHook(() =>
        usePermissions(['can_create_tasks', 'can_edit_all_tasks'])
      );

      expect(mockHasPermission).toHaveBeenCalledTimes(2);
      expect(mockHasPermission).toHaveBeenCalledWith('can_create_tasks');
      expect(mockHasPermission).toHaveBeenCalledWith('can_edit_all_tasks');
    });

    it('should handle empty permissions array', () => {
      const { result } = renderHook(() => usePermissions([]));

      expect(result.current).toEqual({});
    });
  });

  describe('single-tenant mode', () => {
    beforeEach(() => {
      (featureFlags as any).__setMultiTenancy(false);
    });

    it('should check multiple permissions for owner', () => {
      (UserContext as any).__setMockUser({
        id: 'user-1',
        name: 'Derrick',
        pin_hash: 'hash',
        color: '#0033A0',
        created_at: '2026-01-01T00:00:00Z',
        role: 'owner',
      });

      const { result } = renderHook(() =>
        usePermissions(['can_create_tasks', 'can_delete_all_tasks', 'can_manage_members'])
      );

      // Owners have all permissions
      expect(result.current).toEqual({
        can_create_tasks: true,
        can_delete_all_tasks: true,
        can_manage_members: true,
      });
    });

    it('should check multiple permissions for staff', () => {
      (UserContext as any).__setMockUser({
        id: 'user-3',
        name: 'Staff',
        pin_hash: 'hash',
        color: '#C9A227',
        created_at: '2026-01-01T00:00:00Z',
        role: 'staff',
      });

      const { result } = renderHook(() =>
        usePermissions([
          'can_create_tasks',
          'can_edit_all_tasks',
          'can_delete_all_tasks',
          'can_manage_members',
        ])
      );

      expect(result.current).toEqual({
        can_create_tasks: true,
        can_edit_all_tasks: false,
        can_delete_all_tasks: false,
        can_manage_members: false,
      });
    });

    it('should return all false if user has no role', () => {
      (UserContext as any).__setMockUser({
        id: 'user-4',
        name: 'NoRole',
        pin_hash: 'hash',
        color: '#0033A0',
        created_at: '2026-01-01T00:00:00Z',
        // No role
      });

      const { result } = renderHook(() =>
        usePermissions(['can_create_tasks', 'can_edit_all_tasks'])
      );

      expect(result.current).toEqual({
        can_create_tasks: false,
        can_edit_all_tasks: false,
      });
    });

    it('should return all false if user is null', () => {
      (UserContext as any).__setMockUser(null);

      const { result } = renderHook(() =>
        usePermissions(['can_create_tasks', 'can_edit_all_tasks'])
      );

      expect(result.current).toEqual({
        can_create_tasks: false,
        can_edit_all_tasks: false,
      });
    });
  });

  describe('permission combinations', () => {
    beforeEach(() => {
      (featureFlags as any).__setMultiTenancy(false);
    });

    it('should correctly handle owner permissions', () => {
      (UserContext as any).__setMockUser({
        id: 'owner-1',
        name: 'Owner',
        pin_hash: 'hash',
        color: '#0033A0',
        created_at: '2026-01-01T00:00:00Z',
        role: 'owner',
      });

      const { result } = renderHook(() =>
        usePermissions([
          'can_view_all_tasks',
          'can_create_tasks',
          'can_edit_all_tasks',
          'can_delete_all_tasks',
          'can_manage_members',
          'can_view_analytics',
        ])
      );

      // Owner should have all permissions
      Object.values(result.current).forEach(value => {
        expect(value).toBe(true);
      });
    });

    it('should correctly handle manager permissions', () => {
      (UserContext as any).__setMockUser({
        id: 'manager-1',
        name: 'Manager',
        pin_hash: 'hash',
        color: '#72B5E8',
        created_at: '2026-01-01T00:00:00Z',
        role: 'manager',
      });

      const { result } = renderHook(() =>
        usePermissions([
          'can_view_all_tasks',
          'can_create_tasks',
          'can_edit_all_tasks',
          'can_delete_all_tasks',
          'can_manage_members',
          'can_view_analytics',
        ])
      );

      // Manager should have most permissions but not all
      expect(result.current.can_view_all_tasks).toBe(true);
      expect(result.current.can_create_tasks).toBe(true);
      expect(result.current.can_edit_all_tasks).toBe(true);
      expect(result.current.can_delete_all_tasks).toBe(false); // Manager cannot delete all
      expect(result.current.can_manage_members).toBe(false); // Manager cannot manage members
      expect(result.current.can_view_analytics).toBe(true);
    });

    it('should correctly handle staff permissions', () => {
      (UserContext as any).__setMockUser({
        id: 'staff-1',
        name: 'Staff',
        pin_hash: 'hash',
        color: '#C9A227',
        created_at: '2026-01-01T00:00:00Z',
        role: 'staff',
      });

      const { result } = renderHook(() =>
        usePermissions([
          'can_view_all_tasks',
          'can_create_tasks',
          'can_edit_all_tasks',
          'can_delete_all_tasks',
          'can_manage_members',
        ])
      );

      // Staff should have limited permissions
      expect(result.current.can_view_all_tasks).toBe(false); // Staff scoped to own tasks
      expect(result.current.can_create_tasks).toBe(true);
      expect(result.current.can_edit_all_tasks).toBe(false);
      expect(result.current.can_delete_all_tasks).toBe(false);
      expect(result.current.can_manage_members).toBe(false);
    });
  });
});
