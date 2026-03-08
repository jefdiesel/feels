import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';

// Create context with the hook's return type
type RevenueCatContextType = ReturnType<typeof useRevenueCat>;

const RevenueCatContext = createContext<RevenueCatContextType | null>(null);

interface RevenueCatProviderProps {
  children: ReactNode;
}

export function RevenueCatProvider({ children }: RevenueCatProviderProps) {
  const revenueCat = useRevenueCat();
  const { user, isAuthenticated } = useAuthStore();
  const { setSubscriptionFromRevenueCat } = useCreditsStore();

  // Initialize RevenueCat when user authenticates
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      revenueCat.initialize(user.id);
    }
  }, [isAuthenticated, user?.id]);

  // Sync premium status to credits store
  useEffect(() => {
    if (revenueCat.isReady) {
      setSubscriptionFromRevenueCat(revenueCat.isPremium, revenueCat.customerInfo);
    }
  }, [revenueCat.isReady, revenueCat.isPremium, revenueCat.customerInfo]);

  // Logout from RevenueCat when user logs out
  useEffect(() => {
    if (!isAuthenticated && revenueCat.isReady) {
      revenueCat.logout();
    }
  }, [isAuthenticated, revenueCat.isReady]);

  return (
    <RevenueCatContext.Provider value={revenueCat}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCatContext() {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error('useRevenueCatContext must be used within a RevenueCatProvider');
  }
  return context;
}
