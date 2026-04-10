import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  phone?: string;
  phone_verified: boolean;
  name?: string;
  bio?: string;
  age?: number;
  neighborhood?: string;
  photos: string[];
  prompts?: Array<{ question: string; answer: string }>;
  is_verified: boolean;
  looking_for?: string[];
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Generate a unique device ID for web
function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `web-${crypto.randomUUID()}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });

    if (!api.isAuthenticated()) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const user = await api.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      api.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  sendMagicLink: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.sendMagicLink(email);
      set({ isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to send magic link'
      });
      throw error;
    }
  },

  verifyMagicLink: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const deviceId = getDeviceId();
      const response = await api.verifyMagicLink(token, deviceId);
      const user = await api.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
      return response.is_new_user;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await api.logout();
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  refreshUser: async () => {
    if (!api.isAuthenticated()) return;

    try {
      const user = await api.getCurrentUser();
      set({ user });
    } catch {
      // Ignore refresh errors
    }
  },
}));
