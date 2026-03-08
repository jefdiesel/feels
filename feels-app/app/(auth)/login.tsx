import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

type LoginStep = 'email' | 'token';

export default function LoginScreen() {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { sendMagicLink, verifyMagicLink, isLoading } = useAuthStore();

  const handleSendLink = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setError('');
    setSuccess('');
    try {
      await sendMagicLink(email);
      setStep('token');
      setSuccess('Check your email for the login link');
    } catch (e: any) {
      setError(e.message || 'Failed to send magic link');
    }
  };

  const handleVerify = async () => {
    if (!token) {
      setError('Please enter the token from your email');
      return;
    }

    setError('');
    try {
      const { isNewUser } = await verifyMagicLink(token);
      if (isNewUser) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      setError(e.message || 'Invalid or expired link');
    }
  };

  const handleBack = () => {
    setStep('email');
    setToken('');
    setError('');
    setSuccess('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>feels</Text>
          <Text style={styles.subtitle}>
            {step === 'email' ? 'Sign in with email' : 'Enter your code'}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          {step === 'email' && (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.text.tertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSendLink}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.primary} />
                ) : (
                  <Text style={styles.buttonText}>Send Login Link</Text>
                )}
              </TouchableOpacity>

            </>
          )}

          {step === 'token' && (
            <>
              <Text style={styles.instructions}>
                We sent a code to {email}. Paste it below.
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Paste token here"
                  placeholderTextColor={colors.text.tertiary}
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.primary} />
                ) : (
                  <Text style={styles.buttonText}>Verify & Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleSendLink}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.linkText}>Resend code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text style={styles.linkText}>Use a different email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  title: {
    fontSize: 48,
    fontWeight: typography.weights.extrabold as any,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  successText: {
    color: colors.success,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.bg.secondary,
    color: colors.text.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    fontSize: typography.sizes.base,
  },
  button: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.text.primary,
    textAlign: 'center',
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
  },
  linkButton: {
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  linkText: {
    color: colors.primary.DEFAULT,
    textAlign: 'center',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
  },
  instructions: {
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xl,
  },
});
