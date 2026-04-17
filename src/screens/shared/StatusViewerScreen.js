import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, X, Send } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import * as ChatServiceModule from '../../api/chatService';
const chatService = ChatServiceModule.chatService;
import { useNavigation, useRoute } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');
const STATUS_DURATION = 5000;

export default function StatusViewerScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { statuses, initialIndex = 0 } = route.params || {};

   const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const currentStatus = statuses?.[currentIndex];
  const items = currentStatus?.items || [];
  const activeItem = items[currentItemIndex];

  useEffect(() => {
    if (!currentStatus || isPaused) return;
    
    // Reset animation
    progressAnim.setValue(0);
    
    // Start animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STATUS_DURATION,
      useNativeDriver: false, // width animation doesn't support native driver well
    }).start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    return () => {
      progressAnim.stopAnimation();
    };
  }, [currentIndex, currentItemIndex]);

  const handleNext = () => {
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
    } else if (currentIndex < statuses.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCurrentItemIndex(0);
    } else {
      navigation.goBack();
    }
  };

  const handlePrev = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
    } else if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      const prevItems = statuses[currentIndex - 1].items;
      setCurrentItemIndex(prevItems.length - 1);
    } else {
      // At very beginning
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: STATUS_DURATION,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) handleNext();
      });
    }
  };

   const handlePress = (evt) => {
    Keyboard.dismiss();
    if (isPaused) return;
    const x = evt.nativeEvent.locationX;
    if (x < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !user || sending) return;

    console.log('[DEBUG-REPLY] Starting reply send:', currentStatus.sellerUserId, user.id);
    setSending(true);
    try {
      console.log('[DEBUG-REPLY] Resolving conversation...');
      const realCid = await chatService.createConversation(currentStatus.sellerUserId, user.id);
      console.log('[DEBUG-REPLY] Resolved CID:', realCid);
      
      console.log('[DEBUG-REPLY] Sending message with item:', activeItem.id);
      await chatService.sendMessage(realCid, user.id, replyText, activeItem.id);
      console.log('[DEBUG-REPLY] Message sent successfully!');
      
      setReplyText('');
      setIsPaused(false);
      Alert.alert('Sent', 'Reply sent to seller!');
    } catch (e) {
      console.error('[DEBUG-REPLY] ERROR in handleSendReply:', e);
      Alert.alert('Error', 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  };

  if (!currentStatus || !activeItem) {
    return (
      <View style={[styles.container, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
        <CustomText style={{ color: '#fff' }}>Status not found</CustomText>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <CustomText style={{ color: colors.primary }}>Go Back</CustomText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      
      {/* Background content */}
      <View style={styles.contentWrap}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1, width: '100%' }}>
            {activeItem.type === 'image' ? (
              <Image source={{ uri: activeItem.uri }} style={styles.imageContent} resizeMode="cover" />
            ) : (
              <View style={[styles.textContent, { backgroundColor: activeItem.backgroundColor || colors.primary }]}>
                <CustomText style={styles.textOverlay}>{activeItem.content}</CustomText>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>

      {/* Invisible overlay for tapping left/right */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.tapOverlay}
        onPress={handlePress}
      />

      {/* Top Header UI */}
      <View style={styles.headerLayer}>
        {/* Progress bars */}
        <View style={styles.progressRow}>
          {items.map((_, i) => {
            let flexVal;
            if (i < currentItemIndex) flexVal = 1; // fully completed
            else if (i === currentItemIndex) flexVal = progressAnim; // animating
            else flexVal = 0; // not started

            return (
              <View key={i} style={styles.progressBarBG}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: typeof flexVal === 'number' ? `${flexVal * 100}%` : flexVal.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* User Info */}
        <View style={styles.userInfoRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <View style={[styles.avatar, { backgroundColor: currentStatus.sellerColor }]}>
            <CustomText style={styles.avatarText}>{currentStatus.sellerInitials}</CustomText>
          </View>
          <View style={styles.nameWrap}>
            <CustomText style={styles.userName}>{currentStatus.sellerName}</CustomText>
            {activeItem?.timestamp && (
              <CustomText style={styles.statusTime}>
                {(() => {
                  const diff = Date.now() - new Date(activeItem.timestamp).getTime();
                  const mins = Math.floor(diff / 60000);
                  const hrs = Math.floor(mins / 60);
                  if (mins < 1) return 'just now';
                  if (mins < 60) return `${mins}m ago`;
                  if (hrs < 24) return `${hrs}h ago`;
                  return `${Math.floor(hrs / 24)}d ago`;
                })()}
              </CustomText>
            )}
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X color="#fff" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Reply Bar */}
      {currentStatus.sellerUserId !== user?.id && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.footerLayer}
        >
          <View style={styles.replyBox}>
            <TextInput
              style={styles.replyInput}
              placeholder="Reply to status..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={replyText}
              onChangeText={setReplyText}
              onFocus={() => {
                setIsPaused(true);
                progressAnim.stopAnimation();
              }}
              onBlur={() => {
                if (!replyText) setIsPaused(false);
              }}
            />
            {replyText.trim() ? (
              <TouchableOpacity 
                style={styles.sendBtn} 
                onPress={handleSendReply}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Send color="#fff" size={20} />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContent: {
    width: '100%',
    height: '100%',
  },
  textContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  textOverlay: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50, // rough safe area
    paddingHorizontal: 12,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  progressBarBG: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  nameWrap: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  statusTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
  },
  footerLayer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  replyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  replyInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    height: 40,
  },
  sendBtn: {
    marginLeft: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e67e22',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
