import 'react-native-gesture-handler';
import './src/i18n';
import React from 'react';
import { View, StyleSheet, AppState, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Home, ShoppingBag, MessageCircle, CircleUser as UserIcon, Loader2, ShoppingCart } from 'lucide-react-native';

import HomeScreen from './src/screens/HomeScreen';
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
// Network Performance Logger
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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// --- STACKS ---

import SellerStoreScreen from './src/screens/buyer/SellerStoreScreen';

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
  const { colors } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: colors.background }]}>
      <Loader2 color={colors.primary} size={48} style={{ marginBottom: 16 }} />
      <CustomText variant="h2">AMO Market</CustomText>
    </View>
  );
};

const AppTabs = () => {
  const { user } = useAuth();
  const { cartCount } = useCart();
  const { unreadCount } = useNotifications();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName={['SELLER', 'COURIER', 'AGENT'].includes(user?.role?.toUpperCase()) ? 'Me' : 'Home'}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.background, borderTopColor: colors.glassBorder }],
        tabBarActiveTintColor: '#e67e22',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarIcon: ({ color, size }) => {
          let IconComponent;
          if (route.name === 'Home') IconComponent = Home;
          else if (route.name === 'Market') IconComponent = ShoppingBag;
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
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Market" component={MarketplaceStack} />
      <Tab.Screen 
        name="Cart" 
        component={CartScreen} 
        options={{
          tabBarBadge: cartCount > 0 ? cartCount : null,
          tabBarBadgeStyle: { backgroundColor: '#e67e22', fontSize: 10 }
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
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
  const [showWarning, setShowWarning] = React.useState(false);
  const [currentRoute, setCurrentRoute] = React.useState(null);

  const INACTIVITY_LIMIT = 9 * 60 * 1000; // 9 minutes warning
  const LOGOUT_LIMIT = 10 * 60 * 1000; // 10 minutes total

  const resetTimer = React.useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    setShowWarning(false);

    if (!user) return; // Only track logged-in users

    inactivityTimer.current = setTimeout(() => {
      setShowWarning(true);
    }, INACTIVITY_LIMIT);
  }, [user]);

  const handleLogout = React.useCallback(() => {
    setShowWarning(false);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    logout();
  }, [logout]);

  React.useEffect(() => {
    resetTimer();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetTimer]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        if (backgroundTime.current && user) {
          const elapsed = Date.now() - backgroundTime.current;
          if (elapsed >= LOGOUT_LIMIT) {
            handleLogout();
          } else if (elapsed >= INACTIVITY_LIMIT) {
            setShowWarning(true);
          } else {
            resetTimer();
          }
        } else {
          resetTimer();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        backgroundTime.current = Date.now();
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [user, resetTimer, handleLogout]);

  if (loading) {
    return <LoadingScreen />;
  }

  const manifest = Constants.expoConfig || Constants.manifest;
  const hostUri = manifest?.hostUri;

  const linking = {
    prefixes: [
      hostUri ? `exp://${hostUri}/--` : 'exp://1ui--vo-ihyacinthe-8081.exp.direct/--',
      'exp://'
    ],
    config: {
      initialRouteName: 'Auth',
      screens: {
        Auth: {
          initialRouteName: 'Login',
          screens: {
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
      <NavigationContainer 
        linking={linking}
        onStateChange={(state) => {
          if (!state) return;
          let route = state.routes[state.index];
          while (route.state) {
            route = route.state.routes[route.state.index];
          }
          setCurrentRoute(route.name);
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainApp" component={AppTabs} />
          {!user && (
            <Stack.Screen name="Auth" component={AuthStack} />
          )}
        </Stack.Navigator>
        <AuthOverlay currentRoute={currentRoute} />
      </NavigationContainer>

      <AutoLogoutWarningModal
        visible={showWarning}
        onDismiss={resetTimer}
        onLogout={handleLogout}
      />
    </View>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <PresenceProvider>
          <LanguageProvider>
            <ThemeProvider>
              <NotificationProvider>
                <CartProvider>
                  <WishlistProvider>
                    <SafeAreaProvider>
                      <RootNavigator />
                    </SafeAreaProvider>
                  </WishlistProvider>
                </CartProvider>
              </NotificationProvider>
            </ThemeProvider>
          </LanguageProvider>
        </PresenceProvider>
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
  }
});
