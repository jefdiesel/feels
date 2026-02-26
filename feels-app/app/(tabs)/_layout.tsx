import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { FlameIcon, FlameFilledIcon, MessageIcon, MessageFilledIcon, UserIcon, UserFilledIcon } from '@/components/Icons';
import { colors, layout } from '@/constants/theme';

interface TabIconProps {
  focused: boolean;
  icon: 'flame' | 'message' | 'user';
}

function TabIcon({ focused, icon }: TabIconProps) {
  const color = focused ? colors.primary.DEFAULT : colors.text.tertiary;
  const size = layout.tabBar.iconSize;

  const renderIcon = () => {
    switch (icon) {
      case 'flame':
        return focused ? (
          <FlameFilledIcon size={size} color={color} />
        ) : (
          <FlameIcon size={size} color={color} />
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
    </View>
  );
}

export default function TabLayout() {
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
          tabBarIcon: ({ focused }) => <TabIcon icon="flame" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="message" focused={focused} />,
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
});
