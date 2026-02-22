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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper functions for kink level display
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
      answer: profile.lookingFor,
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
            <Text style={styles.closeButtonIcon}>v</Text>
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
                <Text style={styles.location}>
                  {profile.location}
                  {profile.distance && ` - ${profile.distance} mi away`}
                </Text>
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
                  <Text style={styles.basicLabel}>Vibe</Text>
                  <Text style={[styles.basicValue, styles.accentText]}>
                    {formatKinkLevel(profile.kinkLevel)}
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
              <Text style={styles.floatingButtonIcon}>+</Text>
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
    backgroundColor: '#000000',
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
    left: 20,
    zIndex: 20,
  },
  closeButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 40, 40, 0.85)',
  },
  closeButtonIcon: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    transform: [{ rotate: '0deg' }],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  profileHeader: {
    marginBottom: 32,
  },
  nameSection: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  name: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  age: {
    fontSize: 36,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  location: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  basicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  basicItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: '45%',
  },
  basicLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  basicValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accentText: {
    color: '#FF1493',
  },
  promptCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  promptQuestion: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  promptAnswer: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  photoGallery: {
    gap: 12,
  },
  galleryPhotoContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  galleryPhoto: {
    width: '100%',
    height: '100%',
  },
  interestsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  interestText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  floatingLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    backgroundColor: 'rgba(255, 20, 147, 0.25)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 20, 147, 0.4)',
  },
  floatingButtonIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FF1493',
  },
  floatingButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
