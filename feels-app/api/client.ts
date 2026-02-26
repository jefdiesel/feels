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

  getMatch: (matchId: string) =>
    api.get(`/matches/${matchId}`),

  getMessages: (matchId: string) =>
    api.get(`/matches/${matchId}/messages`),

  sendMessage: (matchId: string, content: string, encryptedContent?: string) =>
    api.post(`/matches/${matchId}/messages`, {
      content,
      encrypted_content: encryptedContent,
    }),

  unmatch: (matchId: string) =>
    api.delete(`/matches/${matchId}`),

  enableImages: (matchId: string) =>
    api.post(`/matches/${matchId}/images/enable`),

  disableImages: (matchId: string) =>
    api.post(`/matches/${matchId}/images/disable`),

  sendTyping: (matchId: string, isTyping: boolean) =>
    api.post(`/matches/${matchId}/typing`, { is_typing: isTyping }),

  // Upload an image for chat (requires both users to have images enabled)
  uploadImage: (matchId: string, formData: FormData) =>
    api.post<{ url: string }>(`/matches/${matchId}/images/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const safetyApi = {
  block: (userId: string) =>
    api.post(`/block/${userId}`),

  unblock: (userId: string) =>
    api.delete(`/block/${userId}`),

  report: (userId: string, reason: string, details?: string) =>
    api.post(`/report/${userId}`, { reason, details }),
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
    looking_for?: string;
    prompts?: ProfilePrompt[];
  }) => api.post('/profile', data),

  update: (data: {
    name?: string;
    bio?: string;
    neighborhood?: string;
    looking_for?: string;
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

  uploadPhoto: (formData: FormData) =>
    api.post('/profile/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deletePhoto: (photoId: string) =>
    api.delete(`/profile/photos/${photoId}`),

  reorderPhotos: (photoIds: string[]) =>
    api.put('/profile/photos/reorder', { photo_ids: photoIds }),

  // Request profile verification (requires quarterly or annual subscription)
  verify: () => api.post<{ verified: boolean }>('/profile/verify'),
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

export type PlanType = 'monthly' | 'quarterly' | 'annual';

export interface Plan {
  type: PlanType;
  name: string;
  price_id: string;
  amount: number; // in cents
  currency: string;
  interval: string;
  interval_count: number;
  description: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: PlanType;
  status: string;
  current_period_start: string;
  current_period_end: string;
  canceled_at?: string;
}

export const paymentsApi = {
  // Get available subscription plans
  getPlans: () => api.get<Record<PlanType, Plan>>('/payments/plans'),

  // Create a Stripe checkout session (returns checkout URL)
  createCheckout: (planType: PlanType, successUrl: string, cancelUrl: string) =>
    api.post<{ checkout_url: string; session_id: string }>('/payments/checkout', {
      plan_type: planType,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),

  // Create a Stripe billing portal session (for managing subscription)
  createPortal: (returnUrl: string) =>
    api.post<{ url: string }>('/payments/portal', { return_url: returnUrl }),

  // Get user's current subscription
  getSubscription: () =>
    api.get<{ subscription: Subscription | null }>('/payments/subscription'),

  // Cancel subscription (will cancel at period end)
  cancelSubscription: () => api.delete('/payments/subscription'),
};
