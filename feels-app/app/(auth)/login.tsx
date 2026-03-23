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
  Alert,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/client';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

type LoginStep = 'email' | 'token';

export default function LoginScreen() {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { sendMagicLink, verifyMagicLink, isLoading, getDeviceId, setTokens } = useAuthStore();
  const [appleLoading, setAppleLoading] = useState(false);

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

  const handleAppleSignIn = async () => {
    try {
      setAppleLoading(true);
      setError('');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const deviceId = await getDeviceId();
      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : null;

      const response = await authApi.appleAuth(
        credential.identityToken || '',
        credential.user,
        credential.email,
        fullName,
        deviceId,
        Platform.OS
      );

      await setTokens(response.data.access_token, response.data.refresh_token);

      if (response.data.is_new_user) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled, don't show error
        return;
      }
      console.error('Apple sign in error:', e);
      setError(e.response?.data?.error || e.message || 'Apple sign in failed');
    } finally {
      setAppleLoading(false);
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
              {/* Apple Sign In - iOS only */}
              {Platform.OS === 'ios' && (
                <>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={8}
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                  />

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </>
              )}

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

const styles = StyleSheet.create<{
  container: ViewStyle;
  keyboardView: ViewStyle;
  content: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  errorBox: ViewStyle;
  errorText: TextStyle;
  successBox: ViewStyle;
  successText: TextStyle;
  appleButton: ViewStyle;
  divider: ViewStyle;
  dividerLine: ViewStyle;
  dividerText: TextStyle;
  inputContainer: ViewStyle;
  input: TextStyle;
  button: ViewStyle;
  buttonDisabled: ViewStyle;
  buttonText: TextStyle;
  linkButton: ViewStyle;
  linkText: TextStyle;
  instructions: TextStyle;
}>({
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
    paddingHorizontal: spacing[6],
  },
  title: {
    fontSize: 48,
    fontWeight: typography.weights.heading as TextStyle['fontWeight'],
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[7],
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginBottom: spacing[5],
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginBottom: spacing[5],
  },
  successText: {
    color: colors.success,
    textAlign: 'center',
  },
  appleButton: {
    height: 50,
    marginBottom: spacing[4],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.DEFAULT,
  },
  dividerText: {
    color: colors.text.tertiary,
    paddingHorizontal: spacing[4],
    fontSize: typography.sizes.base,
  },
  inputContainer: {
    marginBottom: spacing[4],
  },
  input: {
    backgroundColor: colors.bg.secondary,
    color: colors.text.primary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.md,
    fontSize: typography.sizes.base,
  },
  button: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.text.primary,
    textAlign: 'center',
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.heading as TextStyle['fontWeight'],
  },
  linkButton: {
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
  },
  linkText: {
    color: colors.primary.DEFAULT,
    textAlign: 'center',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heading as TextStyle['fontWeight'],
  },
  instructions: {
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: typography.sizes.base,
    marginBottom: spacing[5],
  },
});
