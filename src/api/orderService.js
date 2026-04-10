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

export const orderService = {
  getOrders: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/orders`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        data = { error: text };
      }

      if (!response.ok) throw new Error(data.error || 'Failed to fetch orders');
      return data;
    } catch (error) {
      console.error('getOrders error:', error);
      throw error;
    }
  },

  getOrderDetails: async (userId, orderId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        data = { error: text };
      }

      if (!response.ok) throw new Error(data.error || 'Failed to fetch order details');
      return data;
    } catch (error) {
      console.error('getOrderDetails error:', error);
      throw error;
    }
  }
};
