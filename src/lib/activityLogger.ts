import { ActivityAction } from '@/types/todo';
import { logger } from '@/lib/logger';
import { fetchWithCsrf } from '@/lib/csrf';

interface LogActivityParams {
  action: ActivityAction;
  userName: string;
  userRole?: string;
  isPrivate?: boolean;
  todoId?: string;
  todoText?: string;
  details?: Record<string, unknown>;
}

export async function logActivity({ action, userName, userRole, isPrivate, todoId, todoText, details }: LogActivityParams): Promise<void> {
  // Skip logging for personal role users - their activities are private
  if (userRole === 'personal') return;

  // Skip logging for private tasks - they shouldn't appear in Activity Feed
  if (isPrivate) return;

  try {
    await fetchWithCsrf('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        user_name: userName,
        todo_id: todoId,
        todo_text: todoText,
        details: details || {},
      }),
    });
  } catch (error) {
    // Silently fail - activity logging shouldn't break the app
    logger.error('Failed to log activity', error, { component: 'ActivityLogger' });
  }
}
