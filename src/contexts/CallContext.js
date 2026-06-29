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
import InCallManager from 'react-native-incall-manager';
import { API_BASE_URL, SIGNALING_URL } from '@env';
import { useAuth } from '../context/AuthContext';
import { Alert, Vibration } from 'react-native';
import { chatService } from '../api/chatService';
import { setIncomingCallNotificationHandler } from '../utils/callNotificationBridge';

const CallContext = createContext(null);
const CALL_TIMEOUT_MS = 45000;

// DIAGNOSTIC TOGGLE: set true temporarily to force all ICE candidates through
// TURN relay only (no direct/STUN paths allowed). If calls connect with this
// on, NAT traversal was indeed the issue and TURN is doing its job — just
// flip back to false once your permanent TURN server is in place. If calls
// STILL fail with this on, the TURN server itself is unreachable from this
// network/port, not a NAT problem.
const FORCE_RELAY_FOR_TESTING = false;

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
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [connectedAt, setConnectedAt] = useState(null);
  const [endedInfo, setEndedInfo] = useState(null);
  const [isUpgradingToVideo, setIsUpgradingToVideo] = useState(false);

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
    if (!data || typeof data !== 'object' || !data.callerId || data.callerId === user?.id) {
      console.warn('[CallContext] receiveIncomingCall received invalid data or self-call attempt:', data);
      return;
    }
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
        // connectedAt is set AFTER the offer/answer completes — see webrtc_answer handler
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

          // Mark connection time on the callee side — after the offer/answer is complete
          if (!connectedAtRef.current) {
            const now = Date.now();
            setConnectedAt(now);
          }
        } catch (err) {
          console.warn('[CallContext] Error handling webrtc_offer:', err);
        }
      });

      // Caller receives answer → set remote description → drain ICE queue → mark connected
      socketRef.current.on('webrtc_answer', async (data) => {
        try {
          console.log('[CallContext] Received webrtc_answer');
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            remoteDescriptionSetRef.current = true;
            console.log('[CallContext] Remote description (answer) set');

            // Drain any ICE candidates that arrived before the answer was processed
            await drainPendingIceCandidates();

            // Mark connection time on the caller side — after the offer/answer is complete
            if (!connectedAtRef.current) {
              const now = Date.now();
              setConnectedAt(now);
            }
          }
        } catch (err) {
          console.warn('[CallContext] Error handling webrtc_answer:', err);
        }
      });

      // Queue ICE candidates if remote description isn't set yet
      socketRef.current.on('ice_candidate', async (data) => {
        try {
          const candStr = data?.candidate?.candidate || '';
          const typMatch = candStr.match(/typ (\w+)/);
          const candType = typMatch ? typMatch[1] : 'unknown';
          console.log('[CallContext] Remote ICE candidate type:', candType);

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

      // Receiver side: remote wants to upgrade the audio call to video
      socketRef.current.on('upgrade_to_video', async (data) => {
        try {
          console.log('[CallContext] Remote requested video upgrade from', data.callerId);
          // Update local activeCallData to reflect video mode
          setActiveCallData(prev => prev ? { ...prev, isVideo: true } : prev);

          if (!pcRef.current) {
            console.warn('[CallContext] upgrade_to_video: no peer connection');
            return;
          }
          // Acquire local video track
          const videoStream = await mediaDevices.getUserMedia({ audio: false, video: true });
          const videoTrack = videoStream.getVideoTracks()[0];
          if (videoTrack) {
            pcRef.current.addTrack(videoTrack, localStreamRef.current || videoStream);
            // Merge into existing local stream so PiP shows it
            if (localStreamRef.current) {
              localStreamRef.current.addTrack(videoTrack);
              setLocalStream(localStreamRef.current);
            } else {
              localStreamRef.current = videoStream;
              setLocalStream(videoStream);
            }
          }

          // Renegotiate: create a new offer
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          socketRef.current?.emit('webrtc_offer', {
            targetId: data.callerId,
            callerId: user.id,
            sdp: offer,
          });
          console.log('[CallContext] Sent renegotiation offer after video upgrade');
        } catch (err) {
          console.warn('[CallContext] Error handling upgrade_to_video:', err);
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
      // Start InCallManager BEFORE media/connection setup so the device's
      // audio session is routed correctly (proximity sensor, earpiece vs
      // speaker, audio focus) from the moment the call UI appears — not
      // just once ICE connects. Without this, remote audio can be silent
      // or routed to the wrong output even after the WebRTC connection
      // itself succeeds, which was the root cause of "connected but no
      // sound" symptoms.
      try {
        InCallManager.start({ media: isVideo ? 'video' : 'audio' });
        // Video calls default to speaker; voice calls default to earpiece.
        // User can toggle via toggleSpeaker().
        InCallManager.setForceSpeakerphoneOn(isVideo);
        setIsSpeakerOn(isVideo);
      } catch (icmErr) {
        console.warn('[CallContext] InCallManager start error:', icmErr);
      }

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
        iceTransportPolicy: FORCE_RELAY_FOR_TESTING ? 'relay' : 'all',
      };

      pcRef.current = new RTCPeerConnection(configuration);

      // getUserMedia — hard failure: if we can't get media the call must end
      try {
        const stream = await mediaDevices.getUserMedia({ audio: true, video: isVideo });
        setLocalStream(stream);
        localStreamRef.current = stream;
        stream.getTracks().forEach((track) => pcRef.current.addTrack(track, stream));
      } catch (err) {
        console.warn('[CallContext] getUserMedia error:', err);
        // Hard failure — tear down the peer connection and end the call gracefully
        try { pcRef.current.close(); } catch (_) {}
        pcRef.current = null;
        Alert.alert(
          'Camera/Microphone Error',
          isVideo
            ? 'Could not access your camera or microphone. Please check permissions and try again.'
            : 'Could not access your microphone. Please check permissions and try again.',
        );
        finishCall({ status: 'canceled', direction: 'outgoing', notifyRemote: true });
        return; // abort rest of setup
      }

      pcRef.current.onicecandidate = (event) => {
        if (!pcRef.current) return; // Guard against unmounted component/cleanup
        if (event.candidate) {
          // react-native-webrtc's candidate object does NOT expose .type/.protocol/.address
          // like browser WebRTC does — those were always undefined before. The actual
          // type (host/srflx/relay) lives inside the raw SDP candidate string itself,
          // e.g. "candidate:842163049 1 udp 1677729535 1.2.3.4 5000 typ srflx ...".
          // Parse it out so we can actually tell whether TURN relay is being used.
          const candStr = event.candidate.candidate || '';
          const typMatch = candStr.match(/typ (\w+)/);
          const candType = typMatch ? typMatch[1] : 'unknown';
          console.log('[CallContext] Local ICE candidate type:', candType, '| raw:', candStr);

          socketRef.current?.emit('ice_candidate', {
            targetId,
            callerId: user.id,
            candidate: event.candidate,
          });
        } else {
          console.log('[CallContext] ICE gathering complete (null candidate)');
        }
      };

      pcRef.current.ontrack = (event) => {
        if (!pcRef.current) return; // Guard against unmounted component/cleanup
        console.log('[CallContext] ontrack fired, streams:', event.streams?.length);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pcRef.current.oniceconnectionstatechange = () => {
        if (!pcRef.current) return; // Guard against unmounted component/cleanup
        console.log('[CallContext] ICE connection state:', pcRef.current?.iceConnectionState);
      };

      pcRef.current.onconnectionstatechange = () => {
        if (!pcRef.current) return; // Guard against unmounted component/cleanup
        console.log('[CallContext] Peer connection state:', pcRef.current?.connectionState);
      };

      pcRef.current.onsignalingstatechange = () => {
        if (!pcRef.current) return; // Guard against unmounted component/cleanup
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
      // NOTE: connectedAt is intentionally NOT set here.
      // It is set later in the webrtc_offer handler, after the offer/answer
      // exchange is complete and media is actually flowing — not at the moment
      // the user taps "Accept". This prevents the call timer from starting
      // before the WebRTC connection is established.
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
      InCallManager.stop();
    } catch (icmErr) {
      console.warn('[CallContext] InCallManager stop error:', icmErr);
    }

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
    setIsSpeakerOn(false);
    setIsUpgradingToVideo(false);
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

  const toggleSpeaker = () => {
    try {
      const next = !isSpeakerOn;
      InCallManager.setForceSpeakerphoneOn(next);
      setIsSpeakerOn(next);
    } catch (err) {
      console.warn('[CallContext] toggleSpeaker error:', err);
    }
  };

  /**
   * upgradeToVideo — upgrades an active audio-only call to video.
   * Acquires the local camera, adds the video track to the existing
   * peer connection, triggers renegotiation via a new webrtc_offer,
   * and signals the remote side via the "upgrade_to_video" socket event
   * so they also switch to video mode.
   */
  const upgradeToVideo = async () => {
    if (!pcRef.current || !activeCallRef.current) {
      console.warn('[CallContext] upgradeToVideo: no active call or peer connection');
      return;
    }
    if (activeCallRef.current?.isVideo) {
      console.log('[CallContext] upgradeToVideo: already a video call');
      return;
    }
    try {
      setIsUpgradingToVideo(true);

      // Acquire video track
      const videoStream = await mediaDevices.getUserMedia({ audio: false, video: true });
      const videoTrack = videoStream.getVideoTracks()[0];

      if (!videoTrack) {
        throw new Error('No video track acquired from getUserMedia');
      }

      // Add video track to existing peer connection
      pcRef.current.addTrack(videoTrack, localStreamRef.current || videoStream);

      // Merge into existing local stream for PiP display
      if (localStreamRef.current) {
        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(localStreamRef.current);
      } else {
        localStreamRef.current = videoStream;
        setLocalStream(videoStream);
      }

      // Update InCallManager for video routing
      try {
        InCallManager.start({ media: 'video' });
        InCallManager.setForceSpeakerphoneOn(true);
        setIsSpeakerOn(true);
      } catch (icmErr) {
        console.warn('[CallContext] upgradeToVideo InCallManager error:', icmErr);
      }

      // Signal the remote side that we're upgrading
      const targetId = activeCallRef.current.targetId;
      socketRef.current?.emit('upgrade_to_video', {
        callerId: user.id,
        targetId,
      });

      // Trigger renegotiation: create and send a new offer with the video track included
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketRef.current?.emit('webrtc_offer', {
        targetId,
        callerId: user.id,
        sdp: offer,
      });
      console.log('[CallContext] Sent renegotiation offer for video upgrade to', targetId);

      // Update local call data to reflect video mode
      setActiveCallData(prev => prev ? { ...prev, isVideo: true } : prev);
      setIsVideoEnabled(true);
    } catch (err) {
      console.warn('[CallContext] upgradeToVideo error:', err);
      Alert.alert('Camera Error', 'Could not access your camera. Please check permissions and try again.');
    } finally {
      setIsUpgradingToVideo(false);
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
      isSpeakerOn,
      connectedAt,
      endedInfo,
      isUpgradingToVideo,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      toggleVideo,
      switchCamera,
      toggleSpeaker,
      upgradeToVideo,
    }}>
      {children}
    </CallContext.Provider>
  );
};