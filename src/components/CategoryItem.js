import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import CustomText from './CustomText';

const CategoryItem = ({ label, icon: Icon, color, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: color ? `${color}15` : 'rgba(255,255,255,0.05)' }]}>
        <Icon size={24} color={color || '#e67e22'} />
      </View>
      <CustomText variant="caption" style={styles.label}>
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
    borderColor: 'rgba(255,255,255,0.15)',
  },
  label: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default CategoryItem;
