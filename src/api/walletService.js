import { API_BASE_URL } from '@env';

const BASE_URL = API_BASE_URL;

const commonHeaders = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

const buildHeaders = (userId) => ({
  ...commonHeaders,
  'x-user-id': userId
});

export const walletService = {
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

      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch wallet (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('getWallet error:', error);
      throw error;
    }
  },

  topUp: async (userId, amount, method, phone) => {
    try {
      const response = await fetch(`${BASE_URL}/api/wallet/topup`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ amount, method, details: phone }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to top up (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('topUp error:', error);
      throw error;
    }
  },

  withdraw: async (userId, amount, method, details) => {
    try {
      const response = await fetch(`${BASE_URL}/api/wallet`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ amount, method, details }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to withdraw (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('withdraw error:', error);
      throw error;
    }
  }
};
