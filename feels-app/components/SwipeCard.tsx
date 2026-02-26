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
import { HeartFilledIcon, ChevronDownIcon } from '@/components/Icons';
import { colors, typography, borderRadius, spacing, gradients } from '@/constants/theme';

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
    kinky: 'Adventurous',
  };
  return labels[level] || level;
};

const formatLookingFor = (value: string): string => {
  const labels: Record<string, string> = {
    serious: 'Something serious',
    relationship: 'Relationship minded',
    dating: 'Dating',
    meeting_people: 'Meeting new people',
    friends_and_more: 'Friends and more',
  };
  return labels[value] || value;
};

// Default prompts when profile doesn't have any
// Note: lookingFor and kinkLevel are shown as badges, so don't duplicate them here
const getDefaultPrompts = (profile: Profile) => {
  const prompts = [];

  if (profile.bio) {
    prompts.push({
      id: 'bio',
      question: 'About me',
      answer: profile.bio,
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
              colors={gradients.dark as string[]}
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
                  {profile.distance && ` · ${profile.distance} mi`}
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
                  <HeartFilledIcon size={18} color={colors.primary.DEFAULT} />
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

            {/* Looking For badge with alignment indicator */}
            {profile.lookingFor && (
              <View style={styles.lookingForContainer}>
                <View style={[
                  styles.lookingForBadge,
                  profile.lookingForAlignment === 'perfect' && styles.lookingForPerfect,
                  profile.lookingForAlignment === 'similar' && styles.lookingForSimilar,
                ]}>
                  <View>
                    <Text style={styles.lookingForBadgeLabel}>Looking for</Text>
                    {profile.lookingForAlignment && (
                      <Text style={[
                        styles.alignmentIndicator,
                        profile.lookingForAlignment === 'perfect' && styles.alignmentPerfect,
                        profile.lookingForAlignment === 'similar' && styles.alignmentSimilar,
                      ]}>
                        {profile.lookingForAlignment === 'perfect' ? 'Same as you' : 'Similar to you'}
                      </Text>
                    )}
                  </View>
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
              <ChevronDownIcon size={18} color={colors.text.tertiary} />
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
    backgroundColor: colors.bg.primary,
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
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  indicator: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1.5,
  },
  indicatorActive: {
    backgroundColor: colors.text.primary,
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
    left: spacing['2xl'],
  },
  passOverlay: {
    right: spacing['2xl'],
  },
  superlikeOverlay: {
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  feedbackBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 3,
    borderColor: colors.like,
    transform: [{ rotate: '-15deg' }],
  },
  passBadge: {
    borderColor: colors.pass,
    transform: [{ rotate: '15deg' }],
  },
  superlikeBadge: {
    borderColor: colors.superlike,
    transform: [{ rotate: '0deg' }],
  },
  feedbackText: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold as any,
    color: colors.like,
    letterSpacing: 2,
  },
  passText: {
    color: colors.pass,
  },
  superlikeText: {
    color: colors.superlike,
  },
  profileHeader: {
    position: 'absolute',
    bottom: spacing['2xl'],
    left: spacing.xl,
    right: spacing.xl,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.semibold as any,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  age: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.normal as any,
    color: 'rgba(255,255,255,0.85)',
  },
  location: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
    letterSpacing: 0.2,
  },
  promptsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  promptCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    position: 'relative',
  },
  promptQuestion: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  promptAnswer: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium as any,
    color: colors.text.primary,
    lineHeight: 26,
    paddingRight: spacing['4xl'],
  },
  promptLikeButton: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interestsContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  interestsLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  interestsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  interestTag: {
    backgroundColor: colors.bg.tertiary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  interestText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  kinkContainer: {
    marginBottom: spacing.lg,
  },
  kinkBadge: {
    backgroundColor: colors.primary.muted,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kinkLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  kinkValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary.DEFAULT,
  },
  lookingForContainer: {
    marginBottom: spacing.lg,
  },
  lookingForBadge: {
    backgroundColor: colors.tertiary.muted,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lookingForBadgeLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  lookingForBadgeValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    color: colors.tertiary.DEFAULT,
  },
  lookingForPerfect: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)', // green tint
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  lookingForSimilar: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)', // blue tint
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  alignmentIndicator: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium as any,
    marginTop: 2,
  },
  alignmentPerfect: {
    color: 'rgb(34, 197, 94)', // green
  },
  alignmentSimilar: {
    color: 'rgb(59, 130, 246)', // blue
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  viewMoreText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
    color: colors.text.tertiary,
    letterSpacing: 0.3,
  },
});
