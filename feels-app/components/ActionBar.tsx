import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { XIcon } from '@/components/Icons';
import { colors, shadows, animations } from '@/constants/theme';

interface ActionBarProps {
  onPass: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ActionBar({ onPass }: ActionBarProps) {
  const passScale = useSharedValue(1);

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

  return (
    <AnimatedTouchable
      style={[styles.passButton, passAnimatedStyle]}
      onPress={() => animatePress(passScale, onPass)}
      activeOpacity={0.9}
    >
      <XIcon size={26} color={colors.pass} />
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  passButton: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(107, 114, 128, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(107, 114, 128, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
});
