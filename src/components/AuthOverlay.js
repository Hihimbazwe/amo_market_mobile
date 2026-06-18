import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomText from './CustomText';
import { LogIn, Lock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAppSecurity } from '../context/SecurityContext';

const { width } = Dimensions.get('window');

const AuthOverlay = ({ currentRoute }) => {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const { securitySettings, loadDeviceSecurityAndLock } = useAppSecurity();
  const [deviceSecurityEnabled, setDeviceSecurityEnabled] = useState(false);
  const [securityMethod, setSecurityMethod] = useState(null);

  // Load device-wide security settings when logged out
  useEffect(() => {
    const loadDeviceSecurity = async () => {
      if (isAuthenticated) {
        // Use securitySettings from context when authenticated
        setDeviceSecurityEnabled(!!securitySettings?.enabled);
        setSecurityMethod(securitySettings?.method);
        return;
      }

      try {
        const stored = await AsyncStorage.getItem('@device_security_enabled');
        if (stored) {
          const parsed = JSON.parse(stored);
          setDeviceSecurityEnabled(parsed.enabled);
          setSecurityMethod(parsed.method);
        }
      } catch (err) {
        console.warn('[AuthOverlay] Error loading device security settings:', err);
      }
    };
    loadDeviceSecurity();
  }, [isAuthenticated, securitySettings]);

  if (isAuthenticated) return null;

  if (['Login', 'Register', 'VerifyOTP', 'ForgotPassword', 'ResetPassword'].includes(currentRoute)) {
    return null;
  }

  const handlePress = async () => {
    if (deviceSecurityEnabled && securityMethod) {
      // Load device security settings and lock app
      const success = await loadDeviceSecurityAndLock();
      if (success) {
        // AppLockOverlay will show the appropriate lock screen
        // After successful unlock, auth session will be restored and user will be logged in
        // No navigation needed - the overlay is already rendered
      } else {
        // Fallback to regular login if device security loading fails
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.glass}>
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <CustomText style={styles.title}>
              {deviceSecurityEnabled ? 'Unlock to continue' : 'Sign in and enjoy more'}
            </CustomText>
            <CustomText style={styles.subtitle}>
              {deviceSecurityEnabled ? 'Use your security method to unlock' : 'Unlock exclusive deals and features'}
            </CustomText>
          </View>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={handlePress}
          >
            {deviceSecurityEnabled ? <Lock size={18} color="#ffffff" /> : <LogIn size={18} color="#ffffff" />}
            <CustomText style={styles.signInText}>
              {deviceSecurityEnabled ? 'Unlock' : 'Sign In'}
            </CustomText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 72,
    width: width,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 1000,
  },
  glass: {
    backgroundColor: 'rgba(3, 7, 18, 0.8)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    overflow: 'hidden',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  signInButton: {
    backgroundColor: '#e67e22',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  signInText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default AuthOverlay;