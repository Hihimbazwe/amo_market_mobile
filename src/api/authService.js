import { API_BASE_URL } from '@env';

const BASE_URL = API_BASE_URL;

// Common headers for all API calls — ngrok-skip-browser-warning bypasses
// ngrok's HTML interstitial page that breaks non-browser (mobile) fetch calls
const commonHeaders = {
  'Content-Type': 'application/json',
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
          throw new Error('Server error: Invalid response format.');
        }
        if (!response.ok) throw new Error(responseText || 'Login failed');
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
          throw new Error('Server error: Invalid response format.');
        }
        if (!response.ok) throw new Error(responseText || 'Registration failed');
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
};
