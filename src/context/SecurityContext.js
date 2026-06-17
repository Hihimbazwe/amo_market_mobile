import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { appSecurityService } from '../api/appSecurityService';

const SecurityContext = createContext();

export const useAppSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useAppSecurity must be used within SecurityProvider');
  }
  return context;
};

// Local credential hash using SHA-256 — matches format "method:credential"
const buildLocalHash = async (method, credential) => {
  const input = `${method}:${credential}`;
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
};

const verifyLocalHash = async (method, credential, storedHash) => {
  if (!storedHash) return false;
  const hash = await buildLocalHash(method, credential);
  return hash === storedHash;
};

const METHODS = ['pin', 'pattern', 'fingerprint'];

const loadLocalConfiguredMethods = async (userId) => {
  const configuredMethods = {};
  for (const method of METHODS) {
    const raw = await AsyncStorage.getItem(`@security_cred_${userId}_${method}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      configuredMethods[method] = {
        hash: parsed.hash ?? null,
        timestamp: parsed.timestamp || new Date().toISOString(),
      };
    }
  }
  return configuredMethods;
};

const mergeConfiguredMethods = (remoteMethods = {}, localMethods = {}) => {
  const merged = { ...localMethods };
  for (const [method, meta] of Object.entries(remoteMethods)) {
    if (meta?.configured && !merged[method]) {
      merged[method] = {
        hash: null,
        timestamp: meta.timestamp || new Date().toISOString(),
      };
    }
  }
  return merged;
};

const hasConfiguredMethod = (method, configuredMethods = {}) => {
  if (method === 'fingerprint') return !!configuredMethods.fingerprint;
  return !!configuredMethods[method];
};

const persistSecuritySettings = async (userId, settings, deviceSecurityKey) => {
  await AsyncStorage.setItem(`@security_settings_${userId}`, JSON.stringify(settings));
  await AsyncStorage.setItem(deviceSecurityKey, JSON.stringify({
    enabled: settings.enabled,
    method: settings.method,
    userId,
  }));
};

export const SecurityProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [securitySettings, setSecuritySettings] = useState({
    enabled: false,
    method: null, // 'pin', 'pattern', 'fingerprint' - currently active method
    failedAttempts: 0,
    configuredMethods: {}, // Store all configured methods: { pin: { hash, timestamp }, pattern: { hash, timestamp }, fingerprint: { enabled, timestamp } }
  });

  const [appLocked, setAppLocked] = useState(false);
  const [deviceLocked, setDeviceLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const appStateRef = useRef(AppState.currentState);
  const lockTimeoutRef = useRef(null);
  const deviceLockUserIdRef = useRef(null);
  const skipLockAfterLoginRef = useRef(false);
  const isDeviceLockSessionRef = useRef(false);
  const loadSecuritySettingsRef = useRef(null);

  // Storage key for local credential hash (never sent over the wire after setup)
  const localCredKey = user?.id ? `@security_cred_${user.id}` : null;
  // Device-wide key to store if app lock is enabled (used for AuthOverlay when logged out)
  const deviceSecurityKey = '@device_security_enabled';

  // Load security settings from storage
  const loadSecuritySettings = useCallback(async ({ skipLock = false } = {}) => {
    try {
      if (!user?.id) return;
      deviceLockUserIdRef.current = user.id;
      const localConfiguredMethods = await loadLocalConfiguredMethods(user.id);

      // First hydrate from local storage so UI doesn't flash
      const stored = await AsyncStorage.getItem(`@security_settings_${user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const safe = {
          enabled: !!parsed.enabled,
          method: parsed.method || null,
          failedAttempts: parsed.failedAttempts || 0,
          configuredMethods: mergeConfiguredMethods(parsed.configuredMethods, localConfiguredMethods),
        };
        setSecuritySettings(safe);
        if (!skipLock && safe.enabled && safe.method && hasConfiguredMethod(safe.method, safe.configuredMethods)) {
          setAppLocked(true);
        } else if (!skipLock && safe.enabled) {
          setAppLocked(false);
        } else if (skipLock) {
          setAppLocked(false);
        }
      }

      // Then sync from remote
      try {
        const remoteSettings = await appSecurityService.getSecuritySettings(user.id);
        const safeSettings = {
          enabled: !!remoteSettings.enabled,
          method: remoteSettings.method || null,
          failedAttempts: remoteSettings.failedAttempts || 0,
          configuredMethods: mergeConfiguredMethods(remoteSettings.configuredMethods, localConfiguredMethods),
        };
        setSecuritySettings(safeSettings);
        await persistSecuritySettings(user.id, safeSettings, deviceSecurityKey);
        setAppLocked(skipLock ? false : !!safeSettings.enabled);
      } catch (remoteErr) {
        console.warn('[SecurityContext] Remote settings fetch failed, using local cache:', remoteErr?.message);
        if (skipLock) {
          setAppLocked(false);
        }
      }
    } catch (err) {
      console.warn('[SecurityContext] Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, deviceSecurityKey]);

  loadSecuritySettingsRef.current = loadSecuritySettings;

  const applySyncedSettings = useCallback(async (synced) => {
    setSecuritySettings(synced);
    if (user?.id) {
      await persistSecuritySettings(user.id, synced, deviceSecurityKey);
    }
  }, [user?.id, deviceSecurityKey]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      isDeviceLockSessionRef.current = false;
      const skipLock = skipLockAfterLoginRef.current;
      loadSecuritySettingsRef.current?.({ skipLock }).finally(() => {
        if (skipLock) {
          setAppLocked(false);
          skipLockAfterLoginRef.current = false;
        }
      });
    } else if (!isDeviceLockSessionRef.current) {
      deviceLockUserIdRef.current = null;
      setAppLocked(false);
      setSecuritySettings({ enabled: false, method: null, failedAttempts: 0, configuredMethods: {} });
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const notifyCredentialLogin = useCallback(() => {
    skipLockAfterLoginRef.current = true;
    isDeviceLockSessionRef.current = false;
    setAppLocked(false);
  }, []);

  const handleAppStateChange = useCallback((nextAppState) => {
    if (skipLockAfterLoginRef.current) return;

    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      if (securitySettings.enabled && isAuthenticated) {
        if (lockTimeoutRef.current) {
          clearTimeout(lockTimeoutRef.current);
          lockTimeoutRef.current = null;
        }
        setAppLocked(true);
        setDeviceLocked(false);
      }
    } else if (nextAppState.match(/inactive|background/)) {
      if (securitySettings.enabled && isAuthenticated) {
        setAppLocked(true);
        setDeviceLocked(true);
      }
    }
    appStateRef.current = nextAppState;
  }, [securitySettings.enabled, isAuthenticated]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  // Enable security — stores credential hash LOCALLY and syncs to server
  const enableSecurity = useCallback(async (method, pin = null, pattern = null) => {
    if (!user?.id) return false;
    try {
      // Fingerprint: check hardware first
      if (method === 'fingerprint') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !enrolled) {
          console.warn('[SecurityContext] Fingerprint not available on this device');
          return false;
        }
      }

      // Build local hash for PIN / Pattern (so verify works offline too)
      const credential = method === 'pin' ? pin : method === 'pattern' ? pattern : null;
      let localHash = null;
      const methodCredKey = `@security_cred_${user.id}_${method}`;
      if (credential) {
        localHash = await buildLocalHash(method, credential);
      }

      // Update configuredMethods locally
      const updatedConfiguredMethods = {
        ...securitySettings.configuredMethods,
        [method]: {
          hash: localHash,
          timestamp: new Date().toISOString(),
        },
      };

      // Sync to remote FIRST. We ONLY enable security if the remote database is updated successfully.
      try {
        const remoteSettings = await appSecurityService.enableSecurity(user.id, method, pin, pattern, updatedConfiguredMethods);
        const synced = {
          enabled: !!remoteSettings.enabled,
          method: remoteSettings.method || method,
          failedAttempts: remoteSettings.failedAttempts || 0,
          configuredMethods: mergeConfiguredMethods(remoteSettings.configuredMethods, updatedConfiguredMethods),
        };

        if (localHash) {
          await AsyncStorage.setItem(methodCredKey, JSON.stringify({ method, hash: localHash }));
        } else if (method === 'fingerprint') {
          await AsyncStorage.setItem(methodCredKey, JSON.stringify({ method, hash: null, timestamp: synced.configuredMethods.fingerprint?.timestamp }));
        }

        await applySyncedSettings(synced);
        setAppLocked(true);
        return true;
      } catch (remoteErr) {
        console.error('[SecurityContext] Remote enable failed. Reverting lock settings to disabled:', remoteErr?.message);
        const disabledSettings = {
          enabled: false,
          method: null,
          failedAttempts: 0,
          configuredMethods: securitySettings.configuredMethods || {},
        };
        await applySyncedSettings(disabledSettings);
        setAppLocked(false);
        return false;
      }
    } catch (err) {
      console.warn('[SecurityContext] Error enabling security:', err);
      return false;
    }
  }, [user?.id, securitySettings.configuredMethods, applySyncedSettings]);

  // Disable security — keeps configured methods stored for future re-enable
  const disableSecurity = useCallback(async () => {
    let remoteConfiguredMethods = securitySettings.configuredMethods || {};
    if (user?.id) {
      try {
        const remoteSettings = await appSecurityService.disableSecurity(user.id);
        remoteConfiguredMethods = mergeConfiguredMethods(
          remoteSettings.configuredMethods,
          securitySettings.configuredMethods || {}
        );
      } catch (err) {
        console.warn('[SecurityContext] Error disabling security:', err);
      }
    }
    const newSettings = {
      enabled: false,
      method: null,
      failedAttempts: 0,
      configuredMethods: remoteConfiguredMethods,
    };
    await applySyncedSettings(newSettings);
    setAppLocked(false);
    return true;
  }, [user?.id, securitySettings.configuredMethods, applySyncedSettings]);

  // Verify PIN — server when logged in, always falls back to local device hash
  const verifyPin = useCallback(async (inputPin) => {
    const effectiveUserId = user?.id || deviceLockUserIdRef.current;
    if (!effectiveUserId) return false;

    const pinCredKey = `@security_cred_${effectiveUserId}_pin`;

    if (user?.id) {
      try {
        const result = await appSecurityService.verifySecurityCredential(user.id, 'pin', inputPin);
        if (result.success) {
          setSecuritySettings((prev) => ({ ...prev, failedAttempts: 0 }));
          return true;
        }
      } catch (networkErr) {
        console.warn('[SecurityContext] PIN verify network failed, trying local hash:', networkErr?.message);
      }
    }

    try {
      const raw = await AsyncStorage.getItem(pinCredKey);
      if (raw) {
        const { method, hash } = JSON.parse(raw);
        if (method === 'pin') {
          const match = await verifyLocalHash('pin', inputPin, hash);
          if (match) {
            setSecuritySettings((prev) => ({ ...prev, failedAttempts: 0 }));
            return true;
          }
        }
      } else {
        const settingsHash = securitySettings.configuredMethods?.pin?.hash;
        if (settingsHash) {
          const match = await verifyLocalHash('pin', inputPin, settingsHash);
          if (match) {
            setSecuritySettings((prev) => ({ ...prev, failedAttempts: 0 }));
            return true;
          }
        } else if (user?.id) {
          console.warn('[SecurityContext] Local PIN hash is missing and server verify failed. Disabling corrupted lock.');
          await disableSecurity();
          return true;
        }
      }
    } catch (localErr) {
      console.warn('[SecurityContext] Local PIN verify also failed:', localErr?.message);
    }

    setSecuritySettings((prev) => ({ ...prev, failedAttempts: prev.failedAttempts + 1 }));
    return false;
  }, [user?.id, disableSecurity, securitySettings.configuredMethods]);

  // Verify Pattern — server when logged in, always falls back to local device hash
  const verifyPattern = useCallback(async (inputPattern) => {
    const effectiveUserId = user?.id || deviceLockUserIdRef.current;
    if (!effectiveUserId) return false;

    const patternCredKey = `@security_cred_${effectiveUserId}_pattern`;

    if (user?.id) {
      try {
        const result = await appSecurityService.verifySecurityCredential(user.id, 'pattern', inputPattern);
        if (result.success) {
          setSecuritySettings((prev) => ({ ...prev, failedAttempts: 0 }));
          return true;
        }
      } catch (networkErr) {
        console.warn('[SecurityContext] Pattern verify network failed, trying local hash:', networkErr?.message);
      }
    }

    try {
      const raw = await AsyncStorage.getItem(patternCredKey);
      if (raw) {
        const { method, hash } = JSON.parse(raw);
        if (method === 'pattern') {
          const match = await verifyLocalHash('pattern', inputPattern, hash);
          if (match) {
            setSecuritySettings((prev) => ({ ...prev, failedAttempts: 0 }));
            return true;
          }
        }
      } else {
        const settingsHash = securitySettings.configuredMethods?.pattern?.hash;
        if (settingsHash) {
          const match = await verifyLocalHash('pattern', inputPattern, settingsHash);
          if (match) {
            setSecuritySettings((prev) => ({ ...prev, failedAttempts: 0 }));
            return true;
          }
        } else if (user?.id) {
          console.warn('[SecurityContext] Local pattern hash is missing and server verify failed. Disabling corrupted lock.');
          await disableSecurity();
          return true;
        }
      }
    } catch (localErr) {
      console.warn('[SecurityContext] Local pattern verify also failed:', localErr?.message);
    }

    setSecuritySettings((prev) => ({ ...prev, failedAttempts: prev.failedAttempts + 1 }));
    return false;
  }, [user?.id, disableSecurity, securitySettings.configuredMethods]);

  // Verify Fingerprint
  const verifyFingerprint = useCallback(async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return false;
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) return false;

      const authenticated = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: 'Authenticate to unlock your app',
      });

      if (authenticated.success) {
        // Best-effort remote log, don't block on it
        if (user?.id) {
          appSecurityService.verifySecurityCredential(user.id, 'fingerprint').catch(() => {});
        }
        setSecuritySettings((prev) => ({ ...prev, failedAttempts: 0 }));
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[SecurityContext] Fingerprint error:', err);
      return false;
    }
  }, [user?.id]);

  const unlockApp = useCallback(() => {
    setAppLocked(false);
    if (!isAuthenticated) {
      isDeviceLockSessionRef.current = false;
    }
    setSecuritySettings((prev) => ({ ...prev, failedAttempts: 0 }));
  }, [isAuthenticated]);

  const lockApp = useCallback(() => {
    if (securitySettings.enabled && isAuthenticated) {
      setAppLocked(true);
    }
  }, [securitySettings.enabled, isAuthenticated]);

  // Load device security settings and lock app (for AuthOverlay when logged out)
  const loadDeviceSecurityAndLock = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(deviceSecurityKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.enabled && parsed.method) {
          let userId = parsed.userId || null;

          if (!userId) {
            const keys = await AsyncStorage.getAllKeys();
            const settingsKey = keys.find((key) => key.startsWith('@security_settings_'));
            if (settingsKey) {
              userId = settingsKey.replace('@security_settings_', '');
              await AsyncStorage.setItem(deviceSecurityKey, JSON.stringify({
                enabled: parsed.enabled,
                method: parsed.method,
                userId,
              }));
            }
          }

          deviceLockUserIdRef.current = userId;
          isDeviceLockSessionRef.current = true;

          let configuredMethods = {};
          if (userId) {
            configuredMethods = await loadLocalConfiguredMethods(userId);
            const userSettings = await AsyncStorage.getItem(`@security_settings_${userId}`);
            if (userSettings) {
              const userParsed = JSON.parse(userSettings);
              configuredMethods = mergeConfiguredMethods(userParsed.configuredMethods, configuredMethods);
            }
          }

          setSecuritySettings({
            enabled: true,
            method: parsed.method,
            failedAttempts: 0,
            configuredMethods,
          });
          setAppLocked(true);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.warn('[SecurityContext] Error loading device security for lock:', err);
      return false;
    }
  }, [deviceSecurityKey]);

  // Switch active lock method (requires verification of current method first in UI)
  const switchActiveMethod = useCallback(async (newMethod) => {
    if (!user?.id) return false;
    if (!hasConfiguredMethod(newMethod, securitySettings.configuredMethods)) {
      console.warn('[SecurityContext] Method not configured:', newMethod);
      return false;
    }

    try {
      const remoteSettings = await appSecurityService.switchLockMethod(user.id, newMethod);
      const synced = {
        enabled: true,
        method: remoteSettings.method || newMethod,
        failedAttempts: 0,
        configuredMethods: mergeConfiguredMethods(remoteSettings.configuredMethods, securitySettings.configuredMethods),
      };
      await applySyncedSettings(synced);
      return true;
    } catch (remoteErr) {
      console.warn('[SecurityContext] Remote switch failed, applying local switch:', remoteErr?.message);
      const updatedSettings = {
        ...securitySettings,
        enabled: true,
        method: newMethod,
        failedAttempts: 0,
      };
      await applySyncedSettings(updatedSettings);
      return true;
    }
  }, [user?.id, securitySettings, applySyncedSettings]);

  // Re-enable app lock using a previously configured method
  const reEnableSecurity = useCallback(async (method) => {
    if (!user?.id) return false;
    if (!hasConfiguredMethod(method, securitySettings.configuredMethods)) return false;

    try {
      const remoteSettings = await appSecurityService.reEnableSecurity(user.id, method);
      const synced = {
        enabled: true,
        method: remoteSettings.method || method,
        failedAttempts: 0,
        configuredMethods: mergeConfiguredMethods(remoteSettings.configuredMethods, securitySettings.configuredMethods),
      };
      await applySyncedSettings(synced);
      setAppLocked(true);
      return true;
    } catch (remoteErr) {
      console.warn('[SecurityContext] Remote re-enable failed:', remoteErr?.message);
      return false;
    }
  }, [user?.id, securitySettings.configuredMethods, applySyncedSettings]);

  // Update current method (PIN or Pattern) - requires verification first in UI
  const updateMethod = useCallback(async (method, newCredential) => {
    if (!user?.id) return false;

    try {
      const credential = method === 'pin' ? newCredential : method === 'pattern' ? newCredential : null;
      if (!credential) return false;

      const localHash = await buildLocalHash(method, credential);
      const methodCredKey = `@security_cred_${user.id}_${method}`;

      await AsyncStorage.setItem(methodCredKey, JSON.stringify({ method, hash: localHash }));

      const updatedConfiguredMethods = {
        ...securitySettings.configuredMethods,
        [method]: {
          hash: localHash,
          timestamp: new Date().toISOString(),
        },
      };

      try {
        const remoteSettings = await appSecurityService.updateLockMethod(
          user.id,
          method,
          method === 'pin' ? newCredential : null,
          method === 'pattern' ? newCredential : null
        );
        const synced = {
          enabled: securitySettings.enabled,
          method: remoteSettings.method || securitySettings.method,
          failedAttempts: 0,
          configuredMethods: mergeConfiguredMethods(remoteSettings.configuredMethods, updatedConfiguredMethods),
        };
        await applySyncedSettings(synced);
      } catch (remoteErr) {
        console.warn('[SecurityContext] Remote update failed, using local only:', remoteErr?.message);
        const updatedSettings = {
          ...securitySettings,
          configuredMethods: updatedConfiguredMethods,
          failedAttempts: 0,
        };
        await applySyncedSettings(updatedSettings);
      }

      return true;
    } catch (err) {
      console.warn('[SecurityContext] Error updating method:', err);
      return false;
    }
  }, [user?.id, securitySettings, applySyncedSettings]);

  // Configure a new lock method while app lock is enabled
  const configureAndActivateMethod = useCallback(async (method, pin = null, pattern = null) => {
    if (!user?.id) return false;

    try {
      if (method === 'fingerprint') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !enrolled) return false;
      }

      const credential = method === 'pin' ? pin : method === 'pattern' ? pattern : null;
      let localHash = null;
      const methodCredKey = `@security_cred_${user.id}_${method}`;
      if (credential) {
        localHash = await buildLocalHash(method, credential);
      }

      const updatedConfiguredMethods = {
        ...securitySettings.configuredMethods,
        [method]: {
          hash: localHash,
          timestamp: new Date().toISOString(),
        },
      };

      const remoteSettings = await appSecurityService.addLockMethod(
        user.id,
        method,
        pin,
        pattern,
        true
      );

      if (localHash) {
        await AsyncStorage.setItem(methodCredKey, JSON.stringify({ method, hash: localHash }));
      } else if (method === 'fingerprint') {
        await AsyncStorage.setItem(methodCredKey, JSON.stringify({ method, hash: null }));
      }

      const synced = {
        enabled: true,
        method: remoteSettings.method || method,
        failedAttempts: 0,
        configuredMethods: mergeConfiguredMethods(remoteSettings.configuredMethods, updatedConfiguredMethods),
      };
      await applySyncedSettings(synced);
      return true;
    } catch (err) {
      console.warn('[SecurityContext] Error configuring new lock method:', err);
      return false;
    }
  }, [user?.id, securitySettings.configuredMethods, applySyncedSettings]);

  const value = {
    securitySettings,
    appLocked,
    deviceLocked,
    loading,
    enableSecurity,
    disableSecurity,
    verifyPin,
    verifyPattern,
    verifyFingerprint,
    unlockApp,
    lockApp,
    loadDeviceSecurityAndLock,
    switchActiveMethod,
    updateMethod,
    reEnableSecurity,
    configureAndActivateMethod,
    notifyCredentialLogin,
  };

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
};
