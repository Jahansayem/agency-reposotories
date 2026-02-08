'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, Check, Plus, Briefcase, Crown, User, Users, AlertTriangle } from 'lucide-react';
import { useAgency } from '@/contexts/AgencyContext';
import { useTodoStore } from '@/store/todoStore';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
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
    case 'manager':
      return <Briefcase className="w-3 h-3" />;
    default:
      return <User className="w-3 h-3" />;
  }
};

const getRoleLabel = (role: AgencyRole) => {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'manager':
      return 'Manager';
    default:
      return 'Staff';
  }
};

const getRoleColor = (role: AgencyRole) => {
  switch (role) {
    case 'owner':
      return 'text-[var(--warning)]';
    case 'manager':
      return 'text-[var(--accent)]';
    default:
      return 'text-[var(--text-muted)]';
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
    isSwitchingAgency,
    switchAgency,
  } = useAgency();

  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAgencyId, setPendingAgencyId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get bulk selection state to detect unsaved changes
  const selectedTodos = useTodoStore((state) => state.bulkActions.selectedTodos);

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

  /**
   * Check if there are unsaved changes that would be lost
   */
  const hasUnsavedChanges = (): { hasChanges: boolean; details: string[] } => {
    const details: string[] = [];

    // Check for bulk selections
    if (selectedTodos.size > 0) {
      details.push(`${selectedTodos.size} task${selectedTodos.size > 1 ? 's' : ''} selected for bulk actions`);
    }

    return {
      hasChanges: details.length > 0,
      details,
    };
  };

  const handleSelectAgency = async (agencyId: string) => {
    // Skip if selecting the same agency
    if (agencyId === currentAgency?.id) {
      setIsOpen(false);
      return;
    }

    // Check for unsaved changes
    const { hasChanges } = hasUnsavedChanges();

    if (hasChanges) {
      // Show confirmation dialog
      setPendingAgencyId(agencyId);
      setShowConfirmation(true);
      setIsOpen(false);
    } else {
      // No unsaved changes, switch immediately
      await switchAgency(agencyId);
      setIsOpen(false);
    }
  };

  const handleConfirmSwitch = async () => {
    if (pendingAgencyId) {
      await switchAgency(pendingAgencyId);
      setShowConfirmation(false);
      setPendingAgencyId(null);
    }
  };

  const handleCancelSwitch = () => {
    setShowConfirmation(false);
    setPendingAgencyId(null);
  };

  // Get agency name for confirmation dialog
  const pendingAgency = agencies.find(a => a.agency_id === pendingAgencyId);
  const { details: changeDetails } = hasUnsavedChanges();

  return (
    <>
      <div ref={dropdownRef} className={`relative ${className}`}>
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading || isSwitchingAgency}
          className={`
            flex items-center gap-2 rounded-[var(--radius-lg)]
            bg-[var(--surface)]
            border border-[var(--border)]
            hover:bg-[var(--surface-2)]
            transition-colors
            ${sizeClasses[size]}
            ${isLoading || isSwitchingAgency ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {/* Agency Icon or Loading Spinner */}
          {isSwitchingAgency ? (
            <div className="w-6 h-6 rounded flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: currentAgency?.primary_color || '#0033A0' }}
            >
              {currentAgency?.name?.charAt(0) || <Building2 className="w-4 h-4" />}
            </div>
          )}

          {/* Agency Name */}
          <span className="font-medium text-[var(--foreground)] truncate max-w-[150px]">
            {isSwitchingAgency ? 'Switching...' : (isLoading ? 'Loading...' : (currentAgency?.name || 'Select Agency'))}
          </span>

          {/* Role Badge */}
          {showRole && currentRole && !isSwitchingAgency && (
            <span className={`flex items-center gap-1 ${getRoleColor(currentRole)}`}>
              {getRoleIcon(currentRole)}
            </span>
          )}

          {/* Dropdown Arrow */}
          <ChevronDown
            className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Your Agencies
                </p>
              </div>

              {/* Agency List */}
              <div className="max-h-64 overflow-y-auto py-1">
                {agencies.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[var(--text-muted)]">
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
                        hover:bg-[var(--surface-2)]
                        transition-colors text-left
                        ${agency.agency_id === currentAgency?.id ? 'bg-[var(--accent)]/10' : ''}
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
                        <p className="font-medium text-[var(--foreground)] truncate">
                          {agency.agency_name}
                        </p>
                        <p className={`text-xs flex items-center gap-1 ${getRoleColor(agency.role)}`}>
                          {getRoleIcon(agency.role)}
                          {getRoleLabel(agency.role)}
                          {agency.is_default && (
                            <span className="text-[var(--text-muted)] ml-1">
                              (Default)
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Selected Checkmark */}
                      {agency.agency_id === currentAgency?.id && (
                        <Check className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              {(onManageMembers || onCreateAgency) && (
                <>
                  <div className="border-t border-[var(--border)]" />

                  {/* Manage Members Button (owner/manager only) */}
                  {onManageMembers && (currentRole === 'owner' || currentRole === 'manager') && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onManageMembers();
                      }}
                      className="
                        w-full flex items-center gap-2 px-3 py-2
                        text-[var(--accent)]
                        hover:bg-[var(--accent)]/10
                        transition-colors
                      "
                    >
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">Manage Members</span>
                    </button>
                  )}

                  {/* Create Agency Button (owner only) */}
                  {onCreateAgency && currentRole === 'owner' && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onCreateAgency();
                      }}
                      className="
                        w-full flex items-center gap-2 px-3 py-2
                        text-[var(--accent)]
                        hover:bg-[var(--accent)]/10
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

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmation}
        onClose={handleCancelSwitch}
        size="md"
        title="Unsaved Changes"
        closeOnBackdropClick={false}
      >
        <ModalHeader>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-[var(--warning)]/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[var(--warning)]" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Unsaved Changes
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                You have unsaved changes that will be lost if you switch agencies.
              </p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-3">
            <p className="text-sm text-[var(--foreground)] font-medium">
              The following will be lost:
            </p>
            <ul className="space-y-2">
              {changeDetails.map((detail, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                  <span className="text-[var(--warning)] mt-0.5">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-[var(--text-muted)] mt-4">
              Are you sure you want to switch to <span className="font-semibold text-[var(--foreground)]">{pendingAgency?.agency_name}</span>?
            </p>
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            onClick={handleCancelSwitch}
            className="
              flex-1 sm:flex-initial
              px-4 py-2 rounded-[var(--radius-lg)]
              bg-[var(--surface-2)]
              text-[var(--foreground)]
              hover:bg-[var(--surface)]
              transition-colors
              font-medium
              min-h-[44px]
            "
            autoFocus
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSwitch}
            className="
              flex-1 sm:flex-initial
              px-4 py-2 rounded-[var(--radius-lg)]
              bg-[var(--accent)] hover:bg-[var(--accent)]/90
              text-white
              transition-colors
              font-medium
              min-h-[44px]
            "
          >
            Switch Anyway
          </button>
        </ModalFooter>
      </Modal>
    </>
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
        bg-[var(--surface-2)]
        text-xs text-[var(--text-muted)]
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
