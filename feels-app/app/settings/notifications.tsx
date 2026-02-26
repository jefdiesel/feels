import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { ArrowLeftIcon } from '@/components/Icons';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

interface NotificationSettings {
  push_enabled: boolean;
  new_matches: boolean;
  new_messages: boolean;
  likes_received: boolean;
  super_likes: boolean;
  promotions: boolean;
}

const defaultSettings: NotificationSettings = {
  push_enabled: true,
  new_matches: true,
  new_messages: true,
  likes_received: true,
  super_likes: true,
  promotions: false,
};

export default function NotificationsSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings/notifications');
      setSettings({ ...defaultSettings, ...response.data });
    } catch (error: any) {
      // If no settings exist yet, use defaults
      console.log('Using default notification settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // If turning off push entirely, disable all
    if (key === 'push_enabled' && !value) {
      setSettings({
        ...newSettings,
        new_matches: false,
        new_messages: false,
        likes_received: false,
        super_likes: false,
        promotions: false,
      });
    }

    setSaving(true);
    try {
      await api.put('/settings/notifications', newSettings);
    } catch (error: any) {
      console.error('Failed to save setting:', error);
      // Revert on error
      setSettings(settings);
      Alert.alert('Error', 'Failed to save setting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <View style={styles.backButton} />
        </View>

        {/* Master Toggle */}
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Enable or disable all push notifications
              </Text>
            </View>
            <Switch
              value={settings.push_enabled}
              onValueChange={(value) => updateSetting('push_enabled', value)}
              trackColor={{ false: colors.bg.tertiary, true: colors.primary.DEFAULT }}
              thumbColor={colors.text.primary}
            />
          </View>
        </View>

        {/* Individual Toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>

          <View style={[styles.settingRow, !settings.push_enabled && styles.settingDisabled]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>New Matches</Text>
              <Text style={styles.settingDescription}>
                When you match with someone new
              </Text>
            </View>
            <Switch
              value={settings.new_matches}
              onValueChange={(value) => updateSetting('new_matches', value)}
              trackColor={{ false: colors.bg.tertiary, true: colors.primary.DEFAULT }}
              thumbColor={colors.text.primary}
              disabled={!settings.push_enabled}
            />
          </View>

          <View style={[styles.settingRow, !settings.push_enabled && styles.settingDisabled]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>New Messages</Text>
              <Text style={styles.settingDescription}>
                When you receive a new message
              </Text>
            </View>
            <Switch
              value={settings.new_messages}
              onValueChange={(value) => updateSetting('new_messages', value)}
              trackColor={{ false: colors.bg.tertiary, true: colors.primary.DEFAULT }}
              thumbColor={colors.text.primary}
              disabled={!settings.push_enabled}
            />
          </View>

          <View style={[styles.settingRow, !settings.push_enabled && styles.settingDisabled]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Likes Received</Text>
              <Text style={styles.settingDescription}>
                When someone likes your profile
              </Text>
            </View>
            <Switch
              value={settings.likes_received}
              onValueChange={(value) => updateSetting('likes_received', value)}
              trackColor={{ false: colors.bg.tertiary, true: colors.primary.DEFAULT }}
              thumbColor={colors.text.primary}
              disabled={!settings.push_enabled}
            />
          </View>

          <View style={[styles.settingRow, !settings.push_enabled && styles.settingDisabled]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Super Likes</Text>
              <Text style={styles.settingDescription}>
                When someone super likes you
              </Text>
            </View>
            <Switch
              value={settings.super_likes}
              onValueChange={(value) => updateSetting('super_likes', value)}
              trackColor={{ false: colors.bg.tertiary, true: colors.primary.DEFAULT }}
              thumbColor={colors.text.primary}
              disabled={!settings.push_enabled}
            />
          </View>

          <View style={[styles.settingRow, !settings.push_enabled && styles.settingDisabled]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Promotions</Text>
              <Text style={styles.settingDescription}>
                Special offers and updates from Feels
              </Text>
            </View>
            <Switch
              value={settings.promotions}
              onValueChange={(value) => updateSetting('promotions', value)}
              trackColor={{ false: colors.bg.tertiary, true: colors.primary.DEFAULT }}
              thumbColor={colors.text.primary}
              disabled={!settings.push_enabled}
            />
          </View>
        </View>

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  settingDisabled: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  settingTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  savingText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
});
