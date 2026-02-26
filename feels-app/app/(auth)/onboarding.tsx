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
import {
  SparkleIcon,
  FlameIcon,
  HeartFilledIcon,
  StarFilledIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
} from '@/components/Icons';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

const GENDERS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'trans', label: 'Trans' },
];

const VIBE_LEVELS = [
  { value: 'vanilla', label: 'Vanilla', icon: 'sparkle' },
  { value: 'curious', label: 'Curious', icon: 'sparkle' },
  { value: 'sensual', label: 'Sensual', icon: 'flame' },
  { value: 'experienced', label: 'Experienced', icon: 'star' },
  { value: 'kinky', label: 'Adventurous', icon: 'heart' },
];

const LOOKING_FOR = [
  { value: 'serious', label: 'Something serious' },
  { value: 'relationship', label: 'Relationship minded' },
  { value: 'dating', label: 'Dating' },
  { value: 'meeting_people', label: 'Meeting new people' },
  { value: 'friends_and_more', label: 'Friends and more' },
];

const AVAILABLE_PROMPTS = [
  "I'm done playing it safe, now I want...",
  "The energy I'm looking for is...",
  "I'll try anything once, especially...",
  "What I'm curious about exploring...",
  "The vibe that pulls me in is...",
  "I'm at my best when someone...",
  "Don't be boring, be...",
  "I know what I want, and it's...",
  "The thing I haven't tried yet but will...",
  "Green flags that make me say yes...",
];

interface PromptAnswer {
  question: string;
  answer: string;
}

export default function OnboardingScreen() {
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [name, setName] = useState(user?.name || '');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [vibeLevel, setVibeLevel] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [bio, setBio] = useState('');
  const [seekingGenders, setSeekingGenders] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState('');

  // Prompts state
  const [selectedPrompts, setSelectedPrompts] = useState<PromptAnswer[]>([]);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [promptAnswer, setPromptAnswer] = useState('');

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
    if (!vibeLevel) {
      Alert.alert('Error', 'Please select your vibe');
      return false;
    }
    if (seekingGenders.length === 0) {
      Alert.alert('Error', 'Please select who you want to meet');
      return false;
    }
    if (!lookingFor) {
      Alert.alert('Error', 'Please select what you\'re looking for');
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

  const validateStep4 = () => {
    // Prompts are optional but if selected, they must have answers
    const incompletePrompts = selectedPrompts.filter(p => !p.answer.trim());
    if (incompletePrompts.length > 0) {
      Alert.alert('Error', 'Please answer all selected prompts or remove them');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) setStep(4);
    else if (step === 4 && validateStep4()) handleSubmit();
  };

  const selectPrompt = (question: string) => {
    if (selectedPrompts.length >= 3) {
      Alert.alert('Limit reached', 'You can only select up to 3 prompts');
      return;
    }
    if (selectedPrompts.some(p => p.question === question)) {
      return; // Already selected
    }
    const index = selectedPrompts.length;
    setSelectedPrompts([...selectedPrompts, { question, answer: '' }]);
    setEditingPromptIndex(index);
    setPromptAnswer('');
  };

  const savePromptAnswer = () => {
    if (editingPromptIndex === null) return;

    const updated = [...selectedPrompts];
    updated[editingPromptIndex] = {
      ...updated[editingPromptIndex],
      answer: promptAnswer.trim()
    };
    setSelectedPrompts(updated);
    setEditingPromptIndex(null);
    setPromptAnswer('');
  };

  const editPrompt = (index: number) => {
    setEditingPromptIndex(index);
    setPromptAnswer(selectedPrompts[index].answer);
  };

  const removePrompt = (index: number) => {
    const updated = selectedPrompts.filter((_, i) => i !== index);
    setSelectedPrompts(updated);
    if (editingPromptIndex === index) {
      setEditingPromptIndex(null);
      setPromptAnswer('');
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Create profile with prompts
      await profileApi.create({
        name: name.trim(),
        dob,
        gender,
        zip_code: zipCode.trim(),
        bio: bio.trim(),
        kink_level: vibeLevel,
        looking_for: lookingFor,
        prompts: selectedPrompts.filter(p => p.answer.trim()),
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
      setUser({
        ...user!,
        name: name.trim(),
        bio: bio.trim(),
        prompts: selectedPrompts.filter(p => p.answer.trim())
      });

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      // If profile already exists (409), just navigate to main app
      if (error.response?.status === 409) {
        router.replace('/(tabs)');
        return;
      }
      // If unauthorized (401), redirect to login
      if (error.response?.status === 401) {
        router.replace('/(auth)/login');
        return;
      }
      Alert.alert('Error', error.response?.data?.error || 'Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  const availableToSelect = AVAILABLE_PROMPTS.filter(
    p => !selectedPrompts.some(sp => sp.question === p)
  );

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
            {[1, 2, 3, 4].map((s) => (
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
              <View style={styles.dobContainer}>
                <TextInput
                  style={styles.input}
                  value={dob}
                  onChangeText={(t) => setDob(formatDob(t))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  maxLength={10}
                />
                {dob.length > 0 && dob.length < 10 && (
                  <Text style={styles.dobFormat}>
                    {dob.length <= 4 ? 'Year' : dob.length <= 7 ? 'Month' : 'Day'}
                  </Text>
                )}
              </View>
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
                {VIBE_LEVELS.map((k) => {
                  const isSelected = vibeLevel === k.value;
                  const iconColor = isSelected ? colors.primary.DEFAULT : colors.text.tertiary;
                  return (
                    <TouchableOpacity
                      key={k.value}
                      style={[styles.option, isSelected && styles.optionSelected]}
                      onPress={() => setVibeLevel(k.value)}
                    >
                      <View style={styles.vibeOption}>
                        {k.icon === 'sparkle' && <SparkleIcon size={16} color={iconColor} />}
                        {k.icon === 'flame' && <FlameIcon size={16} color={iconColor} />}
                        {k.icon === 'star' && <StarFilledIcon size={16} color={iconColor} />}
                        {k.icon === 'heart' && <HeartFilledIcon size={16} color={iconColor} />}
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                          {k.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
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

              <Text style={[styles.label, { marginTop: 24 }]}>I'm looking for...</Text>
              <View style={styles.optionsGrid}>
                {LOOKING_FOR.map((l) => (
                  <TouchableOpacity
                    key={l.value}
                    style={[
                      styles.option,
                      lookingFor === l.value && styles.optionSelected,
                    ]}
                    onPress={() => setLookingFor(l.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        lookingFor === l.value && styles.optionTextSelected,
                      ]}
                    >
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 3: Location & Bio */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.title}>Almost there!</Text>

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

          {/* Step 4: Profile Prompts */}
          {step === 4 && (
            <View style={styles.stepContent}>
              <Text style={styles.title}>Show your personality</Text>
              <Text style={styles.subtitle}>
                Pick up to 3 prompts and answer them (optional)
              </Text>

              {/* Selected Prompts */}
              {selectedPrompts.map((prompt, index) => (
                <View key={index} style={styles.selectedPrompt}>
                  <View style={styles.promptHeader}>
                    <Text style={styles.promptQuestion}>{prompt.question}</Text>
                    <TouchableOpacity onPress={() => removePrompt(index)} style={styles.removePrompt}>
                      <XIcon size={18} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                  {editingPromptIndex === index ? (
                    <View>
                      <TextInput
                        style={[styles.input, styles.promptInput]}
                        value={promptAnswer}
                        onChangeText={setPromptAnswer}
                        placeholder="Your answer..."
                        placeholderTextColor="#666"
                        multiline
                        numberOfLines={3}
                        maxLength={200}
                        autoFocus
                      />
                      <View style={styles.promptActions}>
                        <Text style={styles.charCount}>{promptAnswer.length}/200</Text>
                        <TouchableOpacity
                          style={styles.savePromptButton}
                          onPress={savePromptAnswer}
                        >
                          <Text style={styles.savePromptText}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => editPrompt(index)}>
                      <Text style={prompt.answer ? styles.promptAnswer : styles.promptPlaceholder}>
                        {prompt.answer || 'Tap to write your answer...'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Available Prompts to Select */}
              {selectedPrompts.length < 3 && editingPromptIndex === null && (
                <View style={styles.availablePrompts}>
                  <Text style={styles.label}>
                    Choose a prompt ({selectedPrompts.length}/3)
                  </Text>
                  {availableToSelect.map((prompt) => (
                    <TouchableOpacity
                      key={prompt}
                      style={styles.promptOption}
                      onPress={() => selectPrompt(prompt)}
                    >
                      <Text style={styles.promptOptionText}>{prompt}</Text>
                      <View style={styles.promptAdd}>
                        <PlusIcon size={22} color={colors.primary.DEFAULT} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
                {isLoading ? 'Creating...' : step === 4 ? "Let's Go!" : 'Next'}
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
    backgroundColor: colors.bg.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.bg.tertiary,
  },
  progressDotActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  stepContent: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold as any,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: spacing['2xl'],
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  bioInput: {
    minHeight: 120,
    paddingTop: spacing.lg,
  },
  dobContainer: {
    position: 'relative',
  },
  dobFormat: {
    position: 'absolute',
    right: spacing.lg,
    top: 18,
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  hint: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
  charCount: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bg.secondary,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
  },
  optionSelected: {
    backgroundColor: colors.primary.muted,
    borderColor: colors.primary.DEFAULT,
  },
  optionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.secondary,
  },
  optionTextSelected: {
    color: colors.primary.DEFAULT,
  },
  vibeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navigation: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing['2xl'],
  },
  backButton: {
    flex: 1,
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold as any,
    color: colors.text.secondary,
  },
  nextButton: {
    flex: 2,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  // Prompts styles
  selectedPrompt: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  promptQuestion: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    color: colors.primary.DEFAULT,
    flex: 1,
  },
  removePrompt: {
    paddingLeft: spacing.md,
  },
  promptInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  promptActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  savePromptButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
  },
  savePromptText: {
    color: colors.text.primary,
    fontWeight: typography.weights.semibold as any,
    fontSize: typography.sizes.sm,
  },
  promptAnswer: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 22,
  },
  promptPlaceholder: {
    fontSize: typography.sizes.base,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  availablePrompts: {
    marginTop: spacing.sm,
  },
  promptOption: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  promptOptionText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    flex: 1,
  },
  promptAdd: {
    marginLeft: spacing.md,
  },
});
