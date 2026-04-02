import 'react-native-gesture-handler';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Home, ShoppingBag, ShoppingCart, User } from 'lucide-react-native';
import HomeScreen from './src/screens/HomeScreen';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyOTPScreen from './src/screens/VerifyOTPScreen';
import { Colors } from './src/theme/colors';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { CartProvider, useCart } from './src/context/CartContext';
import CustomText from './src/components/CustomText';
import BuyerDashboardDrawer from './src/navigation/BuyerDashboardDrawer';
import SellerDashboardDrawer from './src/navigation/SellerDashboardDrawer';
import { Loader2 } from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
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
  </Stack.Navigator>
);

const CartStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CartMain" component={CartScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
  </Stack.Navigator>
);

const LoadingScreen = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: colors.background }]}>
      <Loader2 color={colors.primary} size={48} style={{ marginBottom: 16 }} />
      <CustomText variant="h2">AMO Market</CustomText>
    </View>
  );
};

const RootNavigator = () => {
  const { loading, user } = useAuth();
  const { cartCount } = useCart();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName={user?.role === 'SELLER' ? 'Me' : 'Home'}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.muted,
          tabBarIcon: ({ color, size }) => {
            let IconComponent;
            if (route.name === 'Home') IconComponent = Home;
            else if (route.name === 'Market') IconComponent = ShoppingBag;
            else if (route.name === 'Cart') IconComponent = ShoppingCart;
            else if (route.name === 'Me') IconComponent = User;
            
            return (
              <View>
                <IconComponent color={color} size={size} />
                {route.name === 'Cart' && cartCount > 0 && (
                  <View style={styles.badge}>
                    <CustomText style={styles.badgeText}>{cartCount}</CustomText>
                  </View>
                )}
              </View>
            );
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Market" component={MarketplaceStack} />
        <Tab.Screen name="Cart" component={CartStack} />
        <Tab.Screen 
          name="Me" 
          component={user?.role === 'SELLER' ? SellerDashboardDrawer : BuyerDashboardDrawer} 
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <CartProvider>
            <SafeAreaProvider>
              <RootNavigator />
            </SafeAreaProvider>
          </CartProvider>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
  },
  placeholder: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  }
});
