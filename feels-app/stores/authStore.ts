import { create } from 'zustand';
import { Platform } from 'react-native';
import { api } from '@/api/client';
import { storage } from './storage';

interface ProfilePrompt {
  question: string;
  answer: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  phone_verified: boolean;
  totp_enabled: boolean;
  photos: string[];
  bio?: string;
  age?: number;
  location?: string;
  prompts?: ProfilePrompt[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  loadTokens: () => Promise<void>;
  setUser: (user: User) => void;
  getDeviceId: () => Promise<string>;
  sendPhoneCode: (phone: string) => Promise<void>;
  verifyPhone: (phone: string, code: string) => Promise<void>;

  // Magic link auth
  sendMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<void>;

  // Public key management for E2E encryption
  uploadPublicKey: (publicKey: string) => Promise<void>;
  getPublicKey: (userId: string) => Promise<string | null>;
}

// Generate or retrieve a persistent device ID
const getOrCreateDeviceId = async (): Promise<string> => {
  let deviceId = await storage.getItem('deviceId');
  if (!deviceId) {
    // Generate a unique device ID
    deviceId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    await storage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  deviceId: null,
  isLoading: false,
  isAuthenticated: false,

  getDeviceId: async () => {
    let { deviceId } = get();
    if (!deviceId) {
      deviceId = await getOrCreateDeviceId();
      set({ deviceId });
    }
    return deviceId;
  },

  login: async (email: string, password: string, totpCode?: string) => {
    set({ isLoading: true });
    try {
      const deviceId = await get().getDeviceId();
      const response = await api.post('/auth/login', {
        email,
        password,
        device_id: deviceId,
        platform: Platform.OS,
        totp_code: totpCode,
      });
      const { access_token, refresh_token, user } = response.data;

      await storage.setItem('accessToken', access_token);
      await storage.setItem('refreshToken', refresh_token);

      set({
        accessToken: access_token,
        refreshToken: refresh_token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  register: async (name: string, email: string, password: string, phone: string) => {
    set({ isLoading: true });
    try {
      const deviceId = await get().getDeviceId();
      // Strip formatting from phone, keep just digits
      const phoneDigits = phone.replace(/\D/g, '');

      console.log('Making API request to:', '/auth/register');
      console.log('Request payload:', { email, phone: phoneDigits, device_id: deviceId, platform: Platform.OS });

      const response = await api.post('/auth/register', {
        email,
        password,
        phone: phoneDigits,
        device_id: deviceId,
        platform: Platform.OS,
      });

      console.log('Registration response:', response.data);
      const { access_token, refresh_token, user } = response.data;

      await storage.setItem('accessToken', access_token);
      await storage.setItem('refreshToken', refresh_token);

      // Store first name in profile (separate call after registration)
      // The profile will be created with the name during onboarding

      set({
        accessToken: access_token,
        refreshToken: refresh_token,
        user: { ...user, name },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Registration API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
      });
      set({ isLoading: false });
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    try {
      const refreshToken = await storage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // Ignore logout API errors
    }

    await storage.deleteItem('accessToken');
    await storage.deleteItem('refreshToken');

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  loadTokens: async () => {
    try {
      const accessToken = await storage.getItem('accessToken');
      const refreshToken = await storage.getItem('refreshToken');
      const deviceId = await getOrCreateDeviceId();

      set({ deviceId });

      if (accessToken) {
        set({ accessToken, refreshToken, isAuthenticated: true });

        // Fetch user profile
        try {
          const response = await api.get('/users/me');
          set({ user: response.data });
        } catch {
          // Token might be expired, try to refresh
          if (refreshToken) {
            try {
              const refreshResponse = await api.post('/auth/refresh', {
                refresh_token: refreshToken,
                device_id: deviceId,
              });
              const { access_token, refresh_token: newRefreshToken } = refreshResponse.data;

              await storage.setItem('accessToken', access_token);
              await storage.setItem('refreshToken', newRefreshToken);

              set({ accessToken: access_token, refreshToken: newRefreshToken });

              const userResponse = await api.get('/users/me');
              set({ user: userResponse.data });
            } catch {
              // Refresh failed, logout
              await get().logout();
            }
          } else {
            await get().logout();
          }
        }
      }
    } catch {
      // SecureStore access failed
    }
  },

  sendPhoneCode: async (phone: string) => {
    const phoneDigits = phone.replace(/\D/g, '');
    await api.post('/auth/phone/send', { phone: phoneDigits });
  },

  verifyPhone: async (phone: string, code: string) => {
    const phoneDigits = phone.replace(/\D/g, '');
    await api.post('/auth/phone/verify', { phone: phoneDigits, code });

    // Update user state
    const { user } = get();
    if (user) {
      set({ user: { ...user, phone_verified: true } });
    }
  },

  setUser: (user: User) => {
    set({ user });
  },

  // Magic link methods
  sendMagicLink: async (email: string) => {
    set({ isLoading: true });
    try {
      await api.post('/auth/magic/send', { email });
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Failed to send magic link');
    }
  },

  verifyMagicLink: async (token: string) => {
    set({ isLoading: true });
    try {
      const deviceId = await get().getDeviceId();
      const response = await api.post('/auth/magic/verify', {
        token,
        device_id: deviceId,
        platform: Platform.OS,
      });

      const { access_token, refresh_token, user } = response.data;

      await storage.setItem('accessToken', access_token);
      await storage.setItem('refreshToken', refresh_token);

      set({
        accessToken: access_token,
        refreshToken: refresh_token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Invalid or expired magic link');
    }
  },

  // Public key management for E2E encryption
  uploadPublicKey: async (publicKey: string) => {
    await api.post('/keys/public', {
      public_key: publicKey,
      key_type: 'ECDH-P256',
    });
  },

  getPublicKey: async (userId: string) => {
    try {
      const response = await api.get('/keys/public', {
        params: { user_id: userId },
      });
      return response.data.public_key as string;
    } catch {
      return null;
    }
  },
}));
