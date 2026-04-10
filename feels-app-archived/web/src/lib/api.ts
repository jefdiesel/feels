const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.feels.fun';

interface ApiError {
  error: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  getAccessToken() {
    return this.accessToken;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // If unauthorized, try to refresh token
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });
      }
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth endpoints
  async sendMagicLink(email: string) {
    return this.request<{ message: string }>('/api/v1/auth/magic/send', {
      method: 'POST',
      body: JSON.stringify({ email, platform: 'web' }),
    });
  }

  async verifyMagicLink(token: string, deviceId: string) {
    const response = await this.request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      is_new_user: boolean;
    }>('/api/v1/auth/magic/verify', {
      method: 'POST',
      body: JSON.stringify({ token, device_id: deviceId, platform: 'web' }),
    });

    this.setTokens(response.access_token, response.refresh_token);
    return response;
  }

  async logout() {
    if (this.refreshToken) {
      try {
        await this.request('/api/v1/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        });
      } catch {
        // Ignore logout errors
      }
    }
    this.clearTokens();
  }

  // User endpoints
  async getCurrentUser() {
    return this.request<{
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
    }>('/api/v1/users/me');
  }

  // Profile endpoints
  async getProfile() {
    return this.request<{
      profile: {
        id: string;
        user_id: string;
        name: string;
        bio: string;
        neighborhood?: string;
        photos: Array<{ id: string; url: string; position: number }>;
        prompts: Array<{ question: string; answer: string }>;
        is_verified: boolean;
        looking_for?: string[];
      };
      age: number;
    }>('/api/v1/profile');
  }

  async updateProfile(data: {
    name?: string;
    bio?: string;
    neighborhood?: string;
    looking_for?: string[];
    prompts?: Array<{ question: string; answer: string }>;
  }) {
    return this.request('/api/v1/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadPhoto(file: File, position: number) {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('position', position.toString());

    const response = await fetch(`${API_URL}/api/v1/profile/photos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async deletePhoto(photoId: string) {
    return this.request(`/api/v1/profile/photos/${photoId}`, {
      method: 'DELETE',
    });
  }

  // Feed endpoints
  async getFeed(limit = 10) {
    return this.request<{
      profiles: Array<{
        id: string;
        user_id: string;
        name: string;
        bio: string;
        age: number;
        neighborhood?: string;
        photos: Array<{ id: string; url: string; position: number }>;
        prompts: Array<{ question: string; answer: string }>;
        is_verified: boolean;
        distance_km?: number;
      }>;
    }>(`/api/v1/feed?limit=${limit}`);
  }

  async like(profileId: string) {
    return this.request<{ match?: { id: string; profile: object } }>(`/api/v1/feed/like/${profileId}`, {
      method: 'POST',
    });
  }

  async pass(profileId: string) {
    return this.request(`/api/v1/feed/pass/${profileId}`, {
      method: 'POST',
    });
  }

  async superlike(profileId: string, message?: string) {
    if (message) {
      return this.request<{ match?: { id: string; profile: object } }>(`/api/v1/feed/superlike/${profileId}/message`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    }
    return this.request<{ match?: { id: string; profile: object } }>(`/api/v1/feed/superlike/${profileId}`, {
      method: 'POST',
    });
  }

  // Match endpoints
  async getMatches() {
    return this.request<{
      matches: Array<{
        id: string;
        profile: {
          id: string;
          user_id: string;
          name: string;
          photos: Array<{ url: string }>;
        };
        last_message?: {
          content: string;
          created_at: string;
          sender_id: string;
        };
        unread_count: number;
        created_at: string;
      }>;
    }>('/api/v1/matches');
  }

  async getMatch(matchId: string) {
    return this.request<{
      id: string;
      profile: object;
      messages: Array<{
        id: string;
        content: string;
        sender_id: string;
        created_at: string;
      }>;
    }>(`/api/v1/matches/${matchId}`);
  }

  async unmatch(matchId: string) {
    return this.request(`/api/v1/matches/${matchId}`, {
      method: 'DELETE',
    });
  }

  // Message endpoints
  async getMessages(matchId: string, cursor?: string) {
    const url = cursor
      ? `/api/v1/matches/${matchId}/messages?cursor=${cursor}`
      : `/api/v1/matches/${matchId}/messages`;
    return this.request<{
      messages: Array<{
        id: string;
        content: string;
        sender_id: string;
        created_at: string;
        image_url?: string;
      }>;
      next_cursor?: string;
    }>(url);
  }

  async sendMessage(matchId: string, content: string) {
    return this.request<{
      id: string;
      content: string;
      sender_id: string;
      created_at: string;
    }>(`/api/v1/matches/${matchId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Settings endpoints
  async getNotificationSettings() {
    return this.request<{
      new_matches: boolean;
      new_messages: boolean;
      likes: boolean;
      marketing: boolean;
    }>('/api/v1/settings/notifications');
  }

  async updateNotificationSettings(settings: {
    new_matches?: boolean;
    new_messages?: boolean;
    likes?: boolean;
    marketing?: boolean;
  }) {
    return this.request('/api/v1/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getPrivacySettings() {
    return this.request<{
      show_online_status: boolean;
      show_read_receipts: boolean;
      discoverable: boolean;
    }>('/api/v1/settings/privacy');
  }

  async updatePrivacySettings(settings: {
    show_online_status?: boolean;
    show_read_receipts?: boolean;
    discoverable?: boolean;
  }) {
    return this.request('/api/v1/settings/privacy', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Payment endpoints
  async getSubscription() {
    return this.request<{
      status: string;
      plan?: string;
      expires_at?: string;
      cancel_at_period_end?: boolean;
    }>('/api/v1/payments/subscription');
  }

  async createPortalSession() {
    return this.request<{ url: string }>('/api/v1/payments/portal', {
      method: 'POST',
    });
  }

  async deleteAccount() {
    return this.request('/api/v1/auth/account', {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
