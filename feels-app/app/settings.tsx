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

const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary', 'Trans'];
const KINK_LEVEL_OPTIONS = ['Vanilla', 'Curious', 'Sensual', 'Experienced', 'Kinky'];

interface Preferences {
  age_min: number;
  age_max: number;
  distance_miles: number;
  genders_seeking: string[];
  kink_levels: string[];
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
    kink_levels: [],
    visible_to_genders: [],
  });

  // Load preferences on mount
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
        kink_levels: data.kink_levels ?? [],
        visible_to_genders: data.visible_to_genders ?? [],
      });
    } catch (error: any) {
      console.error('Failed to load preferences:', error);
      // Use defaults if loading fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate age range
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
      Alert.alert('Success', 'Your preferences have been saved.');
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelection = (
    field: 'genders_seeking' | 'kink_levels' | 'visible_to_genders',
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
          <ActivityIndicator size="large" color="#FF1493" />
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
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Search Settings</Text>
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
                placeholderTextColor="#666"
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
                placeholderTextColor="#666"
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
              <Text style={styles.distanceButtonText}>-</Text>
            </TouchableOpacity>
            <View style={styles.distanceInputWrapper}>
              <TextInput
                style={styles.distanceInput}
                value={preferences.distance_miles.toString()}
                onChangeText={handleDistanceChange}
                keyboardType="number-pad"
                placeholder="25"
                placeholderTextColor="#666"
                maxLength={3}
              />
              <Text style={styles.distanceUnit}>miles</Text>
            </View>
            <TouchableOpacity
              style={styles.distanceButton}
              onPress={() => adjustDistance(5)}
            >
              <Text style={styles.distanceButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.distanceHint}>Range: 1-100 miles</Text>
        </View>

        {/* Genders Seeking Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Genders Seeking</Text>
          <Text style={styles.sectionHint}>Select all that apply</Text>
          <View style={styles.optionsContainer}>
            {GENDER_OPTIONS.map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.optionButton,
                  preferences.genders_seeking.includes(gender) && styles.optionButtonSelected,
                ]}
                onPress={() => toggleSelection('genders_seeking', gender)}
              >
                <Text
                  style={[
                    styles.optionText,
                    preferences.genders_seeking.includes(gender) && styles.optionTextSelected,
                  ]}
                >
                  {gender}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Kink Levels Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kink Levels</Text>
          <Text style={styles.sectionHint}>Select all that apply</Text>
          <View style={styles.optionsContainer}>
            {KINK_LEVEL_OPTIONS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.optionButton,
                  preferences.kink_levels.includes(level) && styles.optionButtonSelected,
                ]}
                onPress={() => toggleSelection('kink_levels', level)}
              >
                <Text
                  style={[
                    styles.optionText,
                    preferences.kink_levels.includes(level) && styles.optionTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Visibility Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visibility</Text>
          <Text style={styles.sectionHint}>Who can see your profile</Text>
          <View style={styles.optionsContainer}>
            {GENDER_OPTIONS.map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.optionButton,
                  preferences.visible_to_genders.includes(gender) && styles.optionButtonSelected,
                ]}
                onPress={() => toggleSelection('visible_to_genders', gender)}
              >
                <Text
                  style={[
                    styles.optionText,
                    preferences.visible_to_genders.includes(gender) && styles.optionTextSelected,
                  ]}
                >
                  {gender}
                </Text>
              </TouchableOpacity>
            ))}
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
              <ActivityIndicator color="#FFFFFF" />
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
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888888',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: '#FF1493',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 12,
  },
  // Age inputs
  ageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  ageInputWrapper: {
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  ageInput: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    width: 80,
    borderWidth: 1,
    borderColor: '#333333',
  },
  ageSeparator: {
    fontSize: 18,
    color: '#666666',
    marginTop: 24,
  },
  // Distance controls
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  distanceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FF1493',
  },
  distanceInputWrapper: {
    alignItems: 'center',
  },
  distanceInput: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    width: 100,
    borderWidth: 1,
    borderColor: '#333333',
  },
  distanceUnit: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  distanceHint: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  // Multi-select options
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    backgroundColor: '#111111',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(255, 20, 147, 0.2)',
    borderColor: '#FF1493',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
  },
  optionTextSelected: {
    color: '#FF1493',
  },
  // Save button
  saveButton: {
    backgroundColor: '#FF1493',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
