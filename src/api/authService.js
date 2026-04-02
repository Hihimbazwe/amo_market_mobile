import { API_BASE_URL } from '@env';

const BASE_URL = API_BASE_URL;

// Common headers for all API calls — ngrok-skip-browser-warning bypasses
// ngrok's HTML interstitial page that breaks non-browser (mobile) fetch calls
const commonHeaders = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

export const authService = {
  login: async (email, password) => {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/mobile-login`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ email, password }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
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
      const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(userData),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
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
      const response = await fetch(`${BASE_URL}/api/auth/verify`, {
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
      const response = await fetch(`${BASE_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: commonHeaders,
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
};
