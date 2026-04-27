import { API_BASE_URL } from '@env';

const BASE_URL = API_BASE_URL;

const buildHeaders = (userId) => ({
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
  'x-user-id': userId,
});

export const courierService = {
  getShipments: async (userId) => {
    const res = await fetch(`${BASE_URL}/api/courier/shipments`, {
      headers: buildHeaders(userId),
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  },

  getEarnings: async (userId, period = 'month') => {
    const res = await fetch(`${BASE_URL}/api/courier/earnings?period=${period}`, {
      headers: buildHeaders(userId),
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  },

  getProfile: async (userId) => {
    const res = await fetch(`${BASE_URL}/api/courier/profile`, {
      headers: buildHeaders(userId),
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  },

  updateProfile: async (userId, updates) => {
    const res = await fetch(`${BASE_URL}/api/courier/profile`, {
      method: 'PATCH',
      headers: buildHeaders(userId),
      body: JSON.stringify(updates),
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  },

  shareLocation: async (userId, lat, lng) => {
    const res = await fetch(`${BASE_URL}/api/courier/location`, {
      method: 'POST',
      headers: buildHeaders(userId),
      body: JSON.stringify({ lat, lng }),
    });
    return res.ok;
  },

  getAgents: async (userId) => {
    const res = await fetch(`${BASE_URL}/api/agents`, {
      headers: buildHeaders(userId),
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  },

  assignAgent: async (userId, shipmentId, agentId) => {
    const res = await fetch(`${BASE_URL}/api/courier/shipments/${shipmentId}/assign-agent`, {
      method: 'PATCH',
      headers: buildHeaders(userId),
      body: JSON.stringify({ agentId }),
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  },

  updateStatus: async (userId, shipmentId, status) => {
    const res = await fetch(`${BASE_URL}/api/courier/shipments/${shipmentId}/status`, {
      method: 'PATCH',
      headers: buildHeaders(userId),
      body: JSON.stringify({ status }),
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  },
};
