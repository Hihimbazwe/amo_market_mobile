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

export const cartService = {
  getCart: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/cart`, {
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
        throw new Error(data.error || `Failed to fetch cart (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('getCart error:', error);
      throw error;
    }
  },

  addToCart: async (userId, productId, quantity = 1, selectedVariants = {}) => {
    try {
      const response = await fetch(`${BASE_URL}/api/cart`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ productId, quantity, selectedVariants }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to add to cart (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('addToCart error:', error);
      throw error;
    }
  },

  updateCartItem: async (userId, productId, quantity) => {
    try {
      const response = await fetch(`${BASE_URL}/api/cart`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify({ productId, quantity }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to update cart (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('updateCartItem error:', error);
      throw error;
    }
  },

  removeFromCart: async (userId, productId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/cart`, {
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
        throw new Error(data.error || `Failed to remove from cart (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('removeFromCart error:', error);
      throw error;
    }
  },

  clearCart: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/cart`, {
        method: 'DELETE',
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
        throw new Error(data.error || `Failed to clear cart (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('clearCart error:', error);
      throw error;
    }
  }
};
