import axios from 'axios';
import { storage } from '@/stores/storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
console.log('API Base URL:', BASE_URL);

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore access failed, continue without token
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log errors for debugging
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    const originalRequest = error.config;

    // If 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await storage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;

          await storage.setItem('accessToken', access_token);
          await storage.setItem('refreshToken', refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch {
        // Refresh failed, clear tokens
        await storage.deleteItem('accessToken');
        await storage.deleteItem('refreshToken');
      }
    }

    return Promise.reject(error);
  }
);

// API endpoint functions
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
};

export const feedApi = {
  getProfiles: (limit = 10) =>
    api.get('/feed', { params: { limit } }),

  swipe: (targetUserId: string, action: 'like' | 'pass' | 'superlike') =>
    api.post(`/feed/${action}/${targetUserId}`),
};

export const matchesApi = {
  getMatches: () => api.get('/matches'),

  getMessages: (matchId: string) =>
    api.get(`/matches/${matchId}/messages`),

  sendMessage: (matchId: string, content: string, encryptedContent?: string) =>
    api.post(`/matches/${matchId}/messages`, {
      content,
      encrypted_content: encryptedContent,
    }),

  toggleImagePermission: (matchId: string, allowed: boolean) =>
    api.patch(`/matches/${matchId}/image-permission`, { allowed }),
};

export const userApi = {
  getMe: () => api.get('/users/me'),

  updateProfile: (data: {
    name?: string;
    bio?: string;
    photos?: string[];
  }) => api.patch('/users/me', data),
};

interface ProfilePrompt {
  question: string;
  answer: string;
}

export const profileApi = {
  get: () => api.get('/profile'),

  create: (data: {
    name: string;
    dob: string; // YYYY-MM-DD
    gender: string;
    zip_code: string;
    bio: string;
    neighborhood?: string;
    kink_level?: string;
    prompts?: ProfilePrompt[];
  }) => api.post('/profile', data),

  update: (data: {
    name?: string;
    bio?: string;
    neighborhood?: string;
    prompts?: ProfilePrompt[];
  }) => api.put('/profile', data),

  getPreferences: () => api.get('/profile/preferences'),

  updatePreferences: (data: {
    genders_seeking?: string[];
    age_min?: number;
    age_max?: number;
    distance_miles?: number;
    visible_to_genders?: string[];
  }) => api.put('/profile/preferences', data),
};

export const creditsApi = {
  getCredits: () => api.get('/credits'),

  getSubscription: () => api.get('/subscription'),
};

export const keysApi = {
  setPublicKey: (publicKey: string, keyType: string = 'ECDH-P256') =>
    api.post('/keys/public', { public_key: publicKey, key_type: keyType }),

  getPublicKey: (userId: string) =>
    api.get('/keys/public', { params: { user_id: userId } }),
};
