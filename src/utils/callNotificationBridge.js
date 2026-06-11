let incomingCallHandler = null;

export const setIncomingCallNotificationHandler = (handler) => {
  incomingCallHandler = handler;
  console.log('[CallNotificationBridge] Incoming call handler registered');
  return () => {
    if (incomingCallHandler === handler) {
      incomingCallHandler = null;
      console.log('[CallNotificationBridge] Incoming call handler removed');
    }
  };
};

export const notifyIncomingCallFromPush = (data) => {
  console.log('[CallNotificationBridge] notifyIncomingCallFromPush called with:', data);
  if (incomingCallHandler && data) {
    try {
      incomingCallHandler(data);
    } catch (err) {
      console.warn('[CallNotificationBridge] Error invoking incomingCallHandler:', err);
    }
  } else {
    console.warn('[CallNotificationBridge] No incomingCallHandler registered or invalid data', !!incomingCallHandler, data);
  }
};
