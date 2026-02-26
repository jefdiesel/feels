import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useFeedStore } from '@/stores/feedStore';
import { useCreditsStore } from '@/stores/creditsStore';
import SwipeCard from '@/components/SwipeCard';
import ActionBar from '@/components/ActionBar';
import ProfileOverlay from '@/components/ProfileOverlay';
import { CoinIcon, AlertCircleIcon, SparkleIcon, PartyPopperIcon, ChevronRightIcon } from '@/components/Icons';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

const SUPERLIKE_COST = 5;

export default function FeedScreen() {
  const { profiles, currentIndex, isLoading, error, loadProfiles, swipe } = useFeedStore();
  const {
    balance,
    bonusLikes,
    isLowCredits,
    hasEnoughCredits,
    useBonusLike,
    useCredits,
    loadCredits,
  } = useCreditsStore();
  const [showProfile, setShowProfile] = useState(false);
  const [matchAnimation, setMatchAnimation] = useState(false);

  // Reload profiles when screen gains focus (e.g., after settings change)
  useFocusEffect(
    useCallback(() => {
      loadProfiles();
      loadCredits();
    }, [])
  );

  // Handle profile required error - redirect to onboarding
  useEffect(() => {
    if (error === 'PROFILE_REQUIRED') {
      router.replace('/(auth)/onboarding');
    }
  }, [error]);

  const currentProfile = profiles[currentIndex];

  const handleSwipe = useCallback(
    async (action: 'like' | 'pass' | 'superlike') => {
      // Check credits for superlike
      if (action === 'superlike') {
        // First try to use bonus likes
        if (bonusLikes > 0) {
          useBonusLike();
        } else if (hasEnoughCredits(SUPERLIKE_COST)) {
          useCredits(SUPERLIKE_COST);
        } else {
          // Not enough credits - show warning
          Alert.alert(
            'Not Enough Credits',
            `Super Likes cost ${SUPERLIKE_COST} credits. Get more credits to send Super Likes!`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Get Credits',
                onPress: () => router.push('/(tabs)/profile'),
              },
            ]
          );
          return;
        }
      }

      // For regular likes, use bonus likes (backend also tracks daily likes)
      if (action === 'like' && bonusLikes > 0) {
        useBonusLike();
      }

      setShowProfile(false);
      const isMatch = await swipe(action);
      if (isMatch) {
        setMatchAnimation(true);
        setTimeout(() => setMatchAnimation(false), 2000);
      }
    },
    [swipe, bonusLikes, hasEnoughCredits, useBonusLike, useCredits]
  );

  if (isLoading && profiles.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Finding people near you...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorIconContainer}>
          <AlertCircleIcon size={48} color={colors.error} />
        </View>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!currentProfile) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconContainer}>
          <SparkleIcon size={48} color={colors.secondary.DEFAULT} />
        </View>
        <Text style={styles.emptyTitle}>No more profiles</Text>
        <Text style={styles.emptyText}>Check back later for new people</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Low credits warning banner */}
      {isLowCredits() && balance > 0 && (
        <TouchableOpacity
          style={styles.lowCreditsBanner}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.8}
        >
          <CoinIcon size={18} color={colors.warning} />
          <Text style={styles.lowCreditsText}>
            Credits running low ({balance} left)
          </Text>
          <ChevronRightIcon size={18} color={colors.warning} />
        </TouchableOpacity>
      )}

      {/* Render next card underneath for smooth transition */}
      {profiles[currentIndex + 1] && (
        <View style={styles.nextCard}>
          <SwipeCard
            profile={profiles[currentIndex + 1]}
            onSwipe={() => {}}
            onExpandProfile={() => {}}
          />
        </View>
      )}

      {/* Current card */}
      <SwipeCard
        key={currentProfile.id}
        profile={currentProfile}
        onSwipe={handleSwipe}
        onExpandProfile={() => setShowProfile(true)}
      />

      {/* Bottom action bar */}
      <ActionBar
        onLike={() => handleSwipe('like')}
        onPass={() => handleSwipe('pass')}
        onSuperlike={() => handleSwipe('superlike')}
      />

      {/* Profile overlay */}
      <ProfileOverlay
        profile={currentProfile}
        isVisible={showProfile}
        onClose={() => setShowProfile(false)}
        onLike={() => {
          setShowProfile(false);
          handleSwipe('like');
        }}
      />

      {/* Match animation overlay */}
      {matchAnimation && (
        <View style={styles.matchOverlay}>
          <View style={styles.matchIconContainer}>
            <PartyPopperIcon size={64} color={colors.primary.DEFAULT} />
          </View>
          <Text style={styles.matchText}>It's a Match!</Text>
          <Text style={styles.matchSubtext}>Start a conversation now</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  lowCreditsBanner: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  lowCreditsText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.warning,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['4xl'],
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: typography.sizes.base,
    color: colors.error,
    textAlign: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  nextCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transform: [{ scale: 0.95 }],
    opacity: 0.5,
  },
  matchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  matchText: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.extrabold as any,
    color: colors.primary.DEFAULT,
    marginBottom: spacing.sm,
  },
  matchSubtext: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
});
