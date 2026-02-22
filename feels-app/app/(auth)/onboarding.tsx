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

const AVAILABLE_PROMPTS = [
  "My ideal first date...",
  "I'm looking for...",
  "Two truths and a lie...",
  "My love language is...",
  "On weekends you'll find me...",
  "The way to my heart is...",
  "I get excited about...",
  "My biggest flex is...",
  "I'm convinced that...",
  "A random fact about me...",
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
  const [kinkLevel, setKinkLevel] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [bio, setBio] = useState('');
  const [seekingGenders, setSeekingGenders] = useState<string[]>([]);

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
        kink_level: kinkLevel,
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
                    <TouchableOpacity onPress={() => removePrompt(index)}>
                      <Text style={styles.removePrompt}>X</Text>
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
                      <Text style={styles.promptAdd}>+</Text>
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
  dobContainer: {
    position: 'relative',
  },
  dobFormat: {
    position: 'absolute',
    right: 16,
    top: 18,
    fontSize: 14,
    color: '#666666',
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
  // Prompts styles
  selectedPrompt: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF1493',
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promptQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF1493',
    flex: 1,
  },
  removePrompt: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666666',
    paddingLeft: 12,
  },
  promptInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  promptActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  savePromptButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  savePromptText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  promptAnswer: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  promptPlaceholder: {
    fontSize: 16,
    color: '#666666',
    fontStyle: 'italic',
  },
  availablePrompts: {
    marginTop: 8,
  },
  promptOption: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  promptOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  promptAdd: {
    fontSize: 24,
    color: '#FF1493',
    fontWeight: '700',
    marginLeft: 12,
  },
});
