import React from 'react';
import { StyleSheet, Animated } from 'react-native';

interface NFCRingAnimationProps {
  ringAnim: Animated.Value;
}

export const NFCRingAnimation: React.FC<{ ringAnim: Animated.Value<number> }> = ({ ringAnim }) => {
  return (
    <Animated.View 
      style={[
        styles.ring, 
        { 
          transform: [{ scale: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2] }) }],
          opacity: ringAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 0]
          }),
        }
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
});
