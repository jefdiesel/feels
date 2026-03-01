import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { profileApi } from '@/api/client';
import { ArrowLeftIcon, MinusIcon, PlusIcon, CheckIcon } from '@/components/Icons';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

const GENDER_OPTIONS = [
  { label: 'Woman', value: 'woman' },
  { label: 'Man', value: 'man' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Trans', value: 'trans' },
];

interface Preferences {
  age_min: number;
  age_max: number;
  distance_miles: number;
  genders_seeking: string[];
  visible_to_genders: string[];
}

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    age_min: 18,
    age_max: 99,
    distance_miles: 25,
    genders_seeking: [],
    visible_to_genders: [],
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await profileApi.getPreferences();
      const data = response.data;
      setPreferences({
        age_min: data.age_min ?? 18,
        age_max: data.age_max ?? 99,
        distance_miles: data.distance_miles ?? 25,
        genders_seeking: data.genders_seeking ?? [],
        visible_to_genders: data.visible_to_genders ?? [],
      });
    } catch (error: any) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (preferences.age_min > preferences.age_max) {
      Alert.alert('Invalid Age Range', 'Minimum age cannot be greater than maximum age.');
      return;
    }

    setSaving(true);
    try {
      await profileApi.updatePreferences({
        age_min: preferences.age_min,
        age_max: preferences.age_max,
        distance_miles: preferences.distance_miles,
        genders_seeking: preferences.genders_seeking,
        visible_to_genders: preferences.visible_to_genders,
      });
      router.back();
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save preferences.');
      setSaving(false);
    }
  };

  const toggleSelection = (
    field: 'genders_seeking' | 'visible_to_genders',
    value: string
  ) => {
    setPreferences((prev) => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const handleAgeChange = (field: 'age_min' | 'age_max', text: string) => {
    const numValue = parseInt(text, 10);
    if (text === '') {
      setPreferences((prev) => ({ ...prev, [field]: field === 'age_min' ? 18 : 99 }));
    } else if (!isNaN(numValue)) {
      const clampedValue = Math.min(99, Math.max(18, numValue));
      setPreferences((prev) => ({ ...prev, [field]: clampedValue }));
    }
  };

  const handleDistanceChange = (text: string) => {
    const numValue = parseInt(text, 10);
    if (text === '') {
      setPreferences((prev) => ({ ...prev, distance_miles: 1 }));
    } else if (!isNaN(numValue)) {
      const clampedValue = Math.min(100, Math.max(1, numValue));
      setPreferences((prev) => ({ ...prev, distance_miles: clampedValue }));
    }
  };

  const adjustDistance = (delta: number) => {
    setPreferences((prev) => {
      const newValue = Math.min(100, Math.max(1, prev.distance_miles + delta));
      return { ...prev, distance_miles: newValue };
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading preferences...</Text>
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
          <Text style={styles.title}>Search Filters</Text>
          <View style={styles.backButton} />
        </View>

        {/* Age Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Age Range</Text>
          <View style={styles.ageInputContainer}>
            <View style={styles.ageInputWrapper}>
              <Text style={styles.inputLabel}>Min</Text>
              <TextInput
                style={styles.ageInput}
                value={preferences.age_min.toString()}
                onChangeText={(text) => handleAgeChange('age_min', text)}
                keyboardType="number-pad"
                placeholder="18"
                placeholderTextColor={colors.text.disabled}
                maxLength={2}
              />
            </View>
            <Text style={styles.ageSeparator}>to</Text>
            <View style={styles.ageInputWrapper}>
              <Text style={styles.inputLabel}>Max</Text>
              <TextInput
                style={styles.ageInput}
                value={preferences.age_max.toString()}
                onChangeText={(text) => handleAgeChange('age_max', text)}
                keyboardType="number-pad"
                placeholder="99"
                placeholderTextColor={colors.text.disabled}
                maxLength={2}
              />
            </View>
          </View>
        </View>

        {/* Distance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Maximum Distance</Text>
          <View style={styles.distanceContainer}>
            <TouchableOpacity
              style={styles.distanceButton}
              onPress={() => adjustDistance(-5)}
            >
              <MinusIcon size={20} color={colors.primary.DEFAULT} />
            </TouchableOpacity>
            <View style={styles.distanceInputWrapper}>
              <TextInput
                style={styles.distanceInput}
                value={preferences.distance_miles.toString()}
                onChangeText={handleDistanceChange}
                keyboardType="number-pad"
                placeholder="25"
                placeholderTextColor={colors.text.disabled}
                maxLength={3}
              />
              <Text style={styles.distanceUnit}>miles</Text>
            </View>
            <TouchableOpacity
              style={styles.distanceButton}
              onPress={() => adjustDistance(5)}
            >
              <PlusIcon size={20} color={colors.primary.DEFAULT} />
            </TouchableOpacity>
          </View>
          <Text style={styles.distanceHint}>Range: 1-100 miles</Text>
        </View>

        {/* Genders Seeking Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interested In</Text>
          <Text style={styles.sectionHint}>Select all that apply</Text>
          <View style={styles.optionsContainer}>
            {GENDER_OPTIONS.map((gender) => {
              const isSelected = preferences.genders_seeking.includes(gender.value);
              return (
                <TouchableOpacity
                  key={gender.value}
                  style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                  onPress={() => toggleSelection('genders_seeking', gender.value)}
                >
                  {isSelected && (
                    <CheckIcon size={16} color={colors.primary.DEFAULT} />
                  )}
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {gender.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Visibility Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Visibility</Text>
          <Text style={styles.sectionHint}>Who can see your profile</Text>
          <View style={styles.optionsContainer}>
            {GENDER_OPTIONS.map((gender) => {
              const isSelected = preferences.visible_to_genders.includes(gender.value);
              return (
                <TouchableOpacity
                  key={gender.value}
                  style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                  onPress={() => toggleSelection('visible_to_genders', gender.value)}
                >
                  {isSelected && (
                    <CheckIcon size={16} color={colors.primary.DEFAULT} />
                  )}
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {gender.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.text.primary} />
            ) : (
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            )}
          </TouchableOpacity>
        </View>

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
  loadingText: {
    marginTop: spacing.lg,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
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
    textAlign: 'center',
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
    marginBottom: spacing.sm,
  },
  sectionHint: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },
  // Age inputs
  ageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  ageInputWrapper: {
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  ageInput: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
    textAlign: 'center',
    width: 80,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  ageSeparator: {
    fontSize: typography.sizes.lg,
    color: colors.text.tertiary,
    marginTop: spacing['2xl'],
  },
  // Distance controls
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  distanceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceInputWrapper: {
    alignItems: 'center',
  },
  distanceInput: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
    textAlign: 'center',
    width: 100,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  distanceUnit: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  distanceHint: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Multi-select options
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    gap: spacing.xs,
  },
  optionButtonSelected: {
    backgroundColor: colors.primary.muted,
    borderColor: colors.primary.DEFAULT,
  },
  optionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.secondary,
  },
  optionTextSelected: {
    color: colors.primary.DEFAULT,
  },
  // Save button
  saveButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
});
