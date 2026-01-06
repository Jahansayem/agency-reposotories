'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Dashboard from './Dashboard';
import TodoList from './TodoList';
import { AuthUser, Todo, QuickFilter } from '@/types/todo';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type AppView = 'dashboard' | 'tasks';

interface MainAppProps {
  currentUser: AuthUser;
  onUserChange: (user: AuthUser | null) => void;
}

export default function MainApp({ currentUser, onUserChange }: MainAppProps) {
  const [view, setView] = useState<AppView>('dashboard');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialFilter, setInitialFilter] = useState<QuickFilter | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  // Fetch todos for dashboard stats
  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const [todosResult, usersResult] = await Promise.all([
          supabase
            .from('todos')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('users')
            .select('name')
        ]);

        if (todosResult.data) {
          setTodos(todosResult.data);
        }
        if (usersResult.data) {
          setUsers(usersResult.data.map(u => u.name));
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription for todos
    const channel = supabase
      .channel('dashboard-todos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTodos(prev => [payload.new as Todo, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTodos(prev => prev.map(t => t.id === payload.new.id ? payload.new as Todo : t));
        } else if (payload.eventType === 'DELETE') {
          setTodos(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleNavigateToTasks = useCallback((filter?: QuickFilter) => {
    if (filter) {
      setInitialFilter(filter);
    }
    setView('tasks');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setInitialFilter(null);
    setView('dashboard');
  }, []);

  const handleAddTask = useCallback(() => {
    setShowAddTask(true);
    setView('tasks');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {view === 'dashboard' ? (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Dashboard
            todos={todos}
            currentUser={currentUser}
            users={users}
            onNavigateToTasks={() => handleNavigateToTasks()}
            onAddTask={handleAddTask}
            onFilterOverdue={() => handleNavigateToTasks('overdue')}
            onFilterDueToday={() => handleNavigateToTasks('due_today')}
            onFilterMyTasks={() => handleNavigateToTasks('my_tasks')}
          />
        </motion.div>
      ) : (
        <motion.div
          key="tasks"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <TodoList
            currentUser={currentUser}
            onUserChange={onUserChange}
            onBackToDashboard={handleBackToDashboard}
            initialFilter={initialFilter}
            autoFocusAddTask={showAddTask}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
