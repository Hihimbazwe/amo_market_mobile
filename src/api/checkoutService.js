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

export const checkoutService = {
  placeOrder: async (userId, orderData) => {
    try {
      const response = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify(orderData),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to place order (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('placeOrder error:', error);
      throw error;
    }
  },

  processPayment: async (userId, paymentData) => {
    try {
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify(paymentData),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to process payment (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('processPayment error:', error);
      throw error;
    }
  },

  fetchAgents: async (village, cell, sector, district, province) => {
    try {
      const params = new URLSearchParams({ village, cell, sector, district, province });
      const response = await fetch(`${BASE_URL}/api/agents?${params}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('fetchAgents error:', error);
      return [];
    }
  },

  fetchPickupLocations: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/pickup-locations`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('fetchPickupLocations error:', error);
      return [];
    }
  }
};
