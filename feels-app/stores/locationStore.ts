import { create } from 'zustand';
import * as Location from 'expo-location';
import { api } from '@/api/client';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  permissionStatus: PermissionStatus;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;

  requestPermission: () => Promise<boolean>;
  updateLocation: () => Promise<void>;
  reset: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  latitude: null,
  longitude: null,
  permissionStatus: 'undetermined',
  isLoading: false,
  error: null,
  lastUpdated: null,

  requestPermission: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      set({ permissionStatus: granted ? 'granted' : 'denied' });
      return granted;
    } catch (error) {
      console.error('Failed to request location permission:', error);
      set({ permissionStatus: 'denied' });
      return false;
    }
  },

  updateLocation: async () => {
    const { permissionStatus } = get();

    // If permission not granted, try to request it
    if (permissionStatus !== 'granted') {
      const granted = await get().requestPermission();
      if (!granted) {
        set({ error: 'Location permission denied' });
        return;
      }
    }

    set({ isLoading: true, error: null });

    try {
      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      console.log('Got location:', latitude, longitude);

      // Validate coordinates look reasonable (not 0,0 or clearly wrong)
      const isValidLocation = latitude !== 0 && longitude !== 0 &&
        Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

      // Detect Android emulator default coords (Mountain View, CA)
      // These are useless for NYC-based app
      const isMountainView = Math.abs(latitude - 37.4220) < 0.01 &&
        Math.abs(longitude - (-122.084)) < 0.01;

      if (isMountainView) {
        console.log('Detected emulator default location (Mountain View), ignoring');
        set({
          isLoading: false,
          error: 'Using emulator? Set location manually in your profile.',
        });
        return;
      }

      if (!isValidLocation) {
        console.log('Skipping invalid location:', latitude, longitude);
        set({
          isLoading: false,
          error: 'Could not get valid location',
        });
        return;
      }

      // Send to backend first, only update local state on success
      try {
        await api.put('/profile', { lat: latitude, lng: longitude });
        console.log('Sent location to backend:', latitude, longitude);

        // Backend confirmed - now update local state
        set({
          latitude,
          longitude,
          isLoading: false,
          lastUpdated: Date.now(),
          error: null,
        });
      } catch (apiError: any) {
        console.error('Failed to update location on server:', apiError);
        set({
          isLoading: false,
          error: 'Failed to save location. Try again.',
        });
      }
    } catch (error: any) {
      console.error('Failed to get location:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to get location',
      });
    }
  },

  reset: () => {
    set({
      latitude: null,
      longitude: null,
      permissionStatus: 'undetermined',
      isLoading: false,
      error: null,
      lastUpdated: null,
    });
  },
}));
