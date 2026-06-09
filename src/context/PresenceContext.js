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
  const listeners = useRef(new Set());

  const addListener = (cb) => {
    listeners.current.add(cb);
    return () => listeners.current.delete(cb);
  };

  const emit = (event) => {
    listeners.current.forEach(cb => cb(event));
  };

  const connect = (userId) => {
    if (socketRef.current) return;

    // Safety check — if API_BASE_URL is undefined, skip WebSocket
    const baseUrl = API_BASE_URL || 'https://amomarket-cyan.vercel.app';
    if (!baseUrl || typeof baseUrl !== 'string') {
      console.warn('[PRESENCE] API_BASE_URL is not defined, skipping WebSocket connection');
      return;
    }

    try {
      const wsUrl = baseUrl.replace(/^http/, 'ws') + `/ws/presence?userId=${userId}`;
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
        try {
          const data = JSON.parse(e.data);
          emit(data);
        } catch (err) { }
      };

      ws.onerror = (e) => {
        console.warn('[PRESENCE] Error:', e.message);
      };

      ws.onclose = () => {
        console.log('[PRESENCE] Disconnected');
        socketRef.current = null;
        if (AppState.currentState === 'active' && !reconnectTimerRef.current) {
          reconnectTimerRef.current = setInterval(() => connect(userId), 5000);
        }
      };

      socketRef.current = ws;
    } catch (err) {
      console.warn('[PRESENCE] Failed to connect WebSocket - continuing anyway:', err);
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      try {
        socketRef.current.send(JSON.stringify({ type: 'OFFLINE' }));
      } catch (e) { }
      socketRef.current.close();
      socketRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearInterval(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const sendTyping = (conversationId, recipientId) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({
          type: 'TYPING',
          conversationId,
          recipientId
        }));
      } catch (err) {
        console.warn('[PRESENCE] Failed to send typing event:', err);
      }
    }
  };

  const sendStopTyping = (conversationId, recipientId) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({
          type: 'STOP_TYPING',
          conversationId,
          recipientId
        }));
      } catch (err) {
        console.warn('[PRESENCE] Failed to send stop typing event:', err);
      }
    }
  };

  useEffect(() => {
    if (user?.id) {
      connect(user.id);

      try {
        chatService.pingOnlineStatus(user.id);
      } catch (err) {
        console.warn('[PRESENCE] Failed to ping online status:', err);
      }

      const pingInterval = setInterval(() => {
        if (AppState.currentState === 'active') {
          try {
            chatService.pingOnlineStatus(user.id);
          } catch (err) {
            console.warn('[PRESENCE] Ping failed:', err);
          }
        }
      }, 20000);

      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
          connect(user.id);
          try {
            chatService.pingOnlineStatus(user.id);
          } catch (err) {
            console.warn('[PRESENCE] Ping failed on app active:', err);
          }
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
    <PresenceContext.Provider value={{
      isConnected: !!socketRef.current,
      sendTyping,
      sendStopTyping,
      addListener
    }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);