import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { CheckIcon, XIcon } from '@/components/Icons';
import { colors, typography, spacing } from '@/constants/theme';

export default function MagicLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { verifyMagicLink } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Invalid magic link');
      return;
    }

    const verify = async () => {
      try {
        await verifyMagicLink(token);
        setStatus('success');
        // Redirect to main app after success
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Failed to verify magic link');
      }
    };

    verify();
  }, [token]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            <Text style={styles.title}>Signing you in...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.iconContainer}>
              <CheckIcon size={48} color={colors.text.primary} />
            </View>
            <Text style={styles.title}>Welcome back!</Text>
            <Text style={styles.subtitle}>Redirecting...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={[styles.iconContainer, styles.errorIcon]}>
              <XIcon size={48} color={colors.text.primary} />
            </View>
            <Text style={styles.title}>Sign in failed</Text>
            <Text style={styles.subtitle}>{error}</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  errorIcon: {
    backgroundColor: colors.error,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
