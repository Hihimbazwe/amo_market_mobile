import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  TouchableWithoutFeedback,
  Animated,
  Image,
  Linking,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MoreVertical, Image as ImageIcon, CornerUpLeft, ShoppingBag, ExternalLink, Tag, Paperclip, FileText, UserPlus, X, Phone, Video, MapPin } from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../contexts/CallContext';
import { chatService } from '../../api/chatService';
import { productService } from '../../api/productService';
import { useNotifications } from '../../context/NotificationContext';
import { usePresence } from '../../context/PresenceContext';
import PresenceDot from '../../components/PresenceDot';

function formatLastSeen(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (diffDays === 0) {
    if (now.getDate() === date.getDate()) {
       return `today at ${timeStr}`;
    }
    return `yesterday at ${timeStr}`;
  } else if (diffDays === 1) {
    return `yesterday at ${timeStr}`;
  } else if (diffDays < 7) {
    const weekday = date.toLocaleDateString([], { weekday: 'long' });
    return `${weekday} at ${timeStr}`;
  } else {
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' }) + ` at ${timeStr}`;
  }
}

function formatMsgTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ATTACHMENT_PREFIX = '__AMO_ATTACHMENT__:';

const parseAttachmentMessage = (text) => {
  if (!text || !text.startsWith(ATTACHMENT_PREFIX)) return null;
  try {
    return JSON.parse(text.slice(ATTACHMENT_PREFIX.length));
  } catch {
    return null;
  }
};

const buildAttachmentMessage = (payload) => `${ATTACHMENT_PREFIX}${JSON.stringify(payload)}`;

const formatDateSeparator = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  
  const isSameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric', 
    year: isSameYear ? undefined : 'numeric' 
  });
};

const TypingDotsPulsing = ({ colors }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (anim, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    };
    pulse(dot1, 0);
    pulse(dot2, 200);
    pulse(dot3, 400);
  }, [dot1, dot2, dot3]);

  const getStyle = (anim) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }]
  });

  return (
    <View style={styles.typingDots}>
      <Animated.View style={[styles.dot, { backgroundColor: colors.muted }, getStyle(dot1)]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.muted }, getStyle(dot2)]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.muted }, getStyle(dot3)]} />
    </View>
  );
};

const Bubble = ({ msg, colors, onAction, onSwipeReply, onNavigateProduct }) => {
  const isMe = msg.senderId === 'me';
  const swipeableRef = useRef(null);

  const isProductMsg = msg.text && msg.text.startsWith('🛍️ Product:');
  let productInfo = null;
  let cleanMessageText = msg.text;
  const attachment = parseAttachmentMessage(msg.text);

  if (attachment) {
    cleanMessageText = attachment.caption || '';
  }

  if (isProductMsg) {
    try {
      const lines = msg.text.split('\n');
      const titleLine = lines[0].replace('🛍️ Product: ', '').trim();
      const priceLine = lines[1].replace('💰 Price: ', '').trim();
      const imageLine = lines[2].replace('🖼️ Image: ', '').trim();
      const idLine = lines[3].replace('🆔 ID: ', '').trim();
      
      let restOfText = '';
      if (lines.length > 4) {
        restOfText = lines.slice(4).join('\n').trim();
      }
      if (restOfText.startsWith('\n')) {
        restOfText = restOfText.trim();
      }
      cleanMessageText = restOfText;

      productInfo = {
        id: idLine,
        title: titleLine,
        price: priceLine,
        image: imageLine
      };
    } catch (e) {
      console.log('Failed to parse product msg', e);
    }
  }

  const handleLongPress = () => {
    if (onAction) {
      const opts = [];
      // Edit only for my non-deleted, non-status messages
      if (isMe && !msg.isDeleted && !msg.statusItemId) {
        opts.push({ text: 'Edit', onPress: () => onAction('edit', msg) });
      }
      opts.push({ text: 'Delete', style: 'destructive', onPress: () => onAction('delete', msg) });
      opts.push({ text: 'Cancel', style: 'cancel' });
      Alert.alert('Message Options', 'What would you like to do?', opts);
    }
  };

  // Render the reply icon that appears when swiping
  const renderReplyAction = (progress) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
      extrapolate: 'clamp',
    });
    const opacity = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.5, 1],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View
        style={[
          styles.swipeReplyAction,
          isMe ? styles.swipeReplyLeft : styles.swipeReplyRight,
          { opacity, transform: [{ scale }] },
        ]}
      >
        <View style={[styles.swipeReplyIconWrap, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
          <CornerUpLeft size={18} color={colors.primary} />
        </View>
      </Animated.View>
    );
  };

  const handleSwipeOpen = () => {
    if (!msg.isDeleted && onSwipeReply) {
      onSwipeReply(msg);
    }
    // Snap back immediately
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };

  const isSameSenderAsNext = msg.isSameSenderAsNext;
  const isSameSenderAsPrev = msg.isSameSenderAsPrev;
  
  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={!isMe ? renderReplyAction : undefined}
      renderRightActions={isMe ? renderReplyAction : undefined}
      onSwipeableOpen={handleSwipeOpen}
      friction={2}
      leftThreshold={50}
      rightThreshold={50}
      overshootLeft={false}
      overshootRight={false}
    >
      <View style={[
        styles.bubbleRow, 
        isMe ? styles.rowRight : styles.rowLeft,
        { marginTop: msg.showSeparator ? 12 : (isSameSenderAsPrev ? 2 : 10) }
      ]}>
        {!isMe && (
          <View style={{ width: 28, height: 28, justifyContent: 'flex-end' }}>
            {!isSameSenderAsNext && (
              <View style={[styles.miniAvatar, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
                <CustomText style={[styles.miniAvatarText, { color: colors.primary }]}>S</CustomText>
              </View>
            )}
          </View>
        )}
        <View style={{ maxWidth: '80%' }}>
          <View
            style={[
              styles.bubble,
              isMe
                ? [styles.bubbleMe, { backgroundColor: '#1B6A60', opacity: msg.isDeleted ? 0.7 : 1 }]
                : [styles.bubbleOther, { backgroundColor: colors.card, borderColor: colors.glassBorder, opacity: msg.isDeleted ? 0.7 : 1 }],
              msg.isDeleted && { paddingVertical: 4, minHeight: 26 },
              // Smart borders
              isMe && isSameSenderAsNext && { borderBottomRightRadius: 16 },
              isMe && isSameSenderAsPrev && { borderTopRightRadius: 4 },
              !isMe && isSameSenderAsNext && { borderBottomLeftRadius: 16 },
              !isMe && isSameSenderAsPrev && { borderTopLeftRadius: 4 },
              (productInfo || attachment) && { paddingHorizontal: 2, paddingTop: 2, paddingBottom: 0, overflow: 'hidden' }
            ]}
          >
            {attachment && (
              <View style={[
                styles.attachmentCard,
                { backgroundColor: isMe ? 'rgba(0,0,0,0.12)' : colors.background, borderColor: isMe ? 'rgba(255,255,255,0.2)' : colors.glassBorder }
              ]}>
                {attachment.type === 'image' && attachment.uri ? (
                  <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} resizeMode="cover" />
                ) : attachment.type === 'contact' ? (
                  <View style={styles.attachmentRow}>
                    <View style={[styles.attachmentIcon, { backgroundColor: isMe ? 'rgba(255,255,255,0.14)' : colors.primary + '14' }]}>
                      <UserPlus size={20} color={isMe ? '#fff' : colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CustomText style={[styles.attachmentTitle, { color: isMe ? '#fff' : colors.foreground }]} numberOfLines={1}>
                        {attachment.name || 'Contact'}
                      </CustomText>
                      <CustomText style={[styles.attachmentMeta, { color: isMe ? 'rgba(255,255,255,0.75)' : colors.muted }]} numberOfLines={1}>
                        {attachment.phone || attachment.email || 'Shared contact'}
                      </CustomText>
                    </View>
                  </View>
                ) : attachment.type === 'location' ? (
                  <TouchableOpacity
                    style={styles.attachmentRow}
                    activeOpacity={0.75}
                    onPress={() => {
                      const url = Platform.OS === 'ios'
                        ? `maps:0,0?q=${attachment.latitude},${attachment.longitude}`
                        : `geo:0,0?q=${attachment.latitude},${attachment.longitude}`;
                      Linking.openURL(url).catch(() => Alert.alert('Could not open map'));
                    }}
                  >
                    <View style={[styles.attachmentIcon, { backgroundColor: isMe ? 'rgba(255,255,255,0.14)' : colors.primary + '14' }]}>
                      <MapPin size={20} color={isMe ? '#fff' : colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CustomText style={[styles.attachmentTitle, { color: isMe ? '#fff' : colors.foreground }]} numberOfLines={1}>
                        Location Shared
                      </CustomText>
                      <CustomText style={[styles.attachmentMeta, { color: isMe ? 'rgba(255,255,255,0.75)' : colors.muted }]} numberOfLines={1}>
                        Tap to view on map
                      </CustomText>
                    </View>
                    <ExternalLink size={14} color={isMe ? 'rgba(255,255,255,0.75)' : colors.muted} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.attachmentRow}
                    activeOpacity={attachment.url ? 0.75 : 1}
                    onPress={() => attachment.url && Linking.openURL(attachment.url).catch(() => Alert.alert('Could not open document link'))}
                  >
                    <View style={[styles.attachmentIcon, { backgroundColor: isMe ? 'rgba(255,255,255,0.14)' : colors.primary + '14' }]}>
                      <FileText size={20} color={isMe ? '#fff' : colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CustomText style={[styles.attachmentTitle, { color: isMe ? '#fff' : colors.foreground }]} numberOfLines={1}>
                        {attachment.name || 'Document'}
                      </CustomText>
                      <CustomText style={[styles.attachmentMeta, { color: isMe ? 'rgba(255,255,255,0.75)' : colors.muted }]} numberOfLines={1}>
                        {attachment.url || 'Document reference'}
                      </CustomText>
                    </View>
                    {attachment.url ? <ExternalLink size={14} color={isMe ? 'rgba(255,255,255,0.75)' : colors.muted} /> : null}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {productInfo && (
              <TouchableOpacity
                onPress={() => onNavigateProduct && onNavigateProduct(productInfo.id)}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isMe ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.03)',
                  padding: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: isMe ? 'rgba(255,255,255,0.18)' : colors.glassBorder,
                }}
              >
                {productInfo.image ? (
                  <Image 
                    source={{ uri: productInfo.image }} 
                    style={{ width: 44, height: 44, borderRadius: 8, marginRight: 10 }} 
                    resizeMode="cover" 
                  />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <ShoppingBag size={18} color={isMe ? '#fff' : colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <CustomText style={{ fontSize: 12, fontWeight: '700', color: isMe ? '#fff' : colors.foreground }} numberOfLines={1}>
                    {productInfo.title}
                  </CustomText>
                  <CustomText style={{ fontSize: 11, fontWeight: '800', color: isMe ? 'rgba(255,255,255,0.9)' : colors.primary }}>
                    {productInfo.price}
                  </CustomText>
                </View>
                <ExternalLink size={12} color={isMe ? 'rgba(255,255,255,0.6)' : colors.muted} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={handleLongPress}
              delayLongPress={250}
              style={
                productInfo || attachment
                  ? { paddingHorizontal: 6, paddingTop: 1, paddingBottom: 2 }
                  : undefined
              }
            >
              {msg.statusItem && (
                <View style={[styles.statusReplyBadge, { backgroundColor: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                  {(msg.statusItem.type === 'image' || msg.statusItem.type === 'video') ? (
                    <Image source={{ uri: msg.statusItem.content }} style={styles.statusReplyImage} />
                  ) : (
                    <View style={[styles.statusReplyColorBlock, { backgroundColor: msg.statusItem.backgroundColor || colors.primary }]} />
                  )}
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <CustomText style={[styles.statusReplyTitle, { color: isMe ? '#fff' : colors.foreground }]} numberOfLines={1}>
                      Status Reply
                    </CustomText>
                    <CustomText style={[styles.statusReplySubtitle, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.muted }]} numberOfLines={1}>
                      {msg.statusItem.type === 'text' ? msg.statusItem.content : 'Media'}
                    </CustomText>
                  </View>
                </View>
              )}

              {!msg.statusItem && msg.statusItemId && (
                <View style={[styles.statusReplyBadge, { backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(230, 126, 34, 0.1)' }]}>
                  <ImageIcon size={10} color={isMe ? '#fff' : '#e67e22'} />
                  <CustomText style={[styles.statusReplyText, { color: isMe ? '#fff' : '#e67e22' }]}>
                    Status Reply
                  </CustomText>
                </View>
              )}

              {msg.replyTo && (
                <View style={[styles.quotedBubble, { backgroundColor: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                  <View style={[styles.quotedBorder, { backgroundColor: isMe ? '#fff' : colors.primary }]} />
                  <View style={styles.quotedBody}>
                    <CustomText style={[styles.quotedSender, { color: isMe ? '#fff' : colors.primary }]} numberOfLines={1}>
                      {msg.replyTo.senderName}
                    </CustomText>
                    <CustomText style={[styles.quotedText, { color: isMe ? '#fff' : colors.foreground }]} numberOfLines={2}>
                      {msg.replyTo.text}
                    </CustomText>
                  </View>
                </View>
              )}

              <View style={styles.bubbleTextWrapper}>
                <CustomText style={[styles.bubbleText, { color: msg.isDeleted ? (isMe ? 'rgba(255,255,255,0.8)' : colors.muted) : (isMe ? '#fff' : colors.foreground), fontStyle: msg.isDeleted ? 'italic' : 'normal' }]}>
                  {cleanMessageText}
                  <CustomText style={styles.invisibleSpacer}>
                    {'   '}{formatMsgTime(msg.timestamp)}{!msg.isDeleted && isMe && ' ✓✓'}
                  </CustomText>
                </CustomText>
                
                <View style={styles.timestampWrap}>
                  <CustomText style={[styles.bubbleTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.muted }]}>
                    {formatMsgTime(msg.timestamp)}
                    {!msg.isDeleted && isMe && ' ✓✓'}
                  </CustomText>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Swipeable>
  );
};

const ProductContextCard = ({ context, onNavigateProduct, colors }) => {
  const handlePress = () => {
    if (onNavigateProduct && context?.id) {
      onNavigateProduct(context.id, context.routeProduct);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={[
        productCardStyles.card,
        { backgroundColor: colors.card, borderColor: colors.primary + '30' },
      ]}
    >
      {/* Accent bar */}
      <View style={[productCardStyles.accentBar, { backgroundColor: colors.primary }]} />

      {/* Thumbnail */}
      <View style={[productCardStyles.thumb, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '25' }]}>
        {context.image ? (
          <Image source={{ uri: context.image }} style={productCardStyles.thumbImg} resizeMode="cover" />
        ) : (
          <ShoppingBag size={20} color={colors.primary} />
        )}
      </View>

      {/* Text */}
      <View style={productCardStyles.textBlock}>
        <View style={[productCardStyles.badge, { backgroundColor: colors.primary + '15' }]}>
          <Tag size={9} color={colors.primary} />
          <CustomText style={[productCardStyles.badgeLabel, { color: colors.primary }]}>Product Inquiry</CustomText>
        </View>
        <CustomText style={[productCardStyles.title, { color: colors.foreground }]} numberOfLines={1}>
          {context.title}
        </CustomText>
        <CustomText style={[productCardStyles.price, { color: colors.primary }]}>
          Rwf {(context.price || 0).toLocaleString()}
        </CustomText>
      </View>

      {/* Link icon */}
      <ExternalLink size={16} color={colors.muted} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
};

const productCardStyles = {
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingRight: 12,
    paddingLeft: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
    marginRight: 10,
    marginLeft: 0,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 10,
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    marginBottom: 2,
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  price: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
};
// ──────────────────────────────────────────────────────────────────────────

export default function ChatDetailScreen() {
  const { colors } = useTheme();
  const { user, isSellerDeactivated } = useAuth();
  const { startCall } = useCall();
  const { refreshUnread } = useNotifications();
  const navigation = useNavigation();
  const route = useRoute();
  const { conversation } = route.params || {};
  const participantId = conversation?.participantId || conversation?.otherUser?.id;
  const [productContext, setProductContext] = useState(conversation?.productContext || null);

  useEffect(() => {
    if (conversation?.productContext) {
      setProductContext(conversation.productContext);
    }
  }, [conversation?.productContext]);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState(null); // Clear initial to avoid stale flicker
  const [isOnline, setIsOnline] = useState(false);
  const [isHidden, setIsHidden] = useState(true); // Don't show status until first fetch to avoid flicker
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachmentVisible, setAttachmentVisible] = useState(false);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [attachmentContacts, setAttachmentContacts] = useState([]);
  const [attachmentContactSearch, setAttachmentContactSearch] = useState('');
  const [loadingAttachmentContacts, setLoadingAttachmentContacts] = useState(false);
  const [imageCaptionVisible, setImageCaptionVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageCaption, setImageCaption] = useState('');

  const navigateToProductDetails = async (productId, routeProduct = null) => {
    if (routeProduct) {
      navigation.navigate('ProductDetail', { product: routeProduct });
      return;
    }
    
    try {
      const fullProduct = await productService.getProductById(productId, user?.id);
      if (fullProduct) {
        navigation.navigate('ProductDetail', { product: fullProduct });
      } else {
        Alert.alert('Error', 'Product details could not be found.');
      }
    } catch (e) {
      console.warn('Failed to load product details:', e);
      Alert.alert('Error', 'Could not open product details page.');
    }
  };

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const { addListener, sendTyping, sendStopTyping } = usePresence();
  const typingTimerRef = useRef(null);

  // Heartbeat pulsing effect for online state
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isOnline && !isHidden) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.delay(1200),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isOnline, isHidden]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1.2],
    outputRange: [1, 1.45],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1.2],
    outputRange: [0.65, 0.4, 0],
  });

  // Listen for real-time WebSocket events
  useEffect(() => {
    if (!conversation?.id || !user?.id) return;
    
    return addListener((event) => {
      if (isHidden) return; // Ignore all real-time events if availability is hidden

      // Typing events for this conversation
      if (event.conversationId === conversation.id && event.userId === participantId) {
        if (event.type === 'USER_TYPING') {
          setTyping(true);
        } else if (event.type === 'USER_STOPPED_TYPING') {
          setTyping(false);
        }
      }
      
      // Online/Offline status could also be handled here if server broadcasts USER_ONLINE
      if (event.type === 'USER_ONLINE' && event.userId === participantId) {
        setIsOnline(true);
      }
      if (event.type === 'USER_OFFLINE' && event.userId === participantId) {
        setIsOnline(false);
      }
    });
  }, [conversation?.id, participantId, user?.id, addListener, isHidden]);

  // Typing dots animation for header
  const [typingDots, setTypingDots] = useState('');
  useEffect(() => {
    if (typing && !isHidden) {
      const itv = setInterval(() => {
        setTypingDots(prev => (prev.length >= 3 ? '' : prev + '.'));
      }, 400);
      return () => clearInterval(itv);
    } else {
      setTypingDots('');
    }
  }, [typing, isHidden]);

  // Active presence heartbeat (pings server to keep us online)
  useEffect(() => {
    if (!user?.id) return;
    chatService.pingOnlineStatus(user.id);
    const pingInterval = setInterval(() => {
      chatService.pingOnlineStatus(user.id);
    }, 15000); // 15s interval for 30s server window
    return () => clearInterval(pingInterval);
  }, [user?.id]);

  // Report / Options modal
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(!conversation?.isLocked || !!route.params?.authenticated);
  const [isBlockedByMe, setIsBlockedByMe] = useState(conversation?.isBlockedByMe || false);

  const handleUnblockPrompt = () => {
    Alert.alert('Unblock User', `Do you want to unblock ${conversation?.participantName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Unblock', 
        onPress: async () => {
          const res = await chatService.blockUser(user?.id, participantId, 'unblock');
          if (res.success || res.error === undefined) {
            setIsBlockedByMe(false);
          } else {
            Alert.alert('Error', 'Failed to unblock.');
          }
        }
      }
    ]);
  };

  const handleManageChat = async (action) => {
    setOptionsVisible(false);
    
    if (action === 'clear') {
      Alert.alert('Clear Chat', 'Are you sure you want to clear all messages? This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive', 
          onPress: async () => {
            const res = await chatService.manageConversation(conversation.id, user?.id, 'clear');
            if (res.success) {
              setMessages([]);
              Alert.alert('Cleared', 'Chat history has been cleared.');
            } else {
              Alert.alert('Error', res.error || 'Failed to clear chat.');
            }
          }
        }
      ]);
    } else if (action === 'block') {
      Alert.alert('Block User', `Are you sure you want to block ${conversation?.participantName}? They won't be able to message you.`, [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive', 
          onPress: async () => {
            const res = await chatService.blockUser(user?.id, participantId, 'block');
            if (res.success || res.error === undefined) {
              setIsBlockedByMe(true);
            } else {
              Alert.alert('Error', res.error || 'Failed to block user.');
            }
          }
        }
      ]);
    } else if (action === 'lock' || action === 'unlock') {
      const realAction = action === 'lock' ? (conversation.isLocked ? 'unlock' : 'lock') : action;
      const res = await chatService.manageConversation(conversation.id, user?.id, realAction);
      if (res.success) {
        Alert.alert(realAction === 'lock' ? 'Locked' : 'Unlocked', `Chat has been ${realAction === 'lock' ? 'locked' : 'unlocked'}.`);
        navigation.navigate('Messages', { screen: 'MessagesMain' });
      } else {
        Alert.alert('Error', res.error || 'Action failed');
      }
    } else if (action === 'hide' || action === 'unhide') {
      const res = await chatService.manageConversation(conversation.id, user?.id, action);
      if (res.success) {
        Alert.alert(action === 'hide' ? 'Hidden' : 'Visible', `Chat has been ${action === 'hide' ? 'hidden' : 'unhidden'}.`);
        navigation.navigate('Messages', { screen: 'MessagesMain' });
      } else {
        Alert.alert('Error', res.error || 'Action failed');
      }
    } else if (action === 'report') {
      setReportVisible(true);
    }
  };
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      if (!conversation?.id || !user?.id) return;
      if (conversation.isLocked && !isAuthenticated) {
        if (route.params?.authenticated) {
          setIsAuthenticated(true);
        } else {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Locked Chat',
            fallbackLabel: 'Enter Passcode',
          });
          if (result.success) setIsAuthenticated(true);
          else navigation.goBack();
        }
      }
    }
    checkAuth();
  }, [conversation?.id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      const initMessages = async () => {
        if (!conversation?.id || !user?.id) return;
        if (conversation.isLocked && !isAuthenticated) return;

        let cid = conversation.id;
        if (cid.startsWith('new-') || cid.startsWith('temp_')) {
          try {
            const pId = cid.startsWith('new-') ? cid.replace('new-', '') : cid.replace('temp_', '');
            cid = await chatService.createConversation(pId, user.id);
            navigation.setParams({ conversation: { ...conversation, id: cid } });
          } catch (e) {
            console.error('Failed to resolve conversation:', e);
            setLoading(false);
            return;
          }
        }

        // Mark as read and refresh unread immediately
        chatService.markAsRead(cid, user.id);
        refreshUnread();

        const data = await chatService.getMessages(cid, user.id);
        if (data) {
          setMessages(data);
        }
        setLoading(false);

        // Fetch initial typing and availability status immediately
        try {
          const statusResult = await chatService.checkTyping(cid, user.id, participantId);
          setTyping(statusResult.typing);
          setIsOnline(statusResult.isOnline);
          setLastSeen(statusResult.lastSeen);
          setIsHidden(!!statusResult.isHidden);
        } catch (e) {
          console.warn('Failed to fetch initial presence status:', e);
        }
      };

      initMessages();
      
      const pollInterval = setInterval(async () => {
        if (!conversation?.id || !user?.id) return;
        const cid = (conversation.id.startsWith('new-') || conversation.id.startsWith('temp_')) ? null : conversation.id;
        if (cid) {
          // Poll new messages
          const data = await chatService.getMessages(cid, user.id);
          if (data) {
            // Only update if lengths diff or last message diff to avoid over-rendering janks
            // Preserve temp messages (IDs starting with 'm-') during polling to prevent flickering
            setMessages(prev => {
               const tempMessages = prev.filter(m => m.id && m.id.startsWith('m-'));
               if (prev.length !== data.length || (data.length > 0 && prev[prev.length-1]?.id !== data[data.length-1]?.id)) {
                 return [...data, ...tempMessages];
               }
               return prev;
            });
          }
          
          // Poll typing and online status
          const statusResult = await chatService.checkTyping(cid, user.id, participantId);
          console.log(`[DEBUG-CHAT-DETAIL] Polling status for ${participantId}:`, statusResult);
          setTyping(statusResult.typing);
          setIsOnline(statusResult.isOnline);
          setLastSeen(statusResult.lastSeen);
          setIsHidden(!!statusResult.isHidden);
        }
      }, 3000);

      return () => { clearInterval(pollInterval); };
    }, [conversation?.id, user?.id, isAuthenticated, participantId])
  );



  const handleSwipeReply = useCallback((msg) => {
    setReplyingTo(msg);
    // Small delay so swipe animation finishes before keyboard shows
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 150);
  }, []);

  const handleBubbleAction = (action, msg) => {

    if (action === 'delete') {
      const isMe = msg.senderId === 'me';
      const options = [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete for me', 
          style: 'destructive', 
          onPress: () => {
            chatService.deleteMessage(conversation.id, msg.id, user?.id, 'me').then(() => {
              setMessages(prev => prev.filter(m => m.id !== msg.id));
            });
          }
        }
      ];

      if (isMe && !msg.isDeleted) {
        options.push({ 
          text: 'Delete for everyone',
          style: 'destructive',
          onPress: () => {
            chatService.deleteMessage(conversation.id, msg.id, user?.id, 'everyone').then(() => {
              setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, text: 'This message was deleted', isDeleted: true, statusItemId: null } : m));
            });
          }
        });
      }

      Alert.alert('Delete Message', 'What would you like to do?', options);
    } else if (action === 'edit') {
      setEditingMessageId(msg.id);
      setInput(msg.text);
    }
  };

  const scrollToBottom = () => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToEnd({ animated: true });
    }
  };

  const sendAttachmentMessage = async (payload) => {
    if (isSellerDeactivated) {
      Alert.alert('Account Restricted', 'Your seller account is deactivated. You cannot send messages until your account is reactivated.');
      return;
    }
    if (!user?.id) return;

    const finalMsgText = buildAttachmentMessage(payload);
    const tempId = `m-${Date.now()}`;
    const myMsg = {
      id: tempId,
      text: finalMsgText,
      senderId: 'me',
      timestamp: new Date(),
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        senderName: replyingTo.senderId === 'me' ? 'You' : (replyingTo.senderName || 'Other')
      } : null
    };

    const rId = replyingTo?.id;
    setReplyingTo(null);
    setMessages((prev) => [...prev, myMsg]);

    let cid = conversation.id;
    if (cid.startsWith('new-') || cid.startsWith('temp_')) {
      try {
        const pId = cid.startsWith('new-') ? cid.replace('new-', '') : cid.replace('temp_', '');
        cid = await chatService.createConversation(pId, user.id);
        navigation.setParams({ conversation: { ...conversation, id: cid, productContext: null } });
      } catch (e) {
        setMessages((prev) => prev.filter(m => m.id !== tempId));
        Alert.alert('Error', 'Could not create conversation.');
        return;
      }
    }

    try {
      const realMsg = await chatService.sendMessage(cid, user.id, finalMsgText, null, rId);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...realMsg, replyTo: myMsg.replyTo || realMsg.replyTo } : m)));
    } catch (e) {
      setMessages((prev) => prev.filter(m => m.id !== tempId));
      Alert.alert('Attachment Failed', e.message || 'Failed to send attachment.');
    }
  };

  const handlePickImageAttachment = async () => {
    setAttachmentVisible(false);
    Alert.alert(
      'Select Image',
      'Choose how you want to add an image',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Camera access is needed to take photos.');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.2,
              base64: true,
            });

            if (!result.canceled && result.assets?.[0]) {
              const asset = result.assets[0];
              const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
              setSelectedImage(uri);
              setImageCaption('');
              setImageCaptionVisible(true);
            }
          }
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Gallery access is needed to send images.');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.2,
              base64: true,
            });

            if (!result.canceled && result.assets?.[0]) {
              const asset = result.assets[0];
              const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
              setSelectedImage(uri);
              setImageCaption('');
              setImageCaptionVisible(true);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleOpenContactAttachmentPicker = async () => {
    setAttachmentVisible(false);
    setLoadingAttachmentContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Contacts permission is needed to send contacts.');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });
      const formatted = (data || []).map(c => {
        const phone = c.phoneNumbers?.find(p => p.number)?.number;
        const email = c.emails?.find(e => e.email)?.email;
        return { id: c.id, name: c.name || 'Unknown Contact', phone, email };
      }).filter(c => c.phone || c.email).sort((a, b) => a.name.localeCompare(b.name));
      setAttachmentContacts(formatted);
      setAttachmentContactSearch('');
      setContactPickerVisible(true);
    } catch (e) {
      Alert.alert('Contacts Error', e.message || 'Could not load contacts.');
    } finally {
      setLoadingAttachmentContacts(false);
    }
  };

  const handlePickDocumentAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setAttachmentVisible(false);
        return;
      }

      const asset = result.assets[0];
      const documentName = asset.name || 'Document';
      const documentUri = asset.uri;

      setAttachmentVisible(false);
      // For now, we'll send the document as a reference
      // In a production app, you would upload the file to a server and get a URL
      await sendAttachmentMessage({ type: 'document', name: documentName, url: documentUri });
    } catch (e) {
      setAttachmentVisible(false);
      Alert.alert('Document Error', e.message || 'Could not pick document.');
    }
  };

  const handleSendImageWithCaption = async () => {
    if (!selectedImage) return;
    setImageCaptionVisible(false);
    await sendAttachmentMessage({ type: 'image', uri: selectedImage, caption: imageCaption });
    setSelectedImage(null);
    setImageCaption('');
  };

  const handleShareLocation = async () => {
    setAttachmentVisible(false);
    if (isSellerDeactivated) {
      Alert.alert('Account Restricted', 'Your seller account is deactivated. You cannot send messages until your account is reactivated.');
      return;
    }
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      await sendAttachmentMessage({
        type: 'location',
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (e) {
      Alert.alert('Location Error', 'Could not retrieve your current location.');
    }
  };

  const handleSend = async () => {
    // Deactivated sellers cannot send new messages
    if (isSellerDeactivated) {
      Alert.alert(
        'Account Restricted',
        'Your seller account is deactivated. You cannot send messages until your account is reactivated.'
      );
      return;
    }
    if (!input.trim() || !user?.id) return;
    const text = input.trim();
    const rId = replyingTo?.id;
    const isEditing = !!editingMessageId;
    const editId = editingMessageId;

    if (isEditing) {
      chatService.updateMessage(conversation.id, editId, text).then(() => {
        setMessages(prev => prev.map(m => m.id === editId ? { ...m, text } : m));
        setEditingMessageId(null);
        setInput('');
      });
      return;
    }

    setReplyingTo(null);
    setInput('');

    // Prepend productContext if present, then clear it
    let finalMsgText = text;
    if (productContext) {
      finalMsgText = `🛍️ Product: ${productContext.title}\n💰 Price: RWF ${productContext.price}\n🖼️ Image: ${productContext.image || ''}\n🆔 ID: ${productContext.id || ''}\n\n${text}`;
      setProductContext(null);
      navigation.setParams({ conversation: { ...conversation, productContext: null } });
    }

    const tempId = `m-${Date.now()}`;
    const myMsg = {
      id: tempId,
      text: finalMsgText,
      senderId: 'me',
      timestamp: new Date(),
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        senderName: replyingTo.senderId === 'me' ? 'You' : (replyingTo.senderName || 'Other')
      } : null
    };
    
    setMessages((prev) => [...prev, myMsg]);
    
    let cid = conversation.id;
    if (cid.startsWith('new-') || cid.startsWith('temp_')) {
       try {
         const pId = cid.startsWith('new-') ? cid.replace('new-', '') : cid.replace('temp_', '');
         cid = await chatService.createConversation(pId, user?.id);
         navigation.setParams({ conversation: { ...conversation, id: cid, productContext: null } });
       } catch (e) {
         setMessages((prev) => prev.filter(m => m.id !== tempId));
         Alert.alert('Error', 'Could not create conversation.');
         return;
       }
    }

    try {
      const statusItemId = route.params?.statusId || null;
      const realMsg = await chatService.sendMessage(cid, user.id, finalMsgText, statusItemId, rId);
      
      // Stop typing immediately on send
      if (cid) chatService.stopTyping(cid, user.id);

      setMessages((prev) => 
        prev.map((m) => (m.id === tempId ? { ...realMsg, replyTo: myMsg.replyTo || realMsg.replyTo } : m))
      );
    } catch (e) {
      setMessages((prev) => prev.filter(m => m.id !== tempId));
      Alert.alert('Message Failed', e.message === 'You are blocked by this user' ? 'You cannot send messages to this user.' : e.message || 'Failed to send message.');
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for the report.');
      return;
    }
    setReportSubmitting(true);
    const res = await chatService.reportUser(user?.id, conversation?.participantId, reportReason.trim());
    setReportSubmitting(false);

    if (res.success || res.error === undefined) {
      setReportVisible(false);
      setReportReason('');
      Alert.alert(
        'Report Submitted',
        `Your report against ${conversation?.participantName || 'this user'} has been submitted. Our team will review it shortly.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', res.error || 'Failed to submit report. Please try again.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={() => navigation.navigate('Messages', { screen: 'MessagesMain' })} style={styles.backBtn}>
          <ArrowLeft color={colors.foreground} size={22} />
        </TouchableOpacity>

        {/* Avatar + name + status */}
        <View style={[styles.headerAvatar, { backgroundColor: (conversation?.participantColor || colors.primary) + '22', borderColor: (conversation?.participantColor || colors.primary) + '55', overflow: 'hidden' }]}>
          {conversation?.participantImage ? (
            <Image source={{ uri: conversation.participantImage }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <CustomText style={[styles.headerAvatarText, { color: conversation?.participantColor || colors.primary }]}>
              {conversation?.participantInitials || '??'}
            </CustomText>
          )}
          {isOnline && !isHidden && (
            <View style={styles.onlineDotHeaderWrapper}>
              <Animated.View 
                style={[
                  styles.onlineDotPulse, 
                  { 
                    backgroundColor: '#22c55e', 
                    transform: [{ scale: pulseScale }], 
                    opacity: pulseOpacity 
                  }
                ]} 
              />
              <PresenceDot size={12} borderSize={2} borderColor={colors.background} />
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <CustomText style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
            {conversation?.participantName}
          </CustomText>
          {!isHidden && (
            <CustomText style={[styles.headerStatus, { color: typing ? colors.primary : (isOnline ? '#22c55e' : colors.muted) }]}>
              {typing ? `typing${typingDots}` : isOnline ? 'Online' : `Last seen ${lastSeen ? formatLastSeen(lastSeen) : 'recently'}`}
            </CustomText>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={[styles.headerAction, { marginRight: 4 }]} onPress={() => startCall(participantId, conversation?.participantName, false)} activeOpacity={0.7}>
            <Phone color={colors.primary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerAction, { marginRight: 4 }]} onPress={() => startCall(participantId, conversation?.participantName, true)} activeOpacity={0.7}>
            <Video color={colors.primary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={() => setOptionsVisible(true)} activeOpacity={0.7}>
            <MoreVertical color={colors.muted} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Options Modal */}
      <Modal visible={optionsVisible} transparent animationType="fade" onRequestClose={() => setOptionsVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setOptionsVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.optionsMenu, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              <TouchableOpacity style={styles.optionItem} onPress={() => handleManageChat('clear')}>
                <CustomText style={{ color: colors.foreground }}>Clear Chat</CustomText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => handleManageChat('lock')}>
                <CustomText style={{ color: colors.foreground }}>{conversation?.isLocked ? 'Unlock Chat' : 'Lock Chat'}</CustomText>
              </TouchableOpacity>
              {/* <TouchableOpacity style={styles.optionItem} onPress={() => handleManageChat(conversation?.isHidden ? 'unhide' : 'hide')}>
                <CustomText style={{ color: colors.foreground }}>{conversation?.isHidden ? 'Unhide Chat' : 'Hide Chat'}</CustomText>
              </TouchableOpacity> */}
              {isBlockedByMe ? (
                <TouchableOpacity style={styles.optionItem} onPress={handleUnblockPrompt}>
                  <CustomText style={{ color: '#ef4444' }}>Unblock User</CustomText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.optionItem} onPress={() => handleManageChat('block')}>
                  <CustomText style={{ color: '#ef4444' }}>Block User</CustomText>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.optionItem, { borderBottomWidth: 0 }]} onPress={() => handleManageChat('report')}>
                <CustomText style={{ color: colors.muted }}>Report</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>



      {/* Messages */}
      {loading || (conversation?.isLocked && !isAuthenticated) ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
            const prevDate = prevMsg ? new Date(prevMsg.timestamp).toDateString() : null;
            const currentDate = new Date(item.timestamp).toDateString();
            const showSeparator = prevDate !== currentDate;

            const isSameSenderAsPrev = !showSeparator && prevMsg && prevMsg.senderId === item.senderId;
            const nextDate = nextMsg ? new Date(nextMsg.timestamp).toDateString() : null;
            const isSameSenderAsNext = nextDate === currentDate && nextMsg && nextMsg.senderId === item.senderId;

            const enhancedMsg = {
               ...item,
               showSeparator,
               isSameSenderAsPrev,
               isSameSenderAsNext
            };

            return (
              <View>
                {showSeparator && (
                  <View style={styles.dateSeparator}>
                    <View style={[styles.dateSeparatorLine, { backgroundColor: colors.glassBorder }]} />
                    <View style={[styles.dateSeparatorBadge, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                      <CustomText style={[styles.dateSeparatorText, { color: colors.muted }]}>
                        {formatDateSeparator(item.timestamp)}
                      </CustomText>
                    </View>
                    <View style={[styles.dateSeparatorLine, { backgroundColor: colors.glassBorder }]} />
                  </View>
                )}
                <Bubble msg={enhancedMsg} colors={colors} onAction={handleBubbleAction} onSwipeReply={handleSwipeReply} onNavigateProduct={navigateToProductDetails} />
              </View>
            );
          }}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          ListHeaderComponent={
            productContext ? (
              <ProductContextCard
                context={productContext}
                onNavigateProduct={navigateToProductDetails}
                colors={colors}
              />
            ) : null
          }
          ListFooterComponent={
            typing ? (
              <View style={styles.typingRow}>
                <View style={[styles.miniAvatar, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
                  <CustomText style={[styles.miniAvatarText, { color: colors.primary }]}>S</CustomText>
                </View>
                <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                  <TypingDotsPulsing colors={colors} />
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {isSellerDeactivated ? (
          /* Deactivated seller — show a locked input bar */
          <View style={[styles.inputBarWrapper, { backgroundColor: colors.background, borderTopColor: 'rgba(245,158,11,0.3)' }]}>
            <View style={[styles.inputBar, {
              backgroundColor: 'rgba(245,158,11,0.06)',
              borderRadius: 12,
              margin: 10,
              borderWidth: 1,
              borderColor: 'rgba(245,158,11,0.25)',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 14,
              flexDirection: 'row',
              gap: 8,
            }]}>
              <CustomText style={{ color: '#F59E0B', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                🔒 Messaging restricted — account deactivated
              </CustomText>
            </View>
          </View>
        ) : isBlockedByMe ? (
          <TouchableOpacity 
             style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.glassBorder, justifyContent: 'center', paddingVertical: 18 }]}
             onPress={handleUnblockPrompt}
             activeOpacity={0.7}
          >
             <CustomText style={{ color: colors.muted, fontSize: 13, textAlign: 'center' }}>
               You blocked this contact. Tap to unblock.
             </CustomText>
          </TouchableOpacity>
        ) : (
        <View style={[styles.inputBarWrapper, { backgroundColor: colors.background, borderTopColor: colors.glassBorder }]}>
          {replyingTo && (
            <View style={[styles.replyPreview, { backgroundColor: colors.card, borderLeftColor: colors.primary }]}>
              <View style={styles.replyPreviewBody}>
                <CustomText style={[styles.replyPreviewSender, { color: colors.primary }]}>
                  {replyingTo.senderId === 'me' ? 'You' : (replyingTo.senderName || 'Other')}
                </CustomText>
                <CustomText style={[styles.replyPreviewText, { color: colors.muted }]} numberOfLines={1}>
                  {replyingTo.text}
                </CustomText>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyClose}>
                <View style={[styles.replyCloseCircle, { backgroundColor: colors.glassBorder }]}>
                  <CustomText style={{ fontSize: 10, color: colors.muted }}>✕</CustomText>
                </View>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputBar}>
            <TouchableOpacity
              onPress={() => setAttachmentVisible(true)}
              style={[styles.attachBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
              activeOpacity={0.8}
            >
              <Paperclip color={colors.primary} size={20} />
            </TouchableOpacity>
            <View style={[styles.inputWrap, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              {editingMessageId && (
                <CustomText style={{ fontSize: 10, color: colors.primary, marginBottom: 2, fontWeight: '700' }}>
                  Editing Message
                </CustomText>
              )}
              <TextInput
                ref={inputRef}
                value={input}
                onChangeText={(txt) => {
                  setInput(txt);
                  
                  // Live typing via WebSocket
                  if (conversation?.id && !conversation.id.startsWith('new-') && user?.id) {
                    sendTyping(conversation.id, conversation.participantId);
                    
                    // Clear existing timer
                    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                    
                    // Set timeout to stop typing
                    typingTimerRef.current = setTimeout(() => {
                      sendStopTyping(conversation.id, conversation.participantId);
                    }, 2000);
                  }
                }}
                placeholder="Type a message..."
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.foreground }]}
                multiline
                maxLength={1000}
                returnKeyType="default"
              />
            </View>
            {editingMessageId && (
              <TouchableOpacity onPress={() => { setEditingMessageId(null); setInput(''); }} style={{ marginRight: 6, marginBottom: 12 }}>
                <CustomText style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>Cancel</CustomText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim()}
              style={[
                styles.sendBtn,
                { backgroundColor: input.trim() ? colors.primary : colors.glass },
              ]}
              activeOpacity={0.8}
            >
              <Send color={input.trim() ? '#fff' : colors.muted} size={20} />
            </TouchableOpacity>
          </View>
        </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Report Modal ── */}
      <Modal visible={attachmentVisible} transparent animationType="fade" onRequestClose={() => setAttachmentVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setAttachmentVisible(false)}>
          <View style={styles.attachmentOverlay}>
            <View style={[styles.attachmentSheet, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              <TouchableOpacity style={styles.attachmentOption} onPress={handlePickImageAttachment}>
                <View style={[styles.attachmentOptionIcon, { backgroundColor: colors.primary + '16' }]}>
                  <ImageIcon color={colors.primary} size={20} />
                </View>
                <CustomText style={[styles.attachmentOptionText, { color: colors.foreground }]}>Image</CustomText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentOption} onPress={handleShareLocation}>
                <View style={[styles.attachmentOptionIcon, { backgroundColor: colors.primary + '16' }]}>
                  <MapPin color={colors.primary} size={20} />
                </View>
                <CustomText style={[styles.attachmentOptionText, { color: colors.foreground }]}>Location</CustomText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentOption} onPress={handlePickDocumentAttachment}>
                <View style={[styles.attachmentOptionIcon, { backgroundColor: colors.primary + '16' }]}>
                  <FileText color={colors.primary} size={20} />
                </View>
                <CustomText style={[styles.attachmentOptionText, { color: colors.foreground }]}>Document</CustomText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentOption} onPress={handleOpenContactAttachmentPicker}>
                <View style={[styles.attachmentOptionIcon, { backgroundColor: colors.primary + '16' }]}>
                  <UserPlus color={colors.primary} size={20} />
                </View>
                <CustomText style={[styles.attachmentOptionText, { color: colors.foreground }]}>Contact</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={contactPickerVisible} transparent animationType="slide" onRequestClose={() => setContactPickerVisible(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContent, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={styles.pickerHeader}>
              <CustomText style={[styles.pickerTitle, { color: colors.foreground }]}>Send Contact</CustomText>
              <TouchableOpacity onPress={() => setContactPickerVisible(false)} style={styles.pickerCloseBtn}>
                <X color={colors.foreground} size={20} />
              </TouchableOpacity>
            </View>
            <TextInput value={attachmentContactSearch} onChangeText={setAttachmentContactSearch} placeholder="Search contacts..." placeholderTextColor={colors.muted} style={[styles.contactSearchInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.glassBorder }]} />
            {loadingAttachmentContacts ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : (
              <FlatList
                data={attachmentContacts.filter(c => c.name.toLowerCase().includes(attachmentContactSearch.toLowerCase()) || (c.phone || '').includes(attachmentContactSearch) || (c.email || '').toLowerCase().includes(attachmentContactSearch.toLowerCase()))}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.contactPickRow, { borderBottomColor: colors.glassBorder }]} onPress={() => { setContactPickerVisible(false); sendAttachmentMessage({ type: 'contact', name: item.name, phone: item.phone, email: item.email }); }}>
                    <View style={[styles.attachmentIcon, { backgroundColor: colors.primary + '14' }]}>
                      <UserPlus size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CustomText style={[styles.attachmentTitle, { color: colors.foreground }]}>{item.name}</CustomText>
                      <CustomText style={[styles.attachmentMeta, { color: colors.muted }]}>{item.phone || item.email}</CustomText>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={imageCaptionVisible} transparent animationType="fade" onRequestClose={() => { setImageCaptionVisible(false); setSelectedImage(null); setImageCaption(''); }}>
        <TouchableWithoutFeedback onPress={() => { setImageCaptionVisible(false); setSelectedImage(null); setImageCaption(''); }}>
          <View style={styles.pickerOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <TouchableWithoutFeedback>
                <View style={[styles.pickerContent, { backgroundColor: colors.card, borderColor: colors.glassBorder, height: 'auto', paddingBottom: 24 }]}>
                  <View style={styles.pickerHeader}>
                    <CustomText style={[styles.pickerTitle, { color: colors.foreground }]}>Add Caption</CustomText>
                    <TouchableOpacity onPress={() => { setImageCaptionVisible(false); setSelectedImage(null); setImageCaption(''); }} style={styles.pickerCloseBtn}>
                      <X color={colors.foreground} size={20} />
                    </TouchableOpacity>
                  </View>
                  {selectedImage && (
                    <Image source={{ uri: selectedImage }} style={styles.captionPreviewImage} resizeMode="cover" />
                  )}
                  <TextInput
                    value={imageCaption}
                    onChangeText={setImageCaption}
                    placeholder="Add a caption... (optional)"
                    placeholderTextColor={colors.muted}
                    style={[styles.contactSearchInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.glassBorder, marginTop: 12, marginBottom: 12 }]}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    onPress={handleSendImageWithCaption}
                    style={[styles.sendImageBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                  >
                    <CustomText style={[styles.sendImageBtnText, { color: '#fff' }]}>Send Image</CustomText>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={reportVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setReportVisible(false)}>
          <View style={styles.reportOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%' }}
            >
            <TouchableWithoutFeedback>
              <View style={[styles.reportSheet, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>

                {/* Sheet handle */}
                <View style={[styles.sheetHandle, { backgroundColor: colors.glassBorder }]} />

                {/* Warning icon row */}
                <View style={[styles.reportIconWrap, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }]}>
                  <CustomText style={styles.reportIconEmoji}>🚩</CustomText>
                </View>

                <CustomText style={[styles.reportTitle, { color: colors.foreground }]}>
                  Report User
                </CustomText>
                <CustomText style={[styles.reportSubtitle, { color: colors.muted }]}>
                  Reporting{' '}
                  <CustomText style={{ color: colors.primary, fontWeight: '700' }}>
                    {conversation?.participantName || 'this user'}
                  </CustomText>
                  . Please describe the issue below.
                </CustomText>

                {/* Reason input */}
                <TextInput
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder="e.g. Sending spam messages, inappropriate content..."
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.reportInput,
                    { backgroundColor: colors.background, borderColor: colors.glassBorder, color: colors.foreground },
                  ]}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
                <CustomText style={[styles.charCount, { color: colors.muted }]}>
                  {reportReason.length}/500
                </CustomText>

                {/* Actions */}
                <View style={styles.reportActions}>
                  <TouchableOpacity
                    style={[styles.reportBtn, styles.cancelBtn, { borderColor: colors.glassBorder }]}
                    onPress={() => { setReportVisible(false); setReportReason(''); }}
                    activeOpacity={0.8}
                  >
                    <CustomText style={[styles.reportBtnText, { color: colors.muted }]}>Cancel</CustomText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.reportBtn, styles.submitBtn, { backgroundColor: reportSubmitting ? 'rgba(239,68,68,0.5)' : '#EF4444' }]}
                    onPress={handleReport}
                    disabled={reportSubmitting}
                    activeOpacity={0.8}
                  >
                    {reportSubmitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <CustomText style={[styles.reportBtnText, { color: '#fff' }]}>Submit Report</CustomText>
                    )}
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { padding: 6 },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    position: 'relative',
  },
  headerAvatarText: { fontSize: 14, fontWeight: '900' },
  onlineDotHeaderWrapper: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700' },
  headerStatus: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  headerAction: { padding: 6 },

  // Date divider
  dateDivider: { alignItems: 'center', paddingVertical: 10 },
  dateChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
  },
  dateChipText: { fontSize: 11, fontWeight: '600' },

  // Messages
  messageList: { paddingHorizontal: 12, paddingBottom: 14 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },

  // Swipe-to-reply
  swipeReplyAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
  },
  swipeReplyLeft: { justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 6 },
  swipeReplyRight: { justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6 },
  swipeReplyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  miniAvatarText: { fontSize: 11, fontWeight: '900' },

  bubble: { 
    borderRadius: 16, 
    paddingHorizontal: 10, 
    paddingTop: 6,
    paddingBottom: 6,
  },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleOther: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleTextWrapper: {
    position: 'relative',
    minWidth: 50,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  invisibleSpacer: {
    opacity: 0,
    fontSize: 11,
    lineHeight: 21,
  },
  timestampWrap: {
    position: 'absolute',
    bottom: -2,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubbleTime: { fontSize: 10.5, fontWeight: '600' },

  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, marginBottom: 8, marginTop: 4 },
  typingBubble: { borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  typingDots: { flexDirection: 'row', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, opacity: 0.7 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusReplyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
    marginTop: 2,
  },
  statusReplyImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  statusReplyColorBlock: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  statusReplyTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusReplySubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  statusReplyText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },

  // Input bar
  inputBarWrapper: {
    flexDirection: 'column',
    borderTopWidth: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    maxHeight: 120,
  },
  input: { fontSize: 15, lineHeight: 20 },
  attachBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentCard: {
    borderWidth: 0,
    borderRadius: 14,
    margin: 0,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: 220,
    height: 180,
    borderRadius: 14,
  },
  attachmentRow: {
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  attachmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  attachmentMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  attachmentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 120,
  },
  attachmentSheet: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attachmentOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  attachmentOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentOptionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    height: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  pickerCloseBtn: {
    padding: 6,
  },
  contactSearchInput: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  contactPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  captionPreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  sendImageBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendImageBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Report Modal
  reportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  reportSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 24,
  },
  reportIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  reportIconEmoji: { fontSize: 28 },
  reportTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  reportSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  reportInput: {
    width: '100%',
    height: 110,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 11,
    marginTop: 6,
    marginBottom: 24,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  reportBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  submitBtn: {},
  reportBtnText: { fontSize: 15, fontWeight: '700' },
  
  // Options Menu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 15,
  },
  optionsMenu: {
    width: 170,
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },

  // Date Separators
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 10,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  dateSeparatorBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateSeparatorText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Reply styles
  replyPreview: {
    flexDirection: 'row',
    padding: 10,
    borderLeftWidth: 4,
    borderRadius: 8,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: -4,
  },
  replyPreviewBody: {
    flex: 1,
  },
  replyPreviewSender: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 13,
  },
  replyClose: {
    padding: 4,
  },
  replyCloseCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotedBubble: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
  },
  quotedBorder: {
    width: 3,
  },
  quotedBody: {
    flex: 1,
    padding: 6,
    paddingLeft: 8,
  },
  quotedSender: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  quotedText: {
    fontSize: 12,
    opacity: 0.9,
  },
  onlineDotPulse: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
});
