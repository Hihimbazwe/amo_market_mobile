import React from 'react';
import { View, StyleSheet } from 'react-native';

const GlassContainer = ({ children, style }) => {
  return (
    <View style={[styles.glass, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    // Note: React Native backdrop-filter is not directly supported without expo-blur
    // But we use a dark translucent background to mimic the feel.
  },
});

export default GlassContainer;
