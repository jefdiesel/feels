// Polyfill for crypto random values - must be first import
import 'react-native-get-random-values';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SystemUI from 'expo-system-ui';
import * as Sentry from '@sentry/react-native';
import { useAuthStore } from '@/stores/authStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Initialize Sentry
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_ENV || 'development',
    tracesSampleRate: 0.1,
    enableAutoSessionTracking: true,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

function RootLayoutContent() {
  const { isAuthenticated } = useAuthStore();
  const { initPushNotifications } = usePushNotifications();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#000000');
  }, []);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      initPushNotifications();
    }
  }, [isAuthenticated, initPushNotifications]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="chat/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <RootLayoutContent />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
