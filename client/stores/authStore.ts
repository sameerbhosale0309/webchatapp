import { create } from 'zustand';
import { api } from '@/lib/api';

export interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  sendOtp: (email: string, purpose?: 'register' | 'login', username?: string) => Promise<any>;
  login: (email: string, password: string, otp?: string) => Promise<void>;
  register: (username: string, email: string, password: string, otp: string, avatar?: string) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('echo_token') : null,
  loading: false,
  initialized: false,

  initAuth: async () => {
    try {
      const token = api.getToken();
      if (!token) {
        set({ user: null, loading: false, initialized: true });
        return;
      }
      set({ loading: true });
      const res = await api.get('/auth/me');
      set({ user: res.data, loading: false, initialized: true });
    } catch (err) {
      api.setToken(null);
      set({ user: null, token: null, loading: false, initialized: true });
    }
  },

  sendOtp: async (email, purpose = 'register', username) => {
    try {
      const res = await api.post('/auth/send-otp', { email, purpose, username });
      return res;
    } catch (err: any) {
      throw err;
    }
  },

  login: async (email, password, otp) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', { email, password, otp });
      const { user, accessToken } = res.data;
      api.setToken(accessToken);
      set({ user, token: accessToken, loading: false, initialized: true });
    } catch (err: any) {
      set({ loading: false });
      throw err;
    }
  },

  register: async (username, email, password, otp, avatar) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/register', { username, email, password, otp, avatar });
      const { user, accessToken } = res.data;
      api.setToken(accessToken);
      set({ user, token: accessToken, loading: false, initialized: true });
    } catch (err: any) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      api.setToken(null);
      set({ user: null, token: null });
    }
  },

  updateUser: (data) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...data } });
    }
  },
}));
