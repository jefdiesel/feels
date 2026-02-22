import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface ActionEmojisProps {
  onLike: () => void;
  onPass: () => void;
  onSuperlike: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ActionEmojis({ onLike, onPass, onSuperlike }: ActionEmojisProps) {
  const likeScale = useSharedValue(1);
  const passScale = useSharedValue(1);
  const superlikeScale = useSharedValue(1);

  const animatePress = (scale: Animated.SharedValue<number>, callback: () => void) => {
    scale.value = withSequence(
      withSpring(1.3, { damping: 5 }),
      withTiming(1, { duration: 200 })
    );
    callback();
  };

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const passAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: passScale.value }],
  }));

  const superlikeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: superlikeScale.value }],
  }));

  return (
    <View style={styles.container}>
      <AnimatedTouchable
        style={[styles.button, styles.superlikeButton, superlikeAnimatedStyle]}
        onPress={() => animatePress(superlikeScale, onSuperlike)}
        activeOpacity={0.8}
      >
        <Animated.Text style={styles.emoji}>⭐</Animated.Text>
      </AnimatedTouchable>

      <AnimatedTouchable
        style={[styles.button, styles.likeButton, likeAnimatedStyle]}
        onPress={() => animatePress(likeScale, onLike)}
        activeOpacity={0.8}
      >
        <Animated.Text style={styles.emoji}>💚</Animated.Text>
      </AnimatedTouchable>

      <AnimatedTouchable
        style={[styles.button, styles.passButton, passAnimatedStyle]}
        onPress={() => animatePress(passScale, onPass)}
        activeOpacity={0.8}
      >
        <Animated.Text style={styles.emoji}>❌</Animated.Text>
      </AnimatedTouchable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    top: '40%',
    alignItems: 'center',
    gap: 16,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  superlikeButton: {
    borderWidth: 2,
    borderColor: 'rgba(0, 212, 255, 0.5)',
  },
  likeButton: {
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 136, 0.5)',
  },
  passButton: {
    borderWidth: 2,
    borderColor: 'rgba(255, 68, 88, 0.5)',
  },
  emoji: {
    fontSize: 32,
  },
});
