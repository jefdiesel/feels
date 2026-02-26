import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckIcon, CrownIcon, StarFilledIcon, SparkleIcon } from '@/components/Icons';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';
import { paymentsApi, Plan, PlanType, Subscription } from '@/api/client';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
}

// Map plan types to display info
const PLAN_DISPLAY = {
  monthly: {
    icon: 'sparkle',
    color: colors.tertiary.DEFAULT,
    features: [
      'Unlimited likes',
      'See who liked you',
      'Rewind last swipe',
      'Priority support',
    ],
  },
  quarterly: {
    icon: 'star',
    color: colors.primary.DEFAULT,
    popular: true,
    features: [
      'Unlimited likes',
      'See who liked you',
      'Unlimited rewinds',
      '5 Super Likes per day',
      'Profile verification badge',
      'Boost your profile weekly',
      'Priority support',
    ],
  },
  annual: {
    icon: 'crown',
    color: colors.secondary.DEFAULT,
    features: [
      'Unlimited likes',
      'See who liked you',
      'Unlimited rewinds',
      'Unlimited Super Likes',
      'Profile verification badge',
      'Boost your profile daily',
      'Message before matching',
      'Incognito mode',
      'Priority support',
    ],
  },
};

export default function PremiumModal({
  visible,
  onClose,
}: PremiumModalProps) {
  const [plans, setPlans] = useState<Record<PlanType, Plan> | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<PlanType | null>(null);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, subRes] = await Promise.all([
        paymentsApi.getPlans(),
        paymentsApi.getSubscription(),
      ]);
      setPlans(plansRes.data);
      setSubscription(subRes.data.subscription);
    } catch (error) {
      console.error('Failed to load payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planType: PlanType) => {
    setCheckoutLoading(planType);
    try {
      // Use deep link URLs for Stripe to redirect back to the app
      const successUrl = 'feels://payment/success';
      const cancelUrl = 'feels://payment/cancel';

      const response = await paymentsApi.createCheckout(planType, successUrl, cancelUrl);
      const { checkout_url } = response.data;

      // Open Stripe checkout in browser
      const supported = await Linking.canOpenURL(checkout_url);
      if (supported) {
        await Linking.openURL(checkout_url);
        onClose();
      } else {
        Alert.alert('Error', 'Unable to open payment page. Please try again.');
      }
    } catch (error: any) {
      console.error('Failed to create checkout:', error);
      if (error.response?.status === 409) {
        Alert.alert('Already Subscribed', 'You already have an active subscription.');
      } else {
        Alert.alert('Error', 'Failed to start checkout. Please try again.');
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const returnUrl = 'feels://payment/portal';
      const response = await paymentsApi.createPortal(returnUrl);
      const { url } = response.data;

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open billing portal. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create portal session:', error);
      Alert.alert('Error', 'Failed to open billing portal. Please try again.');
    }
  };

  const formatPrice = (amount: number, currency: string, interval: string, intervalCount: number) => {
    const price = (amount / 100).toFixed(2);
    const currencySymbol = currency === 'usd' ? '$' : currency.toUpperCase();
    const periodLabel = intervalCount === 1
      ? `/${interval}`
      : `/${intervalCount} ${interval}s`;
    return `${currencySymbol}${price}${periodLabel}`;
  };

  const formatMonthlyPrice = (amount: number, intervalCount: number, interval: string) => {
    let monthlyAmount: number;
    if (interval === 'year') {
      monthlyAmount = amount / 12;
    } else if (interval === 'month' && intervalCount > 1) {
      monthlyAmount = amount / intervalCount;
    } else {
      return null;
    }
    return `$${(monthlyAmount / 100).toFixed(2)}/mo`;
  };

  const renderTierIcon = (icon: string, color: string) => {
    switch (icon) {
      case 'sparkle':
        return <SparkleIcon size={24} color={color} />;
      case 'star':
        return <StarFilledIcon size={24} color={color} />;
      case 'crown':
        return <CrownIcon size={24} color={color} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const planOrder: PlanType[] = ['monthly', 'quarterly', 'annual'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Upgrade to Premium</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Get more matches and stand out from the crowd
          </Text>

          {subscription && subscription.status === 'active' && (
            <View style={styles.currentPlan}>
              <Text style={styles.currentPlanLabel}>Current Plan</Text>
              <Text style={styles.currentPlanName}>
                {subscription.plan_type.charAt(0).toUpperCase() +
                  subscription.plan_type.slice(1)}
              </Text>
              <Text style={styles.currentPlanExpiry}>
                {subscription.canceled_at
                  ? `Expires ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`}
              </Text>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={handleManageSubscription}
              >
                <Text style={styles.manageButtonText}>Manage Subscription</Text>
              </TouchableOpacity>
            </View>
          )}

          {planOrder.map((planType) => {
            const plan = plans?.[planType];
            if (!plan) return null;

            const display = PLAN_DISPLAY[planType];
            const isCurrentPlan =
              subscription?.plan_type === planType &&
              subscription?.status === 'active';
            const isLoading = checkoutLoading === planType;
            const monthlyPrice = formatMonthlyPrice(plan.amount, plan.interval_count, plan.interval);

            return (
              <View
                key={planType}
                style={[
                  styles.tierCard,
                  display.popular && styles.popularTierCard,
                  isCurrentPlan && styles.currentTierCard,
                ]}
              >
                {display.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                  </View>
                )}

                <View style={styles.tierHeader}>
                  <View style={styles.tierNameContainer}>
                    {renderTierIcon(display.icon, display.color)}
                    <Text style={[styles.tierName, { color: display.color }]}>
                      {plan.name}
                    </Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.tierPrice}>
                      {formatPrice(plan.amount, plan.currency, plan.interval, plan.interval_count)}
                    </Text>
                    {monthlyPrice && (
                      <Text style={styles.monthlyPrice}>{monthlyPrice}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.featuresList}>
                  {display.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <CheckIcon size={16} color={colors.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    { backgroundColor: display.color },
                    isCurrentPlan && styles.currentButton,
                  ]}
                  onPress={() => !isCurrentPlan && handleSelectPlan(planType)}
                  disabled={isCurrentPlan || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.text.primary} />
                  ) : (
                    <Text style={styles.selectButtonText}>
                      {isCurrentPlan ? 'Current Plan' : 'Subscribe'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={styles.disclaimer}>
            Payment is processed securely via Stripe. Subscriptions automatically
            renew unless canceled at least 24 hours before the end of the current
            period. You can manage or cancel your subscription anytime.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerSpacer: {
    width: 50,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  closeButton: {
    width: 50,
    alignItems: 'flex-end',
  },
  closeText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary.DEFAULT,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  currentPlan: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  currentPlanLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  currentPlanName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.primary.DEFAULT,
    marginBottom: spacing.xs,
  },
  currentPlanExpiry: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },
  manageButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  manageButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary.DEFAULT,
  },
  tierCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
  },
  popularTierCard: {
    borderColor: colors.primary.DEFAULT,
  },
  currentTierCard: {
    opacity: 0.7,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  popularBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  tierNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tierName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold as any,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  tierPrice: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  monthlyPrice: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  featuresList: {
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  featureText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  selectButton: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  currentButton: {
    backgroundColor: colors.bg.tertiary,
  },
  selectButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  disclaimer: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
