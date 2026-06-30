import 'react-native-gesture-handler';
import './src/i18n';
import React, { useEffect } from 'react';
import { View, StyleSheet, AppState, Platform, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Home, ShoppingBag, MessageCircle, CircleUser as UserIcon, Loader2, ShoppingCart } from 'lucide-react-native';

import HomeScreen from './src/screens/HomeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
// Cart removed from tabs
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrderSuccessScreen from './src/screens/OrderSuccessScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyOTPScreen from './src/screens/VerifyOTPScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import GlobalSearchScreen from './src/screens/GlobalSearchScreen';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SecurityProvider, useAppSecurity } from './src/context/SecurityContext';
import { API_BASE_URL } from '@env';
import Constants from 'expo-constants';
import { CartProvider, useCart } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import { PresenceProvider } from './src/context/PresenceContext';
import { LanguageProvider } from './src/context/LanguageContext';
import CustomText from './src/components/CustomText';
import BuyerDashboardDrawer from './src/navigation/BuyerDashboardDrawer';
import SellerDashboardDrawer from './src/navigation/SellerDashboardDrawer';
import AgentDashboardDrawer from './src/navigation/AgentDashboardDrawer';
import CourierDashboardDrawer from './src/navigation/CourierDashboardDrawer';
import ChatListScreen from './src/screens/shared/ChatListScreen';
import ChatDetailScreen from './src/screens/shared/ChatDetailScreen';
import StatusViewerScreen from './src/screens/shared/StatusViewerScreen';
import CartScreen from './src/screens/CartScreen';
import AuthOverlay from './src/components/AuthOverlay';
import AutoLogoutWarningModal from './src/components/modals/AutoLogoutWarningModal';
import 'react-native-gesture-handler';

import { BuyerDrawerContext } from './src/context/BuyerDrawerContext';
import { SellerDrawerContext } from './src/context/SellerDrawerContext';
import { CourierDrawerContext } from './src/context/CourierDrawerContext';
import { AgentDrawerContext } from './src/context/AgentDrawerContext';

import { CallProvider } from './src/contexts/CallContext';
import CallScreen from './src/screens/shared/CallScreen';
import AppLockOverlay from './src/screens/shared/AppLockOverlay';
import { NavigationRefContext, rootNavigationRef } from './src/context/NavigationRefContext';

console.log('📡 [ENV] API_BASE_URL loaded as:', API_BASE_URL);

// ...existing code...
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// --- STACKS ---

import SellerStoreScreen from './src/screens/buyer/SellerStoreScreen';
import ReviewsScreen from './src/screens/ReviewsScreen';

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    <Stack.Screen name="SellerStore" component={SellerStoreScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} />
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
    <Stack.Screen name="StatusViewer" component={StatusViewerScreen} />
    <Stack.Screen name="Reviews" component={ReviewsScreen} />
  </Stack.Navigator>
);

const MarketplaceStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MarketMain" component={MarketplaceScreen} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    <Stack.Screen name="SellerStore" component={SellerStoreScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} />
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
    <Stack.Screen name="StatusViewer" component={StatusViewerScreen} />
  </Stack.Navigator>
);

const MessagesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MessagesMain" component={ChatListScreen} />
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
    <Stack.Screen name="StatusViewer" component={StatusViewerScreen} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

// --- COMPONENTS ---

const LoadingScreen = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#030712', justifyContent: 'center', alignItems: 'center' }}>
      <Image
        source={require('./assets/splash-icon.png')}
        style={{ width: 120, height: 120, resizeMode: 'contain' }}
      />
    </View>
  );
};

const AppTabs = () => {
  const { user } = useAuth();
  const { cartCount } = useCart();
  const { unreadChatCount } = useNotifications();
  const { colors } = useTheme();

  const isSellingDisabled = user?.sellingDisabled === true;

  return (
    <Tab.Navigator
      lazy={false}
      initialRouteName={
        isSellingDisabled
          ? 'Messages'
          : ['SELLER', 'COURIER', 'AGENT'].includes(user?.role?.toUpperCase())
            ? 'Me'
            : 'Home'
      }
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.background, borderTopColor: colors.glassBorder }],
        tabBarActiveTintColor: '#e67e22',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarIcon: ({ color, size }) => {
          let IconComponent;
          if (route.name === 'Home') IconComponent = Home;
          else if (route.name === 'Cart') IconComponent = ShoppingCart;
          else if (route.name === 'Messages') IconComponent = MessageCircle;
          else if (route.name === 'Me') IconComponent = UserIcon;

          return (
            <View>
              <IconComponent color={color} size={size} />
            </View>
          );
        },
      })}
    >
      {!isSellingDisabled && <Tab.Screen name="Home" component={HomeStack} />}
      {!isSellingDisabled && (
        <Tab.Screen
          name="Cart"
          component={CartScreen}
          options={{
            tabBarBadge: cartCount > 0 ? cartCount : null,
            tabBarBadgeStyle: { backgroundColor: '#e67e22', fontSize: 10 }
          }}
        />
      )}
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={{
          tabBarBadge: unreadChatCount > 0 ? unreadChatCount : null,
          tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 10 }
        }}
      />
      <Tab.Screen
        name="Me"
        component={
          user?.role?.toUpperCase() === 'SELLER'
            ? SellerDashboardDrawer
            : user?.role?.toUpperCase() === 'AGENT'
              ? AgentDashboardDrawer
              : user?.role?.toUpperCase() === 'COURIER'
                ? CourierDashboardDrawer
                : BuyerDashboardDrawer
        }
      />
    </Tab.Navigator>
  );
};

// --- CORE NAVIGATION & LOGIC ---

const RootNavigator = () => {
  const { loading, user, logout } = useAuth();
  const { cartCount } = useCart();
  const { unreadCount } = useNotifications();

  const inactivityTimer = React.useRef(null);
  const backgroundTime = React.useRef(null);
  const navigationRef = React.useRef(null);
  const [showWarning, setShowWarning] = React.useState(false);
  const [currentRoute, setCurrentRoute] = React.useState(null);
  const [currentRouteObj, setCurrentRouteObj] = React.useState(null);

  // Global Drawer Visible States
  const [buyerDrawerVisible, setBuyerDrawerVisible] = React.useState(false);
  const [sellerDrawerVisible, setSellerDrawerVisible] = React.useState(false);
  const [courierDrawerVisible, setCourierDrawerVisible] = React.useState(false);
  const [agentDrawerVisible, setAgentDrawerVisible] = React.useState(false);

  const INACTIVITY_LIMIT = 9 * 60 * 1000; // 9 minutes warning
  const BUYER_LOGOUT_LIMIT = 24 * 60 * 60 * 1000; // 24 hours
  const SELLER_LOGOUT_LIMIT = 10 * 60 * 1000; // 10 minutes total

  const isBuyerRole = !['SELLER', 'COURIER', 'AGENT'].includes(user?.role?.toUpperCase());
  const LOGOUT_LIMIT = isBuyerRole ? BUYER_LOGOUT_LIMIT : SELLER_LOGOUT_LIMIT;

  const lastActiveSaved = React.useRef(Date.now());

  const resetTimer = React.useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    setShowWarning(false);

    if (!user) return; // Only track logged-in users

    const now = Date.now();
    if (now - lastActiveSaved.current > 5000) { // Throttle AsyncStorage writes to 5 seconds
      lastActiveSaved.current = now;
      AsyncStorage.setItem('@last_active_time', now.toString()).catch(() => { });
    }

    if (isBuyerRole) {
      // Buyers are not automatically logged out while the app is active and in the foreground.
      return;
    }

    inactivityTimer.current = setTimeout(() => {
      setShowWarning(true);
    }, INACTIVITY_LIMIT);
  }, [user, isBuyerRole, INACTIVITY_LIMIT]);

  const handleLogout = React.useCallback(async () => {
    setShowWarning(false);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (user && currentRouteObj) {
      try {
        await AsyncStorage.setItem('@auto_logout_redirect', JSON.stringify(currentRouteObj));
        console.log('[AUTO_LOGOUT] Preserved route:', currentRouteObj.name);
      } catch (err) {
        console.error('Failed to save auto logout route', err);
      }
    }
    logout(false);
  }, [logout, user, currentRouteObj]);

  const isColdStart = React.useRef(true);

  React.useEffect(() => {
    const checkInitialState = async () => {
      if (user) {
        try {
          const lastActiveStr = await AsyncStorage.getItem('@last_active_time');
          if (lastActiveStr) {
            const lastActive = parseInt(lastActiveStr, 10);
            const elapsed = Date.now() - lastActive;
            // For buyers: only auto-logout on a cold start (app was fully closed),
            // not when resuming from background (recent apps).
            if (isColdStart.current && isBuyerRole && elapsed >= BUYER_LOGOUT_LIMIT) {
              handleLogout();
              return;
            } else if (!isBuyerRole && elapsed >= SELLER_LOGOUT_LIMIT) {
              handleLogout();
              return;
            } else if (!isBuyerRole && elapsed >= INACTIVITY_LIMIT) {
              setShowWarning(true);
            }
          }
        } catch (e) {
          console.warn('Failed to read last active time', e);
        }
      }
      // After the first check, this is no longer a cold start
      isColdStart.current = false;
      resetTimer();
    };
    checkInitialState();

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user, BUYER_LOGOUT_LIMIT, SELLER_LOGOUT_LIMIT, isBuyerRole, INACTIVITY_LIMIT, handleLogout, resetTimer]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        if (user) {
          const startTime = backgroundTime.current || lastActiveSaved.current;
          const elapsed = Date.now() - startTime;
          // Buyers: app is in recent apps/background = still "open" = never auto-logout on resume.
          // Only non-buyers get the inactivity-while-backgrounded check.
          if (!isBuyerRole) {
            if (elapsed >= SELLER_LOGOUT_LIMIT) {
              handleLogout();
            } else if (elapsed >= INACTIVITY_LIMIT) {
              setShowWarning(true);
            } else {
              resetTimer();
            }
          } else {
            // Buyer returned from background: reset the timer, no logout
            resetTimer();
          }
        } else {
          resetTimer();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        const now = Date.now();
        backgroundTime.current = now;
        lastActiveSaved.current = now;
        AsyncStorage.setItem('@last_active_time', now.toString()).catch(() => { });
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [user, resetTimer, handleLogout, BUYER_LOGOUT_LIMIT, SELLER_LOGOUT_LIMIT, isBuyerRole, INACTIVITY_LIMIT]);

  if (loading) {
    return <LoadingScreen />;
  }

  const manifest = Constants.expoConfig || Constants.manifest;
  const hostUri = manifest?.hostUri;

  const linking = {
    prefixes: [
      'amo://',
      hostUri ? `exp://${hostUri}/--` : 'exp://1ui--vo-ihyacinthe-8081.exp.direct/--',
      'exp://'
    ],
    config: {
      initialRouteName: 'Auth',
      screens: {
        Auth: {
          initialRouteName: 'Login',
          screens: {
            Register: 'invite/:inviteToken',
            ResetPassword: 'reset-password',
          },
        },
      },
    },
  };

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        if (!showWarning) resetTimer();
        return false;
      }}
      onPanResponderCapture={() => {
        if (!showWarning) resetTimer();
        return false;
      }}
    >
      <BuyerDrawerContext.Provider value={{ visible: buyerDrawerVisible, setVisible: setBuyerDrawerVisible, toggleDrawer: () => setBuyerDrawerVisible(v => !v) }}>
        <SellerDrawerContext.Provider value={{ visible: sellerDrawerVisible, setVisible: setSellerDrawerVisible, toggleDrawer: () => setSellerDrawerVisible(v => !v) }}>
          <CourierDrawerContext.Provider value={{ visible: courierDrawerVisible, setVisible: setCourierDrawerVisible, toggleDrawer: () => setCourierDrawerVisible(v => !v) }}>
            <AgentDrawerContext.Provider value={{ visible: agentDrawerVisible, setVisible: setAgentDrawerVisible, toggleDrawer: () => setAgentDrawerVisible(v => !v) }}>
              <NavigationRefContext.Provider value={navigationRef}>
                <NavigationContainer
                  ref={(node) => {
                    navigationRef.current = node;
                    rootNavigationRef.current = node;
                  }}
                  linking={linking}
                  onStateChange={(state) => {
                    if (!state) return;
                    try {
                      let route = state.routes[state.index];
                      while (route && route.state && typeof route.state.index === 'number') {
                        const nextRoute = route.state.routes[route.state.index];
                        if (nextRoute) {
                          route = nextRoute;
                        } else {
                          break;
                        }
                      }
                      if (route && route.name) {
                        setCurrentRoute(route.name);
                        if (user) {
                          setCurrentRouteObj({ name: route.name, params: route.params });
                        }
                      }
                    } catch (err) {
                      console.warn('[NAVIGATION] Error tracking route state', err);
                    }
                  }}
                >
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="MainApp" component={AppTabs} />
                    <Stack.Screen name="Checkout" component={CheckoutScreen} />
                    <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
                    <Stack.Screen name="Notifications" component={NotificationsScreen} />
                    <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} />
                    {!user && (
                      <Stack.Screen name="Auth" component={AuthStack} />
                    )}
                  </Stack.Navigator>
                  <AuthOverlay currentRoute={currentRoute} />
                </NavigationContainer>
              </NavigationRefContext.Provider>
            </AgentDrawerContext.Provider>
          </CourierDrawerContext.Provider>
        </SellerDrawerContext.Provider>
      </BuyerDrawerContext.Provider>

      <AutoLogoutWarningModal
        visible={showWarning}
        onDismiss={resetTimer}
        onLogout={handleLogout}
      />
    </View>
  );
};

// Security wrapper component
const SecurityWrapper = ({ children }) => {
  const { appLocked, suppressUnlockToastRef } = useAppSecurity();
  const [showToast, setShowToast] = React.useState(false);
  const prevLockedRef = React.useRef(appLocked);

  React.useEffect(() => {
    if (prevLockedRef.current && !appLocked && !suppressUnlockToastRef.current) {
      const { ToastAndroid, Platform } = require('react-native');
      if (Platform.OS === 'android') {
        ToastAndroid.show('App unlocked successfully', ToastAndroid.SHORT);
      } else {
        setShowToast(true);
        const timer = setTimeout(() => setShowToast(false), 2500);
        return () => clearTimeout(timer);
      }
    }
    prevLockedRef.current = appLocked;
    suppressUnlockToastRef.current = false;
  }, [appLocked]);

  return (
    <>
      {children}
      <AppLockOverlay visible={appLocked} />
      {showToast && (
        <View style={styles.toastContainer}>
          <CustomText style={styles.toastText}>App unlocked successfully</CustomText>
        </View>
      )}
    </>
  );
};

export default function App() {
  useEffect(() => {
    const originalFetch = global.fetch;
    global.fetch = async (...args) => {
      const url = args[0];
      const startTime = Date.now();
      console.log(`🌐 API CALL STARTED: ${url}`);
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        const emoji = duration < 500 ? '✅' : duration < 1500 ? '⚠️' : '🚨';
        console.log(`${emoji} API DONE: ${url}`);
        console.log(`⏱️  Time: ${duration}ms ${duration > 1500 ? '← TOO SLOW!' : ''}`);
        console.log(`📦 Status: ${response.status}`);
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`❌ API FAILED: ${url}`);
        console.log(`⏱️  Time: ${duration}ms`);
        console.log(`💥 Error: ${error.message}`);
        throw error;
      }
    };

    // Cleanup function to restore original fetch if component unmounts
    return () => {
      global.fetch = originalFetch;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SecurityProvider>
          <PresenceProvider>
            <LanguageProvider>
              <ThemeProvider>
                <CallProvider>
                  <NotificationProvider>
                    <CartProvider>
                      <WishlistProvider>
                        <SafeAreaProvider>
                          <SecurityWrapper>
                            <RootNavigator />
                          </SecurityWrapper>
                          <CallScreen />
                        </SafeAreaProvider>
                      </WishlistProvider>
                    </CartProvider>
                  </NotificationProvider>
                </CallProvider>
              </ThemeProvider>
            </LanguageProvider>
          </PresenceProvider>
        </SecurityProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#030712',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingBottom: Platform.OS === 'ios' ? 25 : 12,
    paddingTop: 10,
    height: Platform.OS === 'ios' ? 88 : 70,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#030712',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#e67e22',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#030712',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(185, 83, 16, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  }
});
