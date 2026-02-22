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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper functions for kink level display
const getKinkEmoji = (level: string): string => {
  const emojis: Record<string, string> = {
    vanilla: '🍦',
    curious: '🤔',
    sensual: '🔥',
    experienced: '⛓️',
    kinky: '😈',
  };
  return emojis[level] || '✨';
};

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
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT * 0.7;

interface ProfileOverlayProps {
  profile: Profile;
  isVisible: boolean;
  onClose: () => void;
}

export default function ProfileOverlay({ profile, isVisible, onClose }: ProfileOverlayProps) {
  const translateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onStart(() => {
      // Store initial position
    })
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

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.95)', '#000000']}
          style={styles.gradient}
        />

        {/* Drag handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header with name */}
          <View style={styles.header}>
            <Text style={styles.name}>{profile.name}, {profile.age}</Text>
            <View style={styles.badges}>
              {profile.location && (
                <Text style={styles.location}>
                  📍 {profile.location}
                  {profile.distance && ` • ${profile.distance}mi`}
                </Text>
              )}
              {profile.kinkLevel && (
                <View style={styles.kinkBadge}>
                  <Text style={styles.kinkText}>
                    {getKinkEmoji(profile.kinkLevel)} {formatKinkLevel(profile.kinkLevel)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Bio section */}
          {profile.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          )}

          {/* Photo gallery */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.photoGrid}>
              {profile.photos.map((photo, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image
                    source={{ uri: photo }}
                    style={styles.gridPhoto}
                    contentFit="cover"
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Extra padding at bottom */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>▼</Text>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  gradient: {
    position: 'absolute',
    top: -100,
    left: 0,
    right: 0,
    height: 100,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  location: {
    fontSize: 16,
    color: '#888888',
  },
  kinkBadge: {
    backgroundColor: 'rgba(255, 20, 147, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  kinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF1493',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoWrapper: {
    width: '48%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
});
