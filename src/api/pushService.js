import { API_BASE_URL } from '@env';

const BASE_URL = API_BASE_URL;

const commonHeaders = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

const buildHeaders = (userId) => ({
  ...commonHeaders,
  ...(userId ? { 'x-user-id': userId } : {})
});

export const pushService = {
  /**
   * Registers the Expo push token with the backend for the currently authenticated user.
   * @param {string} userId - The ID of the user.
   * @param {string} token - The Expo push token.
   */
  registerToken: async (userId, token) => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${BASE_URL}/api/user/push-token`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ expoPushToken: token }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        data = { error: text };
      }

      if (!response.ok) throw new Error(data.error || 'Failed to register push token');
      return data;
    } catch (error) {
      console.error('Failed to register push token with backend:', error);
      throw error;
    }
  }
};
