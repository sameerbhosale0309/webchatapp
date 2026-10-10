import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';
import { useChatStore, Message } from './chatStore';
import { soundEffects } from '@/lib/soundEffects';
import { api } from '@/lib/api';

function getSocketUrl(): string {
  let url = process.env.NEXT_PUBLIC_SOCKET_URL || '';
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (!url || ((url.includes('localhost') || url.includes('127.0.0.1')) && host !== 'localhost' && host !== '127.0.0.1')) {
      url = 'https://vartalaab-backend.onrender.com';
    }
  }
  if (!url) {
    url = 'http://localhost:5000';
  }
  if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    url = url.replace('http://', 'https://');
  }
  return url.replace(/\/+$/, '');
}

export interface CallData {
  callId: string;
  caller: { _id: string; username: string; avatar: string };
  receiver: { _id: string; username: string; avatar: string };
  type: 'audio' | 'video';
  signalData?: any;
}

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  onlineUserIds: Set<string>;
  typingUsers: Record<string, string[]>;

  // Calling state
  incomingCall: CallData | null;
  outgoingCall: CallData | null;
  activeCall: CallData | null;

  connectSocket: () => void;
  disconnectSocket: () => void;
  setTyping: (conversationId: string, isTyping: boolean, recipientIds?: string[]) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;

  setIncomingCall: (call: CallData | null) => void;
  setOutgoingCall: (call: CallData | null) => void;
  setActiveCall: (call: CallData | null) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,
  onlineUserIds: new Set<string>(),
  typingUsers: {},

  incomingCall: null,
  outgoingCall: null,
  activeCall: null,

  setIncomingCall: (call) => set({ incomingCall: call }),
  setOutgoingCall: (call) => set({ outgoingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),

  connectSocket: () => {
    const { socket: existingSocket } = get();
    if (existingSocket?.connected) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('⚡ Socket connected to transceiver network:', newSocket.id);
      set({ socket: newSocket, connected: true });

      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        newSocket.emit('user:online', { userId: currentUser._id });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      set({ connected: false });
    });

    // Real-Time Online / Offline Presence sync
    const handleOnlineUsers = (data: string[] | { onlineUserIds: string[] }) => {
      const ids = Array.isArray(data) ? data : data?.onlineUserIds || [];
      console.log('🟢 Real-time online users synced:', ids);
      const setIds = new Set(ids);
      set({ onlineUserIds: setIds });
      useChatStore.getState().syncOnlineUsers(setIds);
    };

    newSocket.on('online_users', handleOnlineUsers);
    newSocket.on('presence:sync', handleOnlineUsers);

    const handleUserStatusChange = ({ userId, status, lastSeen }: { userId: string; status: 'online' | 'offline' | 'away'; lastSeen?: string }) => {
      console.log('🔄 Real-time user status change:', userId, status);
      set((state) => {
        const updated = new Set(state.onlineUserIds);
        if (status === 'online') {
          updated.add(userId);
        } else {
          updated.delete(userId);
        }
        return { onlineUserIds: updated };
      });

      useChatStore.getState().updateUserStatus(userId, status, lastSeen);
    };

    newSocket.on('user:status_change', handleUserStatusChange);
    newSocket.on('user:status', handleUserStatusChange);

    // Real-time message listener with instant read receipt trigger for active chat
    newSocket.on('message:new', (message: Message) => {
      console.log('📩 Real-time message received:', message);
      const chatStore = useChatStore.getState();
      const currentUser = useAuthStore.getState().user;

      chatStore.addMessage(message);
      chatStore.updateConversationLastMessage(message.conversationId, message);

      // Play incoming sound effect
      if (currentUser && message.sender._id !== currentUser._id) {
        soundEffects.playReceive();
      }

      // Real-time instant read sync if recipient is currently viewing this conversation!
      if (currentUser && chatStore.activeConversationId === message.conversationId && message.sender._id !== currentUser._id) {
        chatStore.markConversationMessagesRead(message.conversationId, currentUser._id);

        const activeConv = chatStore.conversations.find((c) => c._id === message.conversationId);
        const participantIds = activeConv?.participants.map((p) => p._id) || [];

        newSocket.emit('message:read', {
          conversationId: message.conversationId,
          userId: currentUser._id,
          participantIds,
        });

        api.post(`/conversations/${message.conversationId}/read`).catch(() => {});
      }

      // Clear typing indicator for this conversation
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [message.conversationId]: [],
        },
      }));
    });

    newSocket.on('conversation:updated', ({ conversationId, lastMessage }: { conversationId: string; lastMessage: Message }) => {
      const chatStore = useChatStore.getState();
      if (lastMessage) {
        chatStore.addMessage(lastMessage);
        chatStore.updateConversationLastMessage(conversationId, lastMessage);
      }
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
      console.log('👁️ Real-time read receipt update received:', conversationId, userId);
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
        return state;
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

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },

  setTyping: (conversationId, isTyping, recipientIds) => {
    const { socket } = get();
    if (!socket?.connected) return;

    if (isTyping) {
      socket.emit('typing:start', { conversationId, recipientIds });
    } else {
      socket.emit('typing:stop', { conversationId, recipientIds });
    }
  },

  joinConversation: (conversationId) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('conversation:join', conversationId);
    }
  },

  leaveConversation: (conversationId) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('conversation:leave', conversationId);
    }
  },
}));
