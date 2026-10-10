import { create } from 'zustand';
import { api } from '@/lib/api';
import { useSocketStore } from './socketStore';
import { useAuthStore } from './authStore';

export interface Attachment {
  url: string;
  type: 'image' | 'video' | 'file' | 'audio';
  name: string;
  size: number;
}

export interface Reaction {
  emoji: string;
  user: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  sender: {
    _id: string;
    username: string;
    avatar: string;
    status?: string;
  };
  content: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
  readBy?: string[];
  replyTo?: {
    _id: string;
    content: string;
    sender: { username: string };
  };
  isDeleted?: boolean;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  description?: string;
  participants: Array<{
    _id: string;
    username: string;
    email: string;
    avatar: string;
    status: 'online' | 'offline' | 'away';
    lastSeen?: string;
    bio?: string;
  }>;
  lastMessage?: Message;
  groupAdmin?: { _id: string; username: string; avatar: string };
  unreadCounts?: Record<string, number>;
  customNames?: Record<string, string>;
  themes?: Record<string, string>;
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  loadingConversations: boolean;
  loadingMessages: boolean;
  pinnedConversationIds: string[];
  favoriteConversationIds: string[];

  fetchConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, attachments?: Attachment[], replyToId?: string) => Promise<void>;
  createDirectConversation: (recipientId: string) => Promise<string>;
  createGroupConversation: (name: string, participantIds: string[], avatar?: string) => Promise<string>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateConversationLastMessage: (conversationId: string, message: Message) => void;
  markConversationMessagesRead: (conversationId: string, userId: string) => void;
  updateUserStatus: (userId: string, status: 'online' | 'offline' | 'away', lastSeen?: string) => void;
  syncOnlineUsers: (onlineUserIdsSet: Set<string>) => void;
  togglePinConversation: (id: string) => void;
  toggleFavoriteConversation: (id: string) => void;
  updateGroupProfile: (id: string, data: { name?: string; avatar?: string; description?: string; groupAdmin?: string }) => Promise<void>;
  leaveGroup: (conversationId: string) => Promise<void>;
  removeGroupMember: (conversationId: string, memberId: string) => Promise<void>;
  makeGroupAdmin: (conversationId: string, memberId: string) => Promise<void>;
  updateConversationSettings: (id: string, settings: { customName?: string; theme?: string }) => Promise<void>;
}

function getStoredArray(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  loadingConversations: false,
  loadingMessages: false,
  pinnedConversationIds: getStoredArray('chat-pinned-ids'),
  favoriteConversationIds: getStoredArray('chat-favorite-ids'),

  fetchConversations: async () => {
    set({ loadingConversations: true });
    try {
      const res = await api.get('/conversations');
      const currentUser = useAuthStore.getState().user;
      const rawData: Conversation[] = Array.isArray(res.data) ? res.data : [];
      const valid = rawData.filter((conv) => {
        const validParticipants = (conv.participants || []).filter(Boolean);
        if (conv.type === 'direct') {
          if (validParticipants.length < 2) return false;
          if (currentUser && !validParticipants.some((p) => p && p._id !== currentUser._id)) return false;
        }
        return true;
      });
      set({ conversations: valid, loadingConversations: false });
    } catch (err) {
      set({ loadingConversations: false });
    }
  },

  selectConversation: async (id: string) => {
    const previous = get().activeConversationId;
    if (previous && previous !== id) {
      useSocketStore.getState().leaveConversation(previous);
    }

    set({ activeConversationId: id });
    useSocketStore.getState().joinConversation(id);

    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      // Mark read locally
      get().markConversationMessagesRead(id, currentUser._id);

      // Emit real-time read event to participants
      const activeConv = get().conversations.find((c) => c._id === id);
      const participantIds = activeConv?.participants.map((p) => p._id) || [];
      const socket = useSocketStore.getState().socket;
      if (socket) {
        socket.emit('message:read', {
          conversationId: id,
          userId: currentUser._id,
          participantIds,
        });
      }

      // Sync via REST API
      try {
        await api.post(`/conversations/${id}/read`);
      } catch (err) {
        // ignore
      }
    }

    await get().fetchMessages(id);
  },

  fetchMessages: async (conversationId: string) => {
    set({ loadingMessages: true });
    try {
      const res = await api.get(`/conversations/${conversationId}/messages`);
      set((state) => ({
        messages: { ...state.messages, [conversationId]: res.data },
        loadingMessages: false,
      }));
    } catch (err) {
      set({ loadingMessages: false });
    }
  },

  sendMessage: async (content: string, attachments = [], replyToId) => {
    const activeId = get().activeConversationId;
    if (!activeId) return;

    const res = await api.post(`/conversations/${activeId}/messages`, {
      content,
      attachments,
      replyTo: replyToId,
    });

    const newMessage: Message = res.data;

    // Append message locally & update conversation last message
    get().addMessage(newMessage);
    get().updateConversationLastMessage(activeId, newMessage);

    // Socket emit to notify participants in real-time
    const activeConv = get().conversations.find((c) => c._id === activeId);
    const recipientIds = activeConv?.participants.map((p) => p._id) || [];

    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit('message:send', {
        conversationId: activeId,
        message: newMessage,
        recipientIds,
      });
    }
  },

  createDirectConversation: async (recipientId: string) => {
    const res = await api.post('/conversations', { type: 'direct', recipientId });
    const conv: Conversation = res.data;

    set((state) => {
      const exists = state.conversations.some((c) => c._id === conv._id);
      if (exists) return state;
      return { conversations: [conv, ...state.conversations] };
    });

    await get().selectConversation(conv._id);
    return conv._id;
  },

  createGroupConversation: async (name: string, participantIds: string[]) => {
    const res = await api.post('/conversations', { type: 'group', name, participantIds });
    const conv: Conversation = res.data;

    set((state) => ({
      conversations: [conv, ...state.conversations],
    }));

    await get().selectConversation(conv._id);
    return conv._id;
  },

  toggleReaction: async (messageId: string, emoji: string) => {
    const activeId = get().activeConversationId;
    if (!activeId) return;

    const res = await api.post(`/messages/${messageId}/reaction`, { emoji });
    const updatedMsg: Message = res.data;

    set((state) => {
      const currentMsgs = state.messages[activeId] || [];
      return {
        messages: {
          ...state.messages,
          [activeId]: currentMsgs.map((m) => (m._id === messageId ? updatedMsg : m)),
        },
      };
    });

    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit('reaction:toggle', {
        conversationId: activeId,
        messageId,
        reactions: updatedMsg.reactions,
      });
    }
  },

  deleteMessage: async (messageId: string) => {
    const activeId = get().activeConversationId;
    if (!activeId) return;

    const res = await api.delete(`/messages/${messageId}`);
    const deletedMsg: Message = res.data?.data || res.data;

    set((state) => {
      const currentMsgs = state.messages[activeId] || [];
      const updatedMsgs = currentMsgs.map((m) => (m._id === messageId ? deletedMsg : m));
      const updatedConvs = state.conversations.map((c) => {
        if (c._id === activeId && c.lastMessage?._id === messageId) {
          return { ...c, lastMessage: deletedMsg };
        }
        return c;
      });

      return {
        messages: {
          ...state.messages,
          [activeId]: updatedMsgs,
        },
        conversations: updatedConvs,
      };
    });

    const socket = useSocketStore.getState().socket;
    if (socket) {
      socket.emit('message:delete', {
        conversationId: activeId,
        message: deletedMsg,
      });
    }
  },

  addMessage: (message: Message) => {
    set((state) => {
      const convMsgs = state.messages[message.conversationId] || [];
      const exists = convMsgs.some((m) => m._id === message._id);
      if (exists) return state;

      return {
        messages: {
          ...state.messages,
          [message.conversationId]: [...convMsgs, message],
        },
      };
    });
  },

  updateConversationLastMessage: (conversationId: string, message: Message) => {
    set((state) => {
      const targetConv = state.conversations.find((c) => c._id === conversationId);
      if (!targetConv) return state;

      const updatedTarget: Conversation = {
        ...targetConv,
        lastMessage: message,
        updatedAt: new Date().toISOString(),
      };

      const remaining = state.conversations.filter((c) => c._id !== conversationId);
      return {
        conversations: [updatedTarget, ...remaining],
      };
    });
  },

  markConversationMessagesRead: (conversationId: string, userId: string) => {
    set((state) => {
      const currentMsgs = state.messages[conversationId] || [];
      const updatedMsgs = currentMsgs.map((m) => {
        const readArray = m.readBy || [];
        const containsUser = readArray.some((id: any) => (id._id ? id._id === userId : id === userId));
        if (!containsUser) {
          return { ...m, readBy: [...readArray, userId] };
        }
        return m;
      });

      const updatedConvs = state.conversations.map((c) => {
        if (c._id === conversationId) {
          const unreadMap = { ...(c.unreadCounts || {}), [userId]: 0 };
          let updatedLast = c.lastMessage;
          if (updatedLast) {
            const lastRead = updatedLast.readBy || [];
            const containsUser = lastRead.some((id: any) => (id._id ? id._id === userId : id === userId));
            if (!containsUser) {
              updatedLast = { ...updatedLast, readBy: [...lastRead, userId] };
            }
          }
          return { ...c, unreadCounts: unreadMap, lastMessage: updatedLast };
        }
        return c;
      });

      return {
        messages: { ...state.messages, [conversationId]: updatedMsgs },
        conversations: updatedConvs,
      };
    });
  },

  updateUserStatus: (userId: string, status: 'online' | 'offline' | 'away', lastSeen?: string) => {
    set((state) => ({
      conversations: state.conversations.map((c) => ({
        ...c,
        participants: c.participants.map((p) =>
          p._id === userId
            ? { ...p, status, ...(lastSeen ? { lastSeen } : {}) }
            : p
        ),
      })),
    }));
  },

  syncOnlineUsers: (onlineUserIdsSet: Set<string>) => {
    set((state) => ({
      conversations: state.conversations.map((c) => ({
        ...c,
        participants: c.participants.map((p) => ({
          ...p,
          status: onlineUserIdsSet.has(p._id) ? 'online' : 'offline',
        })),
      })),
    }));
  },

  togglePinConversation: (id: string) => {
    set((state) => {
      const current = state.pinnedConversationIds || [];
      const updated = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat-pinned-ids', JSON.stringify(updated));
      }
      return { pinnedConversationIds: updated };
    });
  },

  toggleFavoriteConversation: (id: string) => {
    set((state) => {
      const current = state.favoriteConversationIds || [];
      const updated = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat-favorite-ids', JSON.stringify(updated));
      }
      return { favoriteConversationIds: updated };
    });
  },

  updateGroupProfile: async (id: string, data: { name?: string; avatar?: string; description?: string; groupAdmin?: string }) => {
    const res = await api.patch(`/conversations/${id}`, data);
    const updatedConv: Conversation = res.data?.data || res.data;

    set((state) => ({
      conversations: state.conversations.map((c) => (c._id === id ? { ...c, ...updatedConv } : c)),
    }));
  },

  leaveGroup: async (conversationId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    await api.delete(`/conversations/${conversationId}/participants/${currentUser._id}`);

    set((state) => ({
      conversations: state.conversations.filter((c) => c._id !== conversationId),
      activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
    }));
  },

  removeGroupMember: async (conversationId: string, memberId: string) => {
    const res = await api.delete(`/conversations/${conversationId}/participants/${memberId}`);
    const updatedConv: Conversation = res.data?.data || res.data;

    set((state) => ({
      conversations: state.conversations.map((c) => (c._id === conversationId ? { ...c, ...updatedConv } : c)),
    }));
  },

  makeGroupAdmin: async (conversationId: string, memberId: string) => {
    const res = await api.patch(`/conversations/${conversationId}`, { groupAdmin: memberId });
    const updatedConv: Conversation = res.data?.data || res.data;

    set((state) => ({
      conversations: state.conversations.map((c) => (c._id === conversationId ? { ...c, ...updatedConv } : c)),
    }));
  },

  updateConversationSettings: async (id: string, settings: { customName?: string; theme?: string }) => {
    const res = await api.patch(`/conversations/${id}/settings`, settings);
    const updatedConv: Conversation = res.data?.data || res.data;

    set((state) => ({
      conversations: state.conversations.map((c) => (c._id === id ? { ...c, ...updatedConv } : c)),
    }));
  },
}));
