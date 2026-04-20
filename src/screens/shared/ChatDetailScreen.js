import React, { useState, useEffect, useRef, useContext } from 'react';
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
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Phone, MoreVertical, Image as ImageIcon } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../api/chatService';

function formatMsgTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  
  const isToday = d.getDate() === now.getDate() && 
                  d.getMonth() === now.getMonth() && 
                  d.getFullYear() === now.getFullYear();
                  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.getDate() === yesterday.getDate() && 
                      d.getMonth() === yesterday.getMonth() && 
                      d.getFullYear() === yesterday.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Today, ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  } else {
    const isSameYear = d.getFullYear() === now.getFullYear();
    const dateStr = d.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        year: isSameYear ? undefined : 'numeric' 
    });
    return `${dateStr}, ${timeStr}`;
  }
}

const Bubble = ({ msg, colors, onAction }) => {
  const isMe = msg.senderId === 'me';

  const handleLongPress = () => {
    if (isMe && onAction) {
      Alert.alert('Message Options', 'What would you like to do?', [
        { text: 'Edit', onPress: () => onAction('edit', msg) },
        { text: 'Delete', style: 'destructive', onPress: () => onAction('delete', msg) },
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  };

  return (
    <View style={[styles.bubbleRow, isMe ? styles.rowRight : styles.rowLeft]}>
      {/* Avatar for received messages */}
      {!isMe && (
        <View style={[styles.miniAvatar, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
          <CustomText style={[styles.miniAvatarText, { color: colors.primary }]}>S</CustomText>
        </View>
      )}
      <View style={{ maxWidth: '74%' }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={handleLongPress}
          delayLongPress={250}
          style={[
            styles.bubble,
            isMe
              ? [styles.bubbleMe, { backgroundColor: colors.primary }]
              : [styles.bubbleOther, { backgroundColor: colors.card, borderColor: colors.glassBorder }],
          ]}
        >
          {msg.statusItemId && (
            <View style={[styles.statusReplyBadge, { backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(230, 126, 34, 0.1)' }]}>
              <ImageIcon size={10} color={isMe ? '#fff' : '#e67e22'} />
              <CustomText style={[styles.statusReplyText, { color: isMe ? '#fff' : '#e67e22' }]}>
                Status Reply
              </CustomText>
            </View>
          )}
          <CustomText style={[styles.bubbleText, { color: isMe ? '#fff' : colors.foreground }]}>
            {msg.text}
          </CustomText>
          <CustomText
            style={[styles.bubbleTime, { color: isMe ? 'rgba(255,255,255,0.65)' : colors.muted }]}
          >
            {formatMsgTime(msg.timestamp)}
            {isMe && '  ✓✓'}
          </CustomText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ChatDetailScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { conversation } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const listRef = useRef(null);

  // Report / Options modal
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(!conversation?.isLocked || !!route.params?.authenticated);

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
            const res = await chatService.blockUser(user?.id, conversation.participantId, 'block');
            if (res.success) {
              Alert.alert('Blocked', 'User has been blocked.');
              navigation.navigate('Messages', { screen: 'MessagesMain' });
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
    async function init() {
      if (!conversation?.id || !user?.id) return;

      // Handle biometric check for locked chats
      if (conversation.isLocked && !isAuthenticated) {
        // If already authenticated via the list screen, skip prompt
        if (route.params?.authenticated) {
          setIsAuthenticated(true);
        } else {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Locked Chat',
            fallbackLabel: 'Enter Passcode',
          });
          if (result.success) {
            setIsAuthenticated(true);
          } else {
            navigation.goBack();
            return;
          }
        }
      }
      
      let cid = conversation.id;
      if (cid.startsWith('new-')) {
        try {
          const pId = cid.replace('new-', '');
          cid = await chatService.createConversation(pId, user?.id);
          // Update navigation params so other effects use the real ID
          navigation.setParams({ conversation: { ...conversation, id: cid } });
        } catch (e) {
          console.error('Failed to resolve conversation:', e);
          setLoading(false);
          return;
        }
      }

      chatService.getMessages(cid, user.id).then((data) => {
        setMessages(data);
        setLoading(false);
      });
    }
    init();
  }, [conversation?.id, user?.id]);

  const handleBubbleAction = (action, msg) => {
    if (action === 'delete') {
      Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            chatService.deleteMessage(conversation.id, msg.id).then(() => {
              setMessages(prev => prev.filter(m => m.id !== msg.id));
            });
          }
        }
      ]);
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

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    if (editingMessageId) {
      chatService.updateMessage(conversation.id, editingMessageId, text).then(() => {
        setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, text } : m));
        setEditingMessageId(null);
        setInput('');
      });
      return;
    }

    const tempId = `m-${Date.now()}`;
    const myMsg = {
      id: tempId,
      text,
      senderId: 'me',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, myMsg]);
    setInput('');
    let cid = conversation.id;
    if (cid.startsWith('new-')) {
       const pId = cid.replace('new-', '');
       cid = await chatService.createConversation(pId, user?.id);
       navigation.setParams({ conversation: { ...conversation, id: cid } });
    }

    const realMsg = await chatService.sendMessage(cid, user?.id, text);
    setMessages((prev) => 
      prev.map((m) => (m.id === tempId ? realMsg : m))
    );
  };

  const handleReport = () => {
    if (!reportReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for the report.');
      return;
    }
    setReportSubmitting(true);
    // TODO: wire to real API — POST /api/reports
    setTimeout(() => {
      setReportSubmitting(false);
      setReportVisible(false);
      setReportReason('');
      Alert.alert(
        'Report Submitted',
        `Your report against ${conversation?.participantName || 'this user'} has been submitted. Our team will review it shortly.`,
        [{ text: 'OK' }]
      );
    }, 900);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={() => navigation.navigate('Messages', { screen: 'MessagesMain' })} style={styles.backBtn}>
          <ArrowLeft color={colors.foreground} size={22} />
        </TouchableOpacity>

        {/* Avatar + name + status */}
        <View style={[styles.headerAvatar, { backgroundColor: (conversation?.participantColor || colors.primary) + '22', borderColor: (conversation?.participantColor || colors.primary) + '55' }]}>
          <CustomText style={[styles.headerAvatarText, { color: conversation?.participantColor || colors.primary }]}>
            {conversation?.participantInitials || '??'}
          </CustomText>
          {conversation?.isOnline && <View style={styles.onlineDotHeader} />}
        </View>

        <View style={styles.headerInfo}>
          <CustomText style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
            {conversation?.participantName || 'Chat'}
          </CustomText>
          <CustomText style={[styles.headerStatus, { color: typing ? colors.primary : (conversation?.isOnline ? '#22c55e' : colors.muted) }]}>
            {typing ? 'typing...' : conversation?.isOnline ? 'Online' : 'Offline'}
          </CustomText>
        </View>

        <TouchableOpacity style={styles.headerAction} onPress={() => setOptionsVisible(true)} activeOpacity={0.7}>
          <MoreVertical color={colors.muted} size={20} />
        </TouchableOpacity>
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
              <TouchableOpacity style={styles.optionItem} onPress={() => handleManageChat(conversation?.isHidden ? 'unhide' : 'hide')}>
                <CustomText style={{ color: colors.foreground }}>{conversation?.isHidden ? 'Unhide Chat' : 'Hide Chat'}</CustomText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => handleManageChat('block')}>
                <CustomText style={{ color: '#ef4444' }}>Block User</CustomText>
              </TouchableOpacity>
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
          renderItem={({ item }) => <Bubble msg={item} colors={colors} onAction={handleBubbleAction} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          ListFooterComponent={
            typing ? (
              <View style={styles.typingRow}>
                <View style={[styles.miniAvatar, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
                  <CustomText style={[styles.miniAvatarText, { color: colors.primary }]}>S</CustomText>
                </View>
                <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                  <View style={styles.typingDots}>
                    {[0, 1, 2].map(i => (
                      <View key={i} style={[styles.dot, { backgroundColor: colors.muted }]} />
                    ))}
                  </View>
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.glassBorder }]}>
          <View style={[styles.inputWrap, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            {editingMessageId && (
              <CustomText style={{ fontSize: 10, color: colors.primary, marginBottom: 2, fontWeight: '700' }}>
                Editing Message
              </CustomText>
            )}
            <TextInput
              value={input}
              onChangeText={setInput}
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
      </KeyboardAvoidingView>

      {/* ── Report Modal ── */}
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
  onlineDotHeader: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#030712',
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
  messageList: { paddingHorizontal: 14, paddingBottom: 14 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, gap: 8 },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },

  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  miniAvatarText: { fontSize: 11, fontWeight: '900' },

  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleOther: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: 'right', fontWeight: '600' },

  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, marginBottom: 8, marginTop: 4 },
  typingBubble: { borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  typingDots: { flexDirection: 'row', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, opacity: 0.7 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusReplyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    gap: 4,
  },
  statusReplyText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
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
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
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
});
