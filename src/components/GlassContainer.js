import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

const GlassContainer = ({ children, style }) => {
  return (
    <View style={[styles.glass, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  glass: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 16,
    padding: 16,
    // Note: React Native backdrop-filter is not directly supported without expo-blur
    // But we use a dark translucent background to mimic the feel.
  },
});

export default GlassContainer;
