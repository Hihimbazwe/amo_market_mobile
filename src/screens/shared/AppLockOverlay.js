import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAppSecurity } from '../../context/SecurityContext';
import { useAuth } from '../../context/AuthContext';
import { rootNavigationRef } from '../../context/NavigationRefContext';
import PINEntryScreen from './PINEntryScreen';
import PatternEntryScreen from './PatternEntryScreen';
import FingerprintScreen from './FingerprintScreen';

const AppLockOverlay = ({ visible, onUnlock }) => {
  const { colors } = useTheme();
  const { securitySettings, verifyPin, verifyPattern, verifyFingerprint, unlockApp } = useAppSecurity();
  const { logout } = useAuth();
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [locked, setLocked] = useState(true);
  // When user taps "Use Fingerprint" from PIN screen, switch to fingerprint view
  const [showFingerprint, setShowFingerprint] = useState(false);

  const handleUnlockSuccess = () => {
    unlockApp();
    setLocked(false);
    setShowFingerprint(false);
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

  useEffect(() => {
    if (visible) {
      setFailedAttempts(0);
      setLocked(true);
      setShowFingerprint(false);
    }
  }, [visible]);

  if (!visible) return null;

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
            {(securitySettings.method === 'fingerprint' || showFingerprint) && (
              <FingerprintScreen
                onSuccess={handleFingerprintVerify}
                onUsePasswordPress={handleUsePasswordInstead}
              />
            )}

            {/* PIN mode */}
            {securitySettings.method === 'pin' && !showFingerprint && (
              <PINEntryScreen
                onSuccess={handlePINVerify}
                method="pin"
                onFingerprintPress={() => setShowFingerprint(true)}
                onUsePasswordPress={handleUsePasswordInstead}
              />
            )}

            {/* Pattern mode */}
            {securitySettings.method === 'pattern' && !showFingerprint && (
              <PatternEntryScreen
                onSuccess={handlePatternVerify}
                onUsePasswordPress={handleUsePasswordInstead}
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
