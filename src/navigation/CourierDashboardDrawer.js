import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, Modal,
  Animated, Dimensions, TouchableWithoutFeedback, Image, Alert
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CourierDrawerContext } from '../context/CourierDrawerContext';
import CustomText from '../components/CustomText';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import {
  LayoutDashboard,
  Package,
  Wallet,
  Settings,
  LogOut,
  X,
  User as UserIcon,
  Truck,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import CourierDashboardScreen from '../screens/courier/CourierDashboardScreen';
import CourierShipmentsScreen from '../screens/courier/CourierShipmentsScreen';
import CourierEarningsScreen from '../screens/courier/CourierEarningsScreen';
import CourierProfileScreen from '../screens/courier/CourierProfileScreen';
import CourierSettingsScreen from '../screens/courier/CourierSettingsScreen';
import ChatDetailScreen from '../screens/shared/ChatDetailScreen';

const Stack = createNativeStackNavigator();
const { width } = Dimensions.get('window');

// Exactly mirrors the web COURIER sidebar items
const NAV_ITEMS = (t) => [
  { name: t('dashboard'),   icon: LayoutDashboard, screen: 'CourierDashboard' },
  { name: t('shipments'),   icon: Package,         screen: 'CourierShipments' },
  { name: t('earnings'),    icon: Wallet,           screen: 'CourierEarnings'  },
  { name: t('profile'),  icon: UserIcon,         screen: 'CourierProfile'   },
  { name: t('settings'),    icon: Settings,         screen: 'CourierSettings'  },
];

// ─── Slide-in Drawer ──────────────────────────────────────────────────────────
const CustomDrawer = ({ visible, onClose, navigation, activeScreen, setActiveScreen }) => {
  const { colors } = useTheme();
  const { logout, user } = useAuth();
  const { t } = useTranslation(['dashboard', 'common']);
  const slideAnim = useRef(new Animated.Value(-width * 0.75)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -width * 0.75, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setShouldRender(false));
    }
  }, [visible]);

  const handleNavigate = (screen) => {
    setActiveScreen(screen);
    onClose();
    // Use the parent navigation to navigate into the 'Me' tab's nested stack
    if (navigation && navigation.navigate) {
      navigation.navigate('Me', { screen });
    }
  };

  const handleLogout = () => {
    Alert.alert(t('logoutConfirmTitle'), t('logoutConfirmDesc'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('logoutConfirmTitle'),
        style: 'destructive',
        onPress: () => { onClose(); logout(); if (navigation && navigation.navigate) navigation.navigate('Home'); },
      },
    ]);
  };

  if (!shouldRender && !visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
              backgroundColor: colors.background,
              borderRightColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTop}>
              <View style={styles.brandRow}>
                <Image source={require('../../assets/logo.png')} style={styles.brandLogo} />
                <Svg height="28" width="110">
                  <Defs>
                    <SvgGradient id="cgrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#f97316" stopOpacity="1" />
                      <Stop offset="1" stopColor="#ef4444" stopOpacity="1" />
                    </SvgGradient>
                  </Defs>
                  <SvgText fill="url(#cgrad)" fontSize="17" fontWeight="900" x="0" y="20" textAnchor="start">
                    AMO Market
                  </SvgText>
                </Svg>
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.glass }]}>
                <X color={colors.muted} size={20} />
              </TouchableOpacity>
            </View>

            {/* User info */}
            <View style={styles.userInfo}>
              <View style={[styles.avatarWrap, { backgroundColor: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.3)' }]}>
                <Truck color="#f97316" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <CustomText style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
                  {user?.name || t('courier')}
                </CustomText>
                <CustomText style={styles.userRole}>{t('verifiedCourier')}</CustomText>
              </View>
            </View>
          </View>

          {/* Navigation */}
          <ScrollView style={styles.navContent} showsVerticalScrollIndicator={false}>

            {NAV_ITEMS(t).map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.screen;
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.navItem,
                    isActive && styles.navItemActive,
                  ]}
                  onPress={() => handleNavigate(item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.navIconBox,
                    { backgroundColor: isActive ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.08)' }
                  ]}>
                    <Icon color={isActive ? '#f97316' : colors.muted} size={18} />
                  </View>
                  <CustomText style={[
                    styles.navItemText,
                    { color: isActive ? '#f97316' : colors.foreground }
                  ]}>
                    {item.name}
                  </CustomText>
                  {isActive && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer logout */}
          <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: 'rgba(239,68,68,0.08)' }]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <LogOut color="#EF4444" size={18} />
              <CustomText style={styles.logoutText}>{t('signOut')}</CustomText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Main Drawer Navigator ────────────────────────────────────────────────────
export default function CourierDashboardDrawer({ navigation }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeScreen, setActiveScreen] = useState('CourierDashboard');

  const stackNavRef = useRef(null);

  const navigateTo = (screen) => {
    setActiveScreen(screen);
    if (stackNavRef.current) {
      stackNavRef.current.navigate(screen);
    }
  };

  return (
    <CourierDrawerContext.Provider value={{ toggleDrawer: () => setDrawerVisible(v => !v) }}>
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          ref={stackNavRef}
          screenOptions={{ headerShown: false }}
          initialRouteName="CourierDashboard"
        >
          <Stack.Screen name="CourierDashboard" component={CourierDashboardScreen} />
          <Stack.Screen name="CourierShipments" component={CourierShipmentsScreen} />
          <Stack.Screen name="CourierEarnings" component={CourierEarningsScreen} />
          <Stack.Screen name="CourierProfile" component={CourierProfileScreen} />
          <Stack.Screen name="CourierSettings" component={CourierSettingsScreen} />
          <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
        </Stack.Navigator>

        <CustomDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          navigation={navigation}
          activeScreen={activeScreen}
          setActiveScreen={setActiveScreen}
        />
      </View>
    </CourierDrawerContext.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  modalOverlay: { flex: 1, flexDirection: 'row' },
  backdrop: {
    position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  drawer: {
    width: width * 0.75, height: '100%',
    shadowColor: '#000', shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 20, borderRightWidth: 1,
  },
  drawerHeader: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 18,
    borderBottomWidth: 1, gap: 16,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 34, height: 34, resizeMode: 'contain' },
  closeBtn: { padding: 8, borderRadius: 10 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  userName: { fontSize: 14, fontWeight: '700' },
  userRole: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, color: '#f97316' },
  navContent: { flex: 1, paddingHorizontal: 14, paddingTop: 16 },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 10, marginLeft: 6,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, paddingHorizontal: 10,
    borderRadius: 12, marginBottom: 4, position: 'relative',
  },
  navItemActive: { backgroundColor: 'rgba(249,115,22,0.08)' },
  navIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navItemText: { fontSize: 14, fontWeight: '600', flex: 1 },
  activeIndicator: {
    width: 4, height: 20, borderRadius: 2, backgroundColor: '#f97316',
    position: 'absolute', right: 10,
  },
  drawerFooter: { paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14,
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
