import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { Fingerprint } from 'lucide-react-native';

const FingerprintScreen = ({ onSuccess, isSetup = false, onSetupComplete }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(!isSetup);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
    if (!isSetup) {
      automaticallyAuthenticate();
    }
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setSupported(compatible && enrolled);

      if (!compatible) {
        setError('Fingerprint not supported on this device');
      } else if (!enrolled) {
        setError('No fingerprint enrolled. Please enroll in device settings.');
      }
    } catch (err) {
      setError('Error checking biometric support');
    }
  };

  const automaticallyAuthenticate = async () => {
    try {
      setLoading(true);
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: 'Authenticate to unlock your app',
      });

      if (result.success) {
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError('Authentication failed');
      }
    } catch (err) {
      setError('Fingerprint authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        Alert.alert('Not Supported', 'Fingerprint authentication is not supported on this device.');
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('No Fingerprint Enrolled', 'Please register at least one fingerprint in your device settings.');
        return;
      }

      setLoading(true);
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: true,
        reason: 'Scan your fingerprint to confirm and enable lock setup',
      });

      if (result.success) {
        if (isSetup && onSetupComplete) {
          onSetupComplete(true);
        }
      } else {
        Alert.alert('Verification Failed', 'Fingerprint authentication failed. Please try again.');
      }
    } catch (err) {
      console.warn('[FingerprintScreen] Setup error:', err);
      Alert.alert('Error', 'An error occurred during fingerprint verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 20 }} />
          ) : (
            <Fingerprint size={60} color={colors.primary} style={{ marginBottom: 20 }} />
          )}

          <CustomText variant="h2" style={{ textAlign: 'center', marginBottom: 8 }}>
            {isSetup ? 'Enable Fingerprint' : 'Fingerprint Required'}
          </CustomText>

          <CustomText style={{ color: colors.muted, textAlign: 'center', fontSize: 13 }}>
            {isSetup ? 'Use your fingerprint to unlock the app' : 'Place your finger on the sensor'}
          </CustomText>
        </View>

        {error ? (
          <TouchableOpacity
            style={{ backgroundColor: '#EF4444', padding: 12, borderRadius: 10, marginBottom: 20 }}
          >
            <CustomText style={{ color: '#fff', textAlign: 'center', fontSize: 12 }}>
              {error}
            </CustomText>
          </TouchableOpacity>
        ) : null}

        {!isSetup && !loading && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, marginBottom: 8 }]}
            onPress={automaticallyAuthenticate}
          >
            <CustomText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              Try Again
            </CustomText>
          </TouchableOpacity>
        )}

        {isSetup && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, marginBottom: 12 }]}
            onPress={handleSetup}
          >
            <CustomText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              Enable Fingerprint
            </CustomText>
          </TouchableOpacity>
        )}

        {!supported && (
          <CustomText style={{ color: colors.muted, textAlign: 'center', fontSize: 12, marginTop: 16 }}>
            Fingerprint is not available on your device. Please choose PIN or Pattern instead.
          </CustomText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});

export default FingerprintScreen;
