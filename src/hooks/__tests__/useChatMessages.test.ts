import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatMessages } from '../useChatMessages';
import { supabase } from '@/lib/supabaseClient';
import type { AuthUser, ChatMessage, ChatConversation } from '@/types/todo';

// Mock dependencies
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('@/contexts/AgencyContext', () => ({
  useAgency: vi.fn(() => ({
    currentAgencyId: 'test-agency-id',
    isMultiTenancyEnabled: false,
    isLoading: false,
  })),
}));

const mockUser: AuthUser = {
  id: 'user-1',
  name: 'Derrick',
  pin_hash: 'hash',
  color: '#0033A0',
  created_at: '2026-01-01T00:00:00Z',
};

const mockTeamConversation: ChatConversation = {
  type: 'team',
  userName: 'Team Chat',
  userColor: '#0033A0',
  unreadCount: 0,
};

const mockDMConversation: ChatConversation = {
  type: 'dm',
  userName: 'Sefra',
  userColor: '#72B5E8',
  unreadCount: 0,
};

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    text: 'Hello team!',
    created_by: 'Derrick',
    created_at: '2026-02-06T10:00:00Z',
    recipient: null,
    reactions: [],
    read_by: ['Derrick'],
  },
  {
    id: 'msg-2',
    text: 'Hi Derrick',
    created_by: 'Sefra',
    created_at: '2026-02-06T10:05:00Z',
    recipient: 'Derrick',
    reactions: [],
    read_by: [],
  },
  {
    id: 'msg-3',
    text: 'Pinned message',
    created_by: 'Derrick',
    created_at: '2026-02-06T10:10:00Z',
    recipient: null,
    is_pinned: true,
    pinned_by: 'Derrick',
    pinned_at: '2026-02-06T10:10:05Z',
    reactions: [],
    read_by: [],
  },
];

describe('useChatMessages', () => {
  let selectMock: any;
  let updateMock: any;
  let eqMock: any;

  beforeEach(() => {
    // Mock Supabase query chain
    eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    updateMock = {
      update: vi.fn().mockReturnThis(),
      eq: eqMock,
    };
    selectMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    (supabase.from as any).mockReturnValue({
      ...selectMock,
      ...updateMock,
    });

    (supabase.rpc as any).mockResolvedValue({ data: null, error: null });

    vi.clearAllMocks();
  });

  describe('fetchMessages', () => {
    it('should fetch team chat messages', async () => {
      selectMock.limit.mockResolvedValue({
        data: [mockMessages[0], mockMessages[2]],
        error: null,
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      expect(selectMock.is).toHaveBeenCalledWith('recipient', null);
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.loading).toBe(false);
    });

    it('should fetch DM messages', async () => {
      selectMock.limit.mockResolvedValue({
        data: [mockMessages[1]],
        error: null,
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockDMConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      expect(selectMock.or).toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(1);
    });

    it('should not fetch if no conversation', async () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: null,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      selectMock.limit.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.messages).toHaveLength(0);
    });

    it('should set hasMoreMessages if full page returned', async () => {
      const fullPage = new Array(50).fill(mockMessages[0]);
      selectMock.limit.mockResolvedValue({
        data: fullPage,
        error: null,
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      expect(result.current.hasMoreMessages).toBe(true);
    });
  });

  describe('loadMoreMessages', () => {
    beforeEach(async () => {
      selectMock.limit.mockResolvedValue({
        data: [mockMessages[0]],
        error: null,
      });
    });

    it('should load older messages', async () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      // Fetch initial messages
      await act(async () => {
        await result.current.fetchMessages();
      });

      // Mock loading more
      selectMock.limit.mockResolvedValue({
        data: [mockMessages[2]],
        error: null,
      });

      await act(async () => {
        await result.current.loadMoreMessages();
      });

      expect(selectMock.lt).toHaveBeenCalledWith(
        'created_at',
        mockMessages[0].created_at
      );
      expect(result.current.messages).toHaveLength(2);
    });

    it('should not load if already loading', async () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      // Set loading state
      act(() => {
        result.current.messages; // Access to trigger render
      });

      const callCount = selectMock.lt.mock.calls.length;

      await act(async () => {
        await result.current.loadMoreMessages();
        await result.current.loadMoreMessages(); // Try loading again
      });

      // Should only call once (second call blocked)
      expect(selectMock.lt.mock.calls.length).toBeLessThanOrEqual(callCount + 1);
    });
  });

  describe('filtered and grouped messages', () => {
    beforeEach(async () => {
      selectMock.limit.mockResolvedValue({
        data: mockMessages,
        error: null,
      });
    });

    it('should filter team messages', async () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      // Should only show messages with no recipient
      expect(result.current.filteredMessages).toHaveLength(2);
      expect(result.current.filteredMessages.every(m => !m.recipient)).toBe(true);
    });

    it('should filter DM messages', async () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockDMConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      // Should only show messages between Derrick and Sefra
      expect(result.current.filteredMessages).toHaveLength(1);
      expect(result.current.filteredMessages[0].id).toBe('msg-2');
    });

    it('should filter by search query', async () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: 'pinned',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      expect(result.current.filteredMessages).toHaveLength(1);
      expect(result.current.filteredMessages[0].text).toContain('Pinned');
    });

    it('should exclude deleted messages', async () => {
      const messagesWithDeleted = [
        ...mockMessages,
        {
          ...mockMessages[0],
          id: 'deleted-msg',
          deleted_at: '2026-02-06T11:00:00Z',
        },
      ];

      selectMock.limit.mockResolvedValue({
        data: messagesWithDeleted,
        error: null,
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      expect(result.current.filteredMessages.every(m => !m.deleted_at)).toBe(true);
    });

    it('should group consecutive messages from same sender', async () => {
      const consecutiveMessages: ChatMessage[] = [
        {
          ...mockMessages[0],
          id: 'msg-a',
          created_at: '2026-02-06T10:00:00Z',
        },
        {
          ...mockMessages[0],
          id: 'msg-b',
          created_at: '2026-02-06T10:00:30Z',
        },
      ];

      selectMock.limit.mockResolvedValue({
        data: consecutiveMessages,
        error: null,
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      expect(result.current.groupedMessages[0].isGrouped).toBe(false);
      expect(result.current.groupedMessages[1].isGrouped).toBe(true);
    });

    it('should identify pinned messages', async () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      expect(result.current.pinnedMessages).toHaveLength(1);
      expect(result.current.pinnedMessages[0].id).toBe('msg-3');
    });
  });

  describe('real-time handlers', () => {
    it('should handle new message', () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      const newMessage: ChatMessage = {
        id: 'new-msg',
        text: 'New message',
        created_by: 'Sefra',
        created_at: '2026-02-06T11:00:00Z',
        recipient: null,
        reactions: [],
        read_by: [],
      };

      act(() => {
        result.current.handleNewMessage(newMessage);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].id).toBe('new-msg');
    });

    it('should not duplicate messages', () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      const message: ChatMessage = {
        id: 'msg-1',
        text: 'Message',
        created_by: 'Derrick',
        created_at: '2026-02-06T10:00:00Z',
        recipient: null,
        reactions: [],
        read_by: [],
      };

      act(() => {
        result.current.handleNewMessage(message);
        result.current.handleNewMessage(message); // Try adding twice
      });

      expect(result.current.messages).toHaveLength(1);
    });

    it('should handle message update', () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      const message: ChatMessage = {
        id: 'msg-1',
        text: 'Original',
        created_by: 'Derrick',
        created_at: '2026-02-06T10:00:00Z',
        recipient: null,
        reactions: [],
        read_by: [],
      };

      act(() => {
        result.current.handleNewMessage(message);
      });

      const updatedMessage = {
        ...message,
        text: 'Updated',
        edited_at: '2026-02-06T10:05:00Z',
      };

      act(() => {
        result.current.handleMessageUpdate(updatedMessage);
      });

      expect(result.current.messages[0].text).toBe('Updated');
    });

    it('should handle message delete', () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      const message: ChatMessage = {
        id: 'msg-1',
        text: 'To delete',
        created_by: 'Derrick',
        created_at: '2026-02-06T10:00:00Z',
        recipient: null,
        reactions: [],
        read_by: [],
      };

      act(() => {
        result.current.handleNewMessage(message);
      });

      expect(result.current.messages).toHaveLength(1);

      act(() => {
        result.current.handleMessageDelete('msg-1');
      });

      expect(result.current.messages).toHaveLength(0);
    });
  });

  describe('reactions', () => {
    beforeEach(async () => {
      selectMock.limit.mockResolvedValue({
        data: [mockMessages[0]],
        error: null,
      });
    });

    it('should add reaction to message', async () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.addReaction('msg-1', 'heart');
      });

      expect(updateMock.update).toHaveBeenCalledWith({
        reactions: expect.arrayContaining([
          expect.objectContaining({
            user: 'Derrick',
            reaction: 'heart',
          }),
        ]),
      });
    });

    it('should remove reaction if same reaction clicked', async () => {
      const messageWithReaction = {
        ...mockMessages[0],
        reactions: [
          { user: 'Derrick', reaction: 'heart' as const, created_at: '2026-02-06T10:00:00Z' },
        ],
      };

      selectMock.limit.mockResolvedValue({
        data: [messageWithReaction],
        error: null,
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.addReaction('msg-1', 'heart');
      });

      expect(updateMock.update).toHaveBeenCalledWith({
        reactions: [],
      });
    });

    it('should replace existing reaction', async () => {
      const messageWithReaction = {
        ...mockMessages[0],
        reactions: [
          { user: 'Derrick', reaction: 'heart' as const, created_at: '2026-02-06T10:00:00Z' },
        ],
      };

      selectMock.limit.mockResolvedValue({
        data: [messageWithReaction],
        error: null,
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.addReaction('msg-1', 'thumbsup');
      });

      expect(updateMock.update).toHaveBeenCalledWith({
        reactions: expect.arrayContaining([
          expect.objectContaining({
            user: 'Derrick',
            reaction: 'thumbsup',
          }),
        ]),
      });
    });

    it('should rollback on reaction error', async () => {
      eqMock.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.addReaction('msg-1', 'heart');
      });

      // Should have rolled back to empty reactions
      expect(result.current.messages[0].reactions).toEqual([]);
    });
  });

  describe('edit message', () => {
    beforeEach(async () => {
      selectMock.limit.mockResolvedValue({
        data: [mockMessages[0]],
        error: null,
      });
    });

    it('should edit message text', async () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.editMessage('msg-1', 'Edited text');
      });

      expect(updateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Edited text',
        })
      );
    });

    it('should not edit with empty text', async () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.editMessage('msg-1', '   ');
      });

      expect(updateMock.update).not.toHaveBeenCalled();
    });

    it('should rollback on edit error', async () => {
      eqMock.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.editMessage('msg-1', 'New text');
      });

      // Should have rolled back to original text
      expect(result.current.messages[0].text).toBe('Hello team!');
    });
  });

  describe('delete message', () => {
    beforeEach(async () => {
      selectMock.limit.mockResolvedValue({
        data: [mockMessages[0]],
        error: null,
      });
    });

    it('should soft delete message', async () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.deleteMessage('msg-1');
      });

      expect(updateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
        })
      );
    });

    it('should rollback on delete error', async () => {
      eqMock.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.deleteMessage('msg-1');
      });

      // Should not have deleted_at
      expect(result.current.messages[0].deleted_at).toBeUndefined();
    });
  });

  describe('pin message', () => {
    beforeEach(async () => {
      selectMock.limit.mockResolvedValue({
        data: [mockMessages[0]],
        error: null,
      });
    });

    it('should pin message', async () => {
      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.togglePin(result.current.messages[0]);
      });

      expect(updateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_pinned: true,
          pinned_by: 'Derrick',
        })
      );
    });

    it('should unpin message', async () => {
      selectMock.limit.mockResolvedValue({
        data: [mockMessages[2]], // Pinned message
        error: null,
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.togglePin(result.current.messages[0]);
      });

      expect(updateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_pinned: false,
          pinned_by: null,
        })
      );
    });

    it('should rollback on pin error', async () => {
      eqMock.mockResolvedValue({
        data: null,
        error: { message: 'Pin failed' },
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.togglePin(result.current.messages[0]);
      });

      // Should not be pinned
      expect(result.current.messages[0].is_pinned).toBeUndefined();
    });
  });

  describe('mark messages as read', () => {
    it('should mark messages as read using RPC', async () => {
      selectMock.limit.mockResolvedValue({
        data: [mockMessages[1]], // Unread message from Sefra
        error: null,
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockDMConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.markMessagesAsRead(['msg-2']);
      });

      expect(supabase.rpc).toHaveBeenCalledWith('mark_message_read', {
        p_message_id: 'msg-2',
        p_user_name: 'Derrick',
      });
    });

    it('should use fallback if RPC fails', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'RPC not available' },
      });

      selectMock.limit.mockResolvedValue({
        data: [mockMessages[1]],
        error: null,
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockDMConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.markMessagesAsRead(['msg-2']);
      });

      expect(updateMock.update).toHaveBeenCalledWith({
        read_by: expect.arrayContaining(['Derrick']),
      });
    });

    it('should skip already read messages', async () => {
      selectMock.limit.mockResolvedValue({
        data: [mockMessages[0]], // Already read by Derrick
        error: null,
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.markMessagesAsRead(['msg-1']);
      });

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should skip messages created by current user', async () => {
      selectMock.limit.mockResolvedValue({
        data: [{ ...mockMessages[0], read_by: [] }],
        error: null,
      });

      const { result } = renderHook(() =>
        useChatMessages({
          currentUser: mockUser,
          conversation: mockTeamConversation,
          searchQuery: '',
        })
      );

      await act(async () => {
        await result.current.fetchMessages();
      });

      await act(async () => {
        await result.current.markMessagesAsRead(['msg-1']);
      });

      // Should not mark own messages as read
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });
});
