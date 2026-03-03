import { useLocationStore } from '../../stores/locationStore';
import * as Location from 'expo-location';
import { api } from '../../api/client';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 3,
  },
}));

// Mock API
jest.mock('../../api/client', () => ({
  api: {
    put: jest.fn(),
  },
}));

describe('locationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useLocationStore.setState({
      latitude: null,
      longitude: null,
      permissionStatus: 'undetermined',
      isLoading: false,
      error: null,
      lastUpdated: null,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have default values', () => {
      const state = useLocationStore.getState();
      expect(state.latitude).toBeNull();
      expect(state.longitude).toBeNull();
      expect(state.permissionStatus).toBe('undetermined');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeNull();
    });
  });

  describe('requestPermission', () => {
    it('should return true when permission granted', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await useLocationStore.getState().requestPermission();

      expect(result).toBe(true);
      expect(useLocationStore.getState().permissionStatus).toBe('granted');
    });

    it('should return false when permission denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await useLocationStore.getState().requestPermission();

      expect(result).toBe(false);
      expect(useLocationStore.getState().permissionStatus).toBe('denied');
    });

    it('should handle permission request error', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );

      const result = await useLocationStore.getState().requestPermission();

      expect(result).toBe(false);
      expect(useLocationStore.getState().permissionStatus).toBe('denied');
    });
  });

  describe('updateLocation', () => {
    it('should update location when permission granted', async () => {
      useLocationStore.setState({ permissionStatus: 'granted' });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 40.7128, longitude: -74.006 },
      });
      (api.put as jest.Mock).mockResolvedValue({});

      await useLocationStore.getState().updateLocation();

      const state = useLocationStore.getState();
      expect(state.latitude).toBe(40.7128);
      expect(state.longitude).toBe(-74.006);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeTruthy();
      expect(api.put).toHaveBeenCalledWith('/profile', { lat: 40.7128, lng: -74.006 });
    });

    it('should request permission if not granted', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 40.7128, longitude: -74.006 },
      });
      (api.put as jest.Mock).mockResolvedValue({});

      await useLocationStore.getState().updateLocation();

      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(useLocationStore.getState().latitude).toBe(40.7128);
    });

    it('should set error when permission denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      await useLocationStore.getState().updateLocation();

      const state = useLocationStore.getState();
      expect(state.error).toBe('Location permission denied');
      expect(state.latitude).toBeNull();
    });

    it('should reject Mountain View emulator coordinates', async () => {
      useLocationStore.setState({ permissionStatus: 'granted' });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 37.4220, longitude: -122.084 },
      });

      await useLocationStore.getState().updateLocation();

      const state = useLocationStore.getState();
      expect(state.error).toBe('Using emulator? Set location manually in your profile.');
      expect(state.latitude).toBeNull();
      expect(api.put).not.toHaveBeenCalled();
    });

    it('should reject coordinates close to Mountain View', async () => {
      useLocationStore.setState({ permissionStatus: 'granted' });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 37.4225, longitude: -122.0845 }, // Very close
      });

      await useLocationStore.getState().updateLocation();

      expect(useLocationStore.getState().error).toContain('emulator');
    });

    it('should reject 0,0 coordinates', async () => {
      useLocationStore.setState({ permissionStatus: 'granted' });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 0, longitude: 0 },
      });

      await useLocationStore.getState().updateLocation();

      const state = useLocationStore.getState();
      expect(state.error).toBe('Could not get valid location');
      expect(state.latitude).toBeNull();
    });

    it('should reject invalid latitude', async () => {
      useLocationStore.setState({ permissionStatus: 'granted' });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 100, longitude: -74.006 }, // Invalid: > 90
      });

      await useLocationStore.getState().updateLocation();

      const state = useLocationStore.getState();
      expect(state.error).toBe('Could not get valid location');
    });

    it('should reject invalid longitude', async () => {
      useLocationStore.setState({ permissionStatus: 'granted' });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 40.7128, longitude: 200 }, // Invalid: > 180
      });

      await useLocationStore.getState().updateLocation();

      const state = useLocationStore.getState();
      expect(state.error).toBe('Could not get valid location');
    });

    it('should handle API error when saving location', async () => {
      useLocationStore.setState({ permissionStatus: 'granted' });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 40.7128, longitude: -74.006 },
      });
      (api.put as jest.Mock).mockRejectedValue(new Error('Server error'));

      await useLocationStore.getState().updateLocation();

      const state = useLocationStore.getState();
      expect(state.error).toBe('Failed to save location. Try again.');
      expect(state.latitude).toBeNull(); // Should NOT update local state
    });

    it('should handle location fetch error', async () => {
      useLocationStore.setState({ permissionStatus: 'granted' });
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
        new Error('GPS unavailable')
      );

      await useLocationStore.getState().updateLocation();

      const state = useLocationStore.getState();
      expect(state.error).toBe('GPS unavailable');
      expect(state.isLoading).toBe(false);
    });

    it('should accept valid NYC coordinates', async () => {
      useLocationStore.setState({ permissionStatus: 'granted' });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 40.758, longitude: -73.9855 }, // Times Square
      });
      (api.put as jest.Mock).mockResolvedValue({});

      await useLocationStore.getState().updateLocation();

      const state = useLocationStore.getState();
      expect(state.latitude).toBe(40.758);
      expect(state.longitude).toBe(-73.9855);
      expect(state.error).toBeNull();
    });

    it('should accept valid international coordinates', async () => {
      useLocationStore.setState({ permissionStatus: 'granted' });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: -33.8688, longitude: 151.2093 }, // Sydney
      });
      (api.put as jest.Mock).mockResolvedValue({});

      await useLocationStore.getState().updateLocation();

      const state = useLocationStore.getState();
      expect(state.latitude).toBe(-33.8688);
      expect(state.longitude).toBe(151.2093);
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      useLocationStore.setState({
        latitude: 40.7128,
        longitude: -74.006,
        permissionStatus: 'granted',
        isLoading: true,
        error: 'Some error',
        lastUpdated: Date.now(),
      });

      useLocationStore.getState().reset();

      const state = useLocationStore.getState();
      expect(state.latitude).toBeNull();
      expect(state.longitude).toBeNull();
      expect(state.permissionStatus).toBe('undetermined');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeNull();
    });
  });
});
