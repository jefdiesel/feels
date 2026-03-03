import { useAuthStore } from '../../stores/authStore';
import { api } from '../../api/client';
import { storage } from '../../stores/storage';

// Mock the API and storage
jest.mock('../../api/client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('../../stores/storage', () => ({
  storage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    deleteItem: jest.fn(),
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      deviceId: null,
      isLoading: false,
      isAuthenticated: false,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have default values', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { access_token: 'token123', refresh_token: 'refresh123' },
      });
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { id: 'user1', email: 'test@example.com', name: 'Test User' },
      });
      (storage.getItem as jest.Mock).mockResolvedValue(null);
      (storage.setItem as jest.Mock).mockResolvedValue(undefined);

      await useAuthStore.getState().login('test@example.com', 'password123');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('token123');
      expect(state.refreshToken).toBe('refresh123');
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual({ id: 'user1', email: 'test@example.com', name: 'Test User' });
      expect(storage.setItem).toHaveBeenCalledWith('accessToken', 'token123');
      expect(storage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh123');
    });

    it('should include TOTP code when provided', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { access_token: 'token123', refresh_token: 'refresh123' },
      });
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { id: 'user1', email: 'test@example.com', name: 'Test User' },
      });
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().login('test@example.com', 'password123', '123456');

      expect(api.post).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
        email: 'test@example.com',
        password: 'password123',
        totp_code: '123456',
      }));
    });

    it('should handle login error with server message', async () => {
      (api.post as jest.Mock).mockRejectedValue({
        response: { data: { error: 'Invalid credentials' } },
      });
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(useAuthStore.getState().login('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle network error', async () => {
      (api.post as jest.Mock).mockRejectedValue({
        code: 'ERR_NETWORK',
      });
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(useAuthStore.getState().login('test@example.com', 'password')).rejects.toThrow('Network error. Please check your connection.');
    });

    it('should handle timeout error', async () => {
      (api.post as jest.Mock).mockRejectedValue({
        code: 'ECONNABORTED',
      });
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(useAuthStore.getState().login('test@example.com', 'password')).rejects.toThrow('Connection timed out. Please try again.');
    });

    it('should still authenticate if user profile fetch fails', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { access_token: 'token123', refresh_token: 'refresh123' },
      });
      (api.get as jest.Mock).mockRejectedValueOnce(new Error('Profile not found'));
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().login('test@example.com', 'password123');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toBeNull();
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { access_token: 'token123', refresh_token: 'refresh123', user: { id: 'user1', email: 'new@example.com' } },
      });
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().register('John', 'new@example.com', 'password123', '555-123-4567');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.name).toBe('John');
      expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
        email: 'new@example.com',
        password: 'password123',
        phone: '5551234567', // Stripped formatting
      }));
    });

    it('should strip phone formatting', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { access_token: 'token123', refresh_token: 'refresh123', user: {} },
      });
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().register('John', 'new@example.com', 'pass', '(555) 123-4567');

      expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
        phone: '5551234567',
      }));
    });

    it('should handle registration error', async () => {
      (api.post as jest.Mock).mockRejectedValue({
        response: { data: { error: 'Email already exists' } },
      });
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(useAuthStore.getState().register('John', 'existing@example.com', 'pass', '555')).rejects.toThrow('Email already exists');
    });
  });

  describe('logout', () => {
    it('should logout and clear state', async () => {
      useAuthStore.setState({
        user: { id: 'user1', email: 'test@example.com', name: 'Test', phone_verified: false, totp_enabled: false, photos: [] },
        accessToken: 'token123',
        refreshToken: 'refresh123',
        isAuthenticated: true,
      });
      (storage.getItem as jest.Mock).mockResolvedValue('refresh123');
      (api.post as jest.Mock).mockResolvedValue({});

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(storage.deleteItem).toHaveBeenCalledWith('accessToken');
      expect(storage.deleteItem).toHaveBeenCalledWith('refreshToken');
    });

    it('should clear state even if API call fails', async () => {
      useAuthStore.setState({
        user: { id: 'user1', email: 'test@example.com', name: 'Test', phone_verified: false, totp_enabled: false, photos: [] },
        accessToken: 'token123',
        refreshToken: 'refresh123',
        isAuthenticated: true,
      });
      (storage.getItem as jest.Mock).mockResolvedValue('refresh123');
      (api.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('loadTokens', () => {
    it('should load existing tokens and fetch user', async () => {
      (storage.getItem as jest.Mock)
        .mockResolvedValueOnce('token123') // accessToken
        .mockResolvedValueOnce('refresh123') // refreshToken
        .mockResolvedValueOnce(null); // deviceId (will be created)
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { id: 'user1', email: 'test@example.com', name: 'Test User' },
      });

      await useAuthStore.getState().loadTokens();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('token123');
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.name).toBe('Test User');
    });

    it('should refresh token if user fetch fails', async () => {
      (storage.getItem as jest.Mock)
        .mockResolvedValueOnce('expired_token') // accessToken
        .mockResolvedValueOnce('refresh123') // refreshToken
        .mockResolvedValueOnce('device123'); // deviceId
      (api.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Unauthorized')) // First user fetch
        .mockResolvedValueOnce({ data: { id: 'user1', name: 'Test' } }); // After refresh
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { access_token: 'new_token', refresh_token: 'new_refresh' },
      });

      await useAuthStore.getState().loadTokens();

      expect(api.post).toHaveBeenCalledWith('/auth/refresh', expect.objectContaining({
        refresh_token: 'refresh123',
      }));
      expect(storage.setItem).toHaveBeenCalledWith('accessToken', 'new_token');
    });

    it('should logout if refresh fails', async () => {
      (storage.getItem as jest.Mock)
        .mockResolvedValueOnce('expired_token')
        .mockResolvedValueOnce('expired_refresh')
        .mockResolvedValueOnce('device123');
      (api.get as jest.Mock).mockRejectedValue(new Error('Unauthorized'));
      (api.post as jest.Mock).mockRejectedValue(new Error('Refresh failed'));

      await useAuthStore.getState().loadTokens();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should not set authenticated if no tokens', async () => {
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().loadTokens();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('sendMagicLink', () => {
    it('should send magic link email', async () => {
      (api.post as jest.Mock).mockResolvedValue({});

      await useAuthStore.getState().sendMagicLink('test@example.com');

      expect(api.post).toHaveBeenCalledWith('/auth/magic/send', { email: 'test@example.com' });
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle error', async () => {
      (api.post as jest.Mock).mockRejectedValue({
        response: { data: { error: 'Email not found' } },
      });

      await expect(useAuthStore.getState().sendMagicLink('unknown@example.com')).rejects.toThrow('Email not found');
    });
  });

  describe('verifyMagicLink', () => {
    it('should verify magic link and authenticate', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: { access_token: 'token123', refresh_token: 'refresh123' },
      });
      (api.get as jest.Mock).mockResolvedValueOnce({
        data: { id: 'user1', email: 'test@example.com', name: 'Test' },
      });
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().verifyMagicLink('magic_token_123');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(api.post).toHaveBeenCalledWith('/auth/magic/verify', expect.objectContaining({
        token: 'magic_token_123',
      }));
    });

    it('should handle invalid/expired token', async () => {
      (api.post as jest.Mock).mockRejectedValue({
        response: { data: { error: 'Token expired' } },
      });
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(useAuthStore.getState().verifyMagicLink('expired_token')).rejects.toThrow('Token expired');
    });
  });

  describe('phone verification', () => {
    it('should send phone code', async () => {
      (api.post as jest.Mock).mockResolvedValue({});

      await useAuthStore.getState().sendPhoneCode('(555) 123-4567');

      expect(api.post).toHaveBeenCalledWith('/auth/phone/send', { phone: '5551234567' });
    });

    it('should verify phone and update user', async () => {
      useAuthStore.setState({
        user: { id: 'user1', email: 'test@example.com', name: 'Test', phone_verified: false, totp_enabled: false, photos: [] },
      });
      (api.post as jest.Mock).mockResolvedValue({});

      await useAuthStore.getState().verifyPhone('555-123-4567', '123456');

      const state = useAuthStore.getState();
      expect(state.user?.phone_verified).toBe(true);
      expect(api.post).toHaveBeenCalledWith('/auth/phone/verify', { phone: '5551234567', code: '123456' });
    });
  });

  describe('setUser', () => {
    it('should update user in state', () => {
      const newUser = {
        id: 'user1',
        email: 'test@example.com',
        name: 'Updated Name',
        phone_verified: true,
        totp_enabled: false,
        photos: ['photo1.jpg'],
      };

      useAuthStore.getState().setUser(newUser);

      expect(useAuthStore.getState().user).toEqual(newUser);
    });
  });

  describe('public key management', () => {
    it('should upload public key', async () => {
      (api.post as jest.Mock).mockResolvedValue({});

      await useAuthStore.getState().uploadPublicKey('base64_public_key');

      expect(api.post).toHaveBeenCalledWith('/keys/public', {
        public_key: 'base64_public_key',
        key_type: 'ECDH-P256',
      });
    });

    it('should get public key for user', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: { public_key: 'user_public_key' },
      });

      const key = await useAuthStore.getState().getPublicKey('user123');

      expect(key).toBe('user_public_key');
      expect(api.get).toHaveBeenCalledWith('/keys/public', { params: { user_id: 'user123' } });
    });

    it('should return null if key not found', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Not found'));

      const key = await useAuthStore.getState().getPublicKey('unknown_user');

      expect(key).toBeNull();
    });
  });

  describe('getDeviceId', () => {
    it('should create device ID if not exists', async () => {
      (storage.getItem as jest.Mock).mockResolvedValue(null);

      const deviceId = await useAuthStore.getState().getDeviceId();

      expect(deviceId).toMatch(/^ios-\d+-[a-z0-9]+$/);
      expect(storage.setItem).toHaveBeenCalledWith('deviceId', expect.any(String));
    });

    it('should return cached device ID', async () => {
      useAuthStore.setState({ deviceId: 'cached_device_id' });

      const deviceId = await useAuthStore.getState().getDeviceId();

      expect(deviceId).toBe('cached_device_id');
      expect(storage.getItem).not.toHaveBeenCalled();
    });

    it('should return stored device ID', async () => {
      (storage.getItem as jest.Mock).mockResolvedValue('stored_device_id');

      const deviceId = await useAuthStore.getState().getDeviceId();

      expect(deviceId).toBe('stored_device_id');
    });
  });
});
