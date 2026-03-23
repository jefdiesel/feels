import { useState, useRef, useEffect } from 'react';
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
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { authApi } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

type AuthStep = 'phone' | 'code';

export default function PhoneAuthScreen() {
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const { setTokens } = useAuthStore();

  const codeInputRef = useRef<TextInput>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus code input when switching to code step
  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [step]);

  const formatPhone = (text: string) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhone(text);
    setPhone(formatted);
    setError('');
  };

  const getDeviceId = async () => {
    if (Platform.OS === 'ios') {
      return await Application.getIosIdForVendorAsync() || Device.modelId || 'unknown';
    }
    // For Android, use getAndroidId() which is async
    const androidId = await Application.getAndroidId();
    return androidId || Device.modelId || 'unknown';
  };

  const handleSendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!smsOptIn) {
      setError('Please agree to receive SMS verification codes');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.sendPhoneOTP('+1' + digits);
      setMaskedPhone(response.data.phone);
      setStep('code');
      setCountdown(60); // 60 second cooldown for resend
    } catch (e: any) {
      const message = e.response?.data?.error || e.message || 'Failed to send code';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const digits = phone.replace(/\D/g, '');
      const deviceId = await getDeviceId();
      const response = await authApi.phoneLogin('+1' + digits, code, deviceId, Platform.OS);

      // Store tokens
      await setTokens(response.data.access_token, response.data.refresh_token);

      // Navigate based on whether this is a new user
      if (response.data.is_new_user) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      const message = e.response?.data?.error || e.message || 'Invalid code';
      setError(message);
      // Clear code on error so user can try again
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setCode('');
    setError('');
    handleSendCode();
  };

  const handleCodeChange = (text: string) => {
    // Only allow digits, max 6
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError('');

    // Auto-submit when 6 digits entered
    if (digits.length === 6) {
      // Small delay to show the last digit
      setTimeout(() => handleVerifyCode(), 100);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setCode('');
    setError('');
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
            {step === 'phone' ? 'Enter your phone number' : `Enter the code sent to ${maskedPhone}`}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 'phone' && (
            <>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.countryCode}>+1</Text>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.text.tertiary}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  autoFocus
                  maxLength={14} // (XXX) XXX-XXXX
                />
              </View>

              {/* SMS Opt-in Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setSmsOptIn(!smsOptIn)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, smsOptIn && styles.checkboxChecked]}>
                  {smsOptIn && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxText}>
                  I agree to receive SMS verification codes from Feels. Message frequency varies. Standard message and data rates may apply. Reply STOP to opt out. Text HELP for support.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, (isLoading || !smsOptIn) && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={isLoading || !smsOptIn}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.primary} />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.termsText}>
                By continuing, you also agree to our Terms of Service and Privacy Policy.
                Your phone number will not be shared with third parties for marketing purposes.
              </Text>
            </>
          )}

          {step === 'code' && (
            <>
              <View style={styles.codeContainer}>
                <TextInput
                  ref={codeInputRef}
                  style={styles.codeInput}
                  placeholder="000000"
                  placeholderTextColor={colors.text.tertiary}
                  value={code}
                  onChangeText={handleCodeChange}
                  keyboardType="number-pad"
                  maxLength={6}
                  textContentType="oneTimeCode" // iOS auto-fill from SMS
                  autoComplete="sms-otp" // Android auto-fill from SMS
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={isLoading || code.length !== 6}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.primary} />
                ) : (
                  <Text style={styles.buttonText}>Verify</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleResend}
                disabled={countdown > 0}
                activeOpacity={0.8}
              >
                <Text style={[styles.linkText, countdown > 0 && styles.linkTextDisabled]}>
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text style={styles.linkText}>Use a different number</Text>
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
    paddingHorizontal: spacing[6],
  },
  title: {
    fontSize: 48,
    fontWeight: typography.weights.heading as any,
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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  countryCode: {
    color: colors.text.primary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.heading as any,
    paddingLeft: spacing[5],
    paddingRight: spacing[3],
  },
  phoneInput: {
    flex: 1,
    color: colors.text.primary,
    paddingVertical: spacing[4],
    paddingRight: spacing[5],
    fontSize: typography.sizes.title,
  },
  codeContainer: {
    marginBottom: spacing[4],
  },
  codeInput: {
    backgroundColor: colors.bg.secondary,
    color: colors.text.primary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
    borderRadius: borderRadius.md,
    fontSize: 32,
    fontWeight: typography.weights.heading as any,
    textAlign: 'center',
    letterSpacing: 8,
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
    fontWeight: typography.weights.heading as any,
  },
  linkButton: {
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
  },
  linkText: {
    color: colors.primary.DEFAULT,
    textAlign: 'center',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heading as any,
  },
  linkTextDisabled: {
    color: colors.text.tertiary,
  },
  termsText: {
    color: colors.text.tertiary,
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginTop: spacing[4],
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[5],
    paddingHorizontal: spacing[2],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    marginRight: spacing[3],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  checkmark: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: typography.weights.heading as any,
  },
  checkboxText: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: typography.sizes.base,
    lineHeight: 20,
  },
});
