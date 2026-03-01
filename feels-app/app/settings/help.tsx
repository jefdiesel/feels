import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MessageIcon,
  HelpCircleIcon,
  ShieldIcon,
  HeartIcon,
} from '@/components/Icons';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I get more matches?',
    answer: 'Complete your profile with clear photos and interesting prompts. Be active on the app - users who engage regularly see more profiles. Consider upgrading to Premium for features like unlimited likes and seeing who liked you.',
  },
  {
    question: 'What are credits used for?',
    answer: 'Credits are used for Super Likes (5 credits each). You receive 10 free credits daily. Premium subscribers get additional credits monthly.',
  },
  {
    question: 'How does image sharing work?',
    answer: 'For safety, both users must enable image sharing before photos can be sent in chat. You need to exchange at least 5 messages before this option becomes available. Tap the camera/lock icon in the chat header to enable.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes! We use end-to-end encryption for messages when both users have it enabled (look for the "E2E" badge in chat). Your personal data is stored securely and never sold to third parties.',
  },
  {
    question: 'How do I report someone?',
    answer: 'In any chat, tap the "..." menu in the top right and select "Report". Choose a reason and provide details. Our team reviews all reports within 24 hours.',
  },
  {
    question: 'Can I undo a pass?',
    answer: 'Premium subscribers can use the "Rewind" feature to undo their last pass. Free users cannot undo passes, so swipe carefully!',
  },
  {
    question: 'Why am I not seeing any profiles?',
    answer: 'Check your search filters in Settings - they might be too restrictive. Also ensure location services are enabled. If you\'re in a less populated area, try increasing your distance range.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer: 'Subscriptions are managed through the App Store (iOS) or Google Play (Android). Go to your device settings, then Subscriptions, and select Feels to cancel.',
  },
];

export default function HelpScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@feelsfun.app?subject=Help%20Request');
  };

  const handleSafetyCenter = () => {
    Linking.openURL('https://feelsfun.app/safety');
  };

  const handleCommunityGuidelines = () => {
    Linking.openURL('https://feelsfun.app/guidelines');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://feelsfun.app/privacy');
  };

  const handleTerms = () => {
    Linking.openURL('https://feelsfun.app/terms');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeftIcon size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Help & Support</Text>
          <View style={styles.backButton} />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionCard} onPress={handleContactSupport}>
            <View style={[styles.actionIcon, { backgroundColor: colors.primary.muted }]}>
              <MessageIcon size={24} color={colors.primary.DEFAULT} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Contact Support</Text>
              <Text style={styles.actionDescription}>Get help from our team</Text>
            </View>
            <ChevronRightIcon size={20} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleSafetyCenter}>
            <View style={[styles.actionIcon, { backgroundColor: colors.tertiary.muted }]}>
              <ShieldIcon size={24} color={colors.tertiary.DEFAULT} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Safety Center</Text>
              <Text style={styles.actionDescription}>Tips for safe dating</Text>
            </View>
            <ChevronRightIcon size={20} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleCommunityGuidelines}>
            <View style={[styles.actionIcon, { backgroundColor: colors.secondary.muted }]}>
              <HeartIcon size={24} color={colors.secondary.DEFAULT} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Community Guidelines</Text>
              <Text style={styles.actionDescription}>How we keep Feels safe</Text>
            </View>
            <ChevronRightIcon size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          {FAQ_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                {expandedIndex === index ? (
                  <ChevronUpIcon size={20} color={colors.text.tertiary} />
                ) : (
                  <ChevronDownIcon size={20} color={colors.text.tertiary} />
                )}
              </View>
              {expandedIndex === index && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <TouchableOpacity style={styles.linkRow} onPress={handlePrivacyPolicy}>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <ChevronRightIcon size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={handleTerms}>
            <Text style={styles.linkText}>Terms of Service</Text>
            <ChevronRightIcon size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Feels v1.0.0</Text>
          <Text style={styles.copyrightText}>Made with love in NYC</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  // Quick Actions
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  // FAQ
  faqItem: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.primary,
    marginRight: spacing.md,
  },
  faqAnswer: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 22,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  // Legal links
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  linkText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  // Version
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  versionText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  copyrightText: {
    fontSize: typography.sizes.xs,
    color: colors.text.disabled,
  },
});
