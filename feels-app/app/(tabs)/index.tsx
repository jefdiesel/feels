import { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useFeedStore } from '@/stores/feedStore';
import SwipeCard from '@/components/SwipeCard';
import ActionEmojis from '@/components/ActionEmojis';
import ProfileOverlay from '@/components/ProfileOverlay';

export default function FeedScreen() {
  const { profiles, currentIndex, isLoading, error, loadProfiles, swipe } = useFeedStore();
  const [showProfile, setShowProfile] = useState(false);
  const [matchAnimation, setMatchAnimation] = useState(false);

  useEffect(() => {
    loadProfiles();
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
      setShowProfile(false);
      const isMatch = await swipe(action);
      if (isMatch) {
        setMatchAnimation(true);
        setTimeout(() => setMatchAnimation(false), 2000);
      }
    },
    [swipe]
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

      {/* Side action emojis */}
      <ActionEmojis
        onLike={() => handleSwipe('like')}
        onPass={() => handleSwipe('pass')}
        onSuperlike={() => handleSwipe('superlike')}
      />

      {/* Profile overlay */}
      <ProfileOverlay
        profile={currentProfile}
        isVisible={showProfile}
        onClose={() => setShowProfile(false)}
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
