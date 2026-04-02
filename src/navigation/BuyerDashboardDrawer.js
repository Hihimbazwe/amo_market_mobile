import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions, TouchableWithoutFeedback, Image, Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import CustomText from '../components/CustomText';
import { Colors } from '../theme/colors';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { 
  Home, 
  ShoppingBag, 
  User, 
  Heart, 
  Wallet, 
  Settings, 
  AlertCircle, 
  RefreshCcw,
  LogOut,
  X
} from 'lucide-react-native';

import BuyerOverviewScreen from '../screens/buyer/BuyerOverviewScreen';
import BuyerOrdersScreen from '../screens/buyer/BuyerOrdersScreen';
import BuyerProfileScreen from '../screens/buyer/BuyerProfileScreen';
import BuyerWishlistScreen from '../screens/buyer/BuyerWishlistScreen';
import BuyerWalletScreen from '../screens/buyer/BuyerWalletScreen';
import BuyerDisputesScreen from '../screens/buyer/BuyerDisputesScreen';
import BuyerReplacementsScreen from '../screens/buyer/BuyerReplacementsScreen';
import BuyerSettingsScreen from '../screens/buyer/BuyerSettingsScreen';

const Stack = createNativeStackNavigator();
const { width } = Dimensions.get('window');

// A custom Context to allow any screen inside the stack to toggle the drawer
import { BuyerDrawerContext } from '../context/BuyerDrawerContext';

const CustomDrawer = ({ visible, onClose, navigation }) => {
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
    { name: 'Dashboard', icon: Home },
    { name: 'Orders', icon: ShoppingBag },
    { name: 'Profile', icon: User },
    { name: 'Wishlist', icon: Heart },
    { name: 'Wallet', icon: Wallet },
    { name: 'Disputes', icon: AlertCircle },
    { name: 'Replacements', icon: RefreshCcw },
    { name: 'Settings', icon: Settings },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
        </TouchableWithoutFeedback>
        
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.drawerHeader}>
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
                >AMO Market</SvgText>
              </Svg>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={Colors.muted} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.drawerItems}>
            {routes.map((route) => {
              const IconComponent = route.icon;
              return (
                <TouchableOpacity
                  key={route.name}
                  style={styles.drawerItem}
                  onPress={() => {
                    onClose();
                    // Navigate to the inner screen of the 'Me' Tab Stack
                    navigation.navigate('Me', { screen: route.name });
                  }}
                >
                  <IconComponent color={Colors.muted} size={20} />
                  <CustomText style={styles.drawerItemText}>{route.name}</CustomText>
                </TouchableOpacity>
              );
            })}
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
            style={styles.logoutButton}
          >
            <LogOut color={Colors.white} size={20} />
            <CustomText style={{ color: Colors.white, marginLeft: 12, fontWeight: 'bold' }}>Sign Out</CustomText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function BuyerDashboard({ navigation }) {
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <BuyerDrawerContext.Provider value={{ toggleDrawer: () => setDrawerVisible(!drawerVisible) }}>
      <View style={{ flex: 1 }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Dashboard" component={BuyerOverviewScreen} />
          <Stack.Screen name="Orders" component={BuyerOrdersScreen} />
          <Stack.Screen name="Profile" component={BuyerProfileScreen} />
          <Stack.Screen name="Wishlist" component={BuyerWishlistScreen} />
          <Stack.Screen name="Wallet" component={BuyerWalletScreen} />
          <Stack.Screen name="Disputes" component={BuyerDisputesScreen} />
          <Stack.Screen name="Replacements" component={BuyerReplacementsScreen} />
          <Stack.Screen name="Settings" component={BuyerSettingsScreen} />
        </Stack.Navigator>
        
        <CustomDrawer 
          visible={drawerVisible} 
          onClose={() => setDrawerVisible(false)} 
          // Custom navigation object to handle routes inside the Stack overlay
          navigation={navigation.navigate ? navigation : { navigate: () => {} }}
        />
      </View>
    </BuyerDrawerContext.Provider>
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
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
