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

export const notificationService = {
  getNotifications: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/notifications`, {
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

      if (!response.ok) throw new Error(data.error || 'Failed to fetch notifications');
      return data;
    } catch (error) {
      console.error('getNotifications error:', error);
      throw error;
    }
  },

  markAsRead: async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/notifications`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to mark notifications as read');
      return data;
    } catch (error) {
      console.error('markAsRead error:', error);
      throw error;
    }
  },

  deleteNotification: async (userId, notificationId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/notifications`, {
        method: 'DELETE',
        headers: buildHeaders(userId),
        body: JSON.stringify({ id: notificationId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete notification');
      return data;
    } catch (error) {
      console.error('deleteNotification error:', error);
      throw error;
    }
  }
};
