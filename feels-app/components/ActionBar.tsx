import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { XIcon, StarFilledIcon, HeartFilledIcon } from '@/components/Icons';
import { colors, shadows, animations } from '@/constants/theme';

interface ActionBarProps {
  onLike: () => void;
  onPass: () => void;
  onSuperlike: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ActionBar({ onLike, onPass, onSuperlike }: ActionBarProps) {
  const passScale = useSharedValue(1);
  const superlikeScale = useSharedValue(1);
  const likeScale = useSharedValue(1);

  const animatePress = (scale: Animated.SharedValue<number>, callback: () => void) => {
    scale.value = withSequence(
      withSpring(0.85, animations.spring),
      withSpring(1, animations.spring)
    );
    callback();
  };

  const passAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: passScale.value }],
  }));

  const superlikeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: superlikeScale.value }],
  }));

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <View style={styles.glassContainer}>
        <View style={styles.container}>
          {/* Pass Button */}
          <AnimatedTouchable
            style={[styles.button, styles.passButton, passAnimatedStyle]}
            onPress={() => animatePress(passScale, onPass)}
            activeOpacity={0.9}
          >
            <XIcon size={26} color={colors.pass} />
          </AnimatedTouchable>

          {/* Superlike Button */}
          <AnimatedTouchable
            style={[styles.button, styles.superlikeButton, superlikeAnimatedStyle]}
            onPress={() => animatePress(superlikeScale, onSuperlike)}
            activeOpacity={0.9}
          >
            <StarFilledIcon size={22} color={colors.superlike} />
          </AnimatedTouchable>

          {/* Like Button */}
          <AnimatedTouchable
            style={[styles.button, styles.likeButton, likeAnimatedStyle]}
            onPress={() => animatePress(likeScale, onLike)}
            activeOpacity={0.9}
          >
            <HeartFilledIcon size={28} color={colors.like} />
          </AnimatedTouchable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  glassContainer: {
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: colors.glass,
    ...shadows.xl,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 16,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passButton: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  superlikeButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(245, 166, 35, 0.35)',
  },
  likeButton: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(74, 222, 128, 0.35)',
  },
});
