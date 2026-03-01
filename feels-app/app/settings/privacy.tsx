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
import { useCreditsStore } from '@/stores/creditsStore';
import { ArrowLeftIcon, CrownIcon, LockIcon } from '@/components/Icons';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

interface PrivacySettings {
  show_online_status: boolean;
  show_read_receipts: boolean;
  show_distance: boolean;
  hide_age: boolean;
  incognito_mode: boolean;
}

const defaultSettings: PrivacySettings = {
  show_online_status: true,
  show_read_receipts: true,
  show_distance: true,
  hide_age: false,
  incognito_mode: false,
};

export default function PrivacySettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
  const { subscription } = useCreditsStore();

  const isPremium = subscription?.status === 'active';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings/privacy');
      setSettings({ ...defaultSettings, ...response.data });
    } catch (error: any) {
      // If no settings exist yet, use defaults
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof PrivacySettings, value: boolean) => {
    // Check premium for certain features
    const premiumFeatures: (keyof PrivacySettings)[] = [
      'show_read_receipts',
      'incognito_mode',
      'hide_age',
    ];

    if (premiumFeatures.includes(key) && !isPremium) {
      Alert.alert(
        'Premium Feature',
        'This feature requires a premium subscription.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Premium', onPress: () => router.push('/premium') },
        ]
      );
      return;
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    setSaving(true);
    try {
      await api.put('/settings/privacy', newSettings);
    } catch (error: any) {
      console.error('Failed to save setting:', error);
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

  const renderPremiumBadge = () => (
    <View style={styles.premiumBadge}>
      <CrownIcon size={12} color={colors.secondary.DEFAULT} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Privacy</Text>
          <View style={styles.backButton} />
        </View>

        {/* Visibility Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Visibility</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Show Online Status</Text>
              <Text style={styles.settingDescription}>
                Let others see when you're active
              </Text>
            </View>
            <Switch
              value={settings.show_online_status}
              onValueChange={(value) => updateSetting('show_online_status', value)}
              trackColor={{ false: colors.bg.tertiary, true: colors.primary.DEFAULT }}
              thumbColor={colors.text.primary}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Show Distance</Text>
              <Text style={styles.settingDescription}>
                Display how far away you are from others
              </Text>
            </View>
            <Switch
              value={settings.show_distance}
              onValueChange={(value) => updateSetting('show_distance', value)}
              trackColor={{ false: colors.bg.tertiary, true: colors.primary.DEFAULT }}
              thumbColor={colors.text.primary}
            />
          </View>

          <View style={[styles.settingRow, !isPremium && styles.settingLocked]}>
            <View style={styles.settingInfo}>
              <View style={styles.settingTitleRow}>
                <Text style={styles.settingTitle}>Hide Age</Text>
                {!isPremium && renderPremiumBadge()}
              </View>
              <Text style={styles.settingDescription}>
                Don't show your age on your profile
              </Text>
            </View>
            <Switch
              value={settings.hide_age}
              onValueChange={(value) => updateSetting('hide_age', value)}
              trackColor={{ false: colors.bg.tertiary, true: colors.primary.DEFAULT }}
              thumbColor={colors.text.primary}
              disabled={!isPremium}
            />
          </View>
        </View>

        {/* Message Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Messages</Text>

          <View style={[styles.settingRow, !isPremium && styles.settingLocked]}>
            <View style={styles.settingInfo}>
              <View style={styles.settingTitleRow}>
                <Text style={styles.settingTitle}>Read Receipts</Text>
                {!isPremium && renderPremiumBadge()}
              </View>
              <Text style={styles.settingDescription}>
                Let others know when you've read their messages
              </Text>
            </View>
            <Switch
              value={settings.show_read_receipts}
              onValueChange={(value) => updateSetting('show_read_receipts', value)}
              trackColor={{ false: colors.bg.tertiary, true: colors.primary.DEFAULT }}
              thumbColor={colors.text.primary}
              disabled={!isPremium}
            />
          </View>
        </View>

        {/* Advanced Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>

          <View style={[styles.settingRow, !isPremium && styles.settingLocked]}>
            <View style={styles.settingInfo}>
              <View style={styles.settingTitleRow}>
                <Text style={styles.settingTitle}>Incognito Mode</Text>
                {!isPremium && renderPremiumBadge()}
              </View>
              <Text style={styles.settingDescription}>
                Browse profiles without appearing in their "Recently Viewed"
              </Text>
            </View>
            <Switch
              value={settings.incognito_mode}
              onValueChange={(value) => updateSetting('incognito_mode', value)}
              trackColor={{ false: colors.bg.tertiary, true: colors.primary.DEFAULT }}
              thumbColor={colors.text.primary}
              disabled={!isPremium}
            />
          </View>
        </View>

        {/* Data & Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Account</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon.')}
          >
            <Text style={styles.actionText}>Download My Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.dangerRow]}
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'Are you sure you want to delete your account? This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => Alert.alert('Coming Soon', 'Account deletion coming soon.'),
                  },
                ]
              );
            }}
          >
            <Text style={styles.dangerText}>Delete Account</Text>
          </TouchableOpacity>
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
  settingLocked: {
    opacity: 0.7,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  premiumBadge: {
    backgroundColor: colors.secondary.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  actionRow: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  actionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary.DEFAULT,
  },
  dangerRow: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  dangerText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.error,
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
