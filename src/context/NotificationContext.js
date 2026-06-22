import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Load stored notifications on mount
  useEffect(() => {
    const loadStoredNotifications = async () => {
      try {
        const stored = await AsyncStorage.getItem('@notifications_list');
        if (stored) {
          setNotificationsList(JSON.parse(stored));
        }
      } catch (err) {
        console.warn('[NOTIF] Failed to load notifications list:', err);
      }
    };
    loadStoredNotifications();
  }, []);

  // Set notification handler based on user settings
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
      console.warn('[NOTIF] Error setting notification handler:', err);
    }
  }, [pushNotificationsEnabled]);

  // Load push notification settings from storage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem('@push_enabled');
        if (stored !== null) {
          setPushNotificationsEnabled(JSON.parse(stored));
        }
      } catch (err) {
        console.warn('[NOTIF] Failed to load push settings:', err);
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
      console.warn('[NOTIF] Failed to save push setting:', err);
    }
  };

  // Fetch unread chat count
  const fetchUnread = async () => {
    if (!user?.id) return;
    try {
      const apiUrl = API_BASE_URL || 'https://amomarket-cyan.vercel.app';
      const res = await fetch(`${apiUrl}/api/mobile/chat/conversations/unread-count`, {
        headers: {
          'x-user-id': user.id,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await res.json();
      if (data && typeof data.total === 'number') {
        setUnreadChatCount(data.total);
      }
    } catch (e) {
      console.warn('[NOTIF] Failed to fetch unread chat count:', e);
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Setup push notifications when user logs in
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

            // Sync token to backend — failure here must never crash the app
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
              console.warn('[PUSH] Failed to sync token with backend - continuing anyway:', err);
            }
          } else {
            console.warn('[PUSH] No token returned - push notifications unavailable');
          }
        } else {
          // Unregister token on backend when notifications disabled
          try {
            await fetch(`${API_BASE_URL}/api/mobile/push-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'x-user-id': user.id,
              },
              body: JSON.stringify({ token: 'DISABLED', enabled: false }),
            });
          } catch (err) {
            console.warn('[PUSH] Failed to unregister token on backend - continuing anyway:', err);
          }
        }
      } catch (err) {
        // This catch is the last safety net — NEVER let push setup crash the app
        console.warn('[PUSH] Push setup failed - app continues normally:', err);
      }
    };

    // Fire and forget — push failure must never block the app
    setupPushNotifications();

    // Listen for notifications received in foreground
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        try {
          setNotification(notification);
          const newItem = {
            id: notification.request.identifier || String(Date.now()),
            title: notification.request.content.title || 'Notification',
            message: notification.request.content.body || '',
            data: notification.request.content.data || {},
            createdAt: new Date().toISOString(),
            read: false,
          };
          setNotificationsList(prev => {
            if (prev.some(n => n.id === newItem.id)) return prev;
            const updated = [newItem, ...prev];
            AsyncStorage.setItem('@notifications_list', JSON.stringify(updated)).catch(e =>
              console.warn('[NOTIF] Failed to persist notification:', e)
            );
            return updated;
          });
        } catch (err) {
          console.warn('[NOTIF] Error handling received notification:', err);
        }
      });
    } catch (err) {
      console.warn('[NOTIF] Error adding notification received listener:', err);
    }

    // Listen for user tapping a notification
    try {
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        try {
          const notif = response.notification;
          const newItem = {
            id: notif.request.identifier || String(Date.now()),
            title: notif.request.content.title || 'Notification',
            message: notif.request.content.body || '',
            data: notif.request.content.data || {},
            createdAt: new Date().toISOString(),
            read: false,
          };
          setNotificationsList(prev => {
            if (prev.some(n => n.id === newItem.id)) return prev;
            const updated = [newItem, ...prev];
            AsyncStorage.setItem('@notifications_list', JSON.stringify(updated)).catch(e =>
              console.warn('[NOTIF] Failed to persist notification:', e)
            );
            return updated;
          });
        } catch (err) {
          console.warn('[NOTIF] Error handling notification response:', err);
        }
      });
    } catch (err) {
      console.warn('[NOTIF] Error adding notification response listener:', err);
    }

    return () => {
      try {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      } catch (err) {
        console.warn('[NOTIF] Error removing listeners:', err);
      }
    };
  }, [user?.id, pushNotificationsEnabled, loadingSettings]);

  const fetchNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('@notifications_list');
      if (stored) {
        setNotificationsList(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('[NOTIF] Failed to fetch notifications:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const updated = notificationsList.map(n => ({ ...n, read: true }));
      setNotificationsList(updated);
      await AsyncStorage.setItem('@notifications_list', JSON.stringify(updated));
    } catch (e) {
      console.warn('[NOTIF] Failed to mark all as read:', e);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const updated = notificationsList.filter(n => n.id !== id);
      setNotificationsList(updated);
      await AsyncStorage.setItem('@notifications_list', JSON.stringify(updated));
    } catch (e) {
      console.warn('[NOTIF] Failed to delete notification:', e);
    }
  };

  const clearAllNotifications = async () => {
    try {
      setNotificationsList([]);
      await AsyncStorage.removeItem('@notifications_list');
    } catch (e) {
      console.warn('[NOTIF] Failed to clear notifications:', e);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications: notificationsList,
        unreadCount: notificationsList.filter(n => !n.read).length,
        unreadChatCount,
        refreshUnread: fetchUnread,
        loading: false,
        expoPushToken,
        pushNotificationsEnabled,
        togglePushNotifications,
        fetchNotifications,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

// ─── Push Token Registration ───────────────────────────────────────────────

async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      } catch (err) {
        console.warn('[PUSH] Failed to set notification channel:', err);
      }
    }

    if (!Device.isDevice) {
      console.warn('[PUSH] Must use physical device for push notifications');
      return null;
    }

    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[PUSH] Permission not granted - skipping token registration');
      return null;
    }

    // Get project ID from app config
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn('[PUSH] No EAS projectId found in app.json — push notifications disabled');
      return null;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      return tokenData.data;
    } catch (err) {
      console.warn('[PUSH] Failed to get push token:', err);
      return null;
    }
  } catch (error) {
    console.warn('[PUSH] Unexpected error in registerForPushNotificationsAsync:', error);
    return null;
  }
}