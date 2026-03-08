import { useState } from 'react';
import { View, Text, Dimensions, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Profile } from '@/stores/feedStore';
import { HeartFilledIcon, XIcon, ChevronDownIcon } from '@/components/Icons';
import { colors, typography, borderRadius, spacing, gradients } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    serious: 'Serious',
    relationship: 'Relationship',
    dating: 'Dating',
    meeting_people: 'Meeting people',
    friends_and_more: 'Friends+',
  };
  return labels[value] || value;
};

const formatGender = (gender?: string): string => {
  if (!gender) return '';
  const labels: Record<string, string> = {
    woman: 'Woman',
    man: 'Man',
    non_binary: 'Non-binary',
    trans_woman: 'Trans woman',
    trans_man: 'Trans man',
  };
  return labels[gender] || gender;
};

const formatDetail = (key: string, value: any): string | null => {
  if (value === null || value === undefined || value === '') return null;

  const formatters: Record<string, Record<string, string>> = {
    hasKids: { 'true': 'Has kids', true: 'Has kids' },
    wantsKids: {
      yes: 'Wants kids',
      no: 'Doesn\'t want kids',
      maybe: 'Open to kids',
    },
    alcohol: {
      never: 'Doesn\'t drink',
      socially: 'Social drinker',
      often: 'Drinks often',
    },
    weed: {
      never: 'No weed',
      socially: 'Social smoker',
      often: 'Smokes often',
      '420_friendly': '420 friendly',
    },
    religion: {
      agnostic: 'Agnostic',
      atheist: 'Atheist',
      buddhist: 'Buddhist',
      catholic: 'Catholic',
      christian: 'Christian',
      hindu: 'Hindu',
      jewish: 'Jewish',
      muslim: 'Muslim',
      spiritual: 'Spiritual',
      other: 'Religious',
    },
    zodiac: {
      aries: 'Aries ♈',
      taurus: 'Taurus ♉',
      gemini: 'Gemini ♊',
      cancer: 'Cancer ♋',
      leo: 'Leo ♌',
      virgo: 'Virgo ♍',
      libra: 'Libra ♎',
      scorpio: 'Scorpio ♏',
      sagittarius: 'Sagittarius ♐',
      capricorn: 'Capricorn ♑',
      aquarius: 'Aquarius ♒',
      pisces: 'Pisces ♓',
    },
  };

  // Check if we have a formatter for this key
  if (formatters[key] && formatters[key][value]) {
    return formatters[key][value];
  }

  // For hasKids false, don't show anything
  if (key === 'hasKids' && value === false) return null;

  return null;
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
  onSwipe: (action: 'like' | 'pass' | 'superlike' | 'premiumlike') => void;
  onExpandProfile: () => void;
  onLikePrompt?: (promptId: string) => void;
}

export default function SwipeCard({ profile, onSwipe, onExpandProfile, onLikePrompt }: SwipeCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // Animation values
  const likeScale = useSharedValue(1);

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

  // Swipe gesture for photo navigation
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationX < -50) {
        runOnJS(nextPhoto)();
      } else if (event.translationX > 50) {
        runOnJS(prevPhoto)();
      }
    });

  const handleTap = (x: number) => {
    const tapZone = SCREEN_WIDTH / 3;
    if (x < tapZone) {
      prevPhoto();
    } else if (x > tapZone * 2) {
      nextPhoto();
    }
  };

  const handleLike = () => {
    setIsLiked(true);
    likeScale.value = withSequence(
      withSpring(1.2, { damping: 12, stiffness: 200 }),
      withSpring(1, { damping: 12 })
    );
    // Quick flash then move on
    setTimeout(() => {
      onSwipe('like');
    }, 400);
  };

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  // Get prompts to display
  const displayPrompts = profile.prompts?.length ? profile.prompts : getDefaultPrompts(profile);

  return (
    <View style={styles.card}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
      >
        {/* Full-bleed photo with swipe gesture */}
        <GestureDetector gesture={swipeGesture}>
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

            {/* Photo dot indicators */}
            {profile.photos.length > 1 && (
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
            )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={gradients.dark as string[]}
            locations={[0.4, 0.7, 1]}
            style={styles.gradient}
          />

          {/* Profile header info - only name/age/distance over image */}
          <View style={styles.profileHeader}>
            <View style={styles.nameRow}>
              <View style={styles.nameContainer}>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.age}>{profile.age}</Text>
                {profile.distance && (
                  <Text style={styles.distance}>{profile.distance}mi</Text>
                )}
              </View>
              <View style={styles.actionButtons}>
                {/* Pass button */}
                <TouchableOpacity
                  style={styles.passButton}
                  onPress={() => onSwipe('pass')}
                  activeOpacity={0.8}
                >
                  <XIcon size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
                {/* Like button */}
                <TouchableOpacity
                  onPress={handleLike}
                  activeOpacity={0.8}
                  disabled={isLiked}
                >
                  <Animated.View style={[styles.likeButton, likeAnimatedStyle]}>
                    <HeartFilledIcon size={32} color={isLiked ? colors.like : 'rgba(255,255,255,0.5)'} />
                  </Animated.View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        </GestureDetector>

          {/* Info section - below photo on black background */}
          <View style={styles.infoSection}>
            {/* Info bar: gender / location / looking for / vibe */}
            <Text style={styles.infoBarText}>
              {[
                formatGender(profile.gender),
                profile.location,
                profile.lookingFor ? formatLookingFor(profile.lookingFor) : null,
                profile.kinkLevel ? formatKinkLevel(profile.kinkLevel) : null,
              ].filter(Boolean).join(' · ')}
            </Text>

            {/* Details bubble tags */}
            {(() => {
              const details = [
                formatDetail('religion', profile.religion),
                formatDetail('alcohol', profile.alcohol),
                formatDetail('zodiac', profile.zodiac),
                formatDetail('weed', profile.weed),
                formatDetail('hasKids', profile.hasKids),
                formatDetail('wantsKids', profile.wantsKids),
                profile.workForMoney ? `💼 ${profile.workForMoney}` : null,
                profile.workForPassion ? `✨ ${profile.workForPassion}` : null,
              ].filter(Boolean) as string[];
              return details.length > 0 ? (
                <View style={styles.detailsRow}>
                  {details.map((d, i) => (
                    <View key={i} style={styles.detailTag}><Text style={styles.detailTagText}>{d}</Text></View>
                  ))}
                </View>
              ) : null;
            })()}

            {/* About me / bio */}
            {displayPrompts[0] && (
              <Text style={styles.bioText}>{displayPrompts[0].answer}</Text>
            )}

            {/* Alignment indicator */}
            {profile.lookingForAlignment && (
              <View style={[
                styles.alignmentBadge,
                profile.lookingForAlignment === 'perfect' && styles.alignmentPerfect,
                profile.lookingForAlignment === 'similar' && styles.alignmentSimilar,
              ]}>
                <Text style={[
                  styles.alignmentText,
                  profile.lookingForAlignment === 'perfect' && styles.alignmentTextPerfect,
                  profile.lookingForAlignment === 'similar' && styles.alignmentTextSimilar,
                ]}>
                  {profile.lookingForAlignment === 'perfect' ? '✓ Looking for the same thing' : '~ Similar intentions'}
                </Text>
              </View>
            )}

            {/* View full profile */}
            <TouchableOpacity style={styles.viewMoreButton} onPress={onExpandProfile}>
              <ChevronDownIcon size={16} color={colors.text.tertiary} />
              <Text style={styles.viewMoreText}>View full profile</Text>
            </TouchableOpacity>
          </View>

          {/* Additional prompts section */}
          <View style={styles.promptsSection}>
            {displayPrompts.slice(1, 3).map((prompt, index) => (
              <View key={prompt.id || index} style={styles.promptCard}>
                <Text style={styles.promptQuestion}>{prompt.question}</Text>
                <Text style={styles.promptAnswer}>{prompt.answer}</Text>
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
          </View>

          {/* Bottom padding for scroll */}
          <View style={{ height: 140 }} />
        </ScrollView>
      </View>
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
    height: SCREEN_HEIGHT * 0.62,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoIndicators: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  profileHeader: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.xl,
    right: spacing.xl,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  passButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButton: {
    justifyContent: 'center',
    alignItems: 'center',
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
  distance: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium as any,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: spacing.sm,
  },
  location: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
    letterSpacing: 0.2,
  },
  // Info section on black background
  infoSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg.primary,
  },
  infoBarText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
    color: colors.text.primary,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginLeft: -spacing.md, // offset bubble padding so text aligns
  },
  detailTag: {
    backgroundColor: colors.bg.tertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  detailTagText: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
  },
  bioText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.normal as any,
    color: colors.text.primary,
    lineHeight: 28,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  alignmentBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  alignmentPerfect: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  alignmentSimilar: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  alignmentText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
  },
  alignmentTextPerfect: {
    color: 'rgb(34, 197, 94)',
  },
  alignmentTextSimilar: {
    color: 'rgb(59, 130, 246)',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  viewMoreText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
    color: colors.text.tertiary,
  },
  promptsSection: {
    paddingHorizontal: spacing.xl,
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
});
