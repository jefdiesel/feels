import { useCreditsStore } from '../../stores/creditsStore';
import { creditsApi } from '../../api/client';

// Mock the API
jest.mock('../../api/client', () => ({
  creditsApi: {
    getCredits: jest.fn(),
    getSubscription: jest.fn(),
  },
}));

describe('creditsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCreditsStore.setState({
      balance: 0,
      bonusLikes: 0,
      subscription: null,
      isLoading: false,
      error: null,
      lastLoaded: null,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have default values', () => {
      const state = useCreditsStore.getState();
      expect(state.balance).toBe(0);
      expect(state.bonusLikes).toBe(0);
      expect(state.subscription).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadCredits', () => {
    it('should load credits from API', async () => {
      (creditsApi.getCredits as jest.Mock).mockResolvedValue({
        data: { balance: 100, bonus_likes: 5 },
      });

      await useCreditsStore.getState().loadCredits();

      const state = useCreditsStore.getState();
      expect(state.balance).toBe(100);
      expect(state.bonusLikes).toBe(5);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastLoaded).toBeTruthy();
    });

    it('should handle null values from API', async () => {
      (creditsApi.getCredits as jest.Mock).mockResolvedValue({
        data: { balance: null, bonus_likes: null },
      });

      await useCreditsStore.getState().loadCredits();

      const state = useCreditsStore.getState();
      expect(state.balance).toBe(0);
      expect(state.bonusLikes).toBe(0);
    });

    it('should handle API errors', async () => {
      (creditsApi.getCredits as jest.Mock).mockRejectedValue({
        response: { data: { error: 'Server error' } },
      });

      await useCreditsStore.getState().loadCredits();

      const state = useCreditsStore.getState();
      expect(state.error).toBe('Server error');
      expect(state.isLoading).toBe(false);
    });

    it('should use fallback error message', async () => {
      (creditsApi.getCredits as jest.Mock).mockRejectedValue(new Error('Network error'));

      await useCreditsStore.getState().loadCredits();

      const state = useCreditsStore.getState();
      expect(state.error).toBe('Failed to load credits');
    });
  });

  describe('loadSubscription', () => {
    it('should load subscription from API', async () => {
      (creditsApi.getSubscription as jest.Mock).mockResolvedValue({
        data: {
          id: 'sub_123',
          tier: 'plus',
          status: 'active',
          expires_at: '2024-12-31',
          features: ['unlimited_likes', 'see_who_likes'],
        },
      });

      await useCreditsStore.getState().loadSubscription();

      const state = useCreditsStore.getState();
      expect(state.subscription).toEqual({
        id: 'sub_123',
        tier: 'plus',
        status: 'active',
        expiresAt: '2024-12-31',
        features: ['unlimited_likes', 'see_who_likes'],
      });
    });

    it('should handle empty subscription response', async () => {
      (creditsApi.getSubscription as jest.Mock).mockResolvedValue({
        data: {},
      });

      await useCreditsStore.getState().loadSubscription();

      const state = useCreditsStore.getState();
      expect(state.subscription).toBeNull();
    });

    it('should handle 404 gracefully (no subscription)', async () => {
      (creditsApi.getSubscription as jest.Mock).mockRejectedValue({
        response: { status: 404 },
      });

      await useCreditsStore.getState().loadSubscription();

      const state = useCreditsStore.getState();
      expect(state.subscription).toBeNull();
    });
  });

  describe('useCredits', () => {
    it('should deduct credits when balance is sufficient', () => {
      useCreditsStore.setState({ balance: 100 });

      useCreditsStore.getState().useCredits(10);

      expect(useCreditsStore.getState().balance).toBe(90);
    });

    it('should not deduct credits when balance is insufficient', () => {
      useCreditsStore.setState({ balance: 5 });

      useCreditsStore.getState().useCredits(10);

      expect(useCreditsStore.getState().balance).toBe(5);
    });

    it('should handle exact balance', () => {
      useCreditsStore.setState({ balance: 10 });

      useCreditsStore.getState().useCredits(10);

      expect(useCreditsStore.getState().balance).toBe(0);
    });
  });

  describe('useBonusLike', () => {
    it('should use bonus like when available', () => {
      useCreditsStore.setState({ bonusLikes: 5 });

      const result = useCreditsStore.getState().useBonusLike();

      expect(result).toBe(true);
      expect(useCreditsStore.getState().bonusLikes).toBe(4);
    });

    it('should return false when no bonus likes', () => {
      useCreditsStore.setState({ bonusLikes: 0 });

      const result = useCreditsStore.getState().useBonusLike();

      expect(result).toBe(false);
      expect(useCreditsStore.getState().bonusLikes).toBe(0);
    });

    it('should use last bonus like', () => {
      useCreditsStore.setState({ bonusLikes: 1 });

      const result = useCreditsStore.getState().useBonusLike();

      expect(result).toBe(true);
      expect(useCreditsStore.getState().bonusLikes).toBe(0);
    });
  });

  describe('hasEnoughCredits', () => {
    it('should return true when balance is sufficient', () => {
      useCreditsStore.setState({ balance: 100 });

      expect(useCreditsStore.getState().hasEnoughCredits(50)).toBe(true);
    });

    it('should return false when balance is insufficient', () => {
      useCreditsStore.setState({ balance: 5 });

      expect(useCreditsStore.getState().hasEnoughCredits(10)).toBe(false);
    });

    it('should return true when balance equals amount', () => {
      useCreditsStore.setState({ balance: 10 });

      expect(useCreditsStore.getState().hasEnoughCredits(10)).toBe(true);
    });

    it('should return true for zero amount', () => {
      useCreditsStore.setState({ balance: 0 });

      expect(useCreditsStore.getState().hasEnoughCredits(0)).toBe(true);
    });
  });

  describe('isLowCredits', () => {
    it('should return true when balance is below threshold (10)', () => {
      useCreditsStore.setState({ balance: 5 });

      expect(useCreditsStore.getState().isLowCredits()).toBe(true);
    });

    it('should return false when balance is at threshold', () => {
      useCreditsStore.setState({ balance: 10 });

      expect(useCreditsStore.getState().isLowCredits()).toBe(false);
    });

    it('should return false when balance is above threshold', () => {
      useCreditsStore.setState({ balance: 100 });

      expect(useCreditsStore.getState().isLowCredits()).toBe(false);
    });

    it('should return true when balance is zero', () => {
      useCreditsStore.setState({ balance: 0 });

      expect(useCreditsStore.getState().isLowCredits()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      useCreditsStore.setState({
        balance: 100,
        bonusLikes: 5,
        subscription: { id: 'sub_123', tier: 'plus', status: 'active', expiresAt: '2024-12-31', features: [] },
        isLoading: true,
        error: 'Some error',
        lastLoaded: Date.now(),
      });

      useCreditsStore.getState().reset();

      const state = useCreditsStore.getState();
      expect(state.balance).toBe(0);
      expect(state.bonusLikes).toBe(0);
      expect(state.subscription).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastLoaded).toBeNull();
    });
  });
});
