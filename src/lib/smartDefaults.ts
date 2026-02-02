import { Todo, TodoPriority } from '@/types/todo';
import { supabase } from './supabaseClient';

interface UserPattern {
  mostFrequentAssignee: string | null;
  averagePriority: TodoPriority;
  preferredDueDate: number | null; // days from now
  confidence: number;
}

interface SmartDefaults {
  assignedTo: string | null;
  priority: TodoPriority;
  dueDate: string | null; // ISO date string
  confidence: number;
  metadata: {
    basedOnTasks: number;
    lookbackDays: number;
    patterns: {
      assigneeFrequency: Record<string, number>;
      priorityDistribution: Record<string, number>;
      avgDueDateDays: number | null;
    };
  };
}

/**
 * Analyze user's task creation patterns over the last 30 days
 */
export async function analyzeUserPatterns(userName: string): Promise<UserPattern> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch user's recent tasks
  const { data: recentTasks, error } = await supabase
    .from('todos')
    .select('assigned_to, priority, due_date, created_at')
    .eq('created_by', userName)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !recentTasks || recentTasks.length === 0) {
    return {
      mostFrequentAssignee: null,
      averagePriority: 'medium',
      preferredDueDate: null,
      confidence: 0,
    };
  }

  // Analyze assignee patterns
  const assigneeFrequency: Record<string, number> = {};
  recentTasks.forEach(task => {
    if (task.assigned_to) {
      assigneeFrequency[task.assigned_to] = (assigneeFrequency[task.assigned_to] || 0) + 1;
    }
  });

  const mostFrequentAssignee = Object.keys(assigneeFrequency).length > 0
    ? Object.entries(assigneeFrequency).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // Analyze priority patterns
  const priorityFrequency: Record<string, number> = {};
  recentTasks.forEach(task => {
    priorityFrequency[task.priority] = (priorityFrequency[task.priority] || 0) + 1;
  });

  const averagePriority = (Object.entries(priorityFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || 'medium') as TodoPriority;

  // Analyze due date patterns (average days from creation to due date)
  const dueDates = recentTasks
    .filter(task => task.due_date)
    .map(task => {
      const created = new Date(task.created_at);
      const due = new Date(task.due_date!);
      return Math.ceil((due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    })
    .filter(days => days >= 0 && days <= 365); // Filter outliers

  const preferredDueDate = dueDates.length > 0
    ? Math.round(dueDates.reduce((sum, days) => sum + days, 0) / dueDates.length)
    : null;

  // Calculate confidence score (0-1)
  const confidence = Math.min(1, recentTasks.length / 20); // Full confidence at 20+ tasks

  return {
    mostFrequentAssignee,
    averagePriority,
    preferredDueDate,
    confidence,
  };
}

/**
 * Generate smart default suggestions for a user
 */
export async function generateSmartDefaults(userName: string): Promise<SmartDefaults> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch user's recent tasks for analysis
  const { data: recentTasks, error } = await supabase
    .from('todos')
    .select('assigned_to, priority, due_date, created_at')
    .eq('created_by', userName)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !recentTasks || recentTasks.length === 0) {
    // No data - return neutral defaults
    return {
      assignedTo: null,
      priority: 'medium',
      dueDate: null,
      confidence: 0,
      metadata: {
        basedOnTasks: 0,
        lookbackDays: 30,
        patterns: {
          assigneeFrequency: {},
          priorityDistribution: {},
          avgDueDateDays: null,
        },
      },
    };
  }

  // Analyze patterns
  const assigneeFrequency: Record<string, number> = {};
  const priorityDistribution: Record<string, number> = {};
  const dueDateDays: number[] = [];

  recentTasks.forEach(task => {
    // Count assignee frequency
    if (task.assigned_to) {
      assigneeFrequency[task.assigned_to] = (assigneeFrequency[task.assigned_to] || 0) + 1;
    }

    // Count priority distribution
    priorityDistribution[task.priority] = (priorityDistribution[task.priority] || 0) + 1;

    // Calculate days until due date
    if (task.due_date) {
      const created = new Date(task.created_at);
      const due = new Date(task.due_date);
      const days = Math.ceil((due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 365) {
        dueDateDays.push(days);
      }
    }
  });

  // Determine most frequent assignee
  const assignedTo = Object.keys(assigneeFrequency).length > 0
    ? Object.entries(assigneeFrequency).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // Determine most common priority
  const priority = (Object.entries(priorityDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'medium') as TodoPriority;

  // Calculate average due date offset
  const avgDueDateDays = dueDateDays.length > 0
    ? Math.round(dueDateDays.reduce((sum, days) => sum + days, 0) / dueDateDays.length)
    : null;

  // Generate suggested due date (if pattern exists)
  let dueDate: string | null = null;
  if (avgDueDateDays !== null) {
    const suggestedDate = new Date();
    suggestedDate.setDate(suggestedDate.getDate() + avgDueDateDays);
    dueDate = suggestedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  // Calculate confidence (0-1 scale)
  // Based on:
  // - Number of tasks (more data = higher confidence)
  // - Consistency of patterns (more variance = lower confidence)
  const taskCountFactor = Math.min(1, recentTasks.length / 20);

  const assigneeConsistency = assignedTo
    ? assigneeFrequency[assignedTo] / recentTasks.length
    : 0;

  const priorityConsistency = priorityDistribution[priority] / recentTasks.length;

  const confidence = taskCountFactor * ((assigneeConsistency + priorityConsistency) / 2);

  return {
    assignedTo,
    priority,
    dueDate,
    confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
    metadata: {
      basedOnTasks: recentTasks.length,
      lookbackDays: 30,
      patterns: {
        assigneeFrequency,
        priorityDistribution,
        avgDueDateDays,
      },
    },
  };
}
