import { API_BASE_URL } from '@env';

const BASE_URL = API_BASE_URL;

const commonHeaders = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

// Helper inside service to attach user ID
const buildHeaders = (userId) => ({
  ...commonHeaders,
  'x-user-id': userId
});

export const sellerService = {
  getAnalytics: async (userId, period = '7D') => {
    try {
      let webPeriod = "7 Days";
      if (period === "30D") webPeriod = "30 Days";
      if (period === "3M") webPeriod = "90 Days";
      if (period === "1Y") webPeriod = "1 Year";

      const response = await fetch(`${BASE_URL}/api/seller/analytics?period=${encodeURIComponent(webPeriod)}`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to fetch analytics (${response.status})`);
      return data;
    } catch (error) {
      console.error('getAnalytics error:', error);
      throw error;
    }
  },

  getOrders: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/orders`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to fetch orders (${response.status})`);
      return data;
    } catch (error) {
      console.error('getOrders error:', error);
      throw error;
    }
  },

  getWallet: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/wallet`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to fetch wallet info (${response.status})`);
      return data;
    } catch (error) {
      console.error('getWallet error:', error);
      throw error;
    }
  },

  requestWithdrawal: async (userId, amount, method, details) => {
    try {
      const response = await fetch(`${BASE_URL}/api/wallet`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ amount, method, details })
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to submit withdrawal (${response.status})`);
      return data;
    } catch (error) {
      console.error('requestWithdrawal error:', error);
      throw error;
    }
  },

  getDisputes: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/disputes`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to fetch disputes (${response.status})`);
      return data;
    } catch (error) {
      console.error('getDisputes error:', error);
      throw error;
    }
  },

  getReplacements: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/replacements`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to fetch replacements (${response.status})`);
      return data;
    } catch (error) {
      console.error('getReplacements error:', error);
      throw error;
    }
  },

  updateReplacementStatus: async (userId, replacementId, status) => {
    try {
      const response = await fetch(`${BASE_URL}/api/replacements/${replacementId}`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify({ status })
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to update replacement (${response.status})`);
      return data;
    } catch (error) {
      console.error('updateReplacementStatus error:', error);
      throw error;
    }
  },

  getKycStatus: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/kyc`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to fetch KYC (${response.status})`);
      return data;
    } catch (error) {
      console.error('getKycStatus error:', error);
      throw error;
    }
  },

  submitKYC: async (userId, documents) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/kyc`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify(documents)
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to submit KYC (${response.status})`);
      return data;
    } catch (error) {
      console.error('submitKYC error:', error);
      throw error;
    }
  },

  getMembership: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/membership`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to fetch membership (${response.status})`);
      return data;
    } catch (error) {
      console.error('getMembership error:', error);
      throw error;
    }
  },

  upgradeMembership: async (userId, planId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/membership`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ planId })
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to update membership (${response.status})`);
      return data;
    } catch (error) {
       console.error('upgradeMembership error:', error);
       throw error;
    }
  },

  getProfile: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/profile`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to fetch profile (${response.status})`);
      return data;
    } catch (error) {
      console.error('getProfile error:', error);
      throw error;
    }
  },

  updateProfile: async (userId, profileData) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/profile`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify(profileData)
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to update profile (${response.status})`);
      return data;
    } catch (error) {
      console.error('updateProfile error:', error);
      throw error;
    }
  }
};
