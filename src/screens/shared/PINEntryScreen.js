import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { Lock, Fingerprint } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { NavigationRefContext } from '../../context/NavigationRefContext';

const { width, height } = Dimensions.get('window');

const PINEntryScreen = ({ onSuccess, onSetupComplete, method = 'pin', isSetup = false, onFingerprintPress, onCancel, onUsePasswordPress }) => {
  const { colors } = useTheme();
  const navigationRef = useContext(NavigationRefContext);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(isSetup ? 'enter' : 'verify'); // 'enter', 'confirm', 'verify'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fingerprintAvailable, setFingerprintAvailable] = useState(false);

  const PIN_LENGTH = 6;

  // Check fingerprint availability on mount – only show the button if device is enrolled
  useEffect(() => {
    if (!isSetup) {
      checkFingerprint();
    }
  }, [isSetup]);

  const checkFingerprint = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setFingerprintAvailable(hasHardware && enrolled);
    } catch {
      setFingerprintAvailable(false);
    }
  };

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (step === 'verify' && pin.length === PIN_LENGTH) {
      handleNext();
    } else if (isSetup && step === 'enter' && pin.length === PIN_LENGTH) {
      handleNext();
    } else if (isSetup && step === 'confirm' && confirmPin.length === PIN_LENGTH) {
      handleNext();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, confirmPin, step]);

  const handleNumberPress = (num) => {
    const currentStep = step;
    if (currentStep === 'enter' && pin.length < PIN_LENGTH) {
      setPin(pin + num);
      setError('');
    } else if (currentStep === 'confirm' && confirmPin.length < PIN_LENGTH) {
      setConfirmPin(confirmPin + num);
      setError('');
    } else if (currentStep === 'verify' && pin.length < PIN_LENGTH) {
      setPin(pin + num);
      setError('');
    }
  };

  const handleBackspace = () => {
    if (step === 'enter') {
      setPin(pin.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin(confirmPin.slice(0, -1));
    } else if (step === 'verify') {
      setPin(pin.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (step === 'enter') {
      setPin('');
    } else if (step === 'confirm') {
      setConfirmPin('');
    } else if (step === 'verify') {
      setPin('');
    }
  };

  const handleNext = async () => {
    if (isSetup) {
      if (step === 'enter') {
        if (pin.length !== PIN_LENGTH) {
          setError('PIN must be 6 digits');
          return;
        }
        setFirstPin(pin);
        setStep('confirm');
        setPin('');
        setError('');
      } else if (step === 'confirm') {
        if (confirmPin.length !== PIN_LENGTH) {
          setError('PIN must be 6 digits');
          return;
        }
        if (firstPin !== confirmPin) {
          setError('PINs do not match. Start over.');
          setPin('');
          setFirstPin('');
          setConfirmPin('');
          setStep('enter');
          return;
        }
        // Call setup completion with the confirmed PIN
        if (onSetupComplete) {
          onSetupComplete(confirmPin);
        }
      }
    } else {
      if (pin.length !== PIN_LENGTH) {
        setError('PIN must be 6 digits');
        return;
      }
      setLoading(true);
      if (onSuccess) {
        const success = await onSuccess(pin);
        if (success) {
          setPin('');
          setError('');
        } else {
          setError('Incorrect PIN. Try again.');
          setPin('');
        }
      }
      setLoading(false);
    }
  };

  const handleFingerprintPress = async () => {
    if (onFingerprintPress) {
      onFingerprintPress();
    }
  };

  const renderPin = () => {
    const currentPin = step === 'confirm' ? confirmPin : pin;
    return (
      <View style={[styles.pinDisplay, isSetup && { gap: 12, marginBottom: 4 }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.pinDot,
              {
                backgroundColor: i < currentPin.length ? colors.primary : 'transparent',
                borderColor: i < currentPin.length ? colors.primary : colors.muted,
              },
              isSetup && { width: 14, height: 14, borderRadius: 7 }
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNumpad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['back', '0', 'clear'],
    ];

    return (
      <View style={styles.numpad}>
        {numbers.map((row, rowIdx) => (
          <View key={rowIdx} style={[styles.numpadRow, isSetup && { gap: 16, marginBottom: 10 }]}>
            {row.map((num) => {
              return (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.numpadBtn,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    (num === 'back' || num === 'clear') && { backgroundColor: 'transparent', borderColor: 'transparent' },
                    isSetup && { width: 60, height: 60, borderRadius: 30 },
                  ]}
                  onPress={() => {
                    if (num === 'back') {
                      handleBackspace();
                    } else if (num === 'clear') {
                      handleClear();
                    } else {
                      handleNumberPress(num);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <CustomText style={[
                    styles.numpadText,
                    { color: (num === 'back' || num === 'clear') ? colors.primary : colors.foreground },
                    num === 'clear' && { fontSize: 16, fontWeight: '700' },
                    isSetup && { fontSize: 22 },
                    isSetup && num === 'clear' && { fontSize: 14 },
                  ]}>
                    {num === 'back' ? '←' : num === 'clear' ? 'Clear' : num}
                  </CustomText>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, isSetup && { paddingVertical: 12 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={[styles.header, isSetup && { marginBottom: 12 }]}>
            <Lock size={isSetup ? 40 : 52} color={colors.primary} style={{ marginBottom: isSetup ? 8 : 14 }} />
            <CustomText variant="h2" style={[styles.title, isSetup && { fontSize: 20 }]}>
              {isSetup ? (step === 'enter' ? 'Set Your PIN' : 'Confirm PIN') : 'Enter PIN'}
            </CustomText>
            <CustomText style={[styles.subtitle, { color: colors.muted }, isSetup && { fontSize: 13, lineHeight: 18 }]}>
              {isSetup
                ? step === 'enter'
                  ? 'Create a 6-digit PIN to secure your app'
                  : 'Enter the same PIN again to confirm'
                : 'Unlock your app with your PIN'}
            </CustomText>
          </View>

          {/* PIN dots */}
          {renderPin()}

          {/* Error message */}
          {error ? (
            <CustomText style={styles.errorText}>{error}</CustomText>
          ) : (
            <View style={{ height: 24 }} />
          )}

          {/* Numpad */}
          {renderNumpad()}

          {/* Loading indicator shown during verification */}
          {loading && (
            <View style={styles.loadingRow}>
              <CustomText style={[styles.loadingText, { color: colors.primary }]}>Verifying…</CustomText>
            </View>
          )}

          {/* Fingerprint button — only in unlock mode and only if device is enrolled */}
          {!isSetup && fingerprintAvailable && (
            <TouchableOpacity
              style={[styles.fingerprintBtn, { borderColor: colors.primary + '55' }]}
              onPress={handleFingerprintPress}
              activeOpacity={0.8}
            >
              <Fingerprint size={22} color={colors.primary} />
              <CustomText style={[styles.fingerprintText, { color: colors.primary }]}>
                Use Fingerprint
              </CustomText>
            </TouchableOpacity>
          )}

          {/* Cancel button for verification mode */}
          {!isSetup && onCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <CustomText style={[styles.cancelButtonText, { color: colors.muted }]}>
                Cancel
              </CustomText>
            </TouchableOpacity>
          )}

          {/* Use password instead link */}
          {!isSetup && (
            <TouchableOpacity
              style={styles.usePasswordButton}
              onPress={() => {
                if (onUsePasswordPress) {
                  onUsePasswordPress();
                  return;
                }
                if (navigationRef?.current) {
                  navigationRef.current.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                }
              }}
            >
              <CustomText style={[styles.usePasswordButtonText, { color: colors.primary }]}>
                Use password instead
              </CustomText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    textAlign: 'center',
    marginBottom: 6,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 8,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 14,
    height: 24,
  },
  numpad: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  numpadBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  numpadPlaceholder: {
    width: 74,
    height: 74,
  },
  numpadText: {
    fontSize: 26,
    fontWeight: '600',
  },
  loadingRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    height: 40,
    justifyContent: 'center',
  },
  loadingText: {
    fontWeight: '700',
    fontSize: 15,
  },
  fingerprintBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 32,
    borderWidth: 1.5,
    gap: 8,
  },
  fingerprintText: {
    fontWeight: '600',
    fontSize: 15,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  usePasswordButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  usePasswordButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PINEntryScreen;
