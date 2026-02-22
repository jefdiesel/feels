import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { profileApi } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

const GENDERS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'trans', label: 'Trans' },
];

const KINK_LEVELS = [
  { value: 'vanilla', label: 'Vanilla', emoji: '🍦' },
  { value: 'curious', label: 'Curious', emoji: '🤔' },
  { value: 'sensual', label: 'Sensual', emoji: '🔥' },
  { value: 'experienced', label: 'Experienced', emoji: '⛓️' },
  { value: 'kinky', label: 'Kinky AF', emoji: '😈' },
];

export default function OnboardingScreen() {
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [name, setName] = useState(user?.name || '');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [kinkLevel, setKinkLevel] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [bio, setBio] = useState('');
  const [seekingGenders, setSeekingGenders] = useState<string[]>([]);

  const formatDob = (text: string) => {
    // Remove non-digits
    const digits = text.replace(/\D/g, '');
    // Format as YYYY-MM-DD
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  };

  const toggleSeekingGender = (g: string) => {
    setSeekingGenders((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const validateStep1 = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (dob.length !== 10) {
      Alert.alert('Error', 'Please enter your birth date (YYYY-MM-DD)');
      return false;
    }
    // Check age is 18+
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      Alert.alert('Error', 'You must be 18 or older to use Feels');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!gender) {
      Alert.alert('Error', 'Please select your gender');
      return false;
    }
    if (!kinkLevel) {
      Alert.alert('Error', 'Please select your vibe');
      return false;
    }
    if (seekingGenders.length === 0) {
      Alert.alert('Error', 'Please select who you want to meet');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!zipCode.trim() || zipCode.length < 5) {
      Alert.alert('Error', 'Please enter a valid ZIP code');
      return false;
    }
    if (!bio.trim() || bio.length < 10) {
      Alert.alert('Error', 'Please write a short bio (at least 10 characters)');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) handleSubmit();
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Create profile
      await profileApi.create({
        name: name.trim(),
        dob,
        gender,
        zip_code: zipCode.trim(),
        bio: bio.trim(),
        kink_level: kinkLevel,
      });

      // Set preferences
      await profileApi.updatePreferences({
        genders_seeking: seekingGenders,
        age_min: 18,
        age_max: 50,
        distance_miles: 25,
        visible_to_genders: seekingGenders,
      });

      // Update user state
      setUser({ ...user!, name: name.trim(), bio: bio.trim() });

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress */}
          <View style={styles.progress}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[styles.progressDot, s <= step && styles.progressDotActive]}
              />
            ))}
          </View>

          {/* Step 1: Name & DOB */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.title}>Let's get to know you</Text>
              <Text style={styles.subtitle}>This info helps us find your matches</Text>

              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your first name"
                placeholderTextColor="#666"
                autoCapitalize="words"
                maxLength={30}
              />

              <Text style={styles.label}>Birthday</Text>
              <TextInput
                style={styles.input}
                value={dob}
                onChangeText={(t) => setDob(formatDob(t))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                maxLength={10}
              />
              <Text style={styles.hint}>You must be 18+ to use Feels</Text>
            </View>
          )}

          {/* Step 2: Gender & Seeking */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.title}>About you</Text>

              <Text style={styles.label}>I am a...</Text>
              <View style={styles.optionsGrid}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.option, gender === g.value && styles.optionSelected]}
                    onPress={() => setGender(g.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        gender === g.value && styles.optionTextSelected,
                      ]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>My vibe is...</Text>
              <View style={styles.optionsGrid}>
                {KINK_LEVELS.map((k) => (
                  <TouchableOpacity
                    key={k.value}
                    style={[styles.option, kinkLevel === k.value && styles.optionSelected]}
                    onPress={() => setKinkLevel(k.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        kinkLevel === k.value && styles.optionTextSelected,
                      ]}
                    >
                      {k.emoji} {k.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>I want to meet...</Text>
              <View style={styles.optionsGrid}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[
                      styles.option,
                      seekingGenders.includes(g.value) && styles.optionSelected,
                    ]}
                    onPress={() => toggleSeekingGender(g.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        seekingGenders.includes(g.value) && styles.optionTextSelected,
                      ]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hint}>Select all that apply</Text>
            </View>
          )}

          {/* Step 3: Location & Bio */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.title}>Almost done!</Text>

              <Text style={styles.label}>ZIP Code</Text>
              <TextInput
                style={styles.input}
                value={zipCode}
                onChangeText={setZipCode}
                placeholder="Your ZIP code"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                maxLength={5}
              />

              <Text style={styles.label}>About Me</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Write a short bio..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{bio.length}/500</Text>
            </View>
          )}

          {/* Navigation */}
          <View style={styles.navigation}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep(step - 1)}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextButton, isLoading && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={isLoading}
            >
              <Text style={styles.nextButtonText}>
                {isLoading ? 'Creating...' : step === 3 ? "Let's Go!" : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  progressDotActive: {
    backgroundColor: '#FF1493',
  },
  stepContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#222222',
  },
  bioInput: {
    minHeight: 120,
    paddingTop: 16,
  },
  hint: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
    marginTop: 4,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#111111',
    borderWidth: 2,
    borderColor: '#333333',
  },
  optionSelected: {
    backgroundColor: 'rgba(255, 20, 147, 0.2)',
    borderColor: '#FF1493',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888888',
  },
  optionTextSelected: {
    color: '#FF1493',
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#888888',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#FF1493',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
