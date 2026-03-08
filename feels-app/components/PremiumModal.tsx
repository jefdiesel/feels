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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckIcon, CrownIcon, StarFilledIcon, SparkleIcon } from '@/components/Icons';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';
import { useRevenueCat, PurchasesPackage } from '@/hooks/useRevenueCat';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string; // Optional: which feature triggered the modal
}

// Premium features (same for all plans, just pricing differs)
const PREMIUM_FEATURES = [
  '50 daily likes (vs 20 free)',
  '3 Premium Likes per day',
  'Unlimited rewinds',
  '1 boost per week',
  'Private mode',
  'Skip the like queue',
];

// Package identifier mapping for display
interface PackageDisplay {
  icon: string;
  color: string;
  popular?: boolean;
  name: string;
}

// Map RevenueCat package identifiers to display info
const PACKAGE_DISPLAY: Record<string, PackageDisplay> = {
  '$rc_monthly': {
    icon: 'sparkle',
    color: colors.tertiary.DEFAULT,
    name: 'Monthly',
  },
  '$rc_three_month': {
    icon: 'star',
    color: colors.primary.DEFAULT,
    popular: true,
    name: 'Quarterly',
  },
  '$rc_annual': {
    icon: 'crown',
    color: colors.secondary.DEFAULT,
    name: 'Annual',
  },
  // Custom identifiers (if you use them instead of defaults)
  'monthly': {
    icon: 'sparkle',
    color: colors.tertiary.DEFAULT,
    name: 'Monthly',
  },
  'quarterly': {
    icon: 'star',
    color: colors.primary.DEFAULT,
    popular: true,
    name: 'Quarterly',
  },
  'annual': {
    icon: 'crown',
    color: colors.secondary.DEFAULT,
    name: 'Annual',
  },
};

export default function PremiumModal({
  visible,
  onClose,
}: PremiumModalProps) {
  const {
    offerings,
    isPremium,
    isLoading: rcLoading,
    purchasePackage,
    restorePurchases,
    getOfferings,
  } = useRevenueCat();

  const [loading, setLoading] = useState(true);
  const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  const loadOfferings = async () => {
    setLoading(true);
    await getOfferings();
    setLoading(false);
  };

  const handleSelectPackage = async (pkg: PurchasesPackage) => {
    setPurchasingPackage(pkg.identifier);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        Alert.alert('Welcome to Premium!', 'Your subscription is now active.');
        onClose();
      }
    } finally {
      setPurchasingPackage(null);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    const restored = await restorePurchases();
    setLoading(false);
    if (restored) {
      onClose();
    }
  };

  const formatPrice = (pkg: PurchasesPackage): string => {
    return pkg.product.priceString;
  };

  const formatPeriod = (pkg: PurchasesPackage): string => {
    const period = pkg.product.subscriptionPeriod;
    if (!period) return '';

    if (period.includes('P1M')) return '/month';
    if (period.includes('P3M')) return '/3 months';
    if (period.includes('P1Y')) return '/year';
    return '';
  };

  const formatMonthlyPrice = (pkg: PurchasesPackage): string | null => {
    const price = pkg.product.price;
    const period = pkg.product.subscriptionPeriod;

    if (!period || period.includes('P1M')) return null;

    let monthlyPrice: number;
    if (period.includes('P3M')) {
      monthlyPrice = price / 3;
    } else if (period.includes('P1Y')) {
      monthlyPrice = price / 12;
    } else {
      return null;
    }

    // Format with currency symbol
    const currencyCode = pkg.product.currencyCode || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(monthlyPrice) + '/mo';
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

  const getPackageDisplay = (pkg: PurchasesPackage): PackageDisplay => {
    return PACKAGE_DISPLAY[pkg.identifier] || {
      icon: 'sparkle',
      color: colors.primary.DEFAULT,
      name: pkg.product.title || pkg.identifier,
    };
  };

  if (loading || rcLoading) {
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

  // Get packages sorted by price
  const packages = offerings?.availablePackages || [];
  const sortedPackages = [...packages].sort((a, b) => a.product.price - b.product.price);

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

          {isPremium && (
            <View style={styles.currentPlan}>
              <Text style={styles.currentPlanLabel}>Current Status</Text>
              <Text style={styles.currentPlanName}>Premium Active</Text>
              <Text style={styles.currentPlanExpiry}>
                Manage your subscription in device settings
              </Text>
            </View>
          )}

          {sortedPackages.length === 0 ? (
            <View style={styles.noPackages}>
              <Text style={styles.noPackagesText}>
                Subscription plans are being configured. Please check back soon.
              </Text>
            </View>
          ) : (
            sortedPackages.map((pkg) => {
              const display = getPackageDisplay(pkg);
              const isLoading = purchasingPackage === pkg.identifier;
              const monthlyPrice = formatMonthlyPrice(pkg);

              return (
                <View
                  key={pkg.identifier}
                  style={[
                    styles.tierCard,
                    display.popular && styles.popularTierCard,
                    isPremium && styles.currentTierCard,
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
                        {display.name}
                      </Text>
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={styles.tierPrice}>
                        {formatPrice(pkg)}{formatPeriod(pkg)}
                      </Text>
                      {monthlyPrice && (
                        <Text style={styles.monthlyPrice}>{monthlyPrice}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.featuresList}>
                    {PREMIUM_FEATURES.map((feature, index) => (
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
                      isPremium && styles.currentButton,
                    ]}
                    onPress={() => !isPremium && handleSelectPackage(pkg)}
                    disabled={isPremium || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={colors.text.primary} />
                    ) : (
                      <Text style={styles.selectButtonText}>
                        {isPremium ? 'Current Plan' : 'Subscribe'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Payment will be charged to your Apple ID or Google Play account at confirmation of purchase.
            Subscription automatically renews unless auto-renew is turned off at least 24 hours before
            the end of the current period. You can manage or cancel your subscription in your device's
            account settings.
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
  },
  noPackages: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  noPackagesText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
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
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  restoreText: {
    fontSize: typography.sizes.sm,
    color: colors.primary.DEFAULT,
    fontWeight: typography.weights.semibold as any,
  },
  disclaimer: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
