import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CustomText from './CustomText';
import { useTheme } from '../context/ThemeContext';

const CustomButton = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  loading = false, 
  disabled = false, 
  style,
  textStyle 
}) => {
  const { colors } = useTheme();
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  const getGradientColors = () => {
    if (disabled) return [colors.muted, colors.muted];
    if (variant === 'primary') return [colors.primary, '#d35400']; 
    if (variant === 'secondary') return ['#d35400', '#e67e22']; 
    return ['transparent', 'transparent'];
  };

  const Content = () => (
    loading ? (
      <ActivityIndicator color={isOutline || isGhost ? colors.primary : colors.white} />
    ) : (
      <CustomText style={[
        styles.text, 
        { color: colors.white },
        (isOutline || isGhost) && { color: colors.primary },
        textStyle
      ]}>
        {title}
      </CustomText>
    )
  );

  if (isOutline || isGhost) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={disabled || loading}
        style={[
          styles.button, 
          isOutline && { borderWidth: 1, borderColor: colors.primary },
          style
        ]}
      >
        <Content />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button}
      >
        <Content />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  text: {
    fontWeight: '700',
    fontSize: 14,
  },
});

export default CustomButton;
