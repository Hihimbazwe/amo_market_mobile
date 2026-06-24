import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';

let RTCView = null;
if (Constants.appOwnership !== 'expo') {
  try {
    RTCView = require('react-native-webrtc').RTCView;
  } catch (e) {
    console.warn('RTCView not supported in this environment');
  }
}
import { useCall } from '../../contexts/CallContext';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Camera, Volume2, VolumeX } from 'lucide-react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';

const CallScreen = () => {
  const {
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
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    toggleSpeaker,
    upgradeToVideo,
  } = useCall();

  const { colors } = useTheme();
  const themeColors = colors || { background: '#000', foreground: '#fff', primary: '#3B82F6', muted: '#9CA3AF' };
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (callState !== 'CONNECTED' || !connectedAt) {
      setElapsedSeconds(0);
      return undefined;
    }
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [callState, connectedAt]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const statusLabel = (() => {
    if (callState === 'RINGING') return incomingCallData ? 'Incoming call...' : 'Ringing...';
    if (callState === 'CALLING') return 'Calling...';
    if (callState === 'CONNECTED') return connectedAt ? formatDuration(elapsedSeconds) : 'Connecting...';
    if (callState === 'DECLINED') return 'Call declined';
    if (callState === 'ENDED') {
      if (endedInfo?.status === 'missed') return 'Missed call';
      if (endedInfo?.status === 'canceled') return 'Missed call';
      return 'Call ended';
    }
    return '';
  })();

  if (callState === 'IDLE') return null;

  const isConnected = callState === 'CONNECTED';
  const isVideoCall = activeCallData?.isVideo;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>

      {/* Background Video (Remote if connected, Local if calling/video enabled) */}
      <View style={styles.videoContainer}>
        {isConnected && remoteStream && isVideoCall && RTCView ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.fullVideo}
            objectFit="cover"
          />
        ) : callState === 'CALLING' && localStream && isVideoCall && RTCView ? (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.fullVideo}
            objectFit="cover"
          />
        ) : (
          <View style={[styles.fullVideo, { backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' }]}>
            <View style={styles.avatarLarge}>
              <CustomText style={{ fontSize: 40, color: '#FFF' }}>
                {(incomingCallData?.callerName || activeCallData?.targetName || 'U').charAt(0).toUpperCase()}
              </CustomText>
            </View>
          </View>
        )}
      </View>

      {/* Local Video PiP (when connected and video is on) */}
      {isConnected && localStream && isVideoEnabled && isVideoCall && RTCView && (
        <View style={styles.pipVideoContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.pipVideo}
            objectFit="cover"
          />
        </View>
      )}

      {/* Header Info */}
      <View style={styles.header}>
        <CustomText style={styles.statusText}>
          {statusLabel}
        </CustomText>
        <CustomText style={styles.nameText}>
          {callState === 'RINGING' && incomingCallData
            ? incomingCallData?.callerName
            : activeCallData?.targetName}
        </CustomText>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {callState === 'RINGING' && incomingCallData ? (
          <View style={styles.actionRow}>
            <View style={styles.btnWithLabel}>
              <TouchableOpacity style={[styles.callButton, { backgroundColor: '#EF4444' }]} onPress={declineCall}>
                <PhoneOff color="#FFF" size={32} />
              </TouchableOpacity>
              <CustomText style={styles.btnLabel}>Decline</CustomText>
            </View>
            <View style={styles.btnWithLabel}>
              <TouchableOpacity style={[styles.callButton, { backgroundColor: '#22C55E' }]} onPress={acceptCall}>
                <Phone color="#FFF" size={32} />
              </TouchableOpacity>
              <CustomText style={styles.btnLabel}>Accept</CustomText>
            </View>
          </View>
        ) : (
          <View style={styles.controlsGrid}>
            {/* Row 1: Mute · Speaker · Video (if video call) · Camera flip (if video call) */}
            <View style={styles.actionRow}>
              {/* Mute toggle */}
              <View style={styles.btnWithLabel}>
                <TouchableOpacity
                  style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                  onPress={toggleMute}
                >
                  {isMuted ? <MicOff color="#FFF" size={22} /> : <Mic color="#FFF" size={22} />}
                </TouchableOpacity>
                <CustomText style={styles.btnLabel}>{isMuted ? 'Unmute' : 'Mute'}</CustomText>
              </View>

              {/* Speaker toggle — always visible during active call */}
              <View style={styles.btnWithLabel}>
                <TouchableOpacity
                  style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
                  onPress={toggleSpeaker}
                >
                  {isSpeakerOn ? <Volume2 color="#FFF" size={22} /> : <VolumeX color="#FFF" size={22} />}
                </TouchableOpacity>
                <CustomText style={styles.btnLabel}>{isSpeakerOn ? 'Speaker' : 'Earpiece'}</CustomText>
              </View>

              {/* Video toggle — only for video calls */}
              {isVideoCall && (
                <View style={styles.btnWithLabel}>
                  <TouchableOpacity
                    style={[styles.controlBtn, !isVideoEnabled && styles.controlBtnActive]}
                    onPress={toggleVideo}
                  >
                    {isVideoEnabled ? <Video color="#FFF" size={22} /> : <VideoOff color="#FFF" size={22} />}
                  </TouchableOpacity>
                  <CustomText style={styles.btnLabel}>{isVideoEnabled ? 'Cam on' : 'Cam off'}</CustomText>
                </View>
              )}

              {/* Camera flip — only for video calls */}
              {isVideoCall && (
                <View style={styles.btnWithLabel}>
                  <TouchableOpacity style={styles.controlBtn} onPress={switchCamera}>
                    <Camera color="#FFF" size={22} />
                  </TouchableOpacity>
                  <CustomText style={styles.btnLabel}>Flip</CustomText>
                </View>
              )}
            </View>

            {/* Row 2: Upgrade to Video (audio-only) + End Call */}
            <View style={[styles.actionRow, { marginTop: 18 }]}>
              {/* Upgrade to Video — only for audio calls in CONNECTED state */}
              {isConnected && !isVideoCall && (
                <View style={styles.btnWithLabel}>
                  <TouchableOpacity
                    style={[styles.controlBtn, styles.upgradeBtn, isUpgradingToVideo && styles.controlBtnActive]}
                    onPress={upgradeToVideo}
                    disabled={isUpgradingToVideo}
                  >
                    {isUpgradingToVideo
                      ? <ActivityIndicator color="#FFF" size="small" />
                      : <Video color="#FFF" size={22} />}
                  </TouchableOpacity>
                  <CustomText style={styles.btnLabel}>
                    {isUpgradingToVideo ? 'Upgrading…' : 'Add Video'}
                  </CustomText>
                </View>
              )}

              {/* End Call */}
              <View style={styles.btnWithLabel}>
                <TouchableOpacity style={[styles.callButton, { backgroundColor: '#EF4444' }]} onPress={endCall}>
                  <PhoneOff color="#FFF" size={32} />
                </TouchableOpacity>
                <CustomText style={styles.btnLabel}>End</CustomText>
              </View>
            </View>
          </View>
        )}
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    justifyContent: 'space-between',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  fullVideo: {
    width: '100%',
    height: '100%',
  },
  pipVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: '#333',
    zIndex: 10,
  },
  pipVideo: {
    width: '100%',
    height: '100%',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    zIndex: 10,
  },
  statusText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 8,
  },
  nameText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsContainer: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    width: '100%',
  },
  controlsGrid: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 30,
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  callButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  upgradeBtn: {
    backgroundColor: 'rgba(59,130,246,0.6)',
  },
  btnWithLabel: {
    alignItems: 'center',
    gap: 6,
  },
  btnLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default CallScreen;
