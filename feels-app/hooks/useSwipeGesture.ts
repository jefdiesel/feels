import { useCallback } from 'react';
import { Dimensions } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_UP_THRESHOLD = SCREEN_HEIGHT * 0.15;

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
}

export function useSwipeGesture(options: UseSwipeGestureOptions) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const handleSwipeRight = useCallback(() => {
    options.onSwipeRight?.();
  }, [options.onSwipeRight]);

  const handleSwipeLeft = useCallback(() => {
    options.onSwipeLeft?.();
  }, [options.onSwipeLeft]);

  const handleSwipeUp = useCallback(() => {
    options.onSwipeUp?.();
  }, [options.onSwipeUp]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(0.98);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      scale.value = withSpring(1);

      // Swipe up
      if (
        event.translationY < -SWIPE_UP_THRESHOLD &&
        Math.abs(event.translationX) < SWIPE_THRESHOLD
      ) {
        translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 300 });
        runOnJS(handleSwipeUp)();
        return;
      }

      // Swipe right
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
        runOnJS(handleSwipeRight)();
        return;
      }

      // Swipe left
      if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
        runOnJS(handleSwipeLeft)();
        return;
      }

      // Reset position
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => {
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
        { scale: scale.value },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  const superlikeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-SWIPE_UP_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  const reset = useCallback(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    scale.value = withSpring(1);
  }, []);

  return {
    gesture,
    animatedStyle,
    likeOpacity,
    passOpacity,
    superlikeOpacity,
    reset,
    translateX,
    translateY,
  };
}
