import { create } from 'zustand';
import { creditsApi } from '@/api/client';

interface Subscription {
  id: string;
  tier: 'basic' | 'plus' | 'premium';
  status: 'active' | 'canceled' | 'expired';
  expiresAt: string;
  features: string[];
}

interface CreditsState {
  balance: number;
  bonusLikes: number;
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  lastLoaded: number | null;

  loadCredits: () => Promise<void>;
  loadSubscription: () => Promise<void>;
  useCredits: (amount: number) => void;
  useBonusLike: () => boolean;
  hasEnoughCredits: (amount: number) => boolean;
  isLowCredits: () => boolean;
  reset: () => void;
}

const LOW_CREDITS_THRESHOLD = 10;

export const useCreditsStore = create<CreditsState>((set, get) => ({
  balance: 0,
  bonusLikes: 0,
  subscription: null,
  isLoading: false,
  error: null,
  lastLoaded: null,

  loadCredits: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await creditsApi.getCredits();
      const { balance, bonus_likes } = response.data;
      set({
        balance: balance ?? 0,
        bonusLikes: bonus_likes ?? 0,
        isLoading: false,
        lastLoaded: Date.now(),
      });
    } catch (error: any) {
      console.error('Credits load error:', error);
      set({
        error: error.response?.data?.error || 'Failed to load credits',
        isLoading: false,
      });
    }
  },

  loadSubscription: async () => {
    try {
      const response = await creditsApi.getSubscription();
      const sub = response.data;
      if (sub && sub.id) {
        set({
          subscription: {
            id: sub.id,
            tier: sub.tier,
            status: sub.status,
            expiresAt: sub.expires_at,
            features: sub.features || [],
          },
        });
      } else {
        set({ subscription: null });
      }
    } catch (error: any) {
      // No subscription is fine, not an error
      if (error.response?.status !== 404) {
        console.error('Subscription load error:', error);
      }
      set({ subscription: null });
    }
  },

  useCredits: (amount: number) => {
    const { balance } = get();
    if (balance >= amount) {
      set({ balance: balance - amount });
    }
  },

  useBonusLike: () => {
    const { bonusLikes } = get();
    if (bonusLikes > 0) {
      set({ bonusLikes: bonusLikes - 1 });
      return true;
    }
    return false;
  },

  hasEnoughCredits: (amount: number) => {
    return get().balance >= amount;
  },

  isLowCredits: () => {
    return get().balance < LOW_CREDITS_THRESHOLD;
  },

  reset: () => {
    set({
      balance: 0,
      bonusLikes: 0,
      subscription: null,
      isLoading: false,
      error: null,
      lastLoaded: null,
    });
  },
}));
