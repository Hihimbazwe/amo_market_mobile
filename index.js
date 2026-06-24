import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';
import { notifyIncomingCallFromPush } from './src/utils/callNotificationBridge';

import App from './App';

// ─── Background / Killed-App Push Handler ────────────────────────────────────
// This handler fires when a push notification arrives while the app is in the
// background or has been completely killed. Expo's task manager executes this
// in a headless JS context before the React tree mounts, so we route the
// incoming-call payload through the notification bridge which CallContext
// subscribes to once it mounts.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data || {};

    // Give high-priority / full-screen treatment to incoming call pushes
    if (data.type === 'INCOMING_CALL') {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

// When a user taps the incoming-call notification (app was backgrounded),
// forward the data to CallContext so the RINGING UI appears immediately.
Notifications.addNotificationResponseReceivedListener((response) => {
  try {
    const data = response.notification.request.content.data || {};
    if (data.type === 'INCOMING_CALL') {
      console.log('[index.js] User tapped incoming-call notification, forwarding to CallContext');
      notifyIncomingCallFromPush(data);
    }
  } catch (err) {
    console.warn('[index.js] Error handling notification tap:', err);
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);
