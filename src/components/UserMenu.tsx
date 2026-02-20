'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Sun,
  Moon,
  Focus,
  Keyboard,
  LogOut,
  ChevronDown,
  Check
} from 'lucide-react';
import { AuthUser } from '@/types/todo';
import { useTheme } from '@/contexts/ThemeContext';
import { zClass } from '@/lib/z-index';
import { useTodoStore } from '@/store/todoStore';

interface UserMenuProps {
  currentUser: AuthUser;
  onUserChange: (user: AuthUser | null) => void;
  onShowKeyboardShortcuts?: () => void;
}

export function UserMenu({
  currentUser,
  onUserChange,
  onShowKeyboardShortcuts
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();
  const focusMode = useTodoStore((state) => state.ui.focusMode);
  const setFocusMode = useTodoStore((state) => state.setFocusMode);

  const closeAndRestoreFocus = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Arrow-key navigation for menu items
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    const menu = menuRef.current;
    if (!menu) return;

    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    if (items.length === 0) return;

    const currentIndex = items.findIndex(item => item === document.activeElement);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next].focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev].focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        items[0].focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        items[items.length - 1].focus();
        break;
      }
      case 'Escape': {
        e.preventDefault();
        closeAndRestoreFocus();
        break;
      }
      case 'Enter':
      case ' ': {
        // Let the browser's default click behavior handle activation
        // for the currently focused menuitem
        if (document.activeElement && items.includes(document.activeElement as HTMLElement)) {
          e.preventDefault();
          (document.activeElement as HTMLElement).click();
        }
        break;
      }
    }
  }, [closeAndRestoreFocus]);

  // Focus first menu item when dropdown opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        const menu = menuRef.current;
        if (!menu) return;
        const firstItem = menu.querySelector<HTMLElement>('[role="menuitem"]');
        firstItem?.focus();
      });
    }
  }, [isOpen]);

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const handleToggleFocusMode = () => {
    setFocusMode(!focusMode);
    setIsOpen(false);
  };

  const handleKeyboardShortcuts = () => {
    onShowKeyboardShortcuts?.();
    setIsOpen(false);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    // Clear session storage and service worker caches
    const { clearStoredSession } = await import('@/lib/auth');
    await clearStoredSession();
    onUserChange(null); // Logout by setting user to null
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 p-2 rounded-lg
          text-[var(--text-muted)] hover:text-[var(--foreground)]
          hover:bg-[var(--surface-2)]
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2
        "
        aria-label="User menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {/* User Avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: currentUser.color }}
        >
          {currentUser.name.charAt(0).toUpperCase()}
        </div>

        {/* User Name (hidden on mobile) */}
        <span className="hidden sm:inline text-sm font-medium">
          {currentUser.name}
        </span>

        {/* Dropdown Arrow */}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
            className={`
              absolute right-0 mt-2 w-64
              bg-[var(--surface)]
              border border-[var(--border)]
              rounded-lg shadow-lg
              overflow-hidden
              ${zClass.dropdown}
            `}
            role="menu"
            onKeyDown={handleMenuKeyDown}
          >
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-2)]">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: currentUser.color }}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    Signed in
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* Theme Toggle */}
              <button
                onClick={handleToggleTheme}
                className="
                  w-full flex items-center justify-between px-4 py-2.5
                  text-left text-sm
                  text-[var(--foreground)]
                  hover:bg-[var(--surface-2)]
                  transition-colors
                "
                role="menuitem"
              >
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                  <span>Dark Mode</span>
                </div>
                {theme === 'dark' && (
                  <Check className="w-4 h-4 text-[var(--accent)]" />
                )}
              </button>

              {/* Focus Mode Toggle */}
              <button
                onClick={handleToggleFocusMode}
                className="
                  w-full flex items-center justify-between px-4 py-2.5
                  text-left text-sm
                  text-[var(--foreground)]
                  hover:bg-[var(--surface-2)]
                  transition-colors
                "
                role="menuitem"
              >
                <div className="flex items-center gap-3">
                  <Focus className="w-4 h-4" />
                  <span>Focus Mode</span>
                </div>
                {focusMode && (
                  <Check className="w-4 h-4 text-[var(--accent)]" />
                )}
              </button>

              {/* Keyboard Shortcuts */}
              {onShowKeyboardShortcuts && (
                <button
                  onClick={handleKeyboardShortcuts}
                  className="
                    w-full flex items-center gap-3 px-4 py-2.5
                    text-left text-sm
                    text-[var(--foreground)]
                    hover:bg-[var(--surface-2)]
                    transition-colors
                  "
                  role="menuitem"
                >
                  <Keyboard className="w-4 h-4" />
                  <span>Keyboard Shortcuts</span>
                  <span className="ml-auto text-xs text-[var(--text-muted)]">
                    ?
                  </span>
                </button>
              )}
            </div>

            {/* Logout */}
            <div className="border-t border-[var(--border-subtle)]">
              <button
                onClick={handleLogout}
                className="
                  w-full flex items-center gap-3 px-4 py-2.5
                  text-left text-sm
                  text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-900/20
                  transition-colors
                "
                role="menuitem"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
