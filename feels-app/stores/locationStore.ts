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

      // Update local state
      set({
        latitude: isValidLocation ? latitude : null,
        longitude: isValidLocation ? longitude : null,
        isLoading: false,
        lastUpdated: Date.now(),
      });

      // Only send to backend if location looks valid
      if (isValidLocation) {
        try {
          await api.put('/profile', { lat: latitude, lng: longitude });
          console.log('Sent location to backend:', latitude, longitude);
        } catch (apiError) {
          console.error('Failed to update location on server:', apiError);
        }
      } else {
        console.log('Skipping invalid location:', latitude, longitude);
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
