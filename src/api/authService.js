import { API_BASE_URL } from '@env';

const BASE_URL = API_BASE_URL;

// Common headers for all API calls — ngrok-skip-browser-warning bypasses
// ngrok's HTML interstitial page that breaks non-browser (mobile) fetch calls
const commonHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

const buildHeaders = (userId) => ({
  ...commonHeaders,
  ...(userId ? { 'x-user-id': userId } : {})
});

// Wraps fetch with an AbortController timeout to prevent infinite loading
// if the server is unreachable or the tunnel is unresponsive.
const fetchWithTimeout = (url, options = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .then(res => { clearTimeout(timer); return res; })
    .catch(err => {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection and try again.');
      throw err;
    });
};


export const authService = {
  login: async (email, password) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/auth/mobile-login`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ email, password }),
      }, 25000);

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (responseText?.includes('<html') || responseText?.includes('<!DOCTYPE')) {
          console.error('[DEBUG] HTML response detected:', responseText.slice(0, 200));
          throw new Error('Server error: Invalid response format.');
        }
        if (!response.ok) throw new Error(responseText || 'Login failed');
        console.error('[DEBUG] JSON parse error on response:', responseText.slice(0, 200));
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        const errorMsg = data.error || 'Login failed';
        if (errorMsg.includes('EmailVryErr')) {
          throw new Error('EmailVryErr');
        }
        throw new Error(errorMsg);
      }

      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  loginWithGoogle: async (email, name, image) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/auth/mobile-google`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ email, name, image }),
      }, 25000);

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (!response.ok) throw new Error(responseText || 'Google login failed');
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Google login failed');
      }

      return data.user;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  },

  register: async (userData) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(userData),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (responseText?.includes('<html') || responseText?.includes('<!DOCTYPE')) {
          console.error('[DEBUG] HTML response detected:', responseText.slice(0, 200));
          throw new Error('Server error: Invalid response format.');
        }
        if (!response.ok) throw new Error(responseText || 'Registration failed');
        console.error('[DEBUG] JSON parse error on response:', responseText.slice(0, 200));
        throw new Error('Invalid server response');
      }

      if (!response.ok) throw new Error(data.error || 'Registration failed');
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  verifyOTP: async (email, otp) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/auth/verify`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ email, otp }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (!response.ok) throw new Error(responseText || 'Verification failed');
        throw new Error('Invalid server response');
      }

      if (!response.ok) throw new Error(data.error || 'Verification failed');
      return data;
    } catch (error) {
      console.error('Verification error:', error);
      throw error;
    }
  },

  updateProfile: async (userId, profileData) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify({ userId, ...profileData }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (!response.ok) throw new Error(responseText || 'Profile update failed');
        throw new Error('Invalid server response');
      }

      if (!response.ok) throw new Error(data.error || 'Profile update failed');
      return data;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  },

  uploadFile: async (userId, fileUri) => {
    try {
      const headers = buildHeaders(userId);
      delete headers['Content-Type'];

      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: 'image/jpeg',
        name: `avatar_${Date.now()}.jpg`
      });

      const response = await fetchWithTimeout(`${BASE_URL}/api/upload`, {
        method: 'POST',
        headers,
        body: formData
      }, 30000);

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid server response during upload');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } catch (error) {
      console.error('uploadFile error:', error);
      throw error;
    }
  },
  
  changePassword: async (userId, currentPassword, newPassword) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ userId, currentPassword, newPassword }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (!response.ok) throw new Error(responseText || 'Password update failed');
        throw new Error('Invalid server response');
      }

      if (!response.ok) throw new Error(data.message || data.error || 'Password update failed');
      return data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  forgotPassword: async (email, callbackUrl) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ email, isMobile: true, callbackUrl }),
      });

      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch (e) { throw new Error(responseText); }

      if (!response.ok) throw new Error(data.error || 'Failed to send reset email');
      return data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  resetPassword: async (token, password) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ token, password }),
      });

      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch (e) { throw new Error(responseText); }

      if (!response.ok) throw new Error(data.error || 'Failed to reset password');
      return data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },

  deactivateAccount: async (userId) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/user/deactivate`, {
        method: 'POST',
        headers: buildHeaders(userId),
      });
      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch (e) { throw new Error(responseText); }
      if (!response.ok) throw new Error(data.error || 'Deactivation failed');
      return data;
    } catch (error) {
      console.error('Deactivate account error:', error);
      throw error;
    }
  },

  reactivateAccount: async (userId) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/user/reactivate`, {
        method: 'POST',
        headers: buildHeaders(userId),
      });
      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch (e) { throw new Error(responseText); }
      if (!response.ok) throw new Error(data.error || 'Reactivation failed');
      return data;
    } catch (error) {
      console.error('Reactivate account error:', error);
      throw error;
    }
  },

  requestAccountDeletion: async (userId) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/user/delete/request`, {
        method: 'POST',
        headers: buildHeaders(userId),
      });
      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch (e) { throw new Error(responseText); }
      if (!response.ok) throw new Error(data.error || 'Failed to request deletion');
      return data;
    } catch (error) {
      console.error('Request account deletion error:', error);
      throw error;
    }
  },

  confirmAccountDeletion: async (userId, otp) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/user/delete/confirm`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ otp }),
      });
      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch (e) { throw new Error(responseText); }
      if (!response.ok) throw new Error(data.error || 'Failed to confirm deletion');
      return data;
    } catch (error) {
      console.error('Confirm account deletion error:', error);
      throw error;
    }
  },

  setFeatureFlags: async (userId, flags) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/mobile/user/feature-flags`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify(flags),
      });
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (responseText?.includes('<html') || responseText?.includes('<!DOCTYPE')) {
          throw new Error('Server returned an HTML page instead of JSON. Restart the API server and confirm the ngrok URL points to this backend.');
        }
        throw new Error(responseText || 'Invalid server response');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to update feature flags');
      return data;
    } catch (error) {
      console.error('Set feature flags error:', error);
      throw error;
    }
  },
};
