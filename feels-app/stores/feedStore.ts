import { create } from 'zustand';
import { feedApi } from '@/api/client';

export interface ProfilePrompt {
  id?: string;
  question: string;
  answer: string;
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  gender?: string;
  bio?: string;
  photos: string[];
  location?: string;
  distance?: number;
  kinkLevel?: string;
  prompts?: ProfilePrompt[];
  interests?: string[];
  lookingFor?: string;
  lookingForAlignment?: 'perfect' | 'similar';
  hasKids?: boolean;
  wantsKids?: string;
  religion?: string;
  alcohol?: string;
  weed?: string;
  zodiac?: string;
  workForMoney?: string;
  workForPassion?: string;
}

// Backend response types
interface BackendPhoto {
  id: string;
  user_id: string;
  url: string;
  position: number;
}

interface BackendPrompt {
  id?: string;
  question: string;
  answer: string;
}

interface BackendProfile {
  user_id: string;
  name: string;
  age: number;
  gender?: string;
  bio?: string;
  photos?: BackendPhoto[];
  neighborhood?: string;
  distance?: number;
  kink_level?: string;
  prompts?: BackendPrompt[];
  interests?: string[];
  looking_for?: string;
  looking_for_alignment?: 'perfect' | 'similar';
  has_kids?: boolean;
  wants_kids?: string;
  religion?: string;
  alcohol?: string;
  weed?: string;
  zodiac?: string;
  work_for_money?: string;
  work_for_passion?: string;
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
    gender: bp.gender,
    bio: bp.bio,
    photos: bp.photos?.map((p) => p.url) || [],
    location: bp.neighborhood,
    distance: bp.distance,
    kinkLevel: bp.kink_level,
    prompts: bp.prompts,
    interests: bp.interests,
    lookingFor: bp.looking_for,
    lookingForAlignment: bp.looking_for_alignment,
    hasKids: bp.has_kids,
    wantsKids: bp.wants_kids,
    religion: bp.religion,
    alcohol: bp.alcohol,
    weed: bp.weed,
    zodiac: bp.zodiac,
    workForMoney: bp.work_for_money,
    workForPassion: bp.work_for_passion,
  };
}

interface FeedState {
  profiles: Profile[];
  currentIndex: number;
  isLoading: boolean;
  error: string | null;

  loadProfiles: (forceRefresh?: boolean) => Promise<void>;
  nextProfile: () => void;
  swipe: (action: 'like' | 'pass' | 'superlike') => Promise<{ matched: boolean; match_id?: string } | null>;
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
      const profiles = (feedResponse?.profiles || []).map(transformProfile);
      set({ profiles, currentIndex: 0, isLoading: false });
    } catch (error: any) {
      // Check if profile is required (428 Precondition Required)
      if (error.response?.status === 428) {
        set({
          error: 'PROFILE_REQUIRED',
          isLoading: false,
        });
        return;
      }
      // Extract detailed error info
      const status = error.response?.status;
      const serverError = error.response?.data?.error;
      const errorMsg = serverError
        ? `${serverError} (${status})`
        : error.message || 'Failed to load profiles';
      set({
        error: errorMsg,
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

    if (!profile) return null;

    try {
      const response = await feedApi.swipe(profile.id, action);
      get().nextProfile();

      // Return match result (backend returns { matched: bool, match_id?: string })
      return {
        matched: response.data?.matched || false,
        match_id: response.data?.match_id,
      };
    } catch (error: any) {
      // Show specific error from backend
      const status = error.response?.status;
      const serverError = error.response?.data?.error;

      let errorMsg = 'Swipe failed. Please try again.';
      if (status === 402) {
        errorMsg = serverError || 'Out of likes. Get more credits!';
      } else if (status === 409) {
        errorMsg = 'Already liked this person';
        get().nextProfile(); // Skip to next since already liked
        return false;
      } else if (serverError) {
        errorMsg = serverError;
      }

      set({ error: errorMsg });
      throw error;
    }
  },

  reset: () => {
    set({ profiles: [], currentIndex: 0, isLoading: false, error: null });
  },
}));
