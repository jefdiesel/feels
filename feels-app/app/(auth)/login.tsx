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
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

type LoginMode = 'password' | 'magic' | 'magic_sent';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicToken, setMagicToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loginMode, setLoginMode] = useState<LoginMode>('password');
  const { login, sendMagicLink, verifyMagicLink, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    }
  };

  const handleSendMagicLink = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setError('');
    setSuccess('');
    try {
      await sendMagicLink(email);
      setLoginMode('magic_sent');
      setSuccess('Check your email for the login link');
    } catch (e: any) {
      setError(e.message || 'Failed to send magic link');
    }
  };

  const handleVerifyMagicLink = async () => {
    if (!magicToken) {
      setError('Please enter the token from your email');
      return;
    }

    setError('');
    try {
      await verifyMagicLink(magicToken);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Invalid or expired link');
    }
  };

  const toggleLoginMode = () => {
    setError('');
    setSuccess('');
    if (loginMode === 'password') {
      setLoginMode('magic');
    } else {
      setLoginMode('password');
      setMagicToken('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>feels</Text>
          <Text style={styles.subtitle}>Find your connection</Text>

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

          {loginMode === 'password' && (
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
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.text.tertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.primary} />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.magicLinkButton}
                onPress={toggleLoginMode}
                activeOpacity={0.8}
              >
                <Text style={styles.magicLinkButtonText}>Sign in with email link</Text>
              </TouchableOpacity>
            </>
          )}

          {loginMode === 'magic' && (
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
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleSendMagicLink}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.primary} />
                ) : (
                  <Text style={styles.buttonText}>Send Magic Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.magicLinkButton}
                onPress={toggleLoginMode}
                activeOpacity={0.8}
              >
                <Text style={styles.magicLinkButtonText}>Sign in with password</Text>
              </TouchableOpacity>
            </>
          )}

          {loginMode === 'magic_sent' && (
            <>
              <Text style={styles.magicInstructions}>
                Enter the token from your email to sign in
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Paste token here"
                  placeholderTextColor={colors.text.tertiary}
                  value={magicToken}
                  onChangeText={setMagicToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleVerifyMagicLink}
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
                style={styles.magicLinkButton}
                onPress={() => setLoginMode('magic')}
                activeOpacity={0.8}
              >
                <Text style={styles.magicLinkButtonText}>Resend magic link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.magicLinkButton}
                onPress={toggleLoginMode}
                activeOpacity={0.8}
              >
                <Text style={styles.magicLinkButtonText}>Sign in with password</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/register" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
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
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  buttonText: {
    color: colors.text.primary,
    textAlign: 'center',
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
  },
  magicLinkButton: {
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  magicLinkButtonText: {
    color: colors.primary.DEFAULT,
    textAlign: 'center',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
  },
  magicInstructions: {
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.text.secondary,
  },
  linkText: {
    color: colors.primary.DEFAULT,
    fontWeight: typography.weights.semibold as any,
  },
});
