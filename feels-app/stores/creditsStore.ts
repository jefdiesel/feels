import { create } from 'zustand';
import { creditsApi } from '@/api/client';
import type { CustomerInfo } from 'react-native-purchases';

interface Subscription {
  id: string;
  tier: 'basic' | 'plus' | 'premium';
  status: 'active' | 'canceled' | 'expired';
  expiresAt: string;
  features: string[];
  // RevenueCat fields
  source?: 'revenuecat' | 'stripe' | 'legacy';
}

interface CreditsState {
  dailyLikesUsed: number;
  dailyLikesLimit: number;
  bonusLikes: number;
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  lastLoaded: number | null;
  isPremiumFromRevenueCat: boolean;

  loadCredits: () => Promise<void>;
  loadSubscription: () => Promise<void>;
  setSubscriptionFromRevenueCat: (isPremium: boolean, customerInfo: CustomerInfo | null) => void;
  useDailyLike: () => boolean;
  useBonusLike: () => boolean;
  canLike: () => boolean;
  dailyLikesRemaining: () => number;
  isLowLikes: () => boolean;
  hasSubscription: boolean;
  reset: () => void;

  // Legacy - kept for compatibility
  balance: number;
  useCredits: (amount: number) => void;
  hasEnoughCredits: (amount: number) => boolean;
  isLowCredits: () => boolean;
}

const DAILY_LIKES_LIMIT = 10;
const BONUS_LIKES_MAX = 10;

export const useCreditsStore = create<CreditsState>((set, get) => ({
  dailyLikesUsed: 0,
  dailyLikesLimit: DAILY_LIKES_LIMIT,
  bonusLikes: 0,
  balance: 0, // Legacy
  subscription: null,
  isLoading: false,
  error: null,
  lastLoaded: null,
  isPremiumFromRevenueCat: false,

  loadCredits: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await creditsApi.getCredits();
      const { daily_likes_used, daily_likes_limit, bonus_likes, balance } = response.data;
      set({
        dailyLikesUsed: daily_likes_used ?? 0,
        dailyLikesLimit: daily_likes_limit ?? DAILY_LIKES_LIMIT,
        bonusLikes: Math.min(bonus_likes ?? 0, BONUS_LIKES_MAX),
        balance: balance ?? 0, // Legacy
        isLoading: false,
        lastLoaded: Date.now(),
      });
    } catch (error: any) {
      console.error('Credits load error:', error);
      set({
        error: error.response?.data?.error || 'Failed to load likes',
        isLoading: false,
      });
    }
  },

  loadSubscription: async () => {
    // If we have RevenueCat premium, don't overwrite with backend data
    const { isPremiumFromRevenueCat } = get();
    if (isPremiumFromRevenueCat) {
      return;
    }

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
            source: 'legacy',
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

  setSubscriptionFromRevenueCat: (isPremium: boolean, customerInfo: CustomerInfo | null) => {
    set({ isPremiumFromRevenueCat: isPremium });

    if (isPremium && customerInfo) {
      // Find the active entitlement to get expiration
      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      const expiresAt = premiumEntitlement?.expirationDate || '';

      set({
        subscription: {
          id: customerInfo.originalAppUserId,
          tier: 'premium',
          status: 'active',
          expiresAt,
          features: ['unlimited_likes', 'premium_likes', 'rewind', 'boost', 'private_mode'],
          source: 'revenuecat',
        },
      });
    } else if (!isPremium) {
      // Only clear if the current subscription is from RevenueCat
      const { subscription } = get();
      if (subscription?.source === 'revenuecat') {
        set({ subscription: null });
      }
    }
  },

  useDailyLike: () => {
    const { dailyLikesUsed, dailyLikesLimit, subscription } = get();
    // Subscribers have unlimited likes
    if (subscription?.status === 'active') {
      return true;
    }
    if (dailyLikesUsed < dailyLikesLimit) {
      set({ dailyLikesUsed: dailyLikesUsed + 1 });
      return true;
    }
    return false;
  },

  useBonusLike: () => {
    const { bonusLikes } = get();
    if (bonusLikes > 0) {
      set({ bonusLikes: bonusLikes - 1 });
      return true;
    }
    return false;
  },

  canLike: () => {
    const { dailyLikesUsed, dailyLikesLimit, bonusLikes, subscription } = get();
    // Subscribers have unlimited likes
    if (subscription?.status === 'active') {
      return true;
    }
    return bonusLikes > 0 || dailyLikesUsed < dailyLikesLimit;
  },

  dailyLikesRemaining: () => {
    const { dailyLikesUsed, dailyLikesLimit, subscription } = get();
    if (subscription?.status === 'active') {
      return -1; // Unlimited
    }
    return Math.max(0, dailyLikesLimit - dailyLikesUsed);
  },

  isLowLikes: () => {
    const { dailyLikesUsed, dailyLikesLimit, bonusLikes, subscription } = get();
    if (subscription?.status === 'active') {
      return false;
    }
    const remaining = dailyLikesLimit - dailyLikesUsed + bonusLikes;
    return remaining <= 3 && remaining > 0;
  },

  get hasSubscription() {
    return get().subscription?.status === 'active';
  },

  // Legacy methods - kept for compatibility
  useCredits: (amount: number) => {
    const { balance } = get();
    if (balance >= amount) {
      set({ balance: balance - amount });
    }
  },

  hasEnoughCredits: (amount: number) => {
    return get().balance >= amount;
  },

  isLowCredits: () => {
    return get().dailyLikesRemaining() <= 3;
  },

  reset: () => {
    set({
      dailyLikesUsed: 0,
      dailyLikesLimit: DAILY_LIKES_LIMIT,
      bonusLikes: 0,
      balance: 0,
      subscription: null,
      isLoading: false,
      error: null,
      lastLoaded: null,
      isPremiumFromRevenueCat: false,
    });
  },
}));
