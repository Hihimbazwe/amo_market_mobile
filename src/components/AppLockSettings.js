import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Switch, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Keyboard, Grid3x3, Fingerprint, Lock, RefreshCw, Shuffle, Settings2 } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import CustomText from './CustomText';
import { useTheme } from '../context/ThemeContext';
import { useAppSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import PINEntryScreen from '../screens/shared/PINEntryScreen';
import PatternEntryScreen from '../screens/shared/PatternEntryScreen';
import FingerprintScreen from '../screens/shared/FingerprintScreen';

const AppLockSettings = ({ t }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    securitySettings,
    enableSecurity,
    disableSecurity,
    switchActiveMethod,
    updateMethod,
    reEnableSecurity,
    configureAndActivateMethod,
    verifyCurrentCredential,
  } = useAppSecurity();

  const [fingerprintAvailable, setFingerprintAvailable] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState(null);
  const [setupMethod, setSetupMethod] = useState(null);
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [updateMode, setUpdateMode] = useState(false);
  const [showManageMethods, setShowManageMethods] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        setFingerprintAvailable(hasHardware);
      } catch {
        setFingerprintAvailable(false);
      }
    })();
  }, []);

  const currentMethod = securitySettings.method;
  const isEnabled = securitySettings.enabled;
  const configuredMethods = securitySettings.configuredMethods || {};

  const getMethodInfo = (method) => {
    switch (method) {
      case 'pin':
        return { icon: Keyboard, title: 'PIN Lock', subtitle: '6-digit PIN', color: '#3b82f6' };
      case 'pattern':
        return { icon: Grid3x3, title: 'Pattern Lock', subtitle: 'Draw to unlock', color: '#8b5cf6' };
      case 'fingerprint':
        return { icon: Fingerprint, title: 'Fingerprint Lock', subtitle: 'Biometric unlock', color: '#ec4899' };
      default:
        return null;
    }
  };

  const verifyAndExecute = useCallback((action) => {
    if (currentMethod && currentMethod !== 'fingerprint') {
      setVerifyMethod(currentMethod);
      setPendingAction(() => action);
    } else {
      action();
    }
  }, [currentMethod]);

  // Toggle ON -> open method selector. Toggle OFF -> disable immediately, no verification.
  const handleMainToggle = useCallback(async (newValue) => {
    if (newValue) {
      setShowMethodSelector(true);
      return;
    }

    const success = await disableSecurity();
    if (success) {
      Alert.alert(
        'App Lock Disabled',
        'App lock has been disabled. Your configured methods are still saved and can be re-enabled later.'
      );
    } else {
      Alert.alert('Error', 'Failed to disable app lock.');
    }
  }, [disableSecurity]);

  // Update Lock card — PIN/Pattern require current credential verification first. Fingerprint explains device management.
  const handleUpdateMethod = useCallback(() => {
    if (!currentMethod) return;

    if (currentMethod === 'fingerprint') {
      Alert.alert(
        'Managed by Device',
        'Fingerprint settings are managed in your device settings. Switch to PIN or Pattern if you want to update your lock here.'
      );
      return;
    }

    verifyAndExecute(() => {
      setSetupMethod(currentMethod);
      setUpdateMode(true);
    });
  }, [currentMethod, verifyAndExecute]);

  // Change Method card — require current credential verification first.
  const handleChangeMethod = useCallback(() => {
    verifyAndExecute(() => setShowMethodSelector(true));
  }, [verifyAndExecute]);

  // Manage Methods card — require current credential verification first.
  const handleManageMethods = useCallback(() => {
    verifyAndExecute(() => setShowManageMethods(true));
  }, [verifyAndExecute]);

  const handleSwitchToMethod = useCallback(async (method) => {
    setShowMethodSelector(false);

    if (!isEnabled) {
      if (configuredMethods[method]) {
        const success = await reEnableSecurity(method);
        if (success) {
          Alert.alert(t?.('success') || 'Success', `${getMethodInfo(method)?.title} enabled.`);
        } else {
          Alert.alert(t?.('error') || 'Error', 'Failed to enable app lock.');
        }
      } else {
        setSetupMethod(method);
        setUpdateMode(false);
      }
      return;
    }

    if (configuredMethods[method]) {
      const success = await switchActiveMethod(method);
      if (success) {
        Alert.alert(t?.('success') || 'Success', `Switched to ${getMethodInfo(method)?.title}`);
      } else {
        Alert.alert(t?.('error') || 'Error', 'Failed to switch lock method');
      }
      return;
    }

    setSetupMethod(method);
    setUpdateMode(false);
  }, [configuredMethods, isEnabled, reEnableSecurity, switchActiveMethod, t]);

  const handleManageSwitch = useCallback(async (method) => {
    if (method === currentMethod) {
      setShowManageMethods(false);
      return;
    }

    const success = await switchActiveMethod(method);
    if (success) {
      setShowManageMethods(false);
      Alert.alert(t?.('success') || 'Success', `Switched to ${getMethodInfo(method)?.title}`);
    } else {
      Alert.alert(t?.('error') || 'Error', 'Failed to switch lock method');
    }
  }, [currentMethod, switchActiveMethod, t]);

  const handleManageAddMethod = useCallback((method) => {
    setShowManageMethods(false);
    setSetupMethod(method);
    setUpdateMode(false);
  }, []);

  const handleVerifyComplete = useCallback(async (method, credential) => {
    const verified = await verifyCurrentCredential(method, credential);
    if (verified) {
      setVerifyMethod(null);
      if (pendingAction) {
        setTimeout(() => {
          pendingAction();
          setPendingAction(null);
        }, 300);
      }
      return true;
    }
    return false;
  }, [verifyCurrentCredential, pendingAction]);

  const handlePINSetupComplete = useCallback(async (enteredPin) => {
    let ok = false;
    
    // Proceed with update
    if (updateMode) {
      ok = await updateMethod('pin', enteredPin);
    } else if (isEnabled) {
      ok = await configureAndActivateMethod('pin', enteredPin);
    } else {
      ok = await enableSecurity('pin', enteredPin);
    }
    setSetupMethod(null);
    setUpdateMode(false);
    if (ok) {
      Alert.alert(t?.('success') || 'Success', updateMode ? 'PIN updated successfully.' : 'PIN lock saved.');
    } else {
      Alert.alert(t?.('error') || 'Error', 'Could not save PIN lock settings.');
    }
  }, [enableSecurity, updateMethod, configureAndActivateMethod, updateMode, isEnabled, t]);

  const handlePatternSetupComplete = useCallback(async (enteredPattern) => {
    let ok = false;
    
    // Proceed with update
    if (updateMode) {
      ok = await updateMethod('pattern', enteredPattern);
    } else if (isEnabled) {
      ok = await configureAndActivateMethod('pattern', null, enteredPattern);
    } else {
      ok = await enableSecurity('pattern', null, enteredPattern);
    }
    setSetupMethod(null);
    setUpdateMode(false);
    if (ok) {
      Alert.alert(t?.('success') || 'Success', updateMode ? 'Pattern updated successfully.' : 'Pattern lock saved.');
    } else {
      Alert.alert(t?.('error') || 'Error', 'Could not save pattern lock settings.');
    }
  }, [enableSecurity, updateMethod, configureAndActivateMethod, updateMode, isEnabled, t]);

  const handleFingerprintSetupComplete = useCallback(async () => {
    let ok = false;
    if (isEnabled && !updateMode) {
      ok = await configureAndActivateMethod('fingerprint');
    } else {
      ok = await enableSecurity('fingerprint');
    }
    setSetupMethod(null);
    setUpdateMode(false);
    if (ok) Alert.alert(t?.('success') || 'Success', 'Fingerprint lock saved.');
    else Alert.alert(t?.('error') || 'Error', 'Could not enable fingerprint lock.');
  }, [enableSecurity, configureAndActivateMethod, isEnabled, updateMode, t]);

  const methodInfo = getMethodInfo(currentMethod);
  const configuredCount = Object.keys(configuredMethods).length;

  return (
    <>
      {/* Main App Lock Card */}
      <View style={[lockStyles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={lockStyles.mainCardRow}>
          <View style={[lockStyles.iconWrapLg, { backgroundColor: isEnabled ? '#f97316' + '18' : colors.border + '40' }]}>
            <Lock color={isEnabled ? '#f97316' : colors.muted} size={22} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <CustomText style={[lockStyles.title, { color: colors.foreground, fontSize: 15 }]}>App Lock</CustomText>
            <CustomText style={[lockStyles.subtitle, { color: colors.muted }]}>
              {isEnabled
                ? methodInfo
                  ? `${methodInfo.title} — ${methodInfo.subtitle}`
                  : 'Enabled'
                : 'Secure your app with a lock'}
            </CustomText>
          </View>
          <Switch
            value={isEnabled}
            onValueChange={handleMainToggle}
            trackColor={{ false: colors.border, true: '#f97316' }}
            thumbColor="white"
          />
        </View>

        {/* Quick action cards — only when enabled */}
        {isEnabled && methodInfo && (
          <View style={lockStyles.quickActionsRow}>
            <TouchableOpacity
              style={[lockStyles.quickAction, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={handleUpdateMethod}
              activeOpacity={0.7}
            >
              <View style={[lockStyles.quickActionIcon, { backgroundColor: methodInfo.color + '18' }]}>
                <RefreshCw color={methodInfo.color} size={18} />
              </View>
              <CustomText style={[lockStyles.quickActionLabel, { color: colors.foreground }]}>
                Update{'\n'}Lock
              </CustomText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[lockStyles.quickAction, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={handleChangeMethod}
              activeOpacity={0.7}
            >
              <View style={[lockStyles.quickActionIcon, { backgroundColor: '#8b5cf6' + '18' }]}>
                <Shuffle color="#8b5cf6" size={18} />
              </View>
              <CustomText style={[lockStyles.quickActionLabel, { color: colors.foreground }]}>
                Change{'\n'}Method
              </CustomText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[lockStyles.quickAction, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={handleManageMethods}
              activeOpacity={0.7}
            >
              <View style={[lockStyles.quickActionIcon, { backgroundColor: '#10b981' + '18' }]}>
                <Settings2 color="#10b981" size={18} />
              </View>
              <CustomText style={[lockStyles.quickActionLabel, { color: colors.foreground }]}>
                Manage{'\n'}Methods
              </CustomText>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Method Selector Modal */}
      <Modal
        visible={showMethodSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMethodSelector(false)}
      >
        <TouchableOpacity
          style={lockStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMethodSelector(false)}
        >
          <TouchableOpacity
            style={[lockStyles.selectorModalContent, { backgroundColor: colors.background, borderColor: colors.border }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <CustomText variant="h2" style={[lockStyles.modalTitle, { color: colors.foreground }]}>
              {isEnabled ? 'Change Lock Method' : 'Enable App Lock'}
            </CustomText>

            {['pin', 'pattern', ...(fingerprintAvailable ? ['fingerprint'] : [])].map(method => {
              if (isEnabled && !configuredMethods[method]) return null;
              const info = getMethodInfo(method);
              if (!info) return null;
              const Icon = info.icon;
              return (
                <TouchableOpacity
                  key={method}
                  style={[lockStyles.methodOption, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleSwitchToMethod(method)}
                >
                  <View style={[lockStyles.iconWrap, { backgroundColor: info.color + '18' }]}>
                    <Icon color={info.color} size={24} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <CustomText style={[lockStyles.optionTitle, { color: colors.foreground }]}>{info.title}</CustomText>
                    <CustomText style={[lockStyles.optionSubtitle, { color: colors.muted }]}>
                      {configuredMethods[method] ? 'Already configured' : info.subtitle}
                    </CustomText>
                  </View>
                  {configuredMethods[method] && currentMethod === method && (
                    <View style={[lockStyles.activeBadge, { backgroundColor: '#f97316' }]}>
                      <CustomText style={lockStyles.activeBadgeText}>Active</CustomText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[lockStyles.cancelButton, { backgroundColor: colors.border }]}
              onPress={() => setShowMethodSelector(false)}
            >
              <CustomText style={[lockStyles.cancelButtonText, { color: colors.foreground }]}>Cancel</CustomText>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Manage Lock Methods Modal */}
      <Modal
        visible={showManageMethods}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManageMethods(false)}
      >
        <TouchableOpacity
          style={lockStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowManageMethods(false)}
        >
          <TouchableOpacity
            style={[lockStyles.selectorModalContent, { backgroundColor: colors.background, borderColor: colors.border }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <CustomText variant="h2" style={[lockStyles.modalTitle, { color: colors.foreground }]}>
              Manage Lock Methods
            </CustomText>
            <CustomText style={[lockStyles.optionSubtitle, { color: colors.muted, textAlign: 'center', marginBottom: 16 }]}>
              Only one method is active at a time. Configured methods are saved securely.
            </CustomText>

            {['pin', 'pattern', ...(fingerprintAvailable ? ['fingerprint'] : [])].map((method) => {
              const info = getMethodInfo(method);
              if (!info) return null;
              const Icon = info.icon;
              const isConfigured = !!configuredMethods[method];
              const isActive = currentMethod === method;

              return (
                <TouchableOpacity
                  key={method}
                  style={[lockStyles.methodOption, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => (isConfigured ? handleManageSwitch(method) : handleManageAddMethod(method))}
                >
                  <View style={[lockStyles.iconWrap, { backgroundColor: info.color + '18' }]}>
                    <Icon color={info.color} size={24} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <CustomText style={[lockStyles.optionTitle, { color: colors.foreground }]}>{info.title}</CustomText>
                    <CustomText style={[lockStyles.optionSubtitle, { color: colors.muted }]}>
                      {!isConfigured
                        ? 'Not configured — tap to set up'
                        : isActive
                          ? 'Currently active'
                          : 'Tap to activate'}
                    </CustomText>
                  </View>
                  {isActive && (
                    <View style={[lockStyles.activeBadge, { backgroundColor: '#f97316' }]}>
                      <CustomText style={lockStyles.activeBadgeText}>Active</CustomText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[lockStyles.cancelButton, { backgroundColor: colors.border }]}
              onPress={() => setShowManageMethods(false)}
            >
              <CustomText style={[lockStyles.cancelButtonText, { color: colors.foreground }]}>Close</CustomText>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Verify PIN/Pattern Modal */}
      <Modal
        visible={verifyMethod !== null}
        transparent
        animationType={verifyMethod === 'pattern' ? 'fade' : 'slide'}
        onRequestClose={() => { setVerifyMethod(null); setPendingAction(null); }}
      >
        <TouchableOpacity
          style={verifyMethod === 'pattern' ? lockStyles.patternModalOverlay : lockStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setVerifyMethod(null); setPendingAction(null); }}
        >
          {verifyMethod === 'pin' ? (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <TouchableOpacity
                style={[lockStyles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <PINEntryScreen
                  isSetup={false}
                  isModal={true}
                  customTitle="Verify Current PIN"
                  customSubtitle="Enter your current PIN to continue"
                  onSuccess={(pin) => handleVerifyComplete('pin', pin)}
                  onCancel={() => { setVerifyMethod(null); setPendingAction(null); }}
                />
              </TouchableOpacity>
            </KeyboardAvoidingView>
          ) : verifyMethod === 'pattern' ? (
            <TouchableOpacity
              style={[lockStyles.patternModalContent, { backgroundColor: colors.background, borderColor: colors.border }]}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <PatternEntryScreen
                isSetup={false}
                isModal={true}
                customTitle="Verify Current Pattern"
                customSubtitle="Draw your current pattern to continue"
                onSuccess={(pattern) => handleVerifyComplete('pattern', pattern)}
                onCancel={() => { setVerifyMethod(null); setPendingAction(null); }}
              />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      </Modal>

      {/* PIN Setup Modal */}
      <Modal
        visible={setupMethod === 'pin'}
        transparent
        animationType="slide"
        onRequestClose={() => setSetupMethod(null)}
      >
        <TouchableOpacity
          style={lockStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSetupMethod(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <TouchableOpacity
              style={[lockStyles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <PINEntryScreen
                isSetup={true}
                isModal={true}
                customTitle={updateMode ? "Update PIN" : undefined}
                onSetupComplete={handlePINSetupComplete}
                onCancel={() => setSetupMethod(null)}
              />
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Pattern Setup Modal */}
      <Modal
        visible={setupMethod === 'pattern'}
        transparent
        animationType="fade"
        onRequestClose={() => setSetupMethod(null)}
      >
        <TouchableOpacity
          style={lockStyles.patternModalOverlay}
          activeOpacity={1}
          onPress={() => setSetupMethod(null)}
        >
          <TouchableOpacity
            style={[lockStyles.patternModalContent, { backgroundColor: colors.background, borderColor: colors.border }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <PatternEntryScreen
              isSetup={true}
              customTitle={updateMode ? "Update Pattern" : undefined}
              onSetupComplete={handlePatternSetupComplete}
              onCancel={() => setSetupMethod(null)}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Fingerprint Setup Modal */}
      <Modal
        visible={setupMethod === 'fingerprint'}
        transparent
        animationType="fade"
        onRequestClose={() => setSetupMethod(null)}
      >
        <TouchableOpacity
          style={lockStyles.patternModalOverlay}
          activeOpacity={1}
          onPress={() => setSetupMethod(null)}
        >
          <TouchableOpacity
            style={[lockStyles.patternModalContent, { backgroundColor: colors.background, borderColor: colors.border }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <FingerprintScreen
              isSetup={true}
              onSetupComplete={handleFingerprintSetupComplete}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const lockStyles = StyleSheet.create({
  mainCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  mainCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconWrapLg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 10,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '90%',
    height: '80%',
    overflow: 'hidden',
  },
  patternModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternModalContent: {
    borderRadius: 24,
    borderWidth: 1,
    width: '92%',
    maxHeight: '95%',
    height: '90%',
    overflow: 'hidden',
  },
  selectorModalContent: {
    margin: 20,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  cancelButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default AppLockSettings;