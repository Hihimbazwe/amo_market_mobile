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

const handleResponse = async (response, errorMsg) => {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    // If text starts with <!DOCTYPE it's likely a 500 error page from Next.js
    if (text.trim().startsWith('<!DOCTYPE')) {
      data = { error: 'Server Error (500). Please try again later.' };
    } else {
      data = { error: text || errorMsg };
    }
  }

  if (!response.ok) throw new Error(data.error || errorMsg);
  return data;
};

export const orderService = {
  getOrders: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/orders`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      return await handleResponse(response, 'Failed to fetch orders');
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
      return await handleResponse(response, 'Failed to fetch order details');
    } catch (error) {
      console.error('getOrderDetails error:', error);
      throw error;
    }
  },

  getAgentLocation: async (userId, agentId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/agent/gps?agentId=${agentId}`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      return await handleResponse(response, 'Failed to fetch agent location');
    } catch (error) {
      console.error('getAgentLocation error:', error);
      throw error;
    }
  },

  rateAgent: async (userId, ratingData) => {
    try {
      const response = await fetch(`${BASE_URL}/api/agent/ratings`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify(ratingData),
      });
      return await handleResponse(response, 'Failed to submit rating');
    } catch (error) {
      console.error('rateAgent error:', error);
      throw error;
    }
  },

  getDeliveryCode: async (userId, orderId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/orders/${orderId}/qr`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      return await handleResponse(response, 'Failed to fetch delivery code');
    } catch (error) {
      console.error('getDeliveryCode error:', error);
      throw error;
    }
  }
};
