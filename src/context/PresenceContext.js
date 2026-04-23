import React, { createContext, useContext, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@env';
import { chatService } from '../api/chatService';

const PresenceContext = createContext(null);

export const PresenceProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const connect = (userId) => {
    if (socketRef.current) return;

    // Convert http(s) to ws(s) and use specific path
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + `/ws/presence?userId=${userId}`;
    console.log('[PRESENCE] Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[PRESENCE] Connected');
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    ws.onmessage = (e) => {
      // Handle server events if needed
    };

    ws.onerror = (e) => {
      console.warn('[PRESENCE] Error:', e.message);
    };

    ws.onclose = () => {
      console.log('[PRESENCE] Disconnected');
      socketRef.current = null;
      // Reconnect attempt if app is active
      if (AppState.currentState === 'active' && !reconnectTimerRef.current) {
         reconnectTimerRef.current = setInterval(() => connect(userId), 5000);
      }
    };

    socketRef.current = ws;
  };

  const disconnect = () => {
    if (socketRef.current) {
      // Send explicit offline before close for speed
      try {
        socketRef.current.send(JSON.stringify({ type: 'OFFLINE' }));
      } catch (e) {}
      socketRef.current.close();
      socketRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearInterval(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (user?.id) {
      connect(user.id);

      // Fallback periodic HTTP ping for reliability
      chatService.pingOnlineStatus(user.id);
      const pingInterval = setInterval(() => {
        if (AppState.currentState === 'active') {
          chatService.pingOnlineStatus(user.id);
        }
      }, 20000); // 20s interval

      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
          connect(user.id);
          chatService.pingOnlineStatus(user.id);
        } else {
          disconnect();
        }
      });

      return () => {
        subscription.remove();
        clearInterval(pingInterval);
        disconnect();
      };
    } else {
      disconnect();
    }
  }, [user?.id]);

  return (
    <PresenceContext.Provider value={{ isConnected: !!socketRef.current }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
