import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useAppSecurity } from '../../context/SecurityContext';
import { useAuth } from '../../context/AuthContext';
import { rootNavigationRef } from '../../context/NavigationRefContext';
import PINEntryScreen from './PINEntryScreen';
import PatternEntryScreen from './PatternEntryScreen';
import FingerprintScreen from './FingerprintScreen';

const AppLockOverlay = ({ visible, onUnlock }) => {
  const { colors } = useTheme();
  const { securitySettings, verifyPin, verifyPattern, verifyFingerprint, unlockApp, notifyCredentialLogin } = useAppSecurity();
  const { logout, login } = useAuth();
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [locked, setLocked] = useState(true);
  // Snapshot the method when the overlay first opens — prevents a mid-load
  // re-render where securitySettings.method becomes null and closes the screen
  const [lockedMethod, setLockedMethod] = useState(null);
  // When user taps "Use Fingerprint" from PIN screen, switch to fingerprint view
  const [showFingerprint, setShowFingerprint] = useState(false);

  const handleUnlockSuccess = async () => {
    // Unlock the app UI immediately
    unlockApp();
    setLocked(false);
    setShowFingerprint(false);
    
    // Check if this is a device lock session and restore auth if needed AFTER unlocking
    // This prevents double unlock prompts
    try {
      const deviceSecurity = await AsyncStorage.getItem('@device_security_enabled');
      if (deviceSecurity) {
        const parsed = JSON.parse(deviceSecurity);
        if (parsed.authToken && parsed.userData) {
          // Signal to SecurityContext that the upcoming login() call should NOT re-lock the app
          notifyCredentialLogin();
          // Restore auth session with stored token and user data
          await login({ token: parsed.authToken, user: parsed.userData });
          console.log('[AppLockOverlay] Auth session restored successfully');
        }
      }
    } catch (err) {
      console.warn('[AppLockOverlay] Error restoring auth session:', err);
    }
    
    if (onUnlock) onUnlock();
  };

  const handlePINVerify = async (pin) => {
    const success = await verifyPin(pin);
    if (success) {
      handleUnlockSuccess();
    } else {
      setFailedAttempts((prev) => prev + 1);
    }
    return success;
  };

  const handlePatternVerify = async (pattern) => {
    const success = await verifyPattern(pattern);
    if (success) {
      handleUnlockSuccess();
    } else {
      setFailedAttempts((prev) => prev + 1);
    }
    return success;
  };

  const handleFingerprintVerify = async () => {
    const success = await verifyFingerprint();
    if (success) {
      handleUnlockSuccess();
    } else {
      setFailedAttempts((prev) => prev + 1);
    }
    return success;
  };

  const handleUsePasswordInstead = useCallback(async () => {
    unlockApp();
    await logout(true);

    const navigateToLogin = () => {
      const nav = rootNavigationRef.current;
      if (!nav?.reset) return false;

      try {
        nav.reset({
          index: 0,
          routes: [{ name: 'Auth', state: { index: 0, routes: [{ name: 'Login' }] } }],
        });
        return true;
      } catch (err) {
        try {
          nav.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
          return true;
        } catch {
          console.warn('[AppLockOverlay] Failed to navigate to Login:', err?.message);
          return false;
        }
      }
    };

    if (!navigateToLogin()) {
      setTimeout(navigateToLogin, 100);
    }
  }, [unlockApp, logout]);

  const handleBackPress = useCallback(async () => {
    unlockApp();
    await logout(true);

    const navigateToHome = () => {
      const nav = rootNavigationRef.current;
      if (!nav?.reset) return false;

      try {
        nav.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: { screen: 'Home' } }],
        });
        return true;
      } catch (err) {
        try {
          nav.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
          return true;
        } catch {
          return false;
        }
      }
    };

    if (!navigateToHome()) {
      setTimeout(navigateToHome, 100);
    }
  }, [unlockApp, logout]);

  useEffect(() => {
    if (visible) {
      setFailedAttempts(0);
      setLocked(true);
      setShowFingerprint(false);
      // Snapshot the method at the moment the overlay opens.
      // We use this snapshot for rendering so a background reload of settings
      // cannot make the method transiently null and close the unlock screen.
      if (securitySettings.method) {
        setLockedMethod(securitySettings.method);
      }
    }
  }, [visible]);

  // Also update lockedMethod if settings load while overlay is already open
  // (handles the case where settings load asynchronously after overlay appears)
  useEffect(() => {
    if (visible && locked && securitySettings.method && !lockedMethod) {
      setLockedMethod(securitySettings.method);
    }
  }, [visible, locked, securitySettings.method, lockedMethod]);

  if (!visible) return null;

  // Use the snapshotted method for rendering — this prevents a race where
  // a background loadSecuritySettings sets method to null mid-unlock
  const activeMethod = lockedMethod || securitySettings.method;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      hardwareAccelerated={false}
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {locked && (
          <>
            {/* Fingerprint mode (primary) or user switched from PIN */}
            {(activeMethod === 'fingerprint' || showFingerprint) && (
              <FingerprintScreen
                onSuccess={handleFingerprintVerify}
                onUsePasswordPress={handleUsePasswordInstead}
                onBackPress={handleBackPress}
              />
            )}

            {/* PIN mode */}
            {activeMethod === 'pin' && !showFingerprint && (
              <PINEntryScreen
                onSuccess={handlePINVerify}
                method="pin"
                onFingerprintPress={() => setShowFingerprint(true)}
                onUsePasswordPress={handleUsePasswordInstead}
                onBackPress={handleBackPress}
              />
            )}

            {/* Pattern mode */}
            {activeMethod === 'pattern' && !showFingerprint && (
              <PatternEntryScreen
                onSuccess={handlePatternVerify}
                onUsePasswordPress={handleUsePasswordInstead}
                onBackPress={handleBackPress}
              />
            )}
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AppLockOverlay;
