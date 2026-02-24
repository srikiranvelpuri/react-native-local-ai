import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { darkTheme } from '../utils/theme';

export const ThinkingIndicator = () => {
  const opacity1 = useRef(new Animated.Value(0.3)).current;
  const opacity2 = useRef(new Animated.Value(0.3)).current;
  const opacity3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const anim1 = animate(opacity1, 0);
    const anim2 = animate(opacity2, 200);
    const anim3 = animate(opacity3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [opacity1, opacity2, opacity3]);

  return (
    <View style={styles.thinkingContainer}>
      <Animated.View style={[styles.thinkingDot, { opacity: opacity1 }]} />
      <Animated.View style={[styles.thinkingDot, { opacity: opacity2 }]} />
      <Animated.View style={[styles.thinkingDot, { opacity: opacity3 }]} />
      <Text style={styles.thinkingText}>Thinking</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: darkTheme.textSecondary,
  },
  thinkingText: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    marginLeft: 8,
  },
});
