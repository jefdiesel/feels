import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Profile } from '@/stores/feedStore';
import { ChevronDownIcon, HeartFilledIcon, MapPinIcon, SparkleIcon } from '@/components/Icons';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper functions for vibe level display
const formatVibeLevel = (level: string): string => {
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
// Note: lookingFor and kinkLevel are shown in Basics section, so don't duplicate them here
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

interface ProfileOverlayProps {
  profile: Profile;
  isVisible: boolean;
  onClose: () => void;
  onLike?: () => void;
}

export default function ProfileOverlay({ profile, isVisible, onClose, onLike }: ProfileOverlayProps) {
  const translateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow dragging down
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100) {
        translateY.value = withSpring(SCREEN_HEIGHT);
        onClose();
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT * 0.3],
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY: translateY.value }],
      opacity,
    };
  });

  if (!isVisible) return null;

  const displayPrompts = profile.prompts?.length ? profile.prompts : getDefaultPrompts(profile);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {/* Header gradient */}
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'transparent']}
          style={styles.headerGradient}
        />

        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <View style={styles.closeButtonInner}>
            <ChevronDownIcon size={20} color={colors.text.primary} />
          </View>
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Profile header */}
          <View style={styles.profileHeader}>
            <View style={styles.nameSection}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.age}>, {profile.age}</Text>
              </View>
              {profile.location && (
                <View style={styles.locationRow}>
                  <MapPinIcon size={14} color={colors.text.tertiary} />
                  <Text style={styles.location}>
                    {profile.location}
                    {profile.distance && ` - ${profile.distance} mi away`}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Basics section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basics</Text>
            <View style={styles.basicsGrid}>
              {profile.location && (
                <View style={styles.basicItem}>
                  <Text style={styles.basicLabel}>Location</Text>
                  <Text style={styles.basicValue}>{profile.location}</Text>
                </View>
              )}
              {profile.kinkLevel && (
                <View style={styles.basicItem}>
                  <View style={styles.basicLabelRow}>
                    <SparkleIcon size={12} color={colors.text.tertiary} />
                    <Text style={styles.basicLabel}>Vibe</Text>
                  </View>
                  <Text style={[styles.basicValue, styles.accentText]}>
                    {formatVibeLevel(profile.kinkLevel)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Prompts section */}
          {displayPrompts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prompts</Text>
              {displayPrompts.map((prompt, index) => (
                <View key={prompt.id || index} style={styles.promptCard}>
                  <Text style={styles.promptQuestion}>{prompt.question}</Text>
                  <Text style={styles.promptAnswer}>{prompt.answer}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Photos gallery */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.photoGallery}>
              {profile.photos.map((photo, index) => (
                <View key={index} style={styles.galleryPhotoContainer}>
                  <Image
                    source={{ uri: photo }}
                    style={styles.galleryPhoto}
                    contentFit="cover"
                    transition={200}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Interests section */}
          {profile.interests && profile.interests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.interestsTags}>
                {profile.interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Bottom padding */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Floating like button */}
        {onLike && (
          <View style={styles.floatingButtonContainer}>
            <TouchableOpacity
              style={styles.floatingLikeButton}
              onPress={onLike}
              activeOpacity={0.9}
            >
              <HeartFilledIcon size={22} color={colors.primary.DEFAULT} />
              <Text style={styles.floatingButtonText}>Like {profile.name}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg.primary,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    left: spacing.xl,
    zIndex: 20,
  },
  closeButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.glass,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: spacing.xl,
  },
  profileHeader: {
    marginBottom: spacing['2xl'],
  },
  nameSection: {
    marginBottom: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  name: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.semibold as any,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  age: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.normal as any,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  location: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
    color: colors.text.tertiary,
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.lg,
  },
  basicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  basicItem: {
    backgroundColor: colors.bg.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: '45%',
  },
  basicLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  basicLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium as any,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  basicValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.primary,
  },
  accentText: {
    color: colors.primary.DEFAULT,
  },
  promptCard: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  promptQuestion: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  promptAnswer: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium as any,
    color: colors.text.primary,
    lineHeight: 26,
  },
  photoGallery: {
    gap: spacing.md,
  },
  galleryPhotoContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  galleryPhoto: {
    width: '100%',
    height: '100%',
  },
  interestsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  interestTag: {
    backgroundColor: colors.bg.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  interestText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
    color: colors.text.secondary,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: spacing.xl,
    right: spacing.xl,
  },
  floatingLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.primary.muted,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  floatingButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
});
