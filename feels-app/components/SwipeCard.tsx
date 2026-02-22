import { useState, useCallback } from 'react';
import { View, Text, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
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
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_UP_THRESHOLD = SCREEN_HEIGHT * 0.15;

interface SwipeCardProps {
  profile: Profile;
  onSwipe: (action: 'like' | 'pass' | 'superlike') => void;
  onExpandProfile: () => void;
}

export default function SwipeCard({ profile, onSwipe, onExpandProfile }: SwipeCardProps) {
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
      cardScale.value = withSpring(0.98);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      cardScale.value = withSpring(1);

      // Swipe up for superlike
      if (event.translationY < -SWIPE_UP_THRESHOLD && Math.abs(event.translationX) < SWIPE_THRESHOLD) {
        translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 300 });
        runOnJS(handleSwipe)('superlike');
        return;
      }

      // Swipe right for like
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
        runOnJS(handleSwipe)('like');
        return;
      }

      // Swipe left for pass
      if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
        runOnJS(handleSwipe)('pass');
        return;
      }

      // Reset position
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
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

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, animatedCardStyle]}>
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
            transition={200}
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
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />

          {/* Like overlay */}
          <Animated.View style={[styles.actionOverlay, styles.likeOverlay, likeOverlayStyle]}>
            <Text style={styles.overlayEmoji}>💚</Text>
          </Animated.View>

          {/* Pass overlay */}
          <Animated.View style={[styles.actionOverlay, styles.passOverlay, passOverlayStyle]}>
            <Text style={styles.overlayEmoji}>❌</Text>
          </Animated.View>

          {/* Superlike overlay */}
          <Animated.View style={[styles.actionOverlay, styles.superlikeOverlay, superlikeOverlayStyle]}>
            <Text style={styles.overlayEmoji}>⭐</Text>
          </Animated.View>

          {/* Profile info */}
          <TouchableOpacity
            style={styles.profileInfo}
            onPress={onExpandProfile}
            activeOpacity={0.9}
          >
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.name}, {profile.age}</Text>
              <Text style={styles.expandArrow}>▲</Text>
            </View>
            <View style={styles.detailsRow}>
              {profile.location && (
                <Text style={styles.location}>
                  {profile.location}
                  {profile.distance && ` • ${profile.distance}mi`}
                </Text>
              )}
              {profile.kinkLevel && (
                <Text style={styles.kinkBadge}>
                  {getKinkEmoji(profile.kinkLevel)} {formatKinkLevel(profile.kinkLevel)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
  photoContainer: {
    flex: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoIndicators: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
  },
  indicator: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
  },
  indicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 300,
  },
  actionOverlay: {
    position: 'absolute',
    top: '40%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeOverlay: {
    left: 40,
  },
  passOverlay: {
    right: 40,
  },
  superlikeOverlay: {
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  overlayEmoji: {
    fontSize: 80,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  profileInfo: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  expandArrow: {
    fontSize: 20,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  location: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  kinkBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF1493',
    backgroundColor: 'rgba(255, 20, 147, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
