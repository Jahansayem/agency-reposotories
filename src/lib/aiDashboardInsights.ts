/**
 * AI Dashboard Insights
 *
 * Provides intelligent insights, neglected task detection, progress tracking,
 * and motivational features for the dashboard.
 */

import { Todo, TodoPriority, ActivityLogEntry } from '@/types/todo';

// ============================================================================
// TYPES
// ============================================================================

export interface NeglectedTask {
  todo: Todo;
  daysSinceActivity: number;
  urgencyLevel: 'critical' | 'warning' | 'notice';
  aiSuggestion: string;
}

export type InsightIconName =
  | 'clock' | 'calendar' | 'trophy' | 'star' | 'trending-up'
  | 'activity' | 'check-circle' | 'sunrise' | 'sun' | 'moon'
  | 'calendar-days' | 'lightbulb' | 'bar-chart' | 'sparkles'
  | 'target' | 'zap';

export interface ProductivityInsight {
  type: 'streak' | 'pattern' | 'milestone' | 'encouragement' | 'tip';
  icon: InsightIconName;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DashboardAIData {
  neglectedTasks: NeglectedTask[];
  insights: ProductivityInsight[];
  currentStreak: number;
  streakMessage: string | null;
  motivationalQuote: string;
  productivityScore: number;
  todaysFocus: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NEGLECTED_THRESHOLDS = {
  critical: 14, // 2+ weeks
  warning: 7,   // 1+ week
  notice: 3,    // 3+ days
};

const PRIORITY_WEIGHT: Record<TodoPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// ============================================================================
// NEGLECTED TASK DETECTION
// ============================================================================

/**
 * Identifies tasks that haven't had any activity in a while
 */
export function getNeglectedTasks(
  todos: Todo[],
  currentUser: string,
  maxResults: number = 5
): NeglectedTask[] {
  const now = new Date();
  const activeTasks = todos.filter(t =>
    !t.completed &&
    t.assigned_to === currentUser
  );

  const neglected: NeglectedTask[] = [];

  for (const todo of activeTasks) {
    // Use updated_at if available, otherwise created_at
    const lastActivity = todo.updated_at
      ? new Date(todo.updated_at)
      : new Date(todo.created_at);

    const daysSince = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince >= NEGLECTED_THRESHOLDS.notice) {
      let urgencyLevel: 'critical' | 'warning' | 'notice';

      if (daysSince >= NEGLECTED_THRESHOLDS.critical) {
        urgencyLevel = 'critical';
      } else if (daysSince >= NEGLECTED_THRESHOLDS.warning) {
        urgencyLevel = 'warning';
      } else {
        urgencyLevel = 'notice';
      }

      // Generate AI suggestion based on task characteristics
      const aiSuggestion = generateTaskSuggestion(todo, daysSince, urgencyLevel);

      neglected.push({
        todo,
        daysSinceActivity: daysSince,
        urgencyLevel,
        aiSuggestion,
      });
    }
  }

  // Sort by urgency (critical first) then by days neglected
  return neglected
    .sort((a, b) => {
      const urgencyOrder = { critical: 0, warning: 1, notice: 2 };
      const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.daysSinceActivity - a.daysSinceActivity;
    })
    .slice(0, maxResults);
}

/**
 * Generates contextual AI suggestion for a neglected task
 */
function generateTaskSuggestion(
  todo: Todo,
  daysSince: number,
  urgency: 'critical' | 'warning' | 'notice'
): string {
  const suggestions: Record<string, string[]> = {
    critical: [
      "This task has been waiting for over 2 weeks. Consider breaking it into smaller steps.",
      "Long-standing task detected. Is this still relevant, or should it be re-prioritized?",
      "This has been on hold for a while. A quick 15-minute session could restart momentum.",
    ],
    warning: [
      "A week without progress—let's tackle this before it piles up.",
      "This task might need a fresh approach. Try looking at it from a different angle.",
      "Consider dedicating focused time to this task today.",
    ],
    notice: [
      "This task could use some attention soon.",
      "A few days since last activity — worth revisiting.",
      "Consider reviewing this task to keep it on track.",
    ],
  };

  // Add priority-specific context
  if (todo.priority === 'urgent' || todo.priority === 'high') {
    if (urgency === 'critical') {
      return "High priority task neglected for 2+ weeks. This needs immediate attention.";
    }
    if (urgency === 'warning') {
      return "This high-priority task deserves your focus today.";
    }
  }

  // Add due date context
  if (todo.due_date) {
    const dueDate = new Date(todo.due_date);
    const now = new Date();
    if (dueDate < now) {
      return "This task is overdue and needs your attention right away.";
    }
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 3) {
      return `Due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}—now's the time to make progress.`;
    }
  }

  const pool = suggestions[urgency];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================================================
// PRODUCTIVITY INSIGHTS
// ============================================================================

/**
 * Generates AI-powered productivity insights based on task data
 */
export function generateProductivityInsights(
  todos: Todo[],
  activityLog: ActivityLogEntry[],
  currentUser: string
): ProductivityInsight[] {
  const insights: ProductivityInsight[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentHour = now.getHours();

  // Filter user's tasks
  const userTasks = todos.filter(t => t.assigned_to === currentUser);
  const activeTasks = userTasks.filter(t => !t.completed);
  const completedTasks = userTasks.filter(t => t.completed);

  // Get recent completions (last 7 days)
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recentCompletions = completedTasks.filter(t => {
    const completedDate = t.updated_at ? new Date(t.updated_at) : null;
    return completedDate && completedDate >= weekAgo;
  });

  // Get today's completions
  const todayCompletions = completedTasks.filter(t => {
    const completedDate = t.updated_at ? new Date(t.updated_at) : null;
    return completedDate && completedDate.toDateString() === today.toDateString();
  });

  // Calculate tasks due soon (next 3 days)
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const dueSoon = activeTasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate >= today && dueDate <= threeDaysFromNow;
  });

  // Calculate overdue tasks
  const overdue = activeTasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    dueDate.setHours(23, 59, 59, 999);
    return dueDate < today;
  });

  // Tasks due today
  const dueToday = activeTasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate.toDateString() === today.toDateString();
  });

  // Priority counts
  const highPriorityActive = activeTasks.filter(
    t => t.priority === 'urgent' || t.priority === 'high'
  ).length;

  // =====================================================================
  // HIGH PRIORITY INSIGHTS - Always check these first
  // =====================================================================

  // 1. Overdue tasks warning (high priority)
  if (overdue.length > 0) {
    insights.push({
      type: 'tip',
      icon: 'clock',
      title: overdue.length === 1 ? '1 Overdue Task' : `${overdue.length} Overdue Tasks`,
      message: overdue.length === 1
        ? `"${overdue[0].text.slice(0, 35)}${overdue[0].text.length > 35 ? '...' : ''}" needs your attention.`
        : `${overdue.length} tasks are past their due date. Consider prioritizing these first.`,
      priority: 'high',
    });
  }

  // 2. Tasks due today
  if (dueToday.length > 0) {
    insights.push({
      type: 'pattern',
      icon: 'calendar',
      title: dueToday.length === 1 ? '1 Task Due Today' : `${dueToday.length} Tasks Due Today`,
      message: dueToday.length === 1
        ? `"${dueToday[0].text.slice(0, 35)}${dueToday[0].text.length > 35 ? '...' : ''}" is due today.`
        : `Focus on completing these to stay on schedule.`,
      priority: 'high',
    });
  }

  // =====================================================================
  // MILESTONE & ACHIEVEMENT INSIGHTS
  // =====================================================================

  // 3. Check for completion milestone
  const totalCompleted = completedTasks.length;
  if (totalCompleted > 0 && totalCompleted % 10 === 0) {
    insights.push({
      type: 'milestone',
      icon: 'trophy',
      title: 'Milestone Reached',
      message: `${totalCompleted} tasks completed total — strong cumulative progress.`,
      priority: 'high',
    });
  }

  // 4. Today's progress
  if (todayCompletions.length >= 3) {
    insights.push({
      type: 'milestone',
      icon: 'star',
      title: 'Strong Day',
      message: `${todayCompletions.length} tasks completed today — above average output.`,
      priority: 'medium',
    });
  }

  // 5. Weekly completion analysis
  if (recentCompletions.length >= 5) {
    insights.push({
      type: 'pattern',
      icon: 'trending-up',
      title: 'High Weekly Output',
      message: `${recentCompletions.length} tasks completed in the past 7 days — strong pace.`,
      priority: 'medium',
    });
  } else if (recentCompletions.length >= 3) {
    insights.push({
      type: 'encouragement',
      icon: 'activity',
      title: 'Steady Progress',
      message: `${recentCompletions.length} tasks completed this week. Maintaining momentum.`,
      priority: 'medium',
    });
  }

  // 6. All tasks complete
  if (activeTasks.length === 0 && completedTasks.length > 0) {
    insights.push({
      type: 'milestone',
      icon: 'check-circle',
      title: 'All Clear',
      message: "All tasks complete. Ready for new assignments.",
      priority: 'high',
    });
  }

  // =====================================================================
  // CONTEXTUAL & TIME-BASED INSIGHTS
  // =====================================================================

  // 7. Morning planning insight (before 10am)
  if (currentHour < 10 && activeTasks.length > 0 && insights.length < 3) {
    const suggestedTask = activeTasks
      .filter(t => t.priority === 'urgent' || t.priority === 'high')
      .sort((a, b) => {
        if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      })[0] || activeTasks[0];

    insights.push({
      type: 'tip',
      icon: 'sunrise',
      title: 'Morning Focus',
      message: `Recommended first task: "${suggestedTask.text.slice(0, 30)}${suggestedTask.text.length > 30 ? '...' : ''}"`,
      priority: 'medium',
    });
  }

  // 8. Afternoon check-in (2-4pm)
  if (currentHour >= 14 && currentHour < 16 && insights.length < 3) {
    if (todayCompletions.length === 0 && activeTasks.length > 0) {
      insights.push({
        type: 'encouragement',
        icon: 'sun',
        title: 'Afternoon Check-in',
        message: "No completions yet today. Consider tackling one task before end of day.",
        priority: 'medium',
      });
    }
  }

  // 9. End of day wrap-up (after 5pm)
  if (currentHour >= 17 && insights.length < 3) {
    if (todayCompletions.length > 0) {
      insights.push({
        type: 'encouragement',
        icon: 'moon',
        title: 'Day Summary',
        message: `${todayCompletions.length} task${todayCompletions.length > 1 ? 's' : ''} completed today.`,
        priority: 'low',
      });
    } else if (activeTasks.length > 0) {
      insights.push({
        type: 'tip',
        icon: 'moon',
        title: 'Plan Ahead',
        message: "Review tomorrow's priorities to start the day with a clear plan.",
        priority: 'low',
      });
    }
  }

  // =====================================================================
  // TASK DISTRIBUTION & BALANCE INSIGHTS
  // =====================================================================

  // 10. Upcoming deadlines (next 3 days)
  if (dueSoon.length > 0 && !dueToday.length && insights.length < 4) {
    insights.push({
      type: 'pattern',
      icon: 'calendar-days',
      title: `${dueSoon.length} Task${dueSoon.length > 1 ? 's' : ''} Due Soon`,
      message: `${dueSoon.length} deadline${dueSoon.length > 1 ? 's' : ''} within the next 3 days.`,
      priority: 'medium',
    });
  }

  // 11. Priority balance check
  if (highPriorityActive > 5) {
    insights.push({
      type: 'tip',
      icon: 'lightbulb',
      title: 'Priority Overload',
      message: `${highPriorityActive} high-priority tasks active. Consider resolving a few before taking on more.`,
      priority: 'medium',
    });
  }

  // 12. Workload summary (always show if nothing else)
  if (insights.length < 2 && activeTasks.length > 0) {
    const urgentCount = activeTasks.filter(t => t.priority === 'urgent').length;
    const highCount = activeTasks.filter(t => t.priority === 'high').length;

    if (urgentCount > 0 || highCount > 0) {
      insights.push({
        type: 'pattern',
        icon: 'bar-chart',
        title: 'Current Workload',
        message: urgentCount > 0
          ? `${urgentCount} urgent and ${highCount} high priority tasks require attention.`
          : `${highCount} high priority task${highCount > 1 ? 's' : ''} in your queue.`,
        priority: 'medium',
      });
    } else {
      insights.push({
        type: 'encouragement',
        icon: 'sparkles',
        title: 'Balanced Workload',
        message: `${activeTasks.length} active task${activeTasks.length > 1 ? 's' : ''} with no urgent items. Good time to work ahead.`,
        priority: 'low',
      });
    }
  }

  // 13. No tasks due today
  if (dueToday.length === 0 && activeTasks.length > 0 && overdue.length === 0 && insights.length < 3) {
    insights.push({
      type: 'tip',
      icon: 'target',
      title: 'Open Schedule',
      message: "No deadlines today. Good opportunity to address lower-priority backlog items.",
      priority: 'low',
    });
  }

  // 14. Quick win suggestion
  if (insights.length < 3 && activeTasks.length > 0) {
    const quickWins = activeTasks.filter(t =>
      t.priority === 'low' || t.priority === 'medium'
    ).filter(t => !t.subtasks || t.subtasks.length === 0);

    if (quickWins.length > 0) {
      insights.push({
        type: 'tip',
        icon: 'zap',
        title: 'Quick Win',
        message: `"${quickWins[0].text.slice(0, 30)}${quickWins[0].text.length > 30 ? '...' : ''}" — low complexity, easy to close out.`,
        priority: 'low',
      });
    }
  }

  // Sort by priority and limit to top 4
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return insights
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 4);
}

// ============================================================================
// STREAK & MOTIVATION
// ============================================================================

/**
 * Calculates completion streak from activity log
 */
export function calculateStreak(
  activityLog: ActivityLogEntry[],
  userName: string
): number {
  const STREAK_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

  const userCompletions = activityLog
    .filter(entry =>
      entry.user_name === userName &&
      (entry.action === 'task_completed' ||
       (entry.action === 'status_changed' && entry.details?.to === 'done'))
    )
    .sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  if (userCompletions.length === 0) return 0;

  let streak = 1;
  let lastTime = new Date(userCompletions[0].created_at).getTime();

  for (let i = 1; i < userCompletions.length; i++) {
    const completionTime = new Date(userCompletions[i].created_at).getTime();
    if (lastTime - completionTime <= STREAK_WINDOW_MS) {
      streak++;
      lastTime = completionTime;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Gets streak message with emoji
 */
export function getStreakMessage(streak: number): string | null {
  if (streak >= 10) return `${streak}-task streak — exceptional focus session`;
  if (streak >= 7) return `${streak} tasks in a row — strong momentum`;
  if (streak >= 5) return `${streak}-task streak — solid productivity`;
  if (streak >= 3) return `${streak} tasks completed consecutively`;
  return null;
}

/**
 * Collection of motivational quotes for the dashboard
 */
const MOTIVATIONAL_QUOTES = [
  "Small progress is still progress. Keep going!",
  "You're one task closer to your goals.",
  "Focus on progress, not perfection.",
  "Every completed task is a step forward.",
  "The best way to get something done is to begin.",
  "Your future self will thank you for this.",
  "Productivity is never an accident.",
  "One task at a time, one day at a time.",
  "Done is better than perfect.",
  "You've got this!",
  "Make it happen. Shock everyone.",
  "The only way to do great work is to love what you do.",
  "Success is the sum of small efforts repeated daily.",
  "Start where you are. Use what you have. Do what you can.",
  "The secret of getting ahead is getting started.",
];

/**
 * Gets a motivational quote (changes daily)
 */
export function getMotivationalQuote(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime())
    / (1000 * 60 * 60 * 24)
  );
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}

// ============================================================================
// PRODUCTIVITY SCORE
// ============================================================================

/**
 * Calculates a productivity score (0-100) based on recent activity
 */
export function calculateProductivityScore(
  todos: Todo[],
  activityLog: ActivityLogEntry[],
  currentUser: string
): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const userTasks = todos.filter(t => t.assigned_to === currentUser);
  const activeTasks = userTasks.filter(t => !t.completed);
  const completedTasks = userTasks.filter(t => t.completed);

  // Recent completions
  const recentCompletions = completedTasks.filter(t => {
    const completedDate = t.updated_at ? new Date(t.updated_at) : null;
    return completedDate && completedDate >= weekAgo;
  });

  // Overdue count
  const overdue = activeTasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    dueDate.setHours(23, 59, 59, 999);
    return dueDate < today;
  });

  // Calculate score components
  let score = 50; // Base score

  // Add points for completions (up to +30)
  score += Math.min(recentCompletions.length * 5, 30);

  // Subtract points for overdue (up to -20)
  score -= Math.min(overdue.length * 4, 20);

  // Add points for low task backlog (up to +10)
  if (activeTasks.length <= 5) score += 10;
  else if (activeTasks.length <= 10) score += 5;

  // Add points for completing high-priority tasks
  const highPriorityCompleted = recentCompletions.filter(
    t => t.priority === 'urgent' || t.priority === 'high'
  ).length;
  score += Math.min(highPriorityCompleted * 3, 10);

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// TODAY'S FOCUS SUGGESTION
// ============================================================================

/**
 * Suggests what to focus on today based on task analysis
 */
export function getTodaysFocus(
  todos: Todo[],
  currentUser: string
): string | null {
  const userTasks = todos.filter(t =>
    !t.completed &&
    t.assigned_to === currentUser
  );

  if (userTasks.length === 0) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Check for urgent overdue
  const overdueUrgent = userTasks.find(t => {
    if (!t.due_date || t.priority !== 'urgent') return false;
    const dueDate = new Date(t.due_date);
    return dueDate < today;
  });

  if (overdueUrgent) {
    return `Focus: Complete "${overdueUrgent.text.slice(0, 40)}${overdueUrgent.text.length > 40 ? '...' : ''}" (urgent & overdue)`;
  }

  // Check for due today
  const dueToday = userTasks.find(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate.toDateString() === today.toDateString();
  });

  if (dueToday) {
    return `Today's target: "${dueToday.text.slice(0, 40)}${dueToday.text.length > 40 ? '...' : ''}"`;
  }

  // Suggest highest priority task
  const highestPriority = userTasks
    .sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority])[0];

  if (highestPriority && (highestPriority.priority === 'urgent' || highestPriority.priority === 'high')) {
    return `Suggested focus: "${highestPriority.text.slice(0, 40)}${highestPriority.text.length > 40 ? '...' : ''}"`;
  }

  return null;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generates all AI dashboard data in one call
 */
export function generateDashboardAIData(
  todos: Todo[],
  activityLog: ActivityLogEntry[],
  currentUser: string
): DashboardAIData {
  const currentStreak = calculateStreak(activityLog, currentUser);

  return {
    neglectedTasks: getNeglectedTasks(todos, currentUser),
    insights: generateProductivityInsights(todos, activityLog, currentUser),
    currentStreak,
    streakMessage: getStreakMessage(currentStreak),
    motivationalQuote: getMotivationalQuote(),
    productivityScore: calculateProductivityScore(todos, activityLog, currentUser),
    todaysFocus: getTodaysFocus(todos, currentUser),
  };
}
