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

export const SecurityProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [securitySettings, setSecuritySettings] = useState({
    enabled: false,
    method: null, // 'pin', 'pattern', 'fingerprint'
    failedAttempts: 0,
  });

  const [appLocked, setAppLocked] = useState(false);
  const [deviceLocked, setDeviceLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const appStateRef = useRef(AppState.currentState);
  const lockTimeoutRef = useRef(null);

  // Storage key for local credential hash (never sent over the wire after setup)
  const localCredKey = user?.id ? `@security_cred_${user.id}` : null;

  // Load security settings from storage
  const loadSecuritySettings = useCallback(async () => {
    try {
      if (!user?.id) return;
      // First hydrate from local storage so UI doesn't flash
      const stored = await AsyncStorage.getItem(`@security_settings_${user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const safe = {
          enabled: !!parsed.enabled,
          method: parsed.method || null,
          failedAttempts: parsed.failedAttempts || 0,
        };
        setSecuritySettings(safe);
        // Only lock on startup if security is enabled AND we have a local credential hash to verify it offline
        if (safe.enabled) {
          const hasLocalCred = await AsyncStorage.getItem(localCredKey);
          if (hasLocalCred) {
            setAppLocked(true);
          } else {
            console.warn('[SecurityContext] Hydrated lock is enabled but no local credential hash found. Setting lock to false.');
            setAppLocked(false);
          }
        }
      }

      // Then sync from remote
      try {
        const remoteSettings = await appSecurityService.getSecuritySettings(user.id);
        const safeSettings = {
          enabled: !!remoteSettings.enabled,
          method: remoteSettings.method || null,
          failedAttempts: remoteSettings.failedAttempts || 0,
        };
        setSecuritySettings(safeSettings);
        await AsyncStorage.setItem(`@security_settings_${user.id}`, JSON.stringify(safeSettings));
        if (safeSettings.enabled) {
          setAppLocked(true);
        } else {
          setAppLocked(false);
          if (localCredKey) {
            await AsyncStorage.removeItem(localCredKey);
          }
        }
      } catch (remoteErr) {
        console.warn('[SecurityContext] Remote settings fetch failed, using local cache:', remoteErr?.message);
      }
    } catch (err) {
      console.warn('[SecurityContext] Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, localCredKey]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadSecuritySettings();
    } else {
      setAppLocked(false);
      setSecuritySettings({ enabled: false, method: null, failedAttempts: 0 });
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, loadSecuritySettings]);

  const handleAppStateChange = useCallback((nextAppState) => {
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
      if (credential && localCredKey) {
        localHash = await buildLocalHash(method, credential);
      }

      // Sync to remote FIRST. We ONLY enable security if the remote database is updated successfully.
      try {
        const remoteSettings = await appSecurityService.enableSecurity(user.id, method, pin, pattern);
        const synced = {
          enabled: !!remoteSettings.enabled,
          method: remoteSettings.method || method,
          failedAttempts: remoteSettings.failedAttempts || 0,
        };

        // Remote succeeded, now save local settings and local hash
        if (localHash && localCredKey) {
          await AsyncStorage.setItem(localCredKey, JSON.stringify({ method, hash: localHash }));
        }

        setSecuritySettings(synced);
        await AsyncStorage.setItem(`@security_settings_${user.id}`, JSON.stringify(synced));
        setAppLocked(true);
        return true;
      } catch (remoteErr) {
        console.error('[SecurityContext] Remote enable failed. Reverting lock settings to disabled:', remoteErr?.message);
        const disabledSettings = { enabled: false, method: null, failedAttempts: 0 };
        setSecuritySettings(disabledSettings);
        await AsyncStorage.setItem(`@security_settings_${user.id}`, JSON.stringify(disabledSettings));
        if (localCredKey) {
          await AsyncStorage.removeItem(localCredKey);
        }
        setAppLocked(false);
        return false;
      }
    } catch (err) {
      console.warn('[SecurityContext] Error enabling security:', err);
      return false;
    }
  }, [user?.id, localCredKey]);

  // Disable security
  const disableSecurity = useCallback(async () => {
    if (user?.id) {
      try {
        await appSecurityService.disableSecurity(user.id);
      } catch (err) {
        console.warn('[SecurityContext] Error disabling security:', err);
      }
      // Clear local hash too
      if (localCredKey) await AsyncStorage.removeItem(localCredKey);
    }
    const newSettings = { enabled: false, method: null, failedAttempts: 0 };
    setSecuritySettings(newSettings);
    if (user?.id) {
      await AsyncStorage.setItem(`@security_settings_${user.id}`, JSON.stringify(newSettings));
    }
    return true;
  }, [user?.id, localCredKey]);

  // Verify PIN — tries server first, falls back to local SHA-256 hash
  const verifyPin = useCallback(async (inputPin) => {
    if (!user?.id) return false;
    try {
      const result = await appSecurityService.verifySecurityCredential(user.id, 'pin', inputPin);
      if (result.success) {
        setSecuritySettings((prev) => ({ ...prev, failedAttempts: 0 }));
        return true;
      }
      setSecuritySettings((prev) => ({ ...prev, failedAttempts: prev.failedAttempts + 1 }));
      return false;
    } catch (networkErr) {
      // Network failed — fall back to local hash verification
      console.warn('[SecurityContext] PIN verify network failed, trying local hash:', networkErr?.message);
      try {
        if (localCredKey) {
          const raw = await AsyncStorage.getItem(localCredKey);
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
    }
  }, [user?.id, localCredKey, disableSecurity]);

  // Verify Pattern — tries server first, falls back to local SHA-256 hash
  const verifyPattern = useCallback(async (inputPattern) => {
    if (!user?.id) return false;
    try {
      const result = await appSecurityService.verifySecurityCredential(user.id, 'pattern', inputPattern);
      if (result.success) {
        setSecuritySettings((prev) => ({ ...prev, failedAttempts: 0 }));
        return true;
      }
      setSecuritySettings((prev) => ({ ...prev, failedAttempts: prev.failedAttempts + 1 }));
      return false;
    } catch (networkErr) {
      console.warn('[SecurityContext] Pattern verify network failed, trying local hash:', networkErr?.message);
      try {
        if (localCredKey) {
          const raw = await AsyncStorage.getItem(localCredKey);
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
    }
  }, [user?.id, localCredKey, disableSecurity]);

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
    setSecuritySettings((prev) => ({ ...prev, failedAttempts: 0 }));
  }, []);

  const lockApp = useCallback(() => {
    if (securitySettings.enabled && isAuthenticated) {
      setAppLocked(true);
    }
  }, [securitySettings.enabled, isAuthenticated]);

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
  };

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
};
