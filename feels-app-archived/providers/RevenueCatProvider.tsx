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
  // DISABLED: RevenueCat causing crashes with test key
  // Re-enable when Google Play is verified and real API key is available
  const mockRevenueCat = {
    isReady: true,
    customerInfo: null,
    offerings: null,
    isPremium: false,
    isLoading: false,
    error: null,
    initialize: async () => {},
    purchasePackage: async () => false,
    restorePurchases: async () => false,
    getOfferings: async () => null,
    checkPremiumStatus: async () => false,
    logout: async () => {},
  };

  return (
    <RevenueCatContext.Provider value={mockRevenueCat as any}>
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
