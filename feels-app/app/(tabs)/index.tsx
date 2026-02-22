import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useFeedStore } from '@/stores/feedStore';
import { useCreditsStore } from '@/stores/creditsStore';
import SwipeCard from '@/components/SwipeCard';
import ActionBar from '@/components/ActionBar';
import ProfileOverlay from '@/components/ProfileOverlay';

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
  const [showLowCreditsWarning, setShowLowCreditsWarning] = useState(false);

  useEffect(() => {
    loadProfiles();
    loadCredits();
  }, []);

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
        <ActivityIndicator size="large" color="#FF1493" />
        <Text style={styles.loadingText}>Finding people near you...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorEmoji}>😢</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!currentProfile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>🌟</Text>
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
          <Text style={styles.lowCreditsIcon}>🪙</Text>
          <Text style={styles.lowCreditsText}>
            Credits running low ({balance} left)
          </Text>
          <Text style={styles.lowCreditsArrow}>›</Text>
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
          <Text style={styles.matchEmoji}>🎉</Text>
          <Text style={styles.matchText}>It's a Match!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  lowCreditsBanner: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 88, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 88, 0.3)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  lowCreditsIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  lowCreditsText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FF4458',
  },
  lowCreditsArrow: {
    fontSize: 18,
    color: '#FF4458',
  },
  centered: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888888',
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF4458',
    textAlign: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchEmoji: {
    fontSize: 100,
    marginBottom: 24,
  },
  matchText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FF1493',
  },
});
