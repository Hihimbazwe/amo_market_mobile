import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Animated, Dimensions, TouchableWithoutFeedback, Image, Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CustomText from '../components/CustomText';
import { Colors } from '../theme/colors';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { 
  Home, 
  Package, 
  ShoppingBag, 
  Wallet, 
  BarChart2, 
  Settings, 
  ShieldCheck, 
  LogOut,
  X,
  User,
  ArrowDownToLine,
  CreditCard,
  ShieldAlert,
  RefreshCcw,
  AlertCircle
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

import { SellerDrawerContext } from '../context/SellerDrawerContext';

const CustomDrawer = ({ visible, onClose, navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const slideAnim = useRef(new Animated.Value(-width * 0.75)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const { logout } = useAuth();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -width * 0.75, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start();
    }
  }, [visible]);

  if (!visible && opacityAnim._value === 0) return null;

  const routes = [
    { name: 'Dashboard', icon: Home, screen: 'SellerOverview' },
    { name: 'My Products', icon: Package, screen: 'SellerProducts' },
    { name: 'Orders', icon: ShoppingBag, screen: 'SellerOrders' },
    { name: 'Replacements', icon: RefreshCcw, screen: 'SellerReplacements' },
    { name: 'Disputes', icon: AlertCircle, screen: 'SellerDisputes' },
    { name: 'Wallet', icon: Wallet, screen: 'SellerWallet' },
    { name: 'Withdraw', icon: ArrowDownToLine, screen: 'SellerWithdraw' },
    { name: 'Analytics', icon: BarChart2, screen: 'SellerAnalytics' },
    { name: 'Membership', icon: CreditCard, screen: 'SellerMembership' },
    { name: 'KYC', icon: ShieldCheck, screen: 'SellerKYC' },
    { name: 'Profile', icon: User, screen: 'SellerProfile' },
    { name: 'Settings', icon: Settings, screen: 'SellerSettings' },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
        </TouchableWithoutFeedback>
        
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }], backgroundColor: colors.background, borderRightColor: colors.border }]}>
          <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={{ width: 40, height: 40, resizeMode: 'contain', marginRight: 12 }} 
              />
              <Svg height="30" width="110">
                <Defs>
                  <LinearGradient id="grad2" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#A855F7" stopOpacity="1" />
                    <Stop offset="1" stopColor="#3B82F6" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <SvgText
                  fill="url(#grad2)"
                  fontSize="18"
                  fontWeight="900"
                  x="0"
                  y="22"
                  textAnchor="start"
                >Seller Hub</SvgText>
              </Svg>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.glass }]}>
              <X color={colors.muted} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.drawerItems}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {routes.map((route) => {
                const IconComponent = route.icon;
                return (
                  <TouchableOpacity
                    key={route.name}
                    style={[styles.drawerItem, { backgroundColor: 'transparent' }]}
                    onPress={() => {
                      onClose();
                      navigation.navigate('Me', { screen: route.screen });
                    }}
                  >
                    <IconComponent color={colors.muted} size={20} />
                    <CustomText style={[styles.drawerItemText, { color: colors.muted }]}>{route.name}</CustomText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <TouchableOpacity 
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Sign Out', 
                  style: 'destructive', 
                  onPress: () => {
                    onClose();
                    logout();
                    navigation.navigate('Home');
                  } 
                }
              ]);
            }} 
            style={[styles.logoutButton, { borderTopColor: colors.border }]}
          >
            <LogOut color="#EF4444" size={20} />
            <CustomText style={{ color: "#EF4444", marginLeft: 12, fontWeight: 'bold' }}>Sign Out</CustomText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function SellerDashboardDrawer({ navigation }) {
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <SellerDrawerContext.Provider value={{ toggleDrawer: () => setDrawerVisible(!drawerVisible) }}>
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
          navigation={navigation.navigate ? navigation : { navigate: () => {} }}
        />
      </View>
    </SellerDrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
    width: width * 0.75,
    backgroundColor: Colors.background,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
  },
  drawerHeader: {
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 8,
  },
  drawerItems: {
    padding: 16,
    flex: 1,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  drawerItemText: {
    color: Colors.muted,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
});
