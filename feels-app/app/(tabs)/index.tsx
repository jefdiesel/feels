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
import { useQueryClient } from '@tanstack/react-query';
import { useFeedStore } from '@/stores/feedStore';
import { feedApi, matchesApi } from '@/api/client';
import { useCreditsStore } from '@/stores/creditsStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Image } from 'expo-image';
import SwipeCard from '@/components/SwipeCard';
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
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<{ name: string; photo: string } | null>(null);
  const [isPushMatch, setIsPushMatch] = useState(false);
  const queryClient = useQueryClient();

  // Listen for match_created from WebSocket (when someone else likes you back)
  useWebSocket({
    onMessage: (data) => {
      if (data.type === 'match_created' && data.payload?.match_id) {
        setMatchId(data.payload.match_id);
        setIsPushMatch(true);
        // Fetch the match details to get the other person's info
        fetchMatchDetails(data.payload.match_id);
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      }
    },
  });

  const fetchMatchDetails = async (id: string) => {
    try {
      const response = await matchesApi.getMatch(id);
      if (response.data?.other_user) {
        setMatchedProfile({
          name: response.data.other_user.name,
          photo: response.data.other_user.photos?.[0]?.url || '',
        });
        setMatchAnimation(true);
      }
    } catch (e) {
      // Still show match animation even if we can't get details
      setMatchAnimation(true);
    }
  };

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
      const swipedProfile = currentProfile;
      const result = await swipe(action);
      if (result?.matched && result?.match_id) {
        setMatchId(result.match_id);
        setIsPushMatch(false);
        setMatchedProfile({
          name: swipedProfile.name,
          photo: swipedProfile.photos?.[0]?.url || '',
        });
        setMatchAnimation(true);
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
    const showDebug = async () => {
      try {
        const res = await feedApi.debug();
        const d = res.data;
        Alert.alert(
          'Feed Debug',
          `Total profiles: ${d.total_profiles}\nAlready seen: ${d.already_seen}\nGender match: ${d.gender_match}\nAge match: ${d.age_match}\n\nPrefs: ages ${d.pref_age_min}-${d.pref_age_max}, ${d.pref_distance}mi, ${d.pref_genders_count} genders\n\nYour lat: ${d.user_lat || 'null'}, lng: ${d.user_lng || 'null'}`
        );
      } catch (e: any) {
        Alert.alert('Debug Error', e.message);
      }
    };

    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconContainer}>
          <SparkleIcon size={48} color={colors.secondary.DEFAULT} />
        </View>
        <Text style={styles.emptyTitle}>No more profiles</Text>
        <Text style={styles.emptyText}>Check back later for new people</Text>
        <TouchableOpacity onPress={showDebug} style={{ marginTop: 20, padding: 10 }}>
          <Text style={{ color: colors.text.tertiary }}>Debug Info</Text>
        </TouchableOpacity>
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

      {/* Match animation overlay - full screen for swipe match */}
      {matchAnimation && !isPushMatch && (
        <TouchableOpacity
          style={styles.matchOverlay}
          activeOpacity={0.95}
          onPress={() => {
            setMatchAnimation(false);
            if (matchId) {
              router.push(`/chat/${matchId}`);
              setMatchId(null);
              setMatchedProfile(null);
            }
          }}
        >
          {matchedProfile?.photo ? (
            <Image
              source={{ uri: matchedProfile.photo }}
              style={styles.matchPhoto}
              contentFit="cover"
            />
          ) : (
            <View style={styles.matchIconContainer}>
              <PartyPopperIcon size={64} color={colors.primary.DEFAULT} />
            </View>
          )}
          <Text style={styles.matchText}>It's a Match!</Text>
          {matchedProfile?.name && (
            <Text style={styles.matchName}>You and {matchedProfile.name} liked each other</Text>
          )}
          <Text style={styles.matchSubtext}>Tap to start chatting</Text>
          <TouchableOpacity
            style={styles.matchDismiss}
            onPress={(e) => {
              e.stopPropagation();
              setMatchAnimation(false);
              setMatchId(null);
              setMatchedProfile(null);
            }}
          >
            <Text style={styles.matchDismissText}>Keep swiping</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Push match toast - small notification at top */}
      {matchAnimation && isPushMatch && (
        <TouchableOpacity
          style={styles.pushMatchToast}
          activeOpacity={0.9}
          onPress={() => {
            setMatchAnimation(false);
            setIsPushMatch(false);
            if (matchId) {
              router.push(`/chat/${matchId}`);
              setMatchId(null);
              setMatchedProfile(null);
            }
          }}
        >
          {matchedProfile?.photo ? (
            <Image
              source={{ uri: matchedProfile.photo }}
              style={styles.pushMatchAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.pushMatchAvatarPlaceholder}>
              <PartyPopperIcon size={24} color={colors.primary.DEFAULT} />
            </View>
          )}
          <View style={styles.pushMatchContent}>
            <Text style={styles.pushMatchTitle}>New Match!</Text>
            <Text style={styles.pushMatchName}>
              {matchedProfile?.name || 'Someone'} liked you back
            </Text>
          </View>
        </TouchableOpacity>
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
  matchDismiss: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  matchDismissText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  matchPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: spacing['2xl'],
    borderWidth: 3,
    borderColor: colors.primary.DEFAULT,
  },
  matchName: {
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  pushMatchToast: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  pushMatchAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
  },
  pushMatchAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pushMatchContent: {
    flex: 1,
  },
  pushMatchTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.primary.DEFAULT,
  },
  pushMatchName: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
});
