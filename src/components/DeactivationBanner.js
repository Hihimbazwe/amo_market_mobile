import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { AlertTriangle, LogOut } from 'lucide-react-native';
import CustomText from './CustomText';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

/**
 * DeactivationBanner
 * Shown at the top of every seller screen when the account is deactivated.
 * The seller can still log out but all marketplace actions are restricted.
 */
const DeactivationBanner = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation(['dashboard', 'common']);

  // Only render for deactivated sellers
  const isDeactivated = user?.accountStatus && user.accountStatus !== 'ACTIVE';
  if (!isDeactivated) return null;

  // Subtle pulse animation on the warning icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    // Slide in from top
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();

    // Pulse the icon repeatedly
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.9, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 400, useNativeDriver: true }),
        Animated.delay(1400),
      ])
    ).start();
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      {/* Accent stripe */}
      <View style={styles.accentStripe} />

      <View style={styles.inner}>
        {/* Icon */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulseAnim }] }]}>
          <AlertTriangle size={18} color="#F59E0B" />
        </Animated.View>

        {/* Text block */}
        <View style={styles.textBlock}>
          <CustomText style={styles.title}>
            {t('accountDeactivated') || 'Account Deactivated'}
          </CustomText>
          <CustomText style={styles.subtitle}>
            {t('accountDeactivatedBannerDesc') ||
              'Your marketplace access is temporarily restricted. Log out and contact support to reactivate.'}
          </CustomText>
        </View>

        {/* Logout shortcut */}
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutBtn}
          activeOpacity={0.8}
          accessibilityLabel="Log out"
          accessibilityRole="button"
        >
          <LogOut size={15} color="#F59E0B" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 6,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.30)',
    // Glassmorphism shadow
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  accentStripe: {
    height: 3,
    backgroundColor: '#F59E0B',
    opacity: 0.85,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  subtitle: {
    color: 'rgba(245, 158, 11, 0.75)',
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '500',
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
});

export default DeactivationBanner;
