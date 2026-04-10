import { useFeedStore } from '../../stores/feedStore';
import { feedApi } from '../../api/client';

// Mock the API
jest.mock('../../api/client', () => ({
  feedApi: {
    getProfiles: jest.fn(),
    swipe: jest.fn(),
  },
}));

describe('feedStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useFeedStore.setState({
      profiles: [],
      currentIndex: 0,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have default values', () => {
      const state = useFeedStore.getState();
      expect(state.profiles).toEqual([]);
      expect(state.currentIndex).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadProfiles', () => {
    const mockBackendProfiles = [
      {
        user_id: 'user1',
        name: 'Alice',
        age: 25,
        gender: 'woman',
        bio: 'Hello!',
        photos: [{ id: 'p1', user_id: 'user1', url: 'https://example.com/1.jpg', position: 0 }],
        neighborhood: 'Brooklyn',
        distance: 2.5,
        kink_level: 'curious',
        looking_for: 'relationship',
        looking_for_alignment: 'perfect',
      },
      {
        user_id: 'user2',
        name: 'Bob',
        age: 28,
        photos: [],
      },
    ];

    it('should load and transform profiles from API', async () => {
      (feedApi.getProfiles as jest.Mock).mockResolvedValue({
        data: { profiles: mockBackendProfiles, has_more: true, queued_likes: 3, must_process_all: false },
      });

      await useFeedStore.getState().loadProfiles(true);

      const state = useFeedStore.getState();
      expect(state.profiles).toHaveLength(2);
      expect(state.profiles[0]).toEqual({
        id: 'user1',
        name: 'Alice',
        age: 25,
        gender: 'woman',
        bio: 'Hello!',
        photos: ['https://example.com/1.jpg'],
        location: 'Brooklyn',
        distance: 2.5,
        kinkLevel: 'curious',
        prompts: undefined,
        interests: undefined,
        lookingFor: 'relationship',
        lookingForAlignment: 'perfect',
        hasKids: undefined,
        wantsKids: undefined,
        religion: undefined,
        alcohol: undefined,
        weed: undefined,
        zodiac: undefined,
        workForMoney: undefined,
        workForPassion: undefined,
      });
      expect(state.currentIndex).toBe(0);
      expect(state.isLoading).toBe(false);
    });

    it('should handle empty profile list', async () => {
      (feedApi.getProfiles as jest.Mock).mockResolvedValue({
        data: { profiles: [], has_more: false, queued_likes: 0, must_process_all: false },
      });

      await useFeedStore.getState().loadProfiles(true);

      const state = useFeedStore.getState();
      expect(state.profiles).toEqual([]);
    });

    it('should handle null profiles response', async () => {
      (feedApi.getProfiles as jest.Mock).mockResolvedValue({
        data: { profiles: null },
      });

      await useFeedStore.getState().loadProfiles(true);

      const state = useFeedStore.getState();
      expect(state.profiles).toEqual([]);
    });

    it('should not reload if profiles exist and not forced', async () => {
      useFeedStore.setState({
        profiles: [{ id: 'existing', name: 'Test', age: 25, photos: [] }],
        currentIndex: 0,
      });

      await useFeedStore.getState().loadProfiles(false);

      expect(feedApi.getProfiles).not.toHaveBeenCalled();
    });

    it('should reload when forced even if profiles exist', async () => {
      useFeedStore.setState({
        profiles: [{ id: 'existing', name: 'Test', age: 25, photos: [] }],
        currentIndex: 0,
      });
      (feedApi.getProfiles as jest.Mock).mockResolvedValue({
        data: { profiles: [], has_more: false },
      });

      await useFeedStore.getState().loadProfiles(true);

      expect(feedApi.getProfiles).toHaveBeenCalled();
    });

    it('should handle 428 PROFILE_REQUIRED error', async () => {
      (feedApi.getProfiles as jest.Mock).mockRejectedValue({
        response: { status: 428 },
      });

      await useFeedStore.getState().loadProfiles(true);

      const state = useFeedStore.getState();
      expect(state.error).toBe('PROFILE_REQUIRED');
      expect(state.isLoading).toBe(false);
    });

    it('should handle API error with server message', async () => {
      (feedApi.getProfiles as jest.Mock).mockRejectedValue({
        response: { status: 500, data: { error: 'Database connection failed' } },
      });

      await useFeedStore.getState().loadProfiles(true);

      const state = useFeedStore.getState();
      expect(state.error).toBe('Database connection failed (500)');
    });

    it('should handle network error', async () => {
      (feedApi.getProfiles as jest.Mock).mockRejectedValue({
        message: 'Network Error',
      });

      await useFeedStore.getState().loadProfiles(true);

      const state = useFeedStore.getState();
      expect(state.error).toBe('Network Error');
    });
  });

  describe('nextProfile', () => {
    it('should increment currentIndex', () => {
      useFeedStore.setState({
        profiles: [
          { id: 'user1', name: 'Alice', age: 25, photos: [] },
          { id: 'user2', name: 'Bob', age: 28, photos: [] },
        ],
        currentIndex: 0,
      });

      useFeedStore.getState().nextProfile();

      expect(useFeedStore.getState().currentIndex).toBe(1);
    });

    it('should reload profiles when at end of list', async () => {
      (feedApi.getProfiles as jest.Mock).mockResolvedValue({
        data: { profiles: [], has_more: false },
      });
      useFeedStore.setState({
        profiles: [{ id: 'user1', name: 'Alice', age: 25, photos: [] }],
        currentIndex: 0,
      });

      useFeedStore.getState().nextProfile();

      // Should trigger loadProfiles(true)
      expect(feedApi.getProfiles).toHaveBeenCalled();
    });
  });

  describe('swipe', () => {
    beforeEach(() => {
      useFeedStore.setState({
        profiles: [
          { id: 'user1', name: 'Alice', age: 25, photos: [] },
          { id: 'user2', name: 'Bob', age: 28, photos: [] },
        ],
        currentIndex: 0,
      });
    });

    it('should handle like action and return match status', async () => {
      (feedApi.swipe as jest.Mock).mockResolvedValue({
        data: { matched: true, match_id: 'match_123' },
      });

      const result = await useFeedStore.getState().swipe('like');

      expect(result).toBe(true);
      expect(feedApi.swipe).toHaveBeenCalledWith('user1', 'like');
      expect(useFeedStore.getState().currentIndex).toBe(1);
    });

    it('should handle pass action', async () => {
      (feedApi.swipe as jest.Mock).mockResolvedValue({
        data: { matched: false },
      });

      const result = await useFeedStore.getState().swipe('pass');

      expect(result).toBe(false);
      expect(feedApi.swipe).toHaveBeenCalledWith('user1', 'pass');
    });

    it('should handle superlike action', async () => {
      (feedApi.swipe as jest.Mock).mockResolvedValue({
        data: { matched: true },
      });

      const result = await useFeedStore.getState().swipe('superlike');

      expect(result).toBe(true);
      expect(feedApi.swipe).toHaveBeenCalledWith('user1', 'superlike');
    });

    it('should return false when no current profile', async () => {
      useFeedStore.setState({ profiles: [], currentIndex: 0 });

      const result = await useFeedStore.getState().swipe('like');

      expect(result).toBe(false);
      expect(feedApi.swipe).not.toHaveBeenCalled();
    });

    it('should handle 402 out of credits error', async () => {
      (feedApi.swipe as jest.Mock).mockRejectedValue({
        response: { status: 402, data: { error: 'Insufficient credits' } },
      });

      try {
        await useFeedStore.getState().swipe('superlike');
      } catch (e) {
        // Expected to throw
      }

      const state = useFeedStore.getState();
      expect(state.error).toBe('Insufficient credits');
      // Should NOT advance to next profile
      expect(state.currentIndex).toBe(0);
    });

    it('should handle 409 already liked and skip to next', async () => {
      (feedApi.swipe as jest.Mock).mockRejectedValue({
        response: { status: 409, data: { error: 'Already liked' } },
      });

      // 409 returns false instead of throwing, and skips to next profile
      const result = await useFeedStore.getState().swipe('like');

      expect(result).toBe(false);
      const state = useFeedStore.getState();
      // 409 silently skips to next profile without setting error
      expect(state.currentIndex).toBe(1);
    });

    it('should handle generic error', async () => {
      (feedApi.swipe as jest.Mock).mockRejectedValue({
        response: { status: 500 },
      });

      try {
        await useFeedStore.getState().swipe('like');
      } catch (e) {
        // Expected to throw
      }

      const state = useFeedStore.getState();
      expect(state.error).toBe('Swipe failed. Please try again.');
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      useFeedStore.setState({
        profiles: [{ id: 'user1', name: 'Alice', age: 25, photos: [] }],
        currentIndex: 5,
        isLoading: true,
        error: 'Some error',
      });

      useFeedStore.getState().reset();

      const state = useFeedStore.getState();
      expect(state.profiles).toEqual([]);
      expect(state.currentIndex).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('profile transformation', () => {
    it('should correctly map snake_case to camelCase', async () => {
      (feedApi.getProfiles as jest.Mock).mockResolvedValue({
        data: {
          profiles: [
            {
              user_id: 'user1',
              name: 'Test',
              age: 30,
              looking_for: 'relationship',
              looking_for_alignment: 'similar',
              has_kids: true,
              wants_kids: 'someday',
              kink_level: 'experienced',
              work_for_money: 'Software Engineer',
              work_for_passion: 'Music',
            },
          ],
        },
      });

      await useFeedStore.getState().loadProfiles(true);

      const profile = useFeedStore.getState().profiles[0];
      expect(profile.lookingFor).toBe('relationship');
      expect(profile.lookingForAlignment).toBe('similar');
      expect(profile.hasKids).toBe(true);
      expect(profile.wantsKids).toBe('someday');
      expect(profile.kinkLevel).toBe('experienced');
      expect(profile.workForMoney).toBe('Software Engineer');
      expect(profile.workForPassion).toBe('Music');
    });

    it('should extract photo URLs from photo objects', async () => {
      (feedApi.getProfiles as jest.Mock).mockResolvedValue({
        data: {
          profiles: [
            {
              user_id: 'user1',
              name: 'Test',
              age: 25,
              photos: [
                { id: 'p1', user_id: 'user1', url: 'https://example.com/1.jpg', position: 0 },
                { id: 'p2', user_id: 'user1', url: 'https://example.com/2.jpg', position: 1 },
              ],
            },
          ],
        },
      });

      await useFeedStore.getState().loadProfiles(true);

      const profile = useFeedStore.getState().profiles[0];
      expect(profile.photos).toEqual([
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
      ]);
    });

    it('should handle missing photos array', async () => {
      (feedApi.getProfiles as jest.Mock).mockResolvedValue({
        data: {
          profiles: [
            {
              user_id: 'user1',
              name: 'Test',
              age: 25,
              // No photos field
            },
          ],
        },
      });

      await useFeedStore.getState().loadProfiles(true);

      const profile = useFeedStore.getState().profiles[0];
      expect(profile.photos).toEqual([]);
    });
  });
});
