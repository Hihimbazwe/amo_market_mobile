import { API_BASE_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = API_BASE_URL || 'https://amomarket-cyan.vercel.app';

const commonHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

const buildHeaders = async (userId) => {
  let token = null;
  try {
    const rawUser = await AsyncStorage.getItem('@auth_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      token = parsed?.token || null;
    }
    if (!token) {
      token = await AsyncStorage.getItem('@auth_token');
    }
  } catch (err) {
    console.warn('[appSecurityService] failed to load auth token', err);
  }

  return {
    ...commonHeaders,
    ...(userId ? { 'x-user-id': userId } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const fetchWithTimeout = (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .then((res) => {
      clearTimeout(timer);
      return res;
    })
    .catch((err) => {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection and try again.');
      throw err;
    });
};

const parseJson = async (res, fallbackMessage) => {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  // Guard: if server returns HTML (e.g. Vercel 404/error page), throw a clean error
  if (!contentType.includes('application/json') || text.trimStart().startsWith('<')) {
    if (res.status === 404) {
      throw new Error('API endpoint not found. Please update the app or try again later.');
    }
    if (res.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    throw new Error(fallbackMessage || 'Unexpected server response');
  }

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(fallbackMessage || 'Invalid server response');
  }
  if (!res.ok) throw new Error(data.error || fallbackMessage);
  return data;
};

export const appSecurityService = {
  // Get security settings
  getSecuritySettings: async (userId) => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/api/user/security-settings`, {
        headers: await buildHeaders(userId),
      });
      return await parseJson(res, 'Failed to fetch security settings');
    } catch (err) {
      console.error('[appSecurityService] getSecuritySettings error:', err);
      throw err;
    }
  },

  // Update security settings
  updateSecuritySettings: async (userId, settings) => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/api/user/security-settings`, {
        method: 'POST',
        headers: await buildHeaders(userId),
        body: JSON.stringify(settings),
      });
      return await parseJson(res, 'Failed to update security settings');
    } catch (err) {
      console.error('[appSecurityService] updateSecuritySettings error:', err);
      throw err;
    }
  },

  switchLockMethod: async (userId, method) => {
    return appSecurityService.updateSecuritySettings(userId, { action: 'switch', method });
  },

  reEnableSecurity: async (userId, method) => {
    return appSecurityService.updateSecuritySettings(userId, { action: 'reenable', method });
  },

  updateLockMethod: async (userId, method, pin = null, pattern = null) => {
    return appSecurityService.updateSecuritySettings(userId, {
      action: 'update',
      method,
      pin,
      pattern,
    });
  },

  addLockMethod: async (userId, method, pin = null, pattern = null, makeActive = true) => {
    return appSecurityService.updateSecuritySettings(userId, {
      action: 'add',
      method,
      pin,
      pattern,
      makeActive,
    });
  },

  // Enable app security
  enableSecurity: async (userId, method, pin = null, pattern = null, configuredMethods = null) => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/api/user/security-settings/enable`, {
        method: 'POST',
        headers: await buildHeaders(userId),
        body: JSON.stringify({
          method, // 'pin', 'pattern', 'fingerprint'
          pin,
          pattern,
          configuredMethods, // All configured methods
        }),
      });
      return await parseJson(res, 'Failed to enable security');
    } catch (err) {
      console.error('[appSecurityService] enableSecurity error:', err);
      throw err;
    }
  },

  // Disable app security
  disableSecurity: async (userId) => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/api/user/security-settings/disable`, {
        method: 'POST',
        headers: await buildHeaders(userId),
      });
      return await parseJson(res, 'Failed to disable security');
    } catch (err) {
      console.error('[appSecurityService] disableSecurity error:', err);
      throw err;
    }
  },

  // Log security events
  logSecurityEvent: async (userId, eventType, success, method = null) => {
    try {
      await fetchWithTimeout(`${BASE_URL}/api/user/security-logs`, {
        method: 'POST',
        headers: await buildHeaders(userId),
        body: JSON.stringify({
          eventType, // 'unlock_attempt', 'unlock_success', 'lock'
          success,
          method,
          timestamp: new Date().toISOString(),
        }),
      }, 10000);
    } catch (err) {
      console.warn('[appSecurityService] logSecurityEvent error:', err);
    }
  },

  verifySecurityCredential: async (userId, method, credential = null) => {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/api/user/security-settings/verify`, {
        method: 'POST',
        headers: await buildHeaders(userId),
        body: JSON.stringify({
          method,
          pin: method === 'pin' ? credential : undefined,
          pattern: method === 'pattern' ? credential : undefined,
        }),
      });
      return await parseJson(res, 'Failed to verify security credential');
    } catch (err) {
      console.error('[appSecurityService] verifySecurityCredential error:', err);
      throw err;
    }
  },
};
