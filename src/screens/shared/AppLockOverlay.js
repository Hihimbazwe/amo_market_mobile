import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAppSecurity } from '../../context/SecurityContext';
import PINEntryScreen from './PINEntryScreen';
import PatternEntryScreen from './PatternEntryScreen';
import FingerprintScreen from './FingerprintScreen';

const AppLockOverlay = ({ visible, onUnlock }) => {
  const { colors } = useTheme();
  const { securitySettings, verifyPin, verifyPattern, verifyFingerprint, unlockApp } = useAppSecurity();
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
              />
            )}

            {/* PIN mode */}
            {securitySettings.method === 'pin' && !showFingerprint && (
              <PINEntryScreen
                onSuccess={handlePINVerify}
                method="pin"
                onFingerprintPress={() => setShowFingerprint(true)}
              />
            )}

            {/* Pattern mode */}
            {securitySettings.method === 'pattern' && !showFingerprint && (
              <PatternEntryScreen
                onSuccess={handlePatternVerify}
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
