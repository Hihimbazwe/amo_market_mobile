import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { Fingerprint, Lock } from 'lucide-react-native';

const FingerprintScreen = ({ onSuccess, onSetupComplete, isSetup = false, onCancel, onUsePasswordPress }) => {
  const { colors } = useTheme();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const authenticate = async () => {
    if (loading) return false;
    setLoading(true);
    setError('');

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        setError('Fingerprint is not available on this device.');
        setLoading(false);
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: isSetup ? 'Confirm fingerprint to enable app lock' : 'Authenticate to continue',
      });

      if (result.success) {
        if (isSetup && onSetupComplete) {
          onSetupComplete();
        } else if (onSuccess) {
          const success = await onSuccess();
          if (success === false) {
            setError('Verification failed. Try again.');
            setLoading(false);
            return false;
          }
        }
        setLoading(false);
        return true;
      }

      setError('Authentication failed. Try again.');
      setLoading(false);
      return false;
    } catch (err) {
      setError('Fingerprint authentication failed.');
      setLoading(false);
      return false;
    }
  };

  useEffect(() => {
    if (!isSetup) {
      authenticate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSetup]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
          {isSetup ? (
            <Fingerprint color={colors.primary} size={48} />
          ) : (
            <Lock color={colors.primary} size={48} />
          )}
        </View>

        <CustomText variant="h2" style={[styles.title, { color: colors.foreground }]}>
          {isSetup ? 'Enable Fingerprint Lock' : 'Fingerprint Required'}
        </CustomText>
        <CustomText style={[styles.subtitle, { color: colors.muted }]}>
          {isSetup
            ? 'Confirm your fingerprint to save this lock method.'
            : 'Use your fingerprint to verify and continue.'}
        </CustomText>

        {!!error && (
          <CustomText style={[styles.error, { color: '#ef4444' }]}>{error}</CustomText>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={authenticate}
          disabled={loading}
        >
          <CustomText style={styles.buttonText}>
            {loading ? 'Waiting...' : isSetup ? 'Confirm Fingerprint' : 'Try Again'}
          </CustomText>
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <CustomText style={{ color: colors.muted, fontWeight: '600' }}>Cancel</CustomText>
          </TouchableOpacity>
        )}

        {!isSetup && onUsePasswordPress && (
          <TouchableOpacity style={styles.usePasswordButton} onPress={onUsePasswordPress}>
            <CustomText style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
              Use password instead
            </CustomText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  error: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 13,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
  },
  usePasswordButton: {
    marginTop: 16,
    padding: 12,
  },
});

export default FingerprintScreen;
