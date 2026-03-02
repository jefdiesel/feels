import { useState } from 'react';
import { View, Text, Dimensions, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Profile } from '@/stores/feedStore';
import { HeartFilledIcon, ChevronDownIcon } from '@/components/Icons';
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
  if (value === null || value === undefined) return null;
  const formatters: Record<string, Record<string, string>> = {
    wantsKids: { want: 'Wants kids', open: 'Open to kids', not_sure: 'Not sure', dont_want: 'No kids' },
    alcohol: { never: 'Sober', socially: 'Drinks socially', regularly: 'Drinks' },
    weed: { never: 'No 420', socially: '420 friendly', regularly: '420' },
  };
  if (key === 'hasKids' && value === true) return 'Has kids';
  if (key === 'religion' && value) return value.charAt(0).toUpperCase() + value.slice(1);
  if (key === 'zodiac' && value) return value.charAt(0).toUpperCase() + value.slice(1);
  if (formatters[key] && formatters[key][value]) return formatters[key][value];
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
  onSwipe: (action: 'like' | 'pass' | 'superlike') => void;
  onExpandProfile: () => void;
  onLikePrompt?: (promptId: string) => void;
}

export default function SwipeCard({ profile, onSwipe, onExpandProfile, onLikePrompt }: SwipeCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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
    <View style={styles.card}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
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
            {/* Info bar: gender / location / looking for / vibe */}
            <Text style={styles.infoBar}>
              {[
                formatGender(profile.gender),
                profile.location ? `${profile.location}${profile.distance ? ` · ${profile.distance}mi` : ''}` : null,
                profile.lookingFor ? formatLookingFor(profile.lookingFor) : null,
                profile.kinkLevel ? formatKinkLevel(profile.kinkLevel) : null,
              ].filter(Boolean).join(' · ')}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

          {/* Profile prompts section */}
          <View style={styles.promptsSection}>
            {/* Details tags */}
            {(() => {
              const details = [
                formatDetail('hasKids', profile.hasKids),
                formatDetail('wantsKids', profile.wantsKids),
                formatDetail('religion', profile.religion),
                formatDetail('alcohol', profile.alcohol),
                formatDetail('weed', profile.weed),
                formatDetail('zodiac', profile.zodiac),
              ].filter(Boolean) as string[];
              return details.length > 0 ? (
                <View style={styles.detailsRow}>
                  {details.map((d, i) => (
                    <View key={i} style={styles.detailTag}><Text style={styles.detailText}>{d}</Text></View>
                  ))}
                </View>
              ) : null;
            })()}

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
  infoBar: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  detailTag: {
    backgroundColor: colors.bg.tertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  detailText: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
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
