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

export const replacementService = {
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
      } catch (err) {
        data = { error: text };
      }

      if (!response.ok) throw new Error(data.error || 'Failed to fetch replacements');
      return data;
    } catch (error) {
      console.error('getReplacements error:', error);
      throw error;
    }
  },

  requestReplacement: async (userId, orderId, reason, description, evidence = []) => {
    try {
      const response = await fetch(`${BASE_URL}/api/replacements`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ orderId, reason, description, evidence })
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        data = { error: text };
      }

      if (!response.ok) throw new Error(data.error || 'Failed to request replacement');
      return data;
    } catch (error) {
      console.error('requestReplacement error:', error);
      throw error;
    }
  }
};
