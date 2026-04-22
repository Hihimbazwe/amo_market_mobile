import 'react-native-gesture-handler';
import React from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Home, ShoppingBag, MessageCircle, CircleUser as UserIcon, Loader2 } from 'lucide-react-native';

import HomeScreen from './src/screens/HomeScreen';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
// Cart removed from tabs
import CheckoutScreen from './src/screens/CheckoutScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyOTPScreen from './src/screens/VerifyOTPScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import Constants from 'expo-constants';
import { CartProvider, useCart } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import CustomText from './src/components/CustomText';
import BuyerDashboardDrawer from './src/navigation/BuyerDashboardDrawer';
import SellerDashboardDrawer from './src/navigation/SellerDashboardDrawer';
import ChatListScreen from './src/screens/shared/ChatListScreen';
import ChatDetailScreen from './src/screens/shared/ChatDetailScreen';
import StatusViewerScreen from './src/screens/shared/StatusViewerScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// --- STACKS ---

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
    <Stack.Screen name="StatusViewer" component={StatusViewerScreen} />
  </Stack.Navigator>
);

const MarketplaceStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MarketMain" component={MarketplaceScreen} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
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
      initialRouteName={user?.role === 'SELLER' ? 'Me' : 'Home'}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.background, borderTopColor: colors.glassBorder }],
        tabBarActiveTintColor: '#e67e22',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarIcon: ({ color, size }) => {
          let IconComponent;
          if (route.name === 'Home') IconComponent = Home;
          else if (route.name === 'Market') IconComponent = ShoppingBag;
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
        name="Messages" 
        component={MessagesStack} 
        options={{ 
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
          tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 10 }
        }}
      />
      <Tab.Screen 
        name="Me" 
        component={user?.role === 'SELLER' ? SellerDashboardDrawer : BuyerDashboardDrawer} 
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

  const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes

  const resetTimer = React.useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (!user) return; // Only track logged-in users

    inactivityTimer.current = setTimeout(() => {
      logout();
    }, INACTIVITY_LIMIT);
  }, [user, logout]);

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
          if (elapsed >= INACTIVITY_LIMIT) {
            logout();
          }
        }
        resetTimer();
      } else if (nextAppState.match(/inactive|background/)) {
        backgroundTime.current = Date.now();
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [user, resetTimer, logout]);

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
        resetTimer();
        return false; 
      }}
      onPanResponderCapture={() => {
        resetTimer();
        return false;
      }}
    >
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainApp" component={AppTabs} />
          <Stack.Screen name="Auth" component={AuthStack} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
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
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#030712',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
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
