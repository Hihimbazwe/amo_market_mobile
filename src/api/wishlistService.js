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

export const wishlistService = {
  getWishlist: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/wishlist`, {
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
        throw new Error(data.error || `Failed to fetch wishlist (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('getWishlist error:', error);
      throw error;
    }
  },

  toggleWishlist: async (userId, productId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/wishlist`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ productId }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to toggle wishlist (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('toggleWishlist error:', error);
      throw error;
    }
  },

  removeFromWishlist: async (userId, productId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/wishlist`, {
        method: 'DELETE',
        headers: buildHeaders(userId),
        body: JSON.stringify({ productId }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to remove from wishlist (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('removeFromWishlist error:', error);
      throw error;
    }
  }
};
