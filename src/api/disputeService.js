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

export const disputeService = {
  getDisputes: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/disputes`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch disputes');
      return data;
    } catch (error) {
      console.error('getDisputes error:', error);
      throw error;
    }
  },

  createDispute: async (userId, disputeData) => {
    try {
      const response = await fetch(`${BASE_URL}/api/disputes`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify(disputeData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create dispute');
      return data;
    } catch (error) {
      console.error('createDispute error:', error);
      throw error;
    }
  }
};
