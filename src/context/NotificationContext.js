import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────
// In-app API polling was disabled for performance, but 
// we are replacing it with true native Expo Push Notifications.
// ─────────────────────────────────────────────────────────

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [notificationsList, setNotificationsList] = useState([]);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    const loadStoredNotifications = async () => {
      try {
        const stored = await AsyncStorage.getItem('@notifications_list');
        if (stored) {
          setNotificationsList(JSON.parse(stored));
        }
      } catch (err) {
        console.warn('Failed to load notifications list', err);
      }
    };
    loadStoredNotifications();
  }, []);

  // Dynamically set notification handler based on user settings
  useEffect(() => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: pushNotificationsEnabled,
          shouldPlaySound: pushNotificationsEnabled,
          shouldSetBadge: false,
        }),
      });
    } catch (err) {
      console.error('[PUSH] Error setting notification handler:', err);
    }
  }, [pushNotificationsEnabled]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem('@push_enabled');
        if (stored !== null) {
          setPushNotificationsEnabled(JSON.parse(stored));
        }
      } catch (err) {
        console.warn('Failed to load push settings', err);
      } finally {
        setLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  const togglePushNotifications = async (val) => {
    setPushNotificationsEnabled(val);
    try {
      await AsyncStorage.setItem('@push_enabled', JSON.stringify(val));
    } catch (err) {
      console.error('Failed to save push setting', err);
    }
  };

  const fetchUnread = async () => {
    if (!user?.id) return;
    try {
      const apiUrl = API_BASE_URL || 'https://amomarket-cyan.vercel.app';
      const res = await fetch(`${apiUrl}/api/mobile/chat/conversations/unread-count`, {
        headers: { 'x-user-id': user.id, 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await res.json();
      if (data && typeof data.total === 'number') {
        setUnreadChatCount(data.total);
      }
    } catch (e) {
      console.warn('Failed to fetch unread chat count', e);
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000); // Polling every 15s to keep navigation tab fresh
    return () => clearInterval(interval);
  }, [user?.id]);

  // Register push notifications when a user logs in
  useEffect(() => {
    if (!user?.id || loadingSettings) return;

    const setupPushNotifications = async () => {
      try {
        if (pushNotificationsEnabled) {
          console.log('[PUSH] Attempting registration for user:', user.id);
          const token = await registerForPushNotificationsAsync();
          if (token) {
            console.log('[PUSH] Token acquired:', token);
            setExpoPushToken(token);
            // Send the token to the backend
            try {
              const res = await fetch(`${API_BASE_URL}/api/mobile/push-token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'ngrok-skip-browser-warning': 'true',
                  'x-user-id': user.id,
                },
                body: JSON.stringify({ token }),
              });
              const data = await res.json();
              console.log('[PUSH] Backend sync response:', data);
            } catch (err) {
              console.error('[PUSH] Failed to sync push token with backend', err);
            }
          } else {
            console.warn('[PUSH] No token returned from registration');
          }
        } else {
          // Tell backend to delete push token when notifications are disabled
          console.log('[PUSH] Push notifications disabled. Telling server to unregister token...');
          try {
            const res = await fetch(`${API_BASE_URL}/api/mobile/push-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'x-user-id': user.id,
              },
              body: JSON.stringify({ token: 'DISABLED', enabled: false }),
            });
            const data = await res.json();
            console.log('[PUSH] Backend unregister response:', data);
          } catch (err) {
            console.error('[PUSH] Failed to unregister push token on backend', err);
          }
        }
      } catch (err) {
        console.error('[PUSH] Error in setupPushNotifications:', err);
      }
    };

    setupPushNotifications();

    // Handle notifications received while app is running foreground
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        setNotification(notification);
        const newNotificationItem = {
          id: notification.request.identifier || String(Date.now()),
          title: notification.request.content.title || 'Notification',
          message: notification.request.content.body || '',
          data: notification.request.content.data || {},
          createdAt: new Date().toISOString(),
          read: false,
        };
        setNotificationsList(prev => {
          if (prev.some(n => n.id === newNotificationItem.id)) return prev;
          const updated = [newNotificationItem, ...prev];
          AsyncStorage.setItem('@notifications_list', JSON.stringify(updated)).catch(e => console.warn(e));
          return updated;
        });
      });
    } catch (err) {
      console.error('[PUSH] Error adding notification received listener:', err);
    }

    // Handle user tapping the notification
    try {
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log(response);
        const notification = response.notification;
        const newNotificationItem = {
          id: notification.request.identifier || String(Date.now()),
          title: notification.request.content.title || 'Notification',
          message: notification.request.content.body || '',
          data: notification.request.content.data || {},
          createdAt: new Date().toISOString(),
          read: false,
        };
        setNotificationsList(prev => {
          if (prev.some(n => n.id === newNotificationItem.id)) return prev;
          const updated = [newNotificationItem, ...prev];
          AsyncStorage.setItem('@notifications_list', JSON.stringify(updated)).catch(e => console.warn(e));
          return updated;
        });
      });
    } catch (err) {
      console.error('[PUSH] Error adding notification response listener:', err);
    }

    return () => {
      try {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      } catch (err) {
        console.error('[PUSH] Error removing listeners:', err);
      }
    };
  }, [user?.id, pushNotificationsEnabled]);

  const fetchNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('@notifications_list');
      if (stored) {
        setNotificationsList(JSON.parse(stored));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const markAllAsRead = async () => {
    const updated = notificationsList.map(n => ({ ...n, read: true }));
    setNotificationsList(updated);
    try {
      await AsyncStorage.setItem('@notifications_list', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  const deleteNotification = async (id) => {
    const updated = notificationsList.filter(n => n.id !== id);
    setNotificationsList(updated);
    try {
      await AsyncStorage.setItem('@notifications_list', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  const clearAllNotifications = async () => {
    setNotificationsList([]);
    try {
      await AsyncStorage.removeItem('@notifications_list');
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications: notificationsList,
      unreadCount: notificationsList.filter(n => !n.read).length,
      unreadChatCount: unreadChatCount,
      refreshUnread: fetchUnread,
      loading: false,
      expoPushToken,
      pushNotificationsEnabled,
      togglePushNotifications,
      fetchNotifications,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

async function registerForPushNotificationsAsync() {
  let token;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('[PUSH] Failed to get push token for push notification!');
        return null;
      }

      // Use project ID explicitly or fallback to auto-detection
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          console.warn('[PUSH] No EAS Project ID found. Push notifications will not work until you add a projectId to app.json.');
          return null;
        }
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch (e) {
        console.error('[PUSH] Error getting Expo Push Token:', e);
        // Fallback without projectId (deprecated but might work in some dev environments)
        try {
          token = (await Notifications.getExpoPushTokenAsync()).data;
        } catch (fallbackErr) {
          console.error('[PUSH] Fallback also failed:', fallbackErr);
          return null;
        }
      }
    } else {
      console.warn('[PUSH] Must use physical device for Push Notifications');
    }
  } catch (error) {
    console.error('[PUSH] Unexpected error in registerForPushNotificationsAsync:', error);
    return null;
  }

  return token || null;
}
