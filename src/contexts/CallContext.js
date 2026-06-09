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
import { Alert } from 'react-native';

const CallContext = createContext(null);

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

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

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
      socketRef.current = io(signalingUrl, { transports: ['websocket'] });

      socketRef.current.on('connect', () => {
        console.log('[CallContext] Connected to signaling server');
        socketRef.current.emit('register', user.id);
      });

      socketRef.current.on('incoming_call', (data) => {
        console.log('[CallContext] Incoming call from', data.callerId);
        setIncomingCallData(data);
        setCallState('RINGING');
      });

      socketRef.current.on('call_accepted', async (data) => {
        console.log('[CallContext] Call accepted by', data.targetId);
        setCallState('CONNECTED');
        await createOffer(data.targetId);
      });

      socketRef.current.on('call_rejected', () => {
        console.log('[CallContext] Call rejected');
        Alert.alert('Call Rejected', 'The user declined the call.');
        cleanupCall();
      });

      socketRef.current.on('call_ended', () => {
        console.log('[CallContext] Call ended by remote');
        cleanupCall();
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
  }, [user]);

  const setupPeerConnection = async (targetId) => {
    try {
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      pcRef.current = new RTCPeerConnection(configuration);

      try {
        const stream = await mediaDevices.getUserMedia({ audio: true, video: true });
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

  const startCall = async (targetUserId, targetUserName, isVideo = true) => {
    if (!isWebRTCSupported) {
      Alert.alert('Not Supported', 'Calling is not available in Expo Go. Please use a development build.');
      return;
    }
    try {
      setActiveCallData({ targetId: targetUserId, targetName: targetUserName, isVideo });
      setCallState('CALLING');
      await setupPeerConnection(targetUserId);
      socketRef.current?.emit('call_user', {
        callerId: user.id,
        callerName: user.name || 'A user',
        targetId: targetUserId,
        isVideo
      });
    } catch (err) {
      console.warn('[CallContext] startCall error:', err);
    }
  };

  const acceptCall = async () => {
    if (!incomingCallData) return;
    try {
      setActiveCallData({ targetId: incomingCallData.callerId, targetName: incomingCallData.callerName, isVideo: incomingCallData.isVideo });
      setCallState('CONNECTED');
      setIncomingCallData(null);
      await setupPeerConnection(incomingCallData.callerId);
      socketRef.current?.emit('accept_call', {
        callerId: incomingCallData.callerId,
        targetId: user.id
      });
    } catch (err) {
      console.warn('[CallContext] acceptCall error:', err);
    }
  };

  const declineCall = () => {
    if (!incomingCallData) return;
    try {
      socketRef.current?.emit('reject_call', {
        callerId: incomingCallData.callerId,
        targetId: user.id
      });
    } catch (err) {
      console.warn('[CallContext] declineCall error:', err);
    }
    setIncomingCallData(null);
    setCallState('IDLE');
  };

  const endCall = () => {
    try {
      if (activeCallData) {
        socketRef.current?.emit('end_call', { toUserId: activeCallData.targetId });
      } else if (incomingCallData) {
        socketRef.current?.emit('reject_call', {
          callerId: incomingCallData.callerId,
          targetId: user.id
        });
      }
    } catch (err) {
      console.warn('[CallContext] endCall error:', err);
    }
    cleanupCall();
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
    } catch (err) {
      console.warn('[CallContext] cleanupCall error:', err);
    }
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCallData(null);
    setIncomingCallData(null);
    setCallState('IDLE');
    setIsMuted(false);
    setIsVideoEnabled(true);
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