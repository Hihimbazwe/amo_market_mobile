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
  
  // Call States
  const [callState, setCallState] = useState('IDLE'); // IDLE, CALLING, RINGING, CONNECTED
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [activeCallData, setActiveCallData] = useState(null);
  
  // Media States
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Refs for persistent connections
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    // Parse API_BASE_URL to get signaling URL (e.g., http://192.168.1.X:3001)
    let signalingUrl = API_BASE_URL;
    try {
      const urlObj = new URL(API_BASE_URL);
      urlObj.port = '3001';
      signalingUrl = urlObj.toString();
    } catch (e) {
      signalingUrl = API_BASE_URL.replace(/:\d+$/, ':3001'); // Fallback hack
    }

    // Connect to standalone Signaling Server
    socketRef.current = io(signalingUrl, { transports: ['websocket'] });

    socketRef.current.on('connect', () => {
      console.log('[CallContext] Connected to signaling server');
      socketRef.current.emit('register', user.id);
    });

    // Handle Incoming Call
    socketRef.current.on('incoming_call', (data) => {
      console.log('[CallContext] Incoming call from', data.callerId);
      setIncomingCallData(data);
      setCallState('RINGING');
    });

    // Handle Call Accepted
    socketRef.current.on('call_accepted', async (data) => {
      console.log('[CallContext] Call accepted by', data.targetId);
      setCallState('CONNECTED');
      await createOffer(data.targetId);
    });

    // Handle Call Rejected
    socketRef.current.on('call_rejected', (data) => {
      console.log('[CallContext] Call rejected');
      Alert.alert('Call Rejected', 'The user declined the call.');
      cleanupCall();
    });

    // Handle Call Ended
    socketRef.current.on('call_ended', (data) => {
      console.log('[CallContext] Call ended by remote');
      cleanupCall();
    });

    // WebRTC Signaling
    socketRef.current.on('webrtc_offer', async (data) => {
      if (!pcRef.current) await setupPeerConnection(data.callerId || data.targetId);
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socketRef.current.emit('webrtc_answer', { targetId: data.callerId, sdp: answer });
    });

    socketRef.current.on('webrtc_answer', async (data) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    });

    socketRef.current.on('ice_candidate', async (data) => {
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('[CallContext] Error adding ICE candidate', e);
        }
      }
    });

    return () => {
      cleanupCall();
      socketRef.current?.disconnect();
    };
  }, [user]);

  const setupPeerConnection = async (targetId) => {
    // Free STUN servers for testing
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    pcRef.current = new RTCPeerConnection(configuration);

    // Setup local stream
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: true // You can make this dynamic based on isVideo parameter
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      stream.getTracks().forEach((track) => pcRef.current.addTrack(track, stream));
    } catch (err) {
      console.error('[CallContext] getUserMedia error:', err);
    }

    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice_candidate', { targetId, candidate: event.candidate });
      }
    };

    pcRef.current.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };
  };

  const startCall = async (targetUserId, targetUserName, isVideo = true) => {
    if (!isWebRTCSupported) {
      Alert.alert('Not Supported', 'Calling is not available in Expo Go. Please use a development build to make calls.');
      return;
    }
    
    setActiveCallData({ targetId: targetUserId, targetName: targetUserName, isVideo });
    setCallState('CALLING');
    
    await setupPeerConnection(targetUserId);

    socketRef.current.emit('call_user', {
      callerId: user.id,
      callerName: user.name || 'A user',
      targetId: targetUserId,
      isVideo
    });
  };

  const acceptCall = async () => {
    if (!incomingCallData) return;
    setActiveCallData({ targetId: incomingCallData.callerId, targetName: incomingCallData.callerName, isVideo: incomingCallData.isVideo });
    setCallState('CONNECTED');
    setIncomingCallData(null);

    await setupPeerConnection(incomingCallData.callerId);

    socketRef.current.emit('accept_call', {
      callerId: incomingCallData.callerId,
      targetId: user.id
    });
  };

  const declineCall = () => {
    if (!incomingCallData) return;
    socketRef.current.emit('reject_call', {
      callerId: incomingCallData.callerId,
      targetId: user.id
    });
    setIncomingCallData(null);
    setCallState('IDLE');
  };

  const endCall = () => {
    if (activeCallData) {
      socketRef.current.emit('end_call', {
        toUserId: activeCallData.targetId
      });
    } else if (incomingCallData) {
      socketRef.current.emit('reject_call', {
        callerId: incomingCallData.callerId,
        targetId: user.id
      });
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
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
    if (!pcRef.current) return;
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socketRef.current.emit('webrtc_offer', { targetId, sdp: offer });
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const switchCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack && typeof videoTrack._switchCamera === 'function') {
        videoTrack._switchCamera();
      }
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
