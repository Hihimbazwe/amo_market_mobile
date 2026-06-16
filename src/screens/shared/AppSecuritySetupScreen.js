import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { Lock, Fingerprint, Grid3x3, Keyboard } from 'lucide-react-native';
import PINEntryScreen from './PINEntryScreen';
import PatternEntryScreen from './PatternEntryScreen';
import FingerprintScreen from './FingerprintScreen';

const AppSecuritySetupScreen = ({ onComplete, onCancel }) => {
  const { colors } = useTheme();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showSetup, setShowSetup] = useState(false);

  const methods = [
    {
      id: 'pin',
      name: 'PIN',
      description: 'Use a 6-digit PIN',
      icon: Keyboard,
      color: '#3b82f6',
    },
    {
      id: 'pattern',
      name: 'Pattern',
      description: 'Draw a pattern with dots',
      icon: Grid3x3,
      color: '#8b5cf6',
    },
    {
      id: 'fingerprint',
      name: 'Fingerprint',
      description: 'Use your fingerprint',
      icon: Fingerprint,
      color: '#ec4899',
    },
  ];

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setShowSetup(true);
  };

  const handlePINSetup = (enteredPin) => {
    Alert.alert('Success', 'PIN setup complete!', [
      {
        text: 'OK',
        onPress: () => {
          if (onComplete) {
            onComplete({ method: 'pin', pin: enteredPin });
          }
          setShowSetup(false);
          setSelectedMethod(null);
        },
      },
    ]);
  };

  const handlePatternSetup = (enteredPattern) => {
    Alert.alert('Success', 'Pattern setup complete!', [
      {
        text: 'OK',
        onPress: () => {
          if (onComplete) {
            onComplete({ method: 'pattern', pattern: enteredPattern });
          }
          setShowSetup(false);
          setSelectedMethod(null);
        },
      },
    ]);
  };

  const handleFingerprintSetup = () => {
    Alert.alert('Success', 'Fingerprint setup complete!', [
      {
        text: 'OK',
        onPress: () => {
          if (onComplete) {
            onComplete({ method: 'fingerprint', fingerprint: true });
          }
          setShowSetup(false);
          setSelectedMethod(null);
        },
      },
    ]);
  };

  if (showSetup && selectedMethod) {
    if (selectedMethod === 'pin') {
      return (
        <PINEntryScreen
          isSetup={true}
          onSetupComplete={handlePINSetup}
          onSetupMethod={() => {
            setShowSetup(false);
          }}
        />
      );
    } else if (selectedMethod === 'pattern') {
      return (
        <PatternEntryScreen
          isSetup={true}
          onSetupComplete={handlePatternSetup}
        />
      );
    } else if (selectedMethod === 'fingerprint') {
      return (
        <FingerprintScreen
          isSetup={true}
          onSetupComplete={handleFingerprintSetup}
        />
      );
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Lock size={44} color={colors.primary} style={{ marginBottom: 12 }} />
          <CustomText variant="h2" style={{ textAlign: 'center', marginBottom: 4 }}>
            Secure Your App
          </CustomText>
          <CustomText style={{ color: colors.muted, textAlign: 'center', fontSize: 13 }}>
            Choose a security method to protect your app
          </CustomText>
        </View>

        <View style={styles.methodsGrid}>
          {methods.map((method) => {
            const Icon = method.icon;
            return (
              <TouchableOpacity
                key={method.id}
                style={[styles.methodCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleMethodSelect(method.id)}
              >
                <Icon size={40} color={method.color} style={{ marginBottom: 12 }} />
                <CustomText style={[styles.methodName, { color: colors.foreground }]}>
                  {method.name}
                </CustomText>
                <CustomText style={[styles.methodDesc, { color: colors.muted }]}>
                  {method.description}
                </CustomText>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.infoBox}>
          <CustomText style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
            💡 <CustomText style={{ fontWeight: '600', color: colors.foreground }}>Tip:</CustomText> Once enabled, you'll need to unlock the app every time you open it after locking your device.
          </CustomText>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={onCancel}
        >
          <CustomText style={{ color: colors.foreground, fontWeight: '700' }}>Cancel</CustomText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  methodCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  methodDesc: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  infoBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  buttonContainer: {
    marginTop: 16,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});

export default AppSecuritySetupScreen;
