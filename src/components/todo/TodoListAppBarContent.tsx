'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { LayoutList, LayoutGrid, Search, X } from 'lucide-react';
import { ViewMode } from '@/types/todo';
import { useAppBar } from '@/components/layout/AppBarContext';
import { useTodoStore } from '@/store/todoStore';

interface TodoListAppBarContentProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function TodoListAppBarContent({
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
}: TodoListAppBarContentProps) {
  const { setAppBarContent } = useAppBar();
  const { focusMode } = useTodoStore((state) => state.ui);

  // ── Debounced search input ────────────────────────────────────────────
  // Local state gives instant keystroke feedback.
  // The actual Zustand store update is debounced by 300 ms so filtering
  // doesn't run on every character typed.
  const [localSearchInput, setLocalSearchInput] = useState(searchQuery);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local input when the store query is cleared externally
  useEffect(() => {
    if (searchQuery === '' && localSearchInput !== '') {
      setLocalSearchInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearchQuery(value), 300);
  }, [setSearchQuery]);

  const handleSearchClear = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setLocalSearchInput('');
    setSearchQuery('');
  }, [setSearchQuery]);

  useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  // Inject content into the UnifiedAppBar
  useEffect(() => {
    if (focusMode) {
      setAppBarContent(null);
      return;
    }

    setAppBarContent(
      <>
        {/* View toggle */}
        <div
          role="group"
          aria-label="View mode toggle"
          className={`flex backdrop-blur-sm rounded-[var(--radius-lg)] p-0.5 border flex-shrink-0 ${'bg-[var(--surface-2)] border-[var(--border)]'}`}
        >
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 touch-manipulation ${
              viewMode === 'list'
                ? 'bg-[var(--brand-sky)] text-[var(--brand-navy)] shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)]'}`}
            aria-pressed={viewMode === 'list'}
            aria-label="Switch to list view"
          >
            <LayoutList className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 touch-manipulation ${
              viewMode === 'kanban'
                ? 'bg-[var(--brand-sky)] text-[var(--brand-navy)] shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)]'}`}
            aria-pressed={viewMode === 'kanban'}
            aria-label="Switch to board view"
          >
            <LayoutGrid className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Board</span>
          </button>
        </div>

        {/* Search field */}
        <div className="relative flex items-center flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-light)] pointer-events-none" />
          <input
            type="text"
            value={localSearchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
            data-testid="search-input"
            className={`w-full h-10 pl-10 pr-9 text-sm rounded-lg border transition-colors ${'bg-[var(--surface-2)] border-[var(--border)] text-[var(--foreground)] placeholder-[var(--text-light)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20'} focus:outline-none`}
          />
          {localSearchInput && (
            <button
              onClick={handleSearchClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] touch-manipulation"
              aria-label="Clear search (press Escape)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </>
    );

    return () => {
      setAppBarContent(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, localSearchInput, focusMode]);

  // This component doesn't render anything - it only injects into the app bar
  return null;
}
