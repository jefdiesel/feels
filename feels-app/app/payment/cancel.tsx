import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { XIcon } from '@/components/Icons';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function PaymentCancelScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <XIcon size={48} color={colors.text.primary} />
        </View>
        <Text style={styles.title}>Payment Cancelled</Text>
        <Text style={styles.subtitle}>
          No worries! You can upgrade anytime from your profile.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(tabs)/profile')}
        >
          <Text style={styles.buttonText}>Back to Profile</Text>
        </TouchableOpacity>
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
    padding: spacing[5],
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  title: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.heading as any,
    color: colors.text.primary,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  button: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.md,
  },
  buttonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heading as any,
    color: colors.text.primary,
  },
});
