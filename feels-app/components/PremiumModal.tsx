import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Subscription {
  id: string;
  tier: 'basic' | 'plus' | 'premium';
  status: 'active' | 'canceled' | 'expired';
  expiresAt: string;
  features: string[];
}

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  currentSubscription: Subscription | null;
}

const TIERS = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$9.99/mo',
    features: [
      '50 bonus likes per month',
      'See who liked you',
      'Rewind last swipe',
      'Priority support',
    ],
    color: '#4A90D9',
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '$19.99/mo',
    popular: true,
    features: [
      '150 bonus likes per month',
      'See who liked you',
      'Unlimited rewinds',
      '5 Super Likes per day',
      'Boost your profile weekly',
      'Priority support',
    ],
    color: '#FF1493',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$29.99/mo',
    features: [
      'Unlimited likes',
      'See who liked you',
      'Unlimited rewinds',
      'Unlimited Super Likes',
      'Boost your profile daily',
      'Message before matching',
      'Incognito mode',
      'Priority support',
    ],
    color: '#FFD700',
  },
];

export default function PremiumModal({
  visible,
  onClose,
  currentSubscription,
}: PremiumModalProps) {
  const handleSelectTier = (tierId: string) => {
    // TODO: Implement subscription purchase flow
    console.log('Selected tier:', tierId);
  };

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

          {currentSubscription && currentSubscription.status === 'active' && (
            <View style={styles.currentPlan}>
              <Text style={styles.currentPlanLabel}>Current Plan</Text>
              <Text style={styles.currentPlanName}>
                {currentSubscription.tier.charAt(0).toUpperCase() +
                  currentSubscription.tier.slice(1)}
              </Text>
              <Text style={styles.currentPlanExpiry}>
                Renews{' '}
                {new Date(currentSubscription.expiresAt).toLocaleDateString()}
              </Text>
            </View>
          )}

          {TIERS.map((tier) => {
            const isCurrentTier =
              currentSubscription?.tier === tier.id &&
              currentSubscription?.status === 'active';

            return (
              <View
                key={tier.id}
                style={[
                  styles.tierCard,
                  tier.popular && styles.popularTierCard,
                  isCurrentTier && styles.currentTierCard,
                ]}
              >
                {tier.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}

                <View style={styles.tierHeader}>
                  <Text style={[styles.tierName, { color: tier.color }]}>
                    {tier.name}
                  </Text>
                  <Text style={styles.tierPrice}>{tier.price}</Text>
                </View>

                <View style={styles.featuresList}>
                  {tier.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Text style={styles.featureCheck}>+</Text>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    { backgroundColor: tier.color },
                    isCurrentTier && styles.currentButton,
                  ]}
                  onPress={() => !isCurrentTier && handleSelectTier(tier.id)}
                  disabled={isCurrentTier}
                >
                  <Text style={styles.selectButtonText}>
                    {isCurrentTier ? 'Current Plan' : 'Select'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={styles.disclaimer}>
            Subscriptions automatically renew unless canceled at least 24 hours
            before the end of the current period. Manage your subscription in
            your device settings.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  headerSpacer: {
    width: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 50,
    alignItems: 'flex-end',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF1493',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 24,
  },
  currentPlan: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  currentPlanLabel: {
    fontSize: 12,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF1493',
    marginBottom: 4,
  },
  currentPlanExpiry: {
    fontSize: 14,
    color: '#666666',
  },
  tierCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#222222',
  },
  popularTierCard: {
    borderColor: '#FF1493',
  },
  currentTierCard: {
    opacity: 0.7,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#FF1493',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  tierName: {
    fontSize: 24,
    fontWeight: '800',
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  featuresList: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureCheck: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#CCCCCC',
    flex: 1,
  },
  selectButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentButton: {
    backgroundColor: '#333333',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
