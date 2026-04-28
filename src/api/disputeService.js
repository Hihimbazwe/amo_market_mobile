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
    if (text.trim().startsWith('<!DOCTYPE')) {
      data = { error: 'Server Error (500). Please try again later.' };
    } else {
      data = { error: text || errorMsg };
    }
  }

  if (!response.ok) throw new Error(data.error || errorMsg);
  return data;
};

export const disputeService = {
  getDisputes: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/disputes`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      return await handleResponse(response, 'Failed to fetch disputes');
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
      return await handleResponse(response, 'Failed to create dispute');
    } catch (error) {
      console.error('createDispute error:', error);
      throw error;
    }
  }
};
