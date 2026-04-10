import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import CustomText from './CustomText';
import { useNavigation } from '@react-navigation/native';

const NotificationIcon = ({ style, color }) => {
  const { unreadCount } = useNotifications();
  const { colors } = useTheme();
  const navigation = useNavigation();

  return null; // Notification bell hidden as requested
  /*
  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.glass }, style]}
      onPress={() => navigation.navigate('Notifications')}
    >
      <Bell color={color || colors.foreground} size={22} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: '#ef4444', borderColor: colors.background }]}>
          <CustomText style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</CustomText>
        </View>
      )}
    </TouchableOpacity>
  );
  */
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 12,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  }
});

export default NotificationIcon;
