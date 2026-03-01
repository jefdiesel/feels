import axios from 'axios';
import { storage } from '@/stores/storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

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

  // Phone verification (disabled until Twilio configured)
  // sendPhoneCode: (phone: string) =>
  //   api.post('/auth/phone/send', { phone }),
  // verifyPhone: (phone: string, code: string) =>
  //   api.post('/auth/phone/verify', { phone, code }),

  // 2FA (disabled until needed)
  // setup2FA: () =>
  //   api.post<{ secret: string; qr_code: string; backup_codes: string[] }>(
  //     '/auth/2fa/setup'
  //   ),
};

export const feedApi = {
  getProfiles: (limit = 10) =>
    api.get('/feed', { params: { limit } }),

  swipe: (targetUserId: string, action: 'like' | 'pass' | 'superlike') =>
    api.post(`/feed/${action}/${targetUserId}`),

  getDailyPicks: () => api.get('/feed/daily-picks'),

  rewind: () => api.post('/feed/rewind'),

  superlikeWithMessage: (targetUserId: string, message: string) =>
    api.post(`/feed/superlike/${targetUserId}/message`, { message }),
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

  // Get shareable profile link
  getShareLink: () =>
    api.get<{ url: string; title: string; text: string }>('/profile/share-link'),
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

export interface ReferralCode {
  code: string;
  user_id: string;
  created_at: string;
}

export interface ReferralStats {
  code: string;
  total_referrals: number;
  premium_days_earned: number;
}

export const referralApi = {
  // Get or create referral code
  getCode: () => api.get<ReferralCode>('/referral/code'),

  // Redeem a referral code
  redeemCode: (code: string) =>
    api.post<{ success: boolean; message: string }>('/referral/redeem', { code }),

  // Get referral stats
  getStats: () => api.get<ReferralStats>('/referral/stats'),
};

export interface NotificationSettings {
  push_enabled: boolean;
  new_matches: boolean;
  new_messages: boolean;
  likes_received: boolean;
  super_likes: boolean;
  promotions: boolean;
}

export interface PrivacySettings {
  show_online_status: boolean;
  show_read_receipts: boolean;
  show_distance: boolean;
  hide_age: boolean;
  incognito_mode: boolean;
}

export const settingsApi = {
  getNotificationSettings: () =>
    api.get<NotificationSettings>('/settings/notifications'),

  updateNotificationSettings: (settings: Partial<NotificationSettings>) =>
    api.put('/settings/notifications', settings),

  getPrivacySettings: () => api.get<PrivacySettings>('/settings/privacy'),

  updatePrivacySettings: (settings: Partial<PrivacySettings>) =>
    api.put('/settings/privacy', settings),
};

export const pushApi = {
  registerToken: (token: string, platform: 'ios' | 'android') =>
    api.post('/push/register', { token, platform }),

  unregisterToken: () => api.delete('/push/register'),
};

export const analyticsApi = {
  getProfileAnalytics: () =>
    api.get<{ view_count: number; view_count_7d: number; view_count_30d: number }>(
      '/profile/analytics'
    ),
};
