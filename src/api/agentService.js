import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

const API_URL = API_BASE_URL;


// Common headers for all API calls — ngrok-skip-browser-warning bypasses
// ngrok's HTML interstitial page that breaks non-browser (mobile) fetch calls
const commonHeaders = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

const buildHeaders = async () => {
    const storedUser = await AsyncStorage.getItem('@auth_user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    return {
        ...commonHeaders,
        ...(user?.id ? { 'x-user-id': user.id } : {})
    };
};

/**
 * Service for Agent-related API calls
 */
export const agentService = {
  /**
   * Get agent dashboard statistics and profile info
   */
  getProfile: async () => {
    try {
      const headers = await buildHeaders();
      const response = await fetch(`${API_URL}/api/agent/profile`, { headers });
      
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (responseText?.includes('<html') || responseText?.includes('<!DOCTYPE')) {
          throw new Error('Server error: Invalid response format.');
        }
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch agent profile');
      }
      return data;
    } catch (error) {
      console.error('AgentProfile Error:', error);
      throw error;
    }
  },

  /**
   * Get agent orders (active and completed)
   */
  getOrders: async () => {
    try {
      const headers = await buildHeaders();
      const response = await fetch(`${API_URL}/api/agent/orders`, { headers });
      
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch agent orders');
      }
      return data;
    } catch (error) {
      console.error('AgentOrders Error:', error);
      throw error;
    }
  },

  /**
   * Get pending delivery requests
   */
  getDeliveryRequests: async () => {
    try {
      const headers = await buildHeaders();
      const response = await fetch(`${API_URL}/api/agent/delivery-requests`, { headers });
      
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch delivery requests');
      }
      return data;
    } catch (error) {
      console.error('DeliveryRequests Error:', error);
      throw error;
    }
  },

  /**
   * Accept or reject a delivery request
   */
  handleDeliveryAction: async (orderId, action, note = '') => {
    try {
      const headers = await buildHeaders();
      const response = await fetch(`${API_URL}/api/agent/delivery-requests`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ orderId, action, note }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} delivery`);
      }
      return data;
    } catch (error) {
      console.error('DeliveryAction Error:', error);
      throw error;
    }
  },

  /**
   * Update agent GPS location
   */
  updateLocation: async (lat, lng) => {
    try {
      const headers = await buildHeaders();
      const response = await fetch(`${API_URL}/api/agent/gps`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ lat, lng }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update location');
      }
      return data;
    } catch (error) {
      console.error('GPSUpdate Error:', error);
      throw error;
    }
  },

  /**
   * Get agent coverage areas
   */
  getCoverage: async () => {
    try {
      const headers = await buildHeaders();
      const response = await fetch(`${API_URL}/api/agents`, { headers });
      
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch coverage');
      }
      return data;
    } catch (error) {
      console.error('Coverage Error:', error);
      throw error;
    }
  },

  /**
   * Upload a file to the server
   */
  uploadFile: async (fileUri) => {
    try {
      const headers = await buildHeaders();
      // Remove content-type to let fetch set it with boundary for FormData
      delete headers['Content-Type'];

      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: 'image/jpeg', // Defaulting to jpeg for images
        name: `upload_${Date.now()}.jpg`
      });

      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid server response during upload');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } catch (error) {
      console.error('uploadFile error:', error);
      throw error;
    }
  },

  /**
   * Update agent profile (e.g., for verification docs)
   */
  updateProfile: async (profileData) => {
    try {
      const headers = await buildHeaders();
      const response = await fetch(`${API_URL}/api/agent/profile`, {
        method: 'POST',
        headers,
        body: JSON.stringify(profileData)
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      return data;
    } catch (error) {
      console.error('updateProfile error:', error);
      throw error;
    }
  }
};
