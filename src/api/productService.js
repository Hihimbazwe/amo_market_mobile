import { API_BASE_URL } from '@env';

const BASE_URL = API_BASE_URL;

const commonHeaders = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

export const productService = {
  getProducts: async (filters = {}) => {
    try {
      const { category, province, district } = filters;
      
      let url = `${BASE_URL}/api/products?limit=50`;
      if (category && category !== 'All Categories') {
        url += `&category=${encodeURIComponent(category)}`;
      }
      if (province && province !== 'All Provinces') {
        url += `&province=${encodeURIComponent(province)}`;
      }
      if (district && district !== 'All Districts') {
        url += `&district=${encodeURIComponent(district)}`;
      }
      if (filters.followerId) {
        url += `&followerId=${encodeURIComponent(filters.followerId)}`;
      }

      console.log('[DEBUG] Fetching products from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: commonHeaders,
      });

      const text = await response.text();
      console.log('[DEBUG] Raw response status:', response.status);
      console.log('[DEBUG] Raw response start:', text.slice(0, 200));

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (text?.includes('<html') || text?.includes('<!DOCTYPE')) {
          console.error('[DEBUG] HTML response detected from:', url, text.slice(0, 200));
          throw new Error('Server error: Invalid response format.');
        }
        console.error('[DEBUG] JSON parse error from:', url, text.slice(0, 200));
        throw new Error(`Invalid JSON from server at ${url}: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch products (${response.status}) from ${url}`);
      }

      return data;
    } catch (error) {
      console.error('[DEBUG] getProducts error:', error.message || error);
      throw error;
    }
  },

  getMyProducts: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/mobile/products?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: commonHeaders,
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (text?.includes('<html') || text?.includes('<!DOCTYPE')) {
          throw new Error('Server error: Invalid response format.');
        }
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch products (${response.status})`);
      }
      return data;
    } catch (error) {
      console.error('getMyProducts error:', error);
      throw error;
    }
  },

  createProduct: async (userId, productData) => {
    try {
      const response = await fetch(`${BASE_URL}/api/mobile/products`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ userId, ...productData }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to create product (${response.status})`);
      }
      return data;
    } catch (error) {
      console.error('createProduct error:', error);
      throw error;
    }
  },

  deleteProduct: async (userId, productId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers: {
          ...commonHeaders,
          'x-user-id': userId
        },
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to delete product (${response.status})`);
      }
      return data;
    } catch (error) {
      console.error('deleteProduct error:', error);
      throw error;
    }
  },

  updateProduct: async (userId, productId, updates) => {
    try {
      const response = await fetch(`${BASE_URL}/api/products/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        headers: {
          ...commonHeaders,
          'x-user-id': userId
        },
        body: JSON.stringify(updates),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to update product (${response.status})`);
      }
      return data;
    } catch (error) {
      console.error('updateProduct error:', error);
      throw error;
    }
  },

  uploadToCloudinary: async (media) => {
    try {
      // 1. Get signed auth token payload from our backend helper
      const sigResponse = await fetch(`${BASE_URL}/api/mobile/upload-signature`);
      const sigData = await sigResponse.json();
      
      if (!sigResponse.ok) {
        throw new Error(sigData.error || 'Failed to get upload signature');
      }

      const { apiKey, cloudName, signature, timestamp, folder } = sigData;

      const formData = new FormData();
      const fileType = media.mimeType || (media.type === 'video' ? 'video/mp4' : 'image/jpeg');
      const ext = media.type === 'video' ? 'mp4' : 'jpg';

      formData.append('file', {
        uri: media.uri,
        type: fileType,
        name: `upload_${Date.now()}.${ext}`
      });
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);

      // Cloudinary /auto/upload auto-detects video vs image
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Upload failed');
      }
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }
};
