import { faker } from '@faker-js/faker';
import { ChatMessage, TapbackType, MessageReaction } from '@/types/todo';

/**
 * Create a mock chat message
 */
export function createMockMessage(overrides?: Partial<ChatMessage>): ChatMessage {
  return {
    id: faker.string.uuid(),
    text: faker.lorem.sentence(),
    created_by: faker.person.firstName(),
    created_at: faker.date.recent().toISOString(),
    related_todo_id: undefined,
    recipient: null,
    reactions: [],
    read_by: [],
    reply_to_id: null,
    reply_to_text: null,
    reply_to_user: null,
    edited_at: null,
    deleted_at: null,
    is_pinned: false,
    pinned_by: null,
    pinned_at: null,
    mentions: [],
    ...overrides,
  };
}

/**
 * Create a mock message reaction
 */
export function createMockReaction(overrides?: Partial<MessageReaction>): MessageReaction {
  const reactions: TapbackType[] = ['heart', 'thumbsup', 'thumbsdown', 'haha', 'exclamation', 'question'];

  return {
    user: faker.person.firstName(),
    reaction: faker.helpers.arrayElement(reactions),
    created_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/**
 * Create a message with reactions
 */
export function createMockMessageWithReactions(
  reactionCount: number = 3,
  overrides?: Partial<ChatMessage>
): ChatMessage {
  return createMockMessage({
    reactions: Array.from({ length: reactionCount }, () => createMockReaction()),
    ...overrides,
  });
}

/**
 * Create a DM message
 */
export function createMockDM(
  sender: string,
  recipient: string,
  overrides?: Partial<ChatMessage>
): ChatMessage {
  return createMockMessage({
    created_by: sender,
    recipient,
    ...overrides,
  });
}

/**
 * Create a thread (reply message)
 */
export function createMockReply(
  parentMessage: ChatMessage,
  overrides?: Partial<ChatMessage>
): ChatMessage {
  return createMockMessage({
    reply_to_id: parentMessage.id,
    reply_to_text: parentMessage.text,
    reply_to_user: parentMessage.created_by,
    ...overrides,
  });
}
