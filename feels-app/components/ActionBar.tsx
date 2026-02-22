import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

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
      withSpring(0.85, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
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
            <Text style={styles.passIcon}>X</Text>
          </AnimatedTouchable>

          {/* Superlike Button */}
          <AnimatedTouchable
            style={[styles.button, styles.superlikeButton, superlikeAnimatedStyle]}
            onPress={() => animatePress(superlikeScale, onSuperlike)}
            activeOpacity={0.9}
          >
            <Text style={styles.starIcon}>*</Text>
          </AnimatedTouchable>

          {/* Like Button */}
          <AnimatedTouchable
            style={[styles.button, styles.likeButton, likeAnimatedStyle]}
            onPress={() => animatePress(likeScale, onLike)}
            activeOpacity={0.9}
          >
            <Text style={styles.heartIcon}>+</Text>
          </AnimatedTouchable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  glassContainer: {
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 20,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passButton: {
    backgroundColor: 'rgba(100, 100, 100, 0.4)',
    borderWidth: 2,
    borderColor: 'rgba(150, 150, 150, 0.3)',
  },
  superlikeButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(100, 100, 100, 0.4)',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  likeButton: {
    backgroundColor: 'rgba(255, 20, 147, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 20, 147, 0.4)',
  },
  passIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#888888',
  },
  starIcon: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFD700',
  },
  heartIcon: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FF1493',
  },
});
