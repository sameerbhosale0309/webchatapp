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
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  loadingConversations: boolean;
  loadingMessages: boolean;

  fetchConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, attachments?: Attachment[], replyToId?: string) => Promise<void>;
  createDirectConversation: (recipientId: string) => Promise<string>;
  createGroupConversation: (name: string, participantIds: string[]) => Promise<string>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateConversationLastMessage: (conversationId: string, message: Message) => void;
  markConversationMessagesRead: (conversationId: string, userId: string) => void;
  updateUserStatus: (userId: string, status: 'online' | 'offline' | 'away', lastSeen?: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  loadingConversations: false,
  loadingMessages: false,

  fetchConversations: async () => {
    set({ loadingConversations: true });
    try {
      const res = await api.get('/conversations');
      set({ conversations: res.data, loadingConversations: false });
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
}));
