import { useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';

// RevenueCat API keys - test key works for both platforms until stores connected
const REVENUECAT_API_KEY_IOS = 'test_swUPWXhzUyKXlUidTZVxcWRezBe';
const REVENUECAT_API_KEY_ANDROID = 'test_swUPWXhzUyKXlUidTZVxcWRezBe';

// Entitlement ID from RevenueCat dashboard - grants premium access
const PREMIUM_ENTITLEMENT_ID = 'FeelsFun Pro';

interface RevenueCatState {
  isReady: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseRevenueCatReturn extends RevenueCatState {
  initialize: (userId?: string) => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  getOfferings: () => Promise<PurchasesOffering | null>;
  checkPremiumStatus: () => Promise<boolean>;
  logout: () => Promise<void>;
}

// Check if we're in Expo Go (RevenueCat won't work there)
const isExpoGo = (): boolean => {
  // In Expo Go, Constants.appOwnership === 'expo'
  // In dev builds or standalone, it's 'standalone' or undefined
  try {
    const Constants = require('expo-constants').default;
    return Constants.appOwnership === 'expo';
  } catch {
    return false;
  }
};

export function useRevenueCat(): UseRevenueCatReturn {
  const [state, setState] = useState<RevenueCatState>({
    isReady: false,
    customerInfo: null,
    offerings: null,
    isPremium: false,
    isLoading: false,
    error: null,
  });

  const initialize = useCallback(async (userId?: string) => {
    // Skip initialization in Expo Go - purchases won't work
    if (isExpoGo()) {
      console.log('[RevenueCat] Running in Expo Go - using mock mode');
      setState((prev) => ({
        ...prev,
        isReady: true,
        isPremium: false, // Default to non-premium in dev
      }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Enable verbose logging in development
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      }

      // Configure with platform-specific API key
      const apiKey =
        Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

      await Purchases.configure({ apiKey, appUserID: userId });

      // Get initial customer info
      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium =
        typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== 'undefined';

      // Get offerings
      const offerings = await Purchases.getOfferings();

      setState({
        isReady: true,
        customerInfo,
        offerings: offerings.current,
        isPremium,
        isLoading: false,
        error: null,
      });

      console.log('[RevenueCat] Initialized successfully, isPremium:', isPremium);
    } catch (error: any) {
      console.error('[RevenueCat] Initialization error:', error);
      setState((prev) => ({
        ...prev,
        isReady: true, // Still mark as ready so app doesn't hang
        isLoading: false,
        error: error.message || 'Failed to initialize purchases',
      }));
    }
  }, []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    if (isExpoGo()) {
      Alert.alert(
        'Development Mode',
        'In-app purchases are not available in Expo Go. Use a development build to test purchases.'
      );
      return false;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPremium =
        typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== 'undefined';

      setState((prev) => ({
        ...prev,
        customerInfo,
        isPremium,
        isLoading: false,
      }));

      return isPremium;
    } catch (error: any) {
      setState((prev) => ({ ...prev, isLoading: false }));

      // User cancelled - not an error
      if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return false;
      }

      // Already subscribed
      if (error.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
        Alert.alert('Already Subscribed', 'You already have an active subscription.');
        // Refresh status
        await checkPremiumStatus();
        return state.isPremium;
      }

      console.error('[RevenueCat] Purchase error:', error);
      Alert.alert('Purchase Failed', error.message || 'Unable to complete purchase. Please try again.');
      return false;
    }
  }, [state.isPremium]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (isExpoGo()) {
      Alert.alert('Development Mode', 'Restore is not available in Expo Go.');
      return false;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const customerInfo = await Purchases.restorePurchases();
      const isPremium =
        typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== 'undefined';

      setState((prev) => ({
        ...prev,
        customerInfo,
        isPremium,
        isLoading: false,
      }));

      if (isPremium) {
        Alert.alert('Restored', 'Your subscription has been restored!');
      } else {
        Alert.alert('No Subscription Found', 'No active subscription was found for your account.');
      }

      return isPremium;
    } catch (error: any) {
      console.error('[RevenueCat] Restore error:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
      return false;
    }
  }, []);

  const getOfferings = useCallback(async (): Promise<PurchasesOffering | null> => {
    if (isExpoGo()) {
      // Return mock offerings for UI development
      return null;
    }

    try {
      const offerings = await Purchases.getOfferings();
      setState((prev) => ({ ...prev, offerings: offerings.current }));
      return offerings.current;
    } catch (error: any) {
      console.error('[RevenueCat] Get offerings error:', error);
      return null;
    }
  }, []);

  const checkPremiumStatus = useCallback(async (): Promise<boolean> => {
    if (isExpoGo()) {
      return false;
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium =
        typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== 'undefined';

      setState((prev) => ({
        ...prev,
        customerInfo,
        isPremium,
      }));

      return isPremium;
    } catch (error: any) {
      console.error('[RevenueCat] Check status error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (isExpoGo()) {
      setState((prev) => ({
        ...prev,
        customerInfo: null,
        isPremium: false,
      }));
      return;
    }

    try {
      await Purchases.logOut();
      setState((prev) => ({
        ...prev,
        customerInfo: null,
        isPremium: false,
      }));
    } catch (error: any) {
      console.error('[RevenueCat] Logout error:', error);
    }
  }, []);

  // Listen for customer info updates (subscription changes)
  useEffect(() => {
    if (isExpoGo()) return;

    const listener = (customerInfo: CustomerInfo) => {
      const isPremium =
        typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== 'undefined';

      setState((prev) => ({
        ...prev,
        customerInfo,
        isPremium,
      }));
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return {
    ...state,
    initialize,
    purchasePackage,
    restorePurchases,
    getOfferings,
    checkPremiumStatus,
    logout,
  };
}

// Export types for use elsewhere
export type { PurchasesOffering, PurchasesPackage, CustomerInfo };
