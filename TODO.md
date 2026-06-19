# TODO - Fix WebRTC ICE candidate logging + TURN usage visibility

- [ ] Update `amo_mobile_market/src/contexts/CallContext.js`:
  - [ ] Fix ICE candidate logging to not rely on non-existent `.type/.protocol/.address` fields from `react-native-webrtc`.
  - [ ] Log raw candidate string and also attempt to derive candidate details (foundation/component/transport/protocol/host ip/port) from the SDP candidate line.
  - [ ] Add connection diagnostics to infer whether relay (TURN) is used by checking candidate/transport markers and/or `iceConnectionState` + `selected candidate` (as available).
  - [ ] Add safe logs around `pcRef.current.getStats()` (if supported) to detect `relay` candidates/transport.
- [ ] Run unit/lint/build check (or minimal JS syntax check) if available.
- [ ] Verify that audio/video behavior is unchanged except for logging/diagnostics.

