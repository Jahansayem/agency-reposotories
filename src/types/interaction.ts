/**
 * Customer Interaction Types
 *
 * Types for the customer_interactions table and related API responses.
 * Used by the customer history timeline feature.
 */

export type InteractionType =
  | 'task_completed'
  | 'subtask_completed'
  | 'contact_attempt'
  | 'task_created'
  | 'note_added';

export interface CustomerInteraction {
  id: string;
  customerId: string;
  agencyId: string;
  interactionType: InteractionType;
  summary: string;
  details: Record<string, any> | null;
  taskId?: string;
  createdBy: string | null;
  createdByName?: string;
  createdAt: string;
}

export interface CustomerInteractionWithTask extends CustomerInteraction {
  relatedTask?: {
    id: string;
    text: string;
    completed: boolean;
  };
}
