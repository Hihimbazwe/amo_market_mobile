import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Animated, Dimensions, TouchableWithoutFeedback, Image, Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SellerDrawerContext } from '../context/SellerDrawerContext';
import CustomText from '../components/CustomText';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import {
  Home,
  Package,
  ShoppingBag,
  Wallet,
  Settings,
  ShieldCheck,
  LogOut,
  X,
  CreditCard,
  AlertCircle,
  User as UserIcon,
} from 'lucide-react-native';

import SellerOverviewScreen from '../screens/seller/SellerOverviewScreen';
import SellerProductsScreen from '../screens/seller/SellerProductsScreen';
import SellerOrdersScreen from '../screens/seller/SellerOrdersScreen';
import SellerWalletScreen from '../screens/seller/SellerWalletScreen';
import SellerReplacementsScreen from '../screens/seller/SellerReplacementsScreen';
import SellerDisputesScreen from '../screens/seller/SellerDisputesScreen';
import SellerProfileScreen from '../screens/seller/SellerProfileScreen';
import SellerSettingsScreen from '../screens/seller/SellerSettingsScreen';
import SellerWithdrawScreen from '../screens/seller/SellerWithdrawScreen';
import SellerAnalyticsScreen from '../screens/seller/SellerAnalyticsScreen';
import SellerMembershipScreen from '../screens/seller/SellerMembershipScreen';
import SellerKYCScreen from '../screens/seller/SellerKYCScreen';

const Stack = createNativeStackNavigator();
const { width } = Dimensions.get('window');

// Core nav groups — secondary items (Withdraw, Replacements, Analytics, Profile) live inside their related screens
const NAV_GROUPS = [
  {
    label: 'STORE',
    items: [
      { name: 'Dashboard', icon: Home, screen: 'SellerOverview' },
      { name: 'My Products', icon: Package, screen: 'SellerProducts' },
      { name: 'Orders', icon: ShoppingBag, screen: 'SellerOrders' },
      { name: 'Disputes', icon: AlertCircle, screen: 'SellerDisputes' },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { name: 'Wallet', icon: Wallet, screen: 'SellerWallet' },
      { name: 'Membership', icon: CreditCard, screen: 'SellerMembership' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { name: 'KYC Verification', icon: ShieldCheck, screen: 'SellerKYC' },
      { name: 'Settings', icon: Settings, screen: 'SellerSettings' },
    ],
  },
];

const CustomDrawer = ({ visible, onClose, navigation }) => {
  const { colors } = useTheme();
  const { logout, user } = useAuth();
  const slideAnim = useRef(new Animated.Value(-width * 0.75)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -width * 0.75, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible && opacityAnim._value === 0) return null;

  const handleNavigate = (screen) => {
    onClose();
    navigation.navigate('Me', { screen });
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => { onClose(); logout(); navigation.navigate('Home'); },
      },
    ]);
  };


  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateX: slideAnim }], backgroundColor: colors.background, borderRightColor: colors.border },
          ]}
        >
          {/* ── Header ── */}
          <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTop}>
              <View style={styles.brandRow}>
                <Image source={require('../../assets/logo.png')} style={styles.brandLogo} />
                <Svg height="28" width="110">
                  <Defs>
                    <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#A855F7" stopOpacity="1" />
                      <Stop offset="1" stopColor="#3B82F6" stopOpacity="1" />
                    </SvgGradient>
                  </Defs>
                  <SvgText fill="url(#grad)" fontSize="17" fontWeight="900" x="0" y="20" textAnchor="start">
                    AMO Market
                  </SvgText >
                </Svg>
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.glass }]}>
                <X color={colors.muted} size={20} />
              </TouchableOpacity>
            </View>

            {/* User info — only email, no avatar */}
            <View style={styles.userInfo}>
              <View style={{ 
                width: 36, 
                height: 36, 
                borderRadius: 18, 
                backgroundColor: 'rgba(255,255,255,0.05)', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginRight: 10,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)'
              }}>
                {user?.image ? (
                  <Image source={{ uri: user.image }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                ) : (
                  <UserIcon color={colors.primary} size={20} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <CustomText style={[styles.userEmail, { color: colors.foreground, fontSize: 14, fontWeight: '700' }]} numberOfLines={1}>
                  {user?.name || 'Seller'}
                </CustomText>
              </View>
            </View>
          </View>

          {/* ── Nav ── */}
          <ScrollView
            style={styles.navContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {NAV_GROUPS.map((group, gIdx) => (
              <View key={group.label} style={[styles.group, gIdx > 0 && { marginTop: 8 }]}>
                <CustomText style={[styles.groupLabel, { color: colors.muted }]}>{group.label}</CustomText>
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={styles.navItem}
                      onPress={() => handleNavigate(item.screen)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.navIconBox, { backgroundColor: `${colors.primary}12` }]}>
                        <ItemIcon color={colors.muted} size={17} />
                      </View>
                      <CustomText style={[styles.navItemText, { color: colors.foreground }]}>{item.name}</CustomText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          {/* ── Footer ── */}
          <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: 'rgba(239,68,68,0.08)' }]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <LogOut color="#EF4444" size={18} />
              <CustomText style={styles.logoutText}>Sign Out</CustomText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function SellerDashboardDrawer({ navigation }) {
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <SellerDrawerContext.Provider value={{ toggleDrawer: () => setDrawerVisible(v => !v) }}>
      <View style={{ flex: 1 }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="SellerOverview" component={SellerOverviewScreen} />
          <Stack.Screen name="SellerProducts" component={SellerProductsScreen} />
          <Stack.Screen name="SellerOrders" component={SellerOrdersScreen} />
          <Stack.Screen name="SellerReplacements" component={SellerReplacementsScreen} />
          <Stack.Screen name="SellerDisputes" component={SellerDisputesScreen} />
          <Stack.Screen name="SellerWallet" component={SellerWalletScreen} />
          <Stack.Screen name="SellerWithdraw" component={SellerWithdrawScreen} />
          <Stack.Screen name="SellerAnalytics" component={SellerAnalyticsScreen} />
          <Stack.Screen name="SellerMembership" component={SellerMembershipScreen} />
          <Stack.Screen name="SellerKYC" component={SellerKYCScreen} />
          <Stack.Screen name="SellerProfile" component={SellerProfileScreen} />
          <Stack.Screen name="SellerSettings" component={SellerSettingsScreen} />
        </Stack.Navigator>

        <CustomDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          navigation={navigation?.navigate ? navigation : { navigate: () => {} }}
        />
      </View>
    </SellerDrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, flexDirection: 'row' },
  backdrop: {
    position: 'absolute',
    left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
    width: width * 0.75,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
    borderRightWidth: 1,
  },

  // Header
  drawerHeader: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 18,
    borderBottomWidth: 1,
    gap: 16,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 34, height: 34, resizeMode: 'contain' },
  closeBtn: { padding: 8, borderRadius: 10 },

  // User info (no card/border)
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '900' },
  userName: { fontSize: 14, fontWeight: '700' },
  userEmail: { fontSize: 11, marginTop: 1 },

  // Nav
  navContent: { flex: 1, paddingHorizontal: 14, paddingTop: 16 },
  group: { marginBottom: 4 },
  groupLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.4,
    marginBottom: 6, marginLeft: 4,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 8,
    borderRadius: 12, marginBottom: 2,
  },
  navIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navItemText: { fontSize: 14, fontWeight: '600' },

  // Footer
  drawerFooter: { paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14,
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
