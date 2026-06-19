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
import { API_BASE_URL, SIGNALING_URL } from '@env';
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

  // ICE candidate queue — holds candidates that arrive before remote description is set
  const pendingIceCandidatesRef = useRef([]);
  const remoteDescriptionSetRef = useRef(false);

  useEffect(() => { activeCallRef.current = activeCallData; }, [activeCallData]);
  useEffect(() => { incomingCallRef.current = incomingCallData; }, [incomingCallData]);
  useEffect(() => { connectedAtRef.current = connectedAt; }, [connectedAt]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const clearCallTimeout = () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  const startRingingFeedback = (pattern = [0, 900, 700]) => {
    try { Vibration.vibrate(pattern, true); } catch (err) {
      console.warn('[CallContext] ringtone vibration error:', err);
    }
  };

  const stopRingingFeedback = () => {
    try { Vibration.cancel(); } catch (err) {
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
        finishCall({ status: 'missed', direction: 'outgoing', notifyRemote: true });
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

  // Helper to drain queued ICE candidates once remote description is set
  const drainPendingIceCandidates = async () => {
    if (!pcRef.current || pendingIceCandidatesRef.current.length === 0) return;
    console.log(`[CallContext] Draining ${pendingIceCandidatesRef.current.length} queued ICE candidates`);
    for (const candidate of pendingIceCandidatesRef.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[CallContext] Error adding queued ICE candidate:', e);
      }
    }
    pendingIceCandidatesRef.current = [];
  };

  useEffect(() => {
    if (!user?.id) return;

    const signalingUrl = SIGNALING_URL || API_BASE_URL;

    if (!signalingUrl || typeof signalingUrl !== 'string') {
      console.warn('[CallContext] No signaling URL available, skipping signaling connection');
      return;
    }

    console.log('[CallContext] Connecting to signaling server at:', signalingUrl);

    try {
      socketRef.current = io(signalingUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      socketRef.current.on('connect', () => {
        console.log('[CallContext] Connected to signaling server:', signalingUrl, socketRef.current.id);
        tryRegister();
      });

      socketRef.current.on('connect_error', (err) => {
        console.warn('[CallContext] signaling connect_error:', err.message, '| URL:', signalingUrl);
      });

      socketRef.current.on('reconnect_attempt', (attempt) => {
        console.log(`[CallContext] reconnect attempt ${attempt}`);
      });

      socketRef.current.on('reconnect_failed', () => {
        console.error('[CallContext] reconnect_failed — signaling server unreachable');
      });

      socketRef.current.on('registered', (data) => {
        console.log('[CallContext] Registered with signaling server:', data);
      });

      socketRef.current.on('incoming_call', (data) => {
        console.log('[CallContext] Incoming call from', data.callerId, data);
        receiveIncomingCall(data);
      });

      socketRef.current.on('call_ringing', () => {
        console.log('[CallContext] Remote is ringing');
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

      // Callee receives offer → set remote description → drain ICE queue → send answer
      socketRef.current.on('webrtc_offer', async (data) => {
        try {
          console.log('[CallContext] Received webrtc_offer from', data.callerId);
          if (!pcRef.current) await setupPeerConnection(data.callerId);
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
          remoteDescriptionSetRef.current = true;
          console.log('[CallContext] Remote description (offer) set');

          // Drain any ICE candidates that arrived before the offer was processed
          await drainPendingIceCandidates();

          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          // IMPORTANT: include our own id as callerId so the recipient
          // (the original caller) knows who the answer is addressed back to.
          socketRef.current.emit('webrtc_answer', {
            targetId: data.callerId,
            callerId: user.id,
            sdp: answer,
          });
          console.log('[CallContext] Sent webrtc_answer to', data.callerId);
        } catch (err) {
          console.warn('[CallContext] Error handling webrtc_offer:', err);
        }
      });

      // Caller receives answer → set remote description → drain ICE queue
      socketRef.current.on('webrtc_answer', async (data) => {
        try {
          console.log('[CallContext] Received webrtc_answer');
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            remoteDescriptionSetRef.current = true;
            console.log('[CallContext] Remote description (answer) set');

            // Drain any ICE candidates that arrived before the answer was processed
            await drainPendingIceCandidates();
          }
        } catch (err) {
          console.warn('[CallContext] Error handling webrtc_answer:', err);
        }
      });

      // Queue ICE candidates if remote description isn't set yet
      socketRef.current.on('ice_candidate', async (data) => {
        try {
          if (pcRef.current && remoteDescriptionSetRef.current) {
            // Remote description ready — add immediately
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            // Not ready yet — queue for later
            console.log('[CallContext] Queuing ICE candidate (remote description not set yet)');
            pendingIceCandidatesRef.current.push(data.candidate);
          }
        } catch (e) {
          console.warn('[CallContext] Error adding ICE candidate:', e);
        }
      });
    } catch (err) {
      console.warn('[CallContext] Failed to connect to signaling server:', err);
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
          { urls: 'stun:stun1.l.google.com:19302' },
          // TURN servers — required when devices are behind CGNAT / symmetric
          // NAT (very common on mobile data), since STUN alone can't punch
          // through those. Free relay below is for testing only — swap in
          // your own coturn deployment or a paid provider (Twilio, Xirsys,
          // Metered.ca) before shipping to production.
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
        ],
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
          // react-native-webrtc ICE candidate objects do not reliably expose the
          // browser fields `.type/.protocol/.address`. The most portable field is
          // the raw SDP candidate line at `.candidate`.
          const rawCandidate = event.candidate.candidate;
          console.log('[CallContext] Local ICE candidate raw:', rawCandidate);

          // Best-effort parse of SDP candidate line to extract key markers.
          // Example SDP candidate line:
          // candidate:0 1 udp 2122260223 192.0.2.1 54400 typ host
          // candidate:1 1 udp 2122260223 203.0.113.1 3478 typ srflx raddr 0.0.0.0 rport 0 generation 0
          // candidate:2 1 udp 2122260223 198.51.100.1 5000 typ relay raddr 0.0.0.0 rport 0
          try {
            if (typeof rawCandidate === 'string') {
              const parts = rawCandidate.trim().split(/\s+/);
              // Indices are based on the SDP grammar.
              // parts[0] = 'candidate:foundation'
              // parts[1] = component
              // parts[2] = transport
              // parts[3] = priority
              // parts[4] = connection-address
              // parts[5] = port
              // then a sequence of key/value markers incl. typ <host|srflx|relay>
              const transport = parts[2];
              const connAddr = parts[4];
              const port = parts[5];
              let typ = null;
              const typIdx = parts.findIndex((p) => p === 'typ');
              if (typIdx !== -1 && parts[typIdx + 1]) typ = parts[typIdx + 1];

              console.log('[CallContext] Local ICE candidate derived:', {
                transport,
                connAddr,
                port,
                typ, // host | srflx | relay (TURN)
              });
            }
          } catch (e) {
            console.warn('[CallContext] ICE candidate parse error:', e);
          }

          socketRef.current?.emit('ice_candidate', {
            targetId,
            callerId: user.id,
            // Keep the candidate object as-is for compatibility with your signaling.
            candidate: event.candidate,
          });
        } else {
          console.log('[CallContext] ICE gathering complete (null candidate)');
        }
      };

      pcRef.current.ontrack = (event) => {
        console.log('[CallContext] ontrack fired, streams:', event.streams?.length);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pcRef.current.oniceconnectionstatechange = () => {
        console.log('[CallContext] ICE connection state:', pcRef.current?.iceConnectionState);
      };

      pcRef.current.onconnectionstatechange = () => {
        console.log('[CallContext] Peer connection state:', pcRef.current?.connectionState);
      };

      pcRef.current.onsignalingstatechange = () => {
        console.log('[CallContext] Signaling state:', pcRef.current?.signalingState);
      };
    } catch (err) {
      console.warn('[CallContext] setupPeerConnection error:', err);
    }
  };

  const tryRegister = (attempt = 0) => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.log('[CallContext] Socket not connected yet, retrying register in 1s');
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
    const status = connectedAtRef.current ? 'completed' : (direction === 'incoming' ? 'declined' : 'missed');
    finishCall({ status, direction, notifyRemote: true });
  };

  const cleanupCall = () => {
    // Reset ICE candidate queue and remote description flag
    pendingIceCandidatesRef.current = [];
    remoteDescriptionSetRef.current = false;

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
      // IMPORTANT: include callerId (our own user id) so the callee can
      // address the webrtc_answer back to us. Without this, data.callerId
      // is undefined on the callee side and the answer never reaches us.
      socketRef.current?.emit('webrtc_offer', {
        targetId,
        callerId: user.id,
        sdp: offer,
      });
      console.log('[CallContext] Sent webrtc_offer to', targetId);
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
      switchCamera,
    }}>
      {children}
    </CallContext.Provider>
  );
};