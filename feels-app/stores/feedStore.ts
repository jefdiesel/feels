import { create } from 'zustand';
import { feedApi } from '@/api/client';

export interface ProfilePrompt {
  question: string;
  answer: string;
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  bio?: string;
  photos: string[];
  location?: string;
  distance?: number;
  kinkLevel?: string;
  prompts?: ProfilePrompt[];
  interests?: string[];
  lookingFor?: string;
  lookingForAlignment?: 'perfect' | 'similar'; // alignment with your intentions
}

// Backend response types
interface BackendPhoto {
  id: string;
  user_id: string;
  url: string;
  position: number;
}

interface BackendPrompt {
  question: string;
  answer: string;
}

interface BackendProfile {
  user_id: string;
  name: string;
  age: number;
  bio?: string;
  photos?: BackendPhoto[];
  neighborhood?: string;
  distance?: number;
  kink_level?: string;
  prompts?: BackendPrompt[];
  interests?: string[];
  looking_for?: string;
  looking_for_alignment?: 'perfect' | 'similar';
}

interface FeedResponse {
  profiles: BackendProfile[];
  has_more: boolean;
  queued_likes: number;
  must_process_all: boolean;
}

// Transform backend profile to frontend format
function transformProfile(bp: BackendProfile): Profile {
  return {
    id: bp.user_id,
    name: bp.name,
    age: bp.age,
    bio: bp.bio,
    photos: bp.photos?.map((p) => p.url) || [],
    location: bp.neighborhood,
    distance: bp.distance,
    kinkLevel: bp.kink_level,
    prompts: bp.prompts,
    interests: bp.interests,
    lookingFor: bp.looking_for,
    lookingForAlignment: bp.looking_for_alignment,
  };
}

interface FeedState {
  profiles: Profile[];
  currentIndex: number;
  isLoading: boolean;
  error: string | null;

  loadProfiles: (forceRefresh?: boolean) => Promise<void>;
  nextProfile: () => void;
  swipe: (action: 'like' | 'pass' | 'superlike') => Promise<boolean>;
  reset: () => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  profiles: [],
  currentIndex: 0,
  isLoading: false,
  error: null,

  loadProfiles: async (forceRefresh = false) => {
    const { profiles: existingProfiles, currentIndex } = get();

    // Don't reload if we still have profiles to view, unless forced
    if (!forceRefresh && existingProfiles.length > 0 && currentIndex < existingProfiles.length) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await feedApi.getProfiles(20);
      const feedResponse: FeedResponse = response.data;
      const profiles = feedResponse.profiles.map(transformProfile);
      set({ profiles, currentIndex: 0, isLoading: false });
    } catch (error: any) {
      console.error('Feed load error:', error);
      // Check if profile is required (428 Precondition Required)
      if (error.response?.status === 428) {
        set({
          error: 'PROFILE_REQUIRED',
          isLoading: false,
        });
        return;
      }
      set({
        error: error.response?.data?.error || 'Failed to load profiles',
        isLoading: false,
      });
    }
  },

  nextProfile: () => {
    const { currentIndex, profiles } = get();
    if (currentIndex < profiles.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    } else {
      // Reload profiles when we run out (force refresh)
      get().loadProfiles(true);
    }
  },

  swipe: async (action: 'like' | 'pass' | 'superlike') => {
    const { profiles, currentIndex } = get();
    const profile = profiles[currentIndex];

    if (!profile) return false;

    try {
      const response = await feedApi.swipe(profile.id, action);
      get().nextProfile();

      // Return true if it's a match (backend returns { matched: bool, match_id?: string })
      return response.data?.matched || false;
    } catch (error: any) {
      // Don't advance on failure - let user retry
      set({ error: 'Swipe failed. Please try again.' });
      throw error;
    }
  },

  reset: () => {
    set({ profiles: [], currentIndex: 0, isLoading: false, error: null });
  },
}));
