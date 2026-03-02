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
import { useFeedStore } from '@/stores/feedStore';
import { ArrowLeftIcon, MinusIcon, PlusIcon, CheckIcon } from '@/components/Icons';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

const GENDER_OPTIONS = [
  { label: 'Woman', value: 'woman' },
  { label: 'Man', value: 'man' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Trans', value: 'trans' },
];

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Use strings for text inputs to allow proper editing
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('99');
  const [distance, setDistance] = useState('25');
  const [gendersSeeking, setGendersSeeking] = useState<string[]>([]);
  const [visibleToGenders, setVisibleToGenders] = useState<string[]>([]);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await profileApi.getPreferences();
      const data = response.data;
      setAgeMin(String(data.age_min ?? 18));
      setAgeMax(String(data.age_max ?? 99));
      setDistance(String(data.distance_miles ?? 25));
      setGendersSeeking(data.genders_seeking ?? []);
      setVisibleToGenders(data.visible_to_genders ?? []);
    } catch (error: any) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Parse and validate values
    const minAge = parseInt(ageMin, 10) || 18;
    const maxAge = parseInt(ageMax, 10) || 99;
    const distMiles = parseInt(distance, 10) || 25;

    // Clamp values to valid ranges
    const clampedMinAge = Math.min(99, Math.max(18, minAge));
    const clampedMaxAge = Math.min(99, Math.max(18, maxAge));
    const clampedDistance = Math.min(100, Math.max(1, distMiles));

    if (clampedMinAge > clampedMaxAge) {
      Alert.alert('Invalid Age Range', 'Minimum age cannot be greater than maximum age.');
      return;
    }

    if (gendersSeeking.length === 0) {
      Alert.alert('Select Genders', 'Please select at least one gender to see in your feed.');
      return;
    }

    setSaving(true);
    try {
      await profileApi.updatePreferences({
        age_min: clampedMinAge,
        age_max: clampedMaxAge,
        distance_miles: clampedDistance,
        genders_seeking: gendersSeeking,
        visible_to_genders: visibleToGenders,
      });
      // Clear feed so it refreshes with new preferences
      useFeedStore.getState().reset();
      router.back();
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      const status = error.response?.status;
      const serverError = error.response?.data?.error;
      const msg = serverError
        ? `${serverError} (${status})`
        : error.message || 'Failed to save preferences';
      Alert.alert('Error', msg);
      setSaving(false);
    }
  };

  const toggleGendersSeeking = (value: string) => {
    setGendersSeeking((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleVisibleTo = (value: string) => {
    setVisibleToGenders((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const adjustDistance = (delta: number) => {
    const current = parseInt(distance, 10) || 25;
    let newValue: number;

    if (delta > 0) {
      // Increasing: 1→2→3→4→5→10→15→20→25→...
      if (current < 5) {
        newValue = current + 1;
      } else {
        newValue = current + 5;
      }
    } else {
      // Decreasing: ...→25→20→15→10→5→4→3→2→1
      if (current <= 5) {
        newValue = current - 1;
      } else {
        newValue = current - 5;
      }
    }

    newValue = Math.min(100, Math.max(1, newValue));
    setDistance(String(newValue));
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
                value={ageMin}
                onChangeText={setAgeMin}
                keyboardType="number-pad"
                placeholder="18"
                placeholderTextColor={colors.text.disabled}
                maxLength={2}
                selectTextOnFocus
              />
            </View>
            <Text style={styles.ageSeparator}>to</Text>
            <View style={styles.ageInputWrapper}>
              <Text style={styles.inputLabel}>Max</Text>
              <TextInput
                style={styles.ageInput}
                value={ageMax}
                onChangeText={setAgeMax}
                keyboardType="number-pad"
                placeholder="99"
                placeholderTextColor={colors.text.disabled}
                maxLength={2}
                selectTextOnFocus
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
                value={distance}
                onChangeText={setDistance}
                keyboardType="number-pad"
                placeholder="25"
                placeholderTextColor={colors.text.disabled}
                maxLength={3}
                selectTextOnFocus
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
              const isSelected = gendersSeeking.includes(gender.value);
              return (
                <TouchableOpacity
                  key={gender.value}
                  style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                  onPress={() => toggleGendersSeeking(gender.value)}
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
              const isSelected = visibleToGenders.includes(gender.value);
              return (
                <TouchableOpacity
                  key={gender.value}
                  style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                  onPress={() => toggleVisibleTo(gender.value)}
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
