import { useState, useCallback } from 'react';
import { View, Text, Dimensions, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Profile } from '@/stores/feedStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_UP_THRESHOLD = SCREEN_HEIGHT * 0.15;

// Helper function for kink level display
const formatKinkLevel = (level: string): string => {
  const labels: Record<string, string> = {
    vanilla: 'Vanilla',
    curious: 'Curious',
    sensual: 'Sensual',
    experienced: 'Experienced',
    kinky: 'Kinky',
  };
  return labels[level] || level;
};

const formatLookingFor = (value: string): string => {
  const labels: Record<string, string> = {
    relationship: 'A real relationship',
    partner: 'Life partner / family',
    dating: 'Dating around',
    exploring: 'Exploring new experiences',
    casual: 'Something casual',
    open: 'Open to anything',
  };
  return labels[value] || value;
};

// Default prompts when profile doesn't have any
const getDefaultPrompts = (profile: Profile) => {
  const prompts = [];

  if (profile.bio) {
    prompts.push({
      id: 'bio',
      question: 'About me',
      answer: profile.bio,
    });
  }

  if (profile.lookingFor) {
    prompts.push({
      id: 'looking',
      question: "I'm looking for",
      answer: formatLookingFor(profile.lookingFor),
    });
  }

  if (profile.kinkLevel) {
    prompts.push({
      id: 'kink',
      question: 'My vibe',
      answer: formatKinkLevel(profile.kinkLevel),
    });
  }

  return prompts;
};

interface SwipeCardProps {
  profile: Profile;
  onSwipe: (action: 'like' | 'pass' | 'superlike') => void;
  onExpandProfile: () => void;
  onLikePrompt?: (promptId: string) => void;
}

export default function SwipeCard({ profile, onSwipe, onExpandProfile, onLikePrompt }: SwipeCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardScale = useSharedValue(1);

  const handleSwipe = useCallback(
    (action: 'like' | 'pass' | 'superlike') => {
      onSwipe(action);
    },
    [onSwipe]
  );

  const gesture = Gesture.Pan()
    .onStart(() => {
      cardScale.value = withSpring(0.99, { damping: 20, stiffness: 300 });
    })
    .onUpdate((event) => {
      translateX.value = event.translationX * 0.9;
      translateY.value = event.translationY * 0.6;
    })
    .onEnd((event) => {
      cardScale.value = withSpring(1, { damping: 20, stiffness: 300 });

      // Swipe up for superlike
      if (event.translationY < -SWIPE_UP_THRESHOLD && Math.abs(event.translationX) < SWIPE_THRESHOLD) {
        translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 350 });
        runOnJS(handleSwipe)('superlike');
        return;
      }

      // Swipe right for like
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 350 });
        runOnJS(handleSwipe)('like');
        return;
      }

      // Swipe left for pass
      if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 350 });
        runOnJS(handleSwipe)('pass');
        return;
      }

      // Reset position with smooth spring
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-8, 0, 8],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: cardScale.value },
      ],
    };
  });

  const likeOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const passOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const superlikeOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [-SWIPE_UP_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const nextPhoto = () => {
    if (currentPhotoIndex < profile.photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const handleTap = (x: number) => {
    const tapZone = SCREEN_WIDTH / 3;
    if (x < tapZone) {
      prevPhoto();
    } else if (x > tapZone * 2) {
      nextPhoto();
    } else {
      nextPhoto();
    }
  };

  const handlePromptLike = (promptId: string) => {
    if (onLikePrompt) {
      onLikePrompt(promptId);
    } else {
      onSwipe('like');
    }
  };

  // Get prompts to display
  const displayPrompts = profile.prompts?.length ? profile.prompts : getDefaultPrompts(profile);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, animatedCardStyle]}>
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
        >
          {/* Full-bleed photo */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => handleTap(e.nativeEvent.locationX)}
            style={styles.photoContainer}
          >
            <Image
              source={{ uri: profile.photos[currentPhotoIndex] }}
              style={styles.photo}
              contentFit="cover"
              transition={150}
            />

            {/* Photo indicators */}
            <View style={styles.photoIndicators}>
              {profile.photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentPhotoIndex && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>

            {/* Gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
              locations={[0.4, 0.7, 1]}
              style={styles.gradient}
            />

            {/* Swipe feedback overlays */}
            <Animated.View style={[styles.actionOverlay, styles.likeOverlay, likeOverlayStyle]}>
              <View style={styles.feedbackBadge}>
                <Text style={styles.feedbackText}>LIKE</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.actionOverlay, styles.passOverlay, passOverlayStyle]}>
              <View style={[styles.feedbackBadge, styles.passBadge]}>
                <Text style={[styles.feedbackText, styles.passText]}>NOPE</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.actionOverlay, styles.superlikeOverlay, superlikeOverlayStyle]}>
              <View style={[styles.feedbackBadge, styles.superlikeBadge]}>
                <Text style={[styles.feedbackText, styles.superlikeText]}>SUPER</Text>
              </View>
            </Animated.View>

            {/* Profile header info */}
            <TouchableOpacity
              style={styles.profileHeader}
              onPress={onExpandProfile}
              activeOpacity={0.9}
            >
              <View style={styles.nameContainer}>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.age}>{profile.age}</Text>
              </View>
              {profile.location && (
                <Text style={styles.location}>
                  {profile.location}
                  {profile.distance && ` - ${profile.distance} mi`}
                </Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Profile prompts section */}
          <View style={styles.promptsSection}>
            {displayPrompts.slice(0, 3).map((prompt, index) => (
              <View key={prompt.id || index} style={styles.promptCard}>
                <Text style={styles.promptQuestion}>{prompt.question}</Text>
                <Text style={styles.promptAnswer}>{prompt.answer}</Text>

                {/* Like button on prompt */}
                <TouchableOpacity
                  style={styles.promptLikeButton}
                  onPress={() => handlePromptLike(prompt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.promptLikeIcon}>+</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Interests tags */}
            {profile.interests && profile.interests.length > 0 && (
              <View style={styles.interestsContainer}>
                <Text style={styles.interestsLabel}>Interests</Text>
                <View style={styles.interestsTags}>
                  {profile.interests.slice(0, 6).map((interest, index) => (
                    <View key={index} style={styles.interestTag}>
                      <Text style={styles.interestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Looking For badge */}
            {profile.lookingFor && (
              <View style={styles.lookingForContainer}>
                <View style={styles.lookingForBadge}>
                  <Text style={styles.lookingForBadgeLabel}>Looking for</Text>
                  <Text style={styles.lookingForBadgeValue}>{formatLookingFor(profile.lookingFor)}</Text>
                </View>
              </View>
            )}

            {/* Kink level badge */}
            {profile.kinkLevel && (
              <View style={styles.kinkContainer}>
                <View style={styles.kinkBadge}>
                  <Text style={styles.kinkLabel}>Vibe</Text>
                  <Text style={styles.kinkValue}>{formatKinkLevel(profile.kinkLevel)}</Text>
                </View>
              </View>
            )}

            {/* View full profile hint */}
            <TouchableOpacity style={styles.viewMoreButton} onPress={onExpandProfile}>
              <Text style={styles.viewMoreText}>View full profile</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom padding for scroll */}
          <View style={{ height: 140 }} />
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  scrollContainer: {
    flex: 1,
  },
  photoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoIndicators: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
  },
  indicator: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1,
  },
  indicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 280,
  },
  actionOverlay: {
    position: 'absolute',
    top: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeOverlay: {
    left: 24,
  },
  passOverlay: {
    right: 24,
  },
  superlikeOverlay: {
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  feedbackBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FF1493',
    transform: [{ rotate: '-15deg' }],
  },
  passBadge: {
    borderColor: '#888888',
    transform: [{ rotate: '15deg' }],
  },
  superlikeBadge: {
    borderColor: '#FFD700',
    transform: [{ rotate: '0deg' }],
  },
  feedbackText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF1493',
    letterSpacing: 2,
  },
  passText: {
    color: '#888888',
  },
  superlikeText: {
    color: '#FFD700',
  },
  profileHeader: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  name: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  age: {
    fontSize: 28,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
  },
  location: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  promptsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  promptCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    position: 'relative',
  },
  promptQuestion: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  promptAnswer: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 26,
    paddingRight: 40,
  },
  promptLikeButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 20, 147, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptLikeIcon: {
    fontSize: 22,
    fontWeight: '300',
    color: '#FF1493',
  },
  interestsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  interestsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  interestsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  kinkContainer: {
    marginBottom: 16,
  },
  kinkBadge: {
    backgroundColor: 'rgba(255, 20, 147, 0.12)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kinkLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  kinkValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF1493',
  },
  lookingForContainer: {
    marginBottom: 16,
  },
  lookingForBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lookingForBadgeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  lookingForBadgeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00D4FF',
  },
  viewMoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  viewMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.3,
  },
});
