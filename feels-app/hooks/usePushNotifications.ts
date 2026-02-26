import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { api } from '@/api/client';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Register for push notifications
  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      // Check existing permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      const token = tokenData.data;

      setExpoPushToken(token);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E85D75',
        });

        await Notifications.setNotificationChannelAsync('matches', {
          name: 'Matches',
          description: 'Notifications for new matches',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E85D75',
        });

        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          description: 'Notifications for new messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E85D75',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }, []);

  // Send push token to backend
  const savePushToken = useCallback(async (token: string) => {
    try {
      await api.post('/push/register', {
        token,
        platform: Platform.OS,
      });
      console.log('Push token saved to server');
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }, []);

  // Unregister push token (for logout)
  const unregisterPushToken = useCallback(async () => {
    if (!expoPushToken) return;

    try {
      await api.delete('/push/register', {
        data: { token: expoPushToken },
      });
      setExpoPushToken(null);
      console.log('Push token removed from server');
    } catch (error) {
      console.error('Failed to remove push token:', error);
    }
  }, [expoPushToken]);

  // Handle notification response (when user taps notification)
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    if (data?.type === 'new_match' && data.matchId) {
      router.push(`/chat/${data.matchId}`);
    } else if (data?.type === 'new_message' && data.matchId) {
      router.push(`/chat/${data.matchId}`);
    } else if (data?.type === 'like_received') {
      // Navigate to matches tab
      router.push('/(tabs)/matches');
    }
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    // Listener for when user interacts with notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [handleNotificationResponse]);

  // Initialize push notifications
  const initPushNotifications = useCallback(async () => {
    const token = await registerForPushNotifications();
    if (token) {
      await savePushToken(token);
    }
  }, [registerForPushNotifications, savePushToken]);

  // Get badge count
  const getBadgeCount = useCallback(async (): Promise<number> => {
    return Notifications.getBadgeCountAsync();
  }, []);

  // Set badge count
  const setBadgeCount = useCallback(async (count: number) => {
    await Notifications.setBadgeCountAsync(count);
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  }, []);

  return {
    expoPushToken,
    notification,
    initPushNotifications,
    unregisterPushToken,
    getBadgeCount,
    setBadgeCount,
    clearAllNotifications,
  };
}
