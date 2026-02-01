'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, Check, Plus, Shield, Crown, User, Users } from 'lucide-react';
import { useAgency } from '@/contexts/AgencyContext';
import type { AgencyRole } from '@/types/agency';

// ============================================
// Types
// ============================================

interface AgencySwitcherProps {
  /** Callback when "Create Agency" is clicked */
  onCreateAgency?: () => void;
  /** Callback when "Manage Members" is clicked */
  onManageMembers?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show role badge */
  showRole?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// Helper Functions
// ============================================

const getRoleIcon = (role: AgencyRole) => {
  switch (role) {
    case 'owner':
      return <Crown className="w-3 h-3" />;
    case 'admin':
      return <Shield className="w-3 h-3" />;
    default:
      return <User className="w-3 h-3" />;
  }
};

const getRoleLabel = (role: AgencyRole) => {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    default:
      return 'Member';
  }
};

const getRoleColor = (role: AgencyRole) => {
  switch (role) {
    case 'owner':
      return 'text-yellow-500';
    case 'admin':
      return 'text-blue-500';
    default:
      return 'text-gray-500 dark:text-gray-400';
  }
};

// ============================================
// Component
// ============================================

export function AgencySwitcher({
  onCreateAgency,
  onManageMembers,
  size = 'md',
  showRole = true,
  className = '',
}: AgencySwitcherProps) {
  const {
    currentAgency,
    currentRole,
    agencies,
    isLoading,
    isMultiTenancyEnabled,
    switchAgency,
  } = useAgency();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Don't render if multi-tenancy is disabled
  if (!isMultiTenancyEnabled) {
    return null;
  }

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  const handleSelectAgency = async (agencyId: string) => {
    await switchAgency(agencyId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          flex items-center gap-2 rounded-[var(--radius-lg)]
          bg-[var(--surface)]
          border border-[var(--border)]
          hover:bg-[var(--surface-2)]
          transition-colors
          ${sizeClasses[size]}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {/* Agency Icon */}
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: currentAgency?.primary_color || '#0033A0' }}
        >
          {currentAgency?.name?.charAt(0) || <Building2 className="w-4 h-4" />}
        </div>

        {/* Agency Name */}
        <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
          {isLoading ? 'Loading...' : (currentAgency?.name || 'Select Agency')}
        </span>

        {/* Role Badge */}
        {showRole && currentRole && (
          <span className={`flex items-center gap-1 ${getRoleColor(currentRole)}`}>
            {getRoleIcon(currentRole)}
          </span>
        )}

        {/* Dropdown Arrow */}
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="
              absolute z-50 mt-1 w-72
              bg-[var(--surface)]
              border border-[var(--border)]
              rounded-[var(--radius-lg)] shadow-lg
              overflow-hidden
            "
            role="listbox"
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Your Agencies
              </p>
            </div>

            {/* Agency List */}
            <div className="max-h-64 overflow-y-auto py-1">
              {agencies.length === 0 ? (
                <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No agencies yet</p>
                </div>
              ) : (
                agencies.map((agency) => (
                  <button
                    key={agency.agency_id}
                    onClick={() => handleSelectAgency(agency.agency_id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2
                      hover:bg-gray-50 dark:hover:bg-gray-700
                      transition-colors text-left
                      ${agency.agency_id === currentAgency?.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    `}
                    role="option"
                    aria-selected={agency.agency_id === currentAgency?.id}
                  >
                    {/* Agency Icon */}
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: '#0033A0' }} // Default color, could be stored per agency
                    >
                      {agency.agency_name.charAt(0)}
                    </div>

                    {/* Agency Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {agency.agency_name}
                      </p>
                      <p className={`text-xs flex items-center gap-1 ${getRoleColor(agency.role)}`}>
                        {getRoleIcon(agency.role)}
                        {getRoleLabel(agency.role)}
                        {agency.is_default && (
                          <span className="text-gray-400 dark:text-gray-500 ml-1">
                            (Default)
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Selected Checkmark */}
                    {agency.agency_id === currentAgency?.id && (
                      <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Action Buttons */}
            {(onManageMembers || onCreateAgency) && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700" />

                {/* Manage Members Button (owner/admin only) */}
                {onManageMembers && (currentRole === 'owner' || currentRole === 'admin') && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onManageMembers();
                    }}
                    className="
                      w-full flex items-center gap-2 px-3 py-2
                      text-purple-600 dark:text-purple-400
                      hover:bg-purple-50 dark:hover:bg-purple-900/20
                      transition-colors
                    "
                  >
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">Manage Members</span>
                  </button>
                )}

                {/* Create Agency Button (owner only) */}
                {onCreateAgency && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onCreateAgency();
                    }}
                    className="
                      w-full flex items-center gap-2 px-3 py-2
                      text-blue-600 dark:text-blue-400
                      hover:bg-blue-50 dark:hover:bg-blue-900/20
                      transition-colors
                    "
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Create New Agency</span>
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Mini Variant for Compact Spaces
// ============================================

interface AgencySwitcherMiniProps {
  className?: string;
}

export function AgencySwitcherMini({ className = '' }: AgencySwitcherMiniProps) {
  const { currentAgency, isMultiTenancyEnabled } = useAgency();

  if (!isMultiTenancyEnabled || !currentAgency) {
    return null;
  }

  return (
    <div
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded
        bg-gray-100 dark:bg-gray-700/50
        text-xs text-gray-600 dark:text-gray-300
        ${className}
      `}
    >
      <div
        className="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-bold"
        style={{ backgroundColor: currentAgency.primary_color || '#0033A0' }}
      >
        {currentAgency.name.charAt(0)}
      </div>
      <span className="truncate max-w-[100px]">{currentAgency.name}</span>
    </div>
  );
}

export default AgencySwitcher;
