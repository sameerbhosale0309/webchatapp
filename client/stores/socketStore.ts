import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { useChatStore, Message } from './chatStore';

interface ActiveCall {
  fromUser: { _id: string; username: string; avatar: string };
  conversationId: string;
  callType: 'audio' | 'video';
  offer: any;
}

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  onlineUserIds: Set<string>;
  typingUsers: Record<string, string[]>;
  activeCall: ActiveCall | null;
  outgoingCall: { targetUser: any; conversationId: string; callType: 'audio' | 'video' } | null;
  connectSocket: () => void;
  disconnectSocket: () => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  setIncomingCall: (call: ActiveCall | null) => void;
  setOutgoingCall: (call: any) => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,
  onlineUserIds: new Set<string>(),
  typingUsers: {},
  activeCall: null,
  outgoingCall: null,

  connectSocket: () => {
    const existingSocket = get().socket;
    if (existingSocket?.connected) return;

    const token = api.getToken();
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('⚡ Socket connected to server');
      set({ connected: true });
    });

    newSocket.on('disconnect', () => {
      console.log('⚡ Socket disconnected');
      set({ connected: false });
    });

    newSocket.on('online_users', (userIds: string[]) => {
      set({ onlineUserIds: new Set(userIds) });
    });

    newSocket.on('user:status_change', ({ userId, status, lastSeen }: { userId: string; status: 'online' | 'offline' | 'away'; lastSeen?: string }) => {
      set((state) => {
        const updated = new Set(state.onlineUserIds);
        if (status === 'online') {
          updated.add(userId);
        } else {
          updated.delete(userId);
        }
        return { onlineUserIds: updated };
      });

      // Instantly sync participant status and lastSeen in chatStore
      useChatStore.getState().updateUserStatus(userId, status, lastSeen);
    });

    // Zero-latency instant disconnect on tab close/unload
    if (typeof window !== 'undefined') {
      const handleUnload = () => {
        newSocket.emit('user:go_offline');
        newSocket.disconnect();
      };
      window.addEventListener('beforeunload', handleUnload);
      window.addEventListener('pagehide', handleUnload);
    }

    // Real-time message & conversation listeners
    newSocket.on('message:new', (message: Message) => {
      console.log('📩 Real-time message received:', message);
      const chatStore = useChatStore.getState();
      chatStore.addMessage(message);
      chatStore.updateConversationLastMessage(message.conversationId, message);
    });

    newSocket.on('conversation:updated', ({ conversationId, lastMessage }: { conversationId: string; lastMessage: Message }) => {
      console.log('💬 Real-time conversation update:', conversationId);
      const chatStore = useChatStore.getState();
      chatStore.updateConversationLastMessage(conversationId, lastMessage);
    });

    newSocket.on('reaction:updated', ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
      const chatStore = useChatStore.getState();
      const activeId = chatStore.activeConversationId;
      if (!activeId) return;

      const currentMsgs = chatStore.messages[activeId] || [];
      const updated = currentMsgs.map((m) => (m._id === messageId ? { ...m, reactions } : m));
      useChatStore.setState((state) => ({
        messages: { ...state.messages, [activeId]: updated },
      }));
    });

    newSocket.on('message:deleted', ({ conversationId, message }: { conversationId: string; message: Message }) => {
      console.log('🗑️ Real-time message deleted:', message._id);
      const chatStore = useChatStore.getState();
      const currentMsgs = chatStore.messages[conversationId] || [];
      const updated = currentMsgs.map((m) => (m._id === message._id ? message : m));
      
      const updatedConvs = chatStore.conversations.map((c) => {
        if (c._id === conversationId && c.lastMessage?._id === message._id) {
          return { ...c, lastMessage: message };
        }
        return c;
      });

      useChatStore.setState((state) => ({
        messages: { ...state.messages, [conversationId]: updated },
        conversations: updatedConvs,
      }));
    });

    // Real-Time Read Receipt listener
    newSocket.on('message:read_update', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      console.log('👁️ Real-time read receipt update:', conversationId, userId);
      const chatStore = useChatStore.getState();
      chatStore.markConversationMessagesRead(conversationId, userId);
    });

    // Typing indicators
    newSocket.on('typing:start', ({ conversationId, user }: { conversationId: string; user: { username: string } }) => {
      set((state) => {
        const current = state.typingUsers[conversationId] || [];
        if (!current.includes(user.username)) {
          return {
            typingUsers: {
              ...state.typingUsers,
              [conversationId]: [...current, user.username],
            },
          };
        }
        return {};
      });
    });

    newSocket.on('typing:stop', ({ conversationId, user }: { conversationId: string; user: { username: string } }) => {
      set((state) => {
        const current = state.typingUsers[conversationId] || [];
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: current.filter((name) => name !== user.username),
          },
        };
      });
    });

    // WebRTC Calling
    newSocket.on('call:incoming', (call: ActiveCall) => {
      set({ activeCall: call });
    });

    newSocket.on('call:rejected', () => {
      set({ outgoingCall: null });
    });

    newSocket.on('call:ended', () => {
      set({ activeCall: null, outgoingCall: null });
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const s = get().socket;
    if (s) {
      s.disconnect();
      set({ socket: null, connected: false });
    }
  },

  joinConversation: (conversationId: string) => {
    get().socket?.emit('join_conversation', conversationId);
  },

  leaveConversation: (conversationId: string) => {
    get().socket?.emit('leave_conversation', conversationId);
  },

  setTyping: (conversationId: string, isTyping: boolean) => {
    const s = get().socket;
    if (!s) return;
    if (isTyping) {
      s.emit('typing:start', { conversationId });
    } else {
      s.emit('typing:stop', { conversationId });
    }
  },

  setIncomingCall: (call) => set({ activeCall: call }),
  setOutgoingCall: (call) => set({ outgoingCall: call }),
}));
