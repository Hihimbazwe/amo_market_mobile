import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import CustomText from './CustomText';
import { useTheme } from '../context/ThemeContext';

const CategoryItem = ({ label, icon: Icon, color, onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer, 
        { 
          backgroundColor: color ? `${color}15` : colors.glass,
          borderColor: colors.border
        }
      ]}>
        <Icon size={24} color={color || colors.primary} />
      </View>
      <CustomText variant="caption" style={[styles.label, { color: colors.foreground }]}>
        {label}
      </CustomText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '25%', // 4 columns
    marginBottom: 16,
    padding: 8,
  },
  iconContainer: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  label: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default CategoryItem;
