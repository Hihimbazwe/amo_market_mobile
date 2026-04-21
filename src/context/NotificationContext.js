import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@env';

// ─────────────────────────────────────────────────────────
// In-app API polling was disabled for performance, but 
// we are replacing it with true native Expo Push Notifications.
// ─────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/mobile/chat/conversations/unread-count`, {
          headers: { 'x-user-id': user.id, 'ngrok-skip-browser-warning': 'true' }
        });
        const data = await res.json();
        setUnreadChatCount(data.total || 0);
      } catch (e) {
        console.warn('Failed to fetch unread chat count', e);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000); // Polling every 15s to keep navigation tab fresh
    return () => clearInterval(interval);
  }, [user?.id]);

  // Register push notifications when a user logs in
  useEffect(() => {
    if (!user?.id) return;

    console.log('[PUSH] Attempting registration for user:', user.id);
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log('[PUSH] Token acquired:', token);
        setExpoPushToken(token);
        // Send the token to the backend
        fetch(`${API_BASE_URL}/api/mobile/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'x-user-id': user.id,
          },
          body: JSON.stringify({ token }),
        })
        .then(res => res.json())
        .then(data => console.log('[PUSH] Backend sync response:', data))
        .catch(err => {
          console.error('[PUSH] Failed to sync push token with backend', err);
          Alert.alert('Push Sync Error', 'Could not save token to server: ' + err.message);
        });
      } else {
        console.warn('[PUSH] No token returned from registration');
      }
    }).catch(err => {
      console.error('[PUSH] Registration error:', err);
      Alert.alert('Push Registration Error', err.message);
    });

    // Handle notifications received while app is running foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      // Optional: Add to an internal state array if you want an in-app inbox
    });

    // Handle user tapping the notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
      // Optional: Navigate to a specific screen based on response.notification.request.content.data
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user?.id]);

  return (
    <NotificationContext.Provider value={{ 
      notifications: [], // Return to empty, rely array on push alerts
      unreadCount: unreadChatCount, 
      loading: false, 
      expoPushToken,
      fetchNotifications: () => {},
      markAllAsRead: () => {},
      deleteNotification: () => {},
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

async function registerForPushNotificationsAsync() {
  let token;

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
      console.warn('Failed to get push token for push notification!');
      return;
    }
    
    // Use project ID explicitly or fallback to auto-detection
    try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          console.warn('[PUSH] No EAS Project ID found. Push notifications will not work until you add a projectId to app.json.');
          Alert.alert('Push Setup Required', 'Please add your EAS Project ID to app.json to enable notifications.');
          return;
        }
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch(e) {
        console.error('[PUSH] Error getting Expo Push Token:', e);
        // Fallback without projectId (deprecated but might work in some dev environments)
        try {
          token = (await Notifications.getExpoPushTokenAsync()).data;
        } catch(fallbackErr) {
          console.error('[PUSH] Fallback also failed:', fallbackErr);
          throw new Error('Could not get push token. Ensure you have an EAS Project ID.');
        }
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return token;
}
