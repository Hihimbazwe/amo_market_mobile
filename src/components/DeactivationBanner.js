import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { ShoppingBag, MessageCircle, AlertTriangle, LogOut } from 'lucide-react-native';
import CustomText from './CustomText';
import { useAuth } from '../context/AuthContext';

const BANNER_CONFIGS = {
  selling: {
    icon: ShoppingBag,
    color: '#F59E0B',
    title: 'Selling Disabled',
    subtitle: 'Your listings are hidden. Chat features remain active.',
  },
  chat: {
    icon: MessageCircle,
    color: '#3B82F6',
    title: 'Chat Disabled',
    subtitle: 'Messaging is restricted. Selling features remain active.',
  },
  deactivated: {
    icon: AlertTriangle,
    color: '#F59E0B',
    title: 'Account Deactivated',
    subtitle: 'Your marketplace access is temporarily restricted.',
  },
};

const DeactivationBanner = () => {
  const { user, logout } = useAuth();

  const isFullyDeactivated = user?.accountStatus && user.accountStatus !== 'ACTIVE';
  const isSellingDisabled = !isFullyDeactivated && user?.sellingDisabled;
  const isChatDisabled = !isFullyDeactivated && user?.chatDisabled;

  const config = isFullyDeactivated
    ? BANNER_CONFIGS.deactivated
    : isSellingDisabled
    ? BANNER_CONFIGS.selling
    : isChatDisabled
    ? BANNER_CONFIGS.chat
    : null;

  const slideAnim = useRef(new Animated.Value(-80)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!config) return;
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.9, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 400, useNativeDriver: true }),
        Animated.delay(1400),
      ])
    ).start();
  }, [config?.title]);

  if (!config) return null;

  const Icon = config.icon;
  const c = config.color;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: `${c}0D`,
          borderColor: `${c}4D`,
          shadowColor: c,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.accentStripe, { backgroundColor: c }]} />
      <View style={styles.inner}>
        <Animated.View style={[styles.iconWrap, { backgroundColor: `${c}22`, transform: [{ scale: pulseAnim }] }]}>
          <Icon size={18} color={c} />
        </Animated.View>
        <View style={styles.textBlock}>
          <CustomText style={[styles.title, { color: c }]}>{config.title}</CustomText>
          <CustomText style={[styles.subtitle, { color: `${c}BF` }]}>{config.subtitle}</CustomText>
        </View>
        {isFullyDeactivated && (
          <TouchableOpacity onPress={logout} style={[styles.logoutBtn, { backgroundColor: `${c}1F`, borderColor: `${c}40` }]}>
            <LogOut size={15} color={c} />
          </TouchableOpacity>
        )}
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
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  accentStripe: { height: 3, opacity: 0.85 },
  inner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  textBlock: { flex: 1 },
  title: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, marginBottom: 2 },
  subtitle: { fontSize: 10.5, lineHeight: 15, fontWeight: '500' },
  logoutBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 1 },
});

export default DeactivationBanner;
