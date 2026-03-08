import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HeartIcon, HeartFilledIcon, MessageIcon, MessageFilledIcon, UserIcon, UserFilledIcon } from '@/components/Icons';
import { matchesApi } from '@/api/client';
import { useWebSocket } from '@/hooks/useWebSocket';
import { colors, layout, typography, spacing } from '@/constants/theme';

interface TabIconProps {
  focused: boolean;
  icon: 'heart' | 'message' | 'user';
  badge?: number;
}

function TabIcon({ focused, icon, badge }: TabIconProps) {
  const color = focused ? colors.primary.DEFAULT : colors.text.tertiary;
  const size = layout.tabBar.iconSize;

  const renderIcon = () => {
    switch (icon) {
      case 'heart':
        return focused ? (
          <HeartFilledIcon size={size} color={color} />
        ) : (
          <HeartIcon size={size} color={color} />
        );
      case 'message':
        return focused ? (
          <MessageFilledIcon size={size} color={color} />
        ) : (
          <MessageIcon size={size} color={color} />
        );
      case 'user':
        return focused ? (
          <UserFilledIcon size={size} color={color} />
        ) : (
          <UserIcon size={size} color={color} />
        );
    }
  };

  return (
    <View style={[styles.tabIconContainer, focused && styles.tabIconFocused]}>
      {renderIcon()}
      {focused && <View style={styles.indicator} />}
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

// Hook to get total unread message count
function useUnreadCount() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const response = await matchesApi.getMatches();
      return response.data || [];
    },
  });

  // Listen for WebSocket events to update badge instantly
  useWebSocket({
    onMessage: (wsData) => {
      if (wsData.type === 'new_message' || wsData.type === 'new_match' || wsData.type === 'match_created' || wsData.type === 'message_read') {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      }
    },
  });

  // Count conversations with unread messages, not total unread messages
  const unreadConversations = data?.filter((match: any) => match.unread_count > 0).length || 0;
  return unreadConversations;
}

export default function TabLayout() {
  const unreadCount = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.text.tertiary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="heart" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="message" focused={focused} badge={unreadCount} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="user" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg.primary,
    borderTopColor: colors.border.DEFAULT,
    borderTopWidth: 1,
    height: layout.tabBar.height,
    paddingTop: layout.tabBar.paddingTop,
    paddingBottom: layout.tabBar.paddingBottom,
  },
  tabIconContainer: {
    width: 48,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  tabIconFocused: {
    backgroundColor: colors.primary.muted,
  },
  indicator: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary.DEFAULT,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.text.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
  },
});
