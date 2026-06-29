import { API_BASE_URL } from '@env';

const BASE_URL = API_BASE_URL || 'https://amomarket-cyan.vercel.app';

const commonHeaders = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

// Wraps fetch with a timeout to avoid hanging indefinitely over slow tunnels
const fetchWithTimeout = (url, options = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .then(res => { clearTimeout(timer); return res; })
    .catch(err => {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
      throw err;
    });
};

// Helper inside service to attach user ID
const buildHeaders = (userId) => ({
  ...commonHeaders,
  'x-user-id': userId
});

export const sellerService = {
  // Single consolidated call for the seller overview screen
  getDashboard: async (userId) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/seller/dashboard`, {
        method: 'GET',
        headers: buildHeaders(userId),
      }, 12000);
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
      if (!response.ok) throw new Error(data.error || `Failed to load dashboard (${response.status})`);
      return data;
    } catch (error) {
      console.error('getDashboard error:', error);
      throw error;
    }
  },

  getAnalytics: async (userId, period = '7D') => {
    try {
      let webPeriod = "7 Days";
      if (period === "30D") webPeriod = "30 Days";
      if (period === "3M") webPeriod = "90 Days";
      if (period === "1Y") webPeriod = "1 Year";

      const response = await fetchWithTimeout(`${BASE_URL}/api/seller/analytics?period=${encodeURIComponent(webPeriod)}`, {
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
      if (!response.ok) throw new Error(data.error || `Failed to fetch analytics (${response.status})`);
      return data;
    } catch (error) {
      console.error('getAnalytics error:', error);
      throw error;
    }
  },

  getOrders: async (userId, limit = undefined) => {
    try {
      const url = limit ? `${BASE_URL}/api/seller/orders?limit=${limit}` : `${BASE_URL}/api/seller/orders`;
      const response = await fetchWithTimeout(url, {
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
      if (!response.ok) throw new Error(data.error || `Failed to fetch orders (${response.status})`);
      return data;
    } catch (error) {
      console.error('getOrders error:', error);
      throw error;
    }
  },

  getAgents: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/agents`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(text); }
      if (!response.ok) throw new Error(data.error || `Failed to fetch agents (${response.status})`);
      return data;
    } catch (error) {
      console.error('getAgents error:', error);
      throw error;
    }
  },

  getCouriers: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/couriers`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(text); }
      if (!response.ok) throw new Error(data.error || `Failed to fetch couriers (${response.status})`);
      return data;
    } catch (error) {
      console.error('getCouriers error:', error);
      throw error;
    }
  },

  assignCourier: async (userId, orderId, courierId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/orders/${orderId}/assign-courier`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify({ courierId })
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(text); }
      if (!response.ok) throw new Error(data.error || `Failed to assign courier (${response.status})`);
      return data;
    } catch (error) {
      console.error('assignCourier error:', error);
      throw error;
    }
  },

  assignAgent: async (userId, orderId, agentId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/orders/${orderId}/assign-agent`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify({ agentId })
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(text); }
      if (!response.ok) throw new Error(data.error || `Failed to assign agent (${response.status})`);
      return data;
    } catch (error) {
      console.error('assignAgent error:', error);
      throw error;
    }
  },

  shipOrder: async (userId, orderId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/orders/${orderId}/ship`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(text); }
      if (!response.ok) throw new Error(data.error || `Failed to ship order (${response.status})`);
      return data;
    } catch (error) {
      console.error('shipOrder error:', error);
      throw error;
    }
  },

  markPrepared: async (userId, orderId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/orders/${orderId}/prepare`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(text); }
      if (!response.ok) throw new Error(data.error || `Failed to mark as prepared (${response.status})`);
      return data;
    } catch (error) {
      console.error('markPrepared error:', error);
      throw error;
    }
  },

  verifyPickupCode: async (userId, orderId, pickupCode) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/orders/${orderId}/verify-pickup`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ pickupCode }),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(text); }
      if (!response.ok) throw new Error(data.error || `Failed to verify pickup code (${response.status})`);
      return data;
    } catch (error) {
      console.error('verifyPickupCode error:', error);
      throw error;
    }
  },

  verifyReturnCode: async (userId, orderId, returnCode) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/orders/${orderId}/verify-return`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ returnCode }),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(text); }
      if (!response.ok) throw new Error(data.error || `Failed to verify return code (${response.status})`);
      return data;
    } catch (error) {
      console.error('verifyReturnCode error:', error);
      throw error;
    }
  },

  rejectReturn: async (userId, orderId, reason) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/orders/${orderId}/reject-return`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ reason }),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(text); }
      if (!response.ok) throw new Error(data.error || `Failed to reject return (${response.status})`);
      return data;
    } catch (error) {
      console.error('rejectReturn error:', error);
      throw error;
    }
  },

  getWallet: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/wallet`, {
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
      if (!response.ok) throw new Error(data.error || `Failed to fetch wallet info (${response.status})`);
      return data;
    } catch (error) {
      console.error('getWallet error:', error);
      throw error;
    }
  },

  requestWithdrawal: async (userId, amount, method, details) => {
    try {
      const response = await fetch(`${BASE_URL}/api/wallet`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ amount, method, details })
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to submit withdrawal (${response.status})`);
      return data;
    } catch (error) {
      console.error('requestWithdrawal error:', error);
      throw error;
    }
  },

  getDisputes: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/disputes`, {
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
      if (!response.ok) throw new Error(data.error || `Failed to fetch disputes (${response.status})`);
      return data;
    } catch (error) {
      console.error('getDisputes error:', error);
      throw error;
    }
  },

  getReplacements: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/replacements?_t=${Date.now()}`, {
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
      if (!response.ok) throw new Error(data.error || `Failed to fetch replacements (${response.status})`);
      return data;
    } catch (error) {
      console.error('getReplacements error:', error);
      throw error;
    }
  },

  updateReplacementStatus: async (userId, replacementId, status, action = undefined) => {
    try {
      const payload = {};
      if (status) payload.status = status;
      if (action) payload.action = action;
      
      // Map APPROVED/REJECTED to action for compatibility with Next.js backend PATCH api
      if (status === 'APPROVED') {
        payload.action = 'approve';
        delete payload.status;
      } else if (status === 'REJECTED') {
        payload.action = 'reject';
        delete payload.status;
      }

      const response = await fetch(`${BASE_URL}/api/replacements/${replacementId}`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to update replacement (${response.status})`);
      return data;
    } catch (error) {
      console.error('updateReplacementStatus error:', error);
      throw error;
    }
  },

  verifyReplacementReturn: async (userId, pickupCode) => {
    try {
      const response = await fetch(`${BASE_URL}/api/replacements/verify`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ pickupCode }),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(text); }
      if (!response.ok) throw new Error(data.error || `Verification failed (${response.status})`);
      return data;
    } catch (error) {
      console.error('verifyReplacementReturn error:', error);
      throw error;
    }
  },

  getKycStatus: async (userId) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/seller/kyc`, {
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
      if (!response.ok) throw new Error(data.error || `Failed to fetch KYC (${response.status})`);
      return data;
    } catch (error) {
      console.error('getKycStatus error:', error);
      throw error;
    }
  },

  submitKYC: async (userId, documents) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/kyc`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify(documents)
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to submit KYC (${response.status})`);
      return data;
    } catch (error) {
      console.error('submitKYC error:', error);
      throw error;
    }
  },

  uploadKycFile: async (userId, asset) => {
    try {
      const headers = buildHeaders(userId);
      delete headers['Content-Type'];

      const formData = new FormData();
      const name = asset.name || asset.fileName || `kyc_${Date.now()}.jpg`;
      const type = asset.mimeType || asset.type || (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      formData.append('file', {
        uri: asset.uri,
        type,
        name,
      });

      const response = await fetchWithTimeout(`${BASE_URL}/api/upload`, {
        method: 'POST',
        headers,
        body: formData,
      }, 30000);

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid upload response: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to upload KYC file (${response.status})`);
      return data;
    } catch (error) {
      console.error('uploadKycFile error:', error);
      throw error;
    }
  },

  getMembership: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/membership`, {
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
      if (!response.ok) throw new Error(data.error || `Failed to fetch membership (${response.status})`);
      return data;
    } catch (error) {
      console.error('getMembership error:', error);
      throw error;
    }
  },

  upgradeMembership: async (userId, planId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/membership`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ planId })
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to update membership (${response.status})`);
      return data;
    } catch (error) {
       console.error('upgradeMembership error:', error);
       throw error;
    }
  },

  getProfile: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/profile`, {
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
      if (!response.ok) throw new Error(data.error || `Failed to fetch profile (${response.status})`);
      return data;
    } catch (error) {
      console.error('getProfile error:', error);
      throw error;
    }
  },

  getPublicProfile: async (sellerId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/public/seller/${sellerId}`, {
        method: 'GET',
        headers: commonHeaders,
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to fetch public profile (${response.status})`);
      return data;
    } catch (error) {
      console.error('getPublicProfile error:', error);
      throw error;
    }
  },

  getPaymentMethods: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/payment-methods`, {
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
      if (!response.ok) throw new Error(data.error || `Failed to fetch payment methods (${response.status})`);
      return data;
    } catch (error) {
      console.error('getPaymentMethods error:', error);
      throw error;
    }
  },

  updatePaymentMethods: async (userId, acceptedPayments) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/payment-methods`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify({ acceptedPayments }),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to update payment methods (${response.status})`);
      return data;
    } catch (error) {
      console.error('updatePaymentMethods error:', error);
      throw error;
    }
  },

  updateProfile: async (userId, profileData) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/profile`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify(profileData)
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to update profile (${response.status})`);
      return data;
    } catch (error) {
      console.error('updateProfile error:', error);
      throw error;
    }
  },

  updateLocation: async (userId, locationData) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/location`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify(locationData)
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON from server: ${text.slice(0, 100)}`);
      }
      if (!response.ok) throw new Error(data.error || `Failed to update location (${response.status})`);
      return data;
    } catch (error) {
      console.error('updateLocation error:', error);
      throw error;
    }
  },

  toggleFollow: async (userId, sellerId, action) => {
    try {
      const response = await fetch(`${BASE_URL}/api/mobile/user/follow`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ sellerId, action })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to toggle follow');
      return data;
    } catch (error) {
      console.error('toggleFollow error:', error);
      throw error;
    }
  },

  getFollowStatus: async (userId, sellerId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/mobile/user/follow?sellerId=${encodeURIComponent(sellerId)}`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get follow status');
      return data;
    } catch (error) {
      console.error('getFollowStatus error:', error);
      throw error;
    }
  },

  // Inventory Management
  getInventory: async (userId) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/seller/inventory`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`Invalid JSON: ${text.slice(0, 100)}`); }
      if (!response.ok) throw new Error(data.error || `Failed to fetch inventory (${response.status})`);
      return data;
    } catch (error) {
      console.error('getInventory error:', error);
      throw error;
    }
  },

  updateInventoryStock: async (userId, payload) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/seller/inventory`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`Invalid JSON: ${text.slice(0, 100)}`); }
      if (!response.ok) throw new Error(data.error || `Failed to update inventory (${response.status})`);
      return data;
    } catch (error) {
      console.error('updateInventoryStock error:', error);
      throw error;
    }
  },

  getFollowers: async (userId) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/seller/followers`, {
        method: 'GET',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`Invalid JSON: ${text.slice(0, 100)}`); }
      if (!response.ok) throw new Error(data.error || `Failed to fetch followers (${response.status})`);
      return data;
    } catch (error) {
      console.error('getFollowers error:', error);
      throw error;
    }
  },
};
