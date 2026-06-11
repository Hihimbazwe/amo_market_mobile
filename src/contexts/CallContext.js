import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Constants from 'expo-constants';

let RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices;
let isWebRTCSupported = false;

if (Constants.appOwnership !== 'expo') {
  try {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnection = webrtc.RTCPeerConnection;
    RTCIceCandidate = webrtc.RTCIceCandidate;
    RTCSessionDescription = webrtc.RTCSessionDescription;
    mediaDevices = webrtc.mediaDevices;
    isWebRTCSupported = true;
  } catch (e) {
    console.warn('WebRTC not supported in this environment');
  }
}

import io from 'socket.io-client';
import { API_BASE_URL } from '@env';
import { useAuth } from '../context/AuthContext';
import { Alert, Vibration } from 'react-native';
import { chatService } from '../api/chatService';
import { setIncomingCallNotificationHandler } from '../utils/callNotificationBridge';

const CallContext = createContext(null);
const CALL_TIMEOUT_MS = 45000;

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const { user } = useAuth();

  const [callState, setCallState] = useState('IDLE');
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [activeCallData, setActiveCallData] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectedAt, setConnectedAt] = useState(null);
  const [endedInfo, setEndedInfo] = useState(null);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const callFinalizedRef = useRef(false);
  const activeCallRef = useRef(null);
  const incomingCallRef = useRef(null);
  const connectedAtRef = useRef(null);
  const sentCallLogsRef = useRef(new Set());
  const callStateRef = useRef(null);

  useEffect(() => {
    activeCallRef.current = activeCallData;
  }, [activeCallData]);

  useEffect(() => {
    incomingCallRef.current = incomingCallData;
  }, [incomingCallData]);

  useEffect(() => {
    connectedAtRef.current = connectedAt;
  }, [connectedAt]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const clearCallTimeout = () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  const startRingingFeedback = (pattern = [0, 900, 700]) => {
    try {
      Vibration.vibrate(pattern, true);
    } catch (err) {
      console.warn('[CallContext] ringtone vibration error:', err);
    }
  };

  const stopRingingFeedback = () => {
    try {
      Vibration.cancel();
    } catch (err) {
      console.warn('[CallContext] stop vibration error:', err);
    }
  };

  const getDurationSeconds = () => {
    const started = connectedAtRef.current;
    if (!started) return 0;
    return Math.max(0, Math.round((Date.now() - started) / 1000));
  };

  const writeCallLog = async (callData, status, direction, durationSeconds = 0) => {
    if (!user?.id || !callData?.targetId || !callData?.conversationId) {
      console.warn('[CallContext] writeCallLog missing required data', { userId: user?.id, callData });
      return;
    }

    const callId = callData.callId || `${callData.callerId || 'unknown'}-${Date.now()}`;
    if (sentCallLogsRef.current.has(callId)) {
      console.log('[CallContext] Skipping duplicate call log for', callId);
      return;
    }

    try {
      const payload = {
        type: callData.isVideo ? 'video' : 'voice',
        status,
        direction,
        durationSeconds,
        callId,
        createdAt: new Date().toISOString(),
      };
      console.log('[CallContext] Writing call log', callData.conversationId, user.id, callData.targetId, payload);
      await chatService.sendCallLog(callData.conversationId, user.id, callData.targetId, payload);
      sentCallLogsRef.current.add(callId);
    } catch (err) {
      console.warn('[CallContext] Failed to write call log:', err);
    }
  };

  const finishCall = async ({ status, direction, remote = false, notifyRemote = true, durationSeconds = 0 } = {}) => {
    if (callFinalizedRef.current && status !== 'missed') return;
    callFinalizedRef.current = true;
    clearCallTimeout();
    stopRingingFeedback();

    const callData = activeCallRef.current || incomingCallRef.current;
    const resolvedStatus = status || (connectedAtRef.current ? 'completed' : 'canceled');
    const resolvedDirection = direction || callData?.direction || 'outgoing';
    const finalDuration = resolvedStatus === 'completed' ? (durationSeconds || getDurationSeconds()) : 0;

    try {
      if (notifyRemote && callData?.targetId) {
        if (resolvedStatus === 'declined') {
          socketRef.current?.emit('reject_call', {
            callerId: callData.targetId,
            targetId: user.id,
            callId: callData.callId,
            conversationId: callData.conversationId,
          });
        } else if (resolvedStatus === 'missed') {
          socketRef.current?.emit('miss_call', {
            callerId: callData.targetId,
            targetId: user.id,
            callId: callData.callId,
            conversationId: callData.conversationId,
          });
        } else {
          socketRef.current?.emit('end_call', {
            toUserId: callData.targetId,
            callId: callData.callId,
            status: resolvedStatus,
            durationSeconds: finalDuration,
            conversationId: callData.conversationId,
          });
        }
      }
    } catch (err) {
      console.warn('[CallContext] finishCall signal error:', err);
    }

    if (callData) {
      await writeCallLog(callData, resolvedStatus, resolvedDirection, finalDuration);
    }

    setEndedInfo({ status: resolvedStatus, durationSeconds: finalDuration, remote });
    setCallState(resolvedStatus === 'declined' ? 'DECLINED' : 'ENDED');
    setTimeout(() => cleanupCall(), 1200);
  };

  const scheduleCallTimeout = (callData, direction) => {
    clearCallTimeout();
    callTimeoutRef.current = setTimeout(() => {
      if (direction === 'incoming') {
        finishCall({ status: 'missed', direction: 'incoming', notifyRemote: true });
      } else {
        finishCall({ status: 'canceled', direction: 'outgoing', notifyRemote: true });
      }
    }, CALL_TIMEOUT_MS);
  };

  const receiveIncomingCall = (data) => {
    if (!data?.callerId || data.callerId === user?.id) return;
    const normalized = {
      callId: data.callId || `${data.callerId}-${Date.now()}`,
      targetId: data.callerId,
      targetName: data.callerName || 'AmoMarket user',
      callerId: data.callerId,
      callerName: data.callerName || 'AmoMarket user',
      isVideo: data.isVideo === true || data.type === 'video',
      conversationId: data.conversationId,
      direction: 'incoming',
    };

    callFinalizedRef.current = false;
    setIncomingCallData(normalized);
    setActiveCallData(normalized);
    setConnectedAt(null);
    setEndedInfo(null);
    setCallState('RINGING');
    startRingingFeedback();
    scheduleCallTimeout(normalized, 'incoming');
    socketRef.current?.emit('ringing_call', {
      callerId: normalized.callerId,
      targetId: user?.id,
      callId: normalized.callId,
      conversationId: normalized.conversationId,
    });
  };

  useEffect(() => {
    const unsubscribe = setIncomingCallNotificationHandler(receiveIncomingCall);
    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Safety: get a valid base URL with fallback
    const baseUrl = API_BASE_URL || 'https://amomarket-cyan.vercel.app';

    if (!baseUrl || typeof baseUrl !== 'string') {
      console.warn('[CallContext] API_BASE_URL is not defined, skipping signaling connection');
      return;
    }

    let signalingUrl = baseUrl;
    try {
      const urlObj = new URL(baseUrl);
      urlObj.port = '3001';
      signalingUrl = urlObj.toString();
    } catch (e) {
      try {
        signalingUrl = baseUrl.replace(/:\d+$/, ':3001');
      } catch (replaceErr) {
        console.warn('[CallContext] Failed to parse signaling URL, using base URL:', replaceErr);
        signalingUrl = baseUrl;
      }
    }

    try {
      socketRef.current = io(signalingUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 5000,
      });

      socketRef.current.on('connect', () => {
        console.log('[CallContext] Connected to signaling server', signalingUrl, socketRef.current.id);
        // Attempt register with ack and retry if necessary
        tryRegister();
      });

      socketRef.current.on('connect_error', (err) => {
        console.warn('[CallContext] signaling connect_error', err);
      });

      socketRef.current.on('reconnect_attempt', (attempt) => {
        console.log(`[CallContext] reconnect attempt ${attempt}`);
      });

      socketRef.current.on('reconnect_failed', () => {
        console.error('[CallContext] reconnect_failed');
      });

      socketRef.current.on('registered', (data) => {
        console.log('[CallContext] Received server registered event', data);
      });

      socketRef.current.on('incoming_call', (data) => {
        console.log('[CallContext] Incoming call from', data.callerId, 'data:', data);
        receiveIncomingCall(data);
      });

      socketRef.current.on('call_ringing', () => {
        console.log('[CallContext] Remote is ringing - transitioning from CALLING to RINGING');
        if (!connectedAtRef.current && callStateRef.current === 'CALLING') {
          setCallState('RINGING');
        }
      });

      socketRef.current.on('call_accepted', async (data) => {
        console.log('[CallContext] Call accepted by', data.targetId);
        clearCallTimeout();
        stopRingingFeedback();
        const now = Date.now();
        setConnectedAt(now);
        setCallState('CONNECTED');
        await createOffer(data.targetId);
      });

      socketRef.current.on('call_rejected', async () => {
        console.log('[CallContext] Call rejected');
        await finishCall({ status: 'declined', direction: 'outgoing', remote: true, notifyRemote: false });
      });

      socketRef.current.on('call_missed', async () => {
        console.log('[CallContext] Call missed by remote');
        await finishCall({ status: 'missed', direction: 'outgoing', remote: true, notifyRemote: false });
      });

      socketRef.current.on('call_ended', async (data) => {
        console.log('[CallContext] Call ended by remote');
        const status = data?.status === 'canceled' ? 'canceled' : (connectedAtRef.current ? 'completed' : 'canceled');
        await finishCall({
          status,
          direction: activeCallRef.current?.direction || 'incoming',
          remote: true,
          notifyRemote: false,
          durationSeconds: data?.durationSeconds,
        });
      });

      socketRef.current.on('webrtc_offer', async (data) => {
        try {
          if (!pcRef.current) await setupPeerConnection(data.callerId || data.targetId);
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socketRef.current.emit('webrtc_answer', { targetId: data.callerId, sdp: answer });
        } catch (err) {
          console.warn('[CallContext] Error handling webrtc_offer:', err);
        }
      });

      socketRef.current.on('webrtc_answer', async (data) => {
        try {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
          }
        } catch (err) {
          console.warn('[CallContext] Error handling webrtc_answer:', err);
        }
      });

      socketRef.current.on('ice_candidate', async (data) => {
        try {
          if (pcRef.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        } catch (e) {
          console.warn('[CallContext] Error adding ICE candidate:', e);
        }
      });
    } catch (err) {
      console.warn('[CallContext] Failed to connect to signaling server - continuing anyway:', err);
    }

    return () => {
      try {
        cleanupCall();
        socketRef.current?.disconnect();
      } catch (err) {
        console.warn('[CallContext] Cleanup error:', err);
      }
    };
  }, [user?.id]);

  const setupPeerConnection = async (targetId, isVideo = true) => {
    try {
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      pcRef.current = new RTCPeerConnection(configuration);

      try {
        const stream = await mediaDevices.getUserMedia({ audio: true, video: isVideo });
        setLocalStream(stream);
        localStreamRef.current = stream;
        stream.getTracks().forEach((track) => pcRef.current.addTrack(track, stream));
      } catch (err) {
        console.warn('[CallContext] getUserMedia error:', err);
      }

      pcRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit('ice_candidate', { targetId, candidate: event.candidate });
        }
      };

      pcRef.current.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };
    } catch (err) {
      console.warn('[CallContext] setupPeerConnection error:', err);
    }
  };

  // Attempt to register with server using ack; retry until success
  const tryRegister = (attempt = 0) => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.log('[CallContext] Socket not connected yet, will retry register in 1s');
      setTimeout(() => tryRegister(attempt + 1), 1000);
      return;
    }
    try {
      socketRef.current.emit('register', user.id, (ack) => {
        if (ack && ack.ok) {
          console.log('[CallContext] Registered with signaling server (ack):', ack.userId);
        } else {
          console.warn('[CallContext] Register ack failed, retrying in 1s', ack);
          setTimeout(() => tryRegister(attempt + 1), 1000);
        }
      });
    } catch (err) {
      console.warn('[CallContext] register emit error, retrying in 1s', err);
      setTimeout(() => tryRegister(attempt + 1), 1000);
    }
  };

  const startCall = async (targetUserId, targetUserName, isVideo = true, metadata = {}) => {
    if (!isWebRTCSupported) {
      Alert.alert('Not Supported', 'Calling is not available in Expo Go. Please use a development build.');
      return;
    }
    try {
      const callData = {
        targetId: targetUserId,
        targetName: targetUserName,
        isVideo,
        callId: metadata.callId || `${user.id}-${targetUserId}-${Date.now()}`,
        conversationId: metadata.conversationId,
        direction: 'outgoing',
      };
      callFinalizedRef.current = false;
      setActiveCallData(callData);
      setIncomingCallData(null);
      setConnectedAt(null);
      setEndedInfo(null);
      setCallState('CALLING');
      startRingingFeedback([0, 650, 900]);
      scheduleCallTimeout(callData, 'outgoing');
      await setupPeerConnection(targetUserId, isVideo);
      socketRef.current?.emit('call_user', {
        callerId: user.id,
        callerName: user.name || 'A user',
        targetId: targetUserId,
        isVideo,
        callId: callData.callId,
        conversationId: callData.conversationId,
      });
    } catch (err) {
      console.warn('[CallContext] startCall error:', err);
    }
  };

  const acceptCall = async () => {
    if (!incomingCallData) return;
    try {
      clearCallTimeout();
      stopRingingFeedback();
      setActiveCallData({
        ...incomingCallData,
        targetId: incomingCallData.callerId,
        targetName: incomingCallData.callerName,
        direction: 'incoming',
      });
      const now = Date.now();
      setConnectedAt(now);
      setCallState('CONNECTED');
      setIncomingCallData(null);
      await setupPeerConnection(incomingCallData.callerId, incomingCallData.isVideo);
      socketRef.current?.emit('accept_call', {
        callerId: incomingCallData.callerId,
        targetId: user.id,
        callId: incomingCallData.callId,
        conversationId: incomingCallData.conversationId,
      });
    } catch (err) {
      console.warn('[CallContext] acceptCall error:', err);
    }
  };

  const declineCall = () => {
    if (!incomingCallData) return;
    finishCall({ status: 'declined', direction: 'incoming', notifyRemote: true });
  };

  const endCall = () => {
    const direction = activeCallRef.current?.direction || (incomingCallRef.current ? 'incoming' : 'outgoing');
    const status = connectedAtRef.current ? 'completed' : (direction === 'incoming' ? 'declined' : 'canceled');
    finishCall({ status, direction, notifyRemote: true });
  };

  const cleanupCall = () => {
    try {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      clearCallTimeout();
      stopRingingFeedback();
    } catch (err) {
      console.warn('[CallContext] cleanupCall error:', err);
    }
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCallData(null);
    setIncomingCallData(null);
    setConnectedAt(null);
    setEndedInfo(null);
    setCallState('IDLE');
    setIsMuted(false);
    setIsVideoEnabled(true);
    callFinalizedRef.current = false;
  };

  const createOffer = async (targetId) => {
    try {
      if (!pcRef.current) return;
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketRef.current?.emit('webrtc_offer', { targetId, sdp: offer });
    } catch (err) {
      console.warn('[CallContext] createOffer error:', err);
    }
  };

  const toggleMute = () => {
    try {
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          setIsMuted(!audioTrack.enabled);
        }
      }
    } catch (err) {
      console.warn('[CallContext] toggleMute error:', err);
    }
  };

  const toggleVideo = () => {
    try {
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
          setIsVideoEnabled(videoTrack.enabled);
        }
      }
    } catch (err) {
      console.warn('[CallContext] toggleVideo error:', err);
    }
  };

  const switchCamera = () => {
    try {
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack && typeof videoTrack._switchCamera === 'function') {
          videoTrack._switchCamera();
        }
      }
    } catch (err) {
      console.warn('[CallContext] switchCamera error:', err);
    }
  };

  return (
    <CallContext.Provider value={{
      callState,
      incomingCallData,
      activeCallData,
      localStream,
      remoteStream,
      isMuted,
      isVideoEnabled,
      connectedAt,
      endedInfo,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      toggleVideo,
      switchCamera
    }}>
      {children}
    </CallContext.Provider>
  );
};
