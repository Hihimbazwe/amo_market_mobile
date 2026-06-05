import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Image,
  Modal,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Contacts from 'expo-contacts';
import { Menu, Search, MessageCircle, Plus, Archive, Trash2, Pin, PinOff, Lock, Users, X, Settings, Radio, Megaphone } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../api/chatService';
import PresenceDot from '../../components/PresenceDot';

import { BuyerDrawerContext } from '../../context/BuyerDrawerContext';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { CourierDrawerContext } from '../../context/CourierDrawerContext';
import { AgentDrawerContext } from '../../context/AgentDrawerContext';

import { BuyerDrawerComponent } from '../../navigation/BuyerDashboardDrawer';
import { SellerDrawerComponent } from '../../navigation/SellerDashboardDrawer';
import { CourierDrawerComponent } from '../../navigation/CourierDashboardDrawer';
import { AgentDrawerComponent } from '../../navigation/AgentDashboardDrawer';


function formatTime(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  } else {
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }
}

function normalizeSearch(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

function conversationSearchScore(query, conversation) {
  const q = query.trim().toLowerCase();
  const qn = normalizeSearch(q);
  const name = conversation.participantName || '';
  const normalizedName = normalizeSearch(name);
  const lastMessage = normalizeSearch(conversation.lastMessage);

  if (!qn) return 0;
  if (normalizedName === qn) return 0;
  if (normalizedName.startsWith(qn)) return 5;
  if (normalizedName.includes(qn)) return 10;

  const distance = editDistance(qn, normalizedName);
  if (distance <= Math.max(1, Math.ceil(Math.max(qn.length, normalizedName.length) * 0.34))) {
    return 25 + distance;
  }

  const parts = q.split(/\s+/).map(normalizeSearch).filter(Boolean);
  const matchedParts = parts.filter(part => normalizedName.includes(part)).length;
  if (matchedParts > 0) return 70 - matchedParts;

  if (lastMessage.includes(qn)) return 95;

  return 999;
}

const renderRightActions = (progress, dragX, item, onSwipeAction) => {
  return (
    <View style={{ flexDirection: 'row', width: 210 }}>
      {/* Pin/Unpin */}
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' }}
        onPress={() => onSwipeAction('pin', item)}
        activeOpacity={0.8}
      >
        {item.isPinned ? <PinOff color="#fff" size={20} /> : <Pin color="#fff" size={20} />}
        <CustomText style={{ color: '#fff', fontSize: 11, marginTop: 4 }}>{item.isPinned ? 'Unpin' : 'Pin'}</CustomText>
      </TouchableOpacity>
      {/* Archive */}
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: '#ea580c', justifyContent: 'center', alignItems: 'center' }}
        onPress={() => onSwipeAction('archive', item)}
        activeOpacity={0.8}
      >
        <Archive color="#fff" size={20} />
        <CustomText style={{ color: '#fff', fontSize: 11, marginTop: 4 }}>{item.isArchived ? 'Unarchive' : 'Archive'}</CustomText>
      </TouchableOpacity>
      {/* Delete */}
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' }}
        onPress={() => onSwipeAction('delete', item)}
        activeOpacity={0.8}
      >
        <Trash2 color="#fff" size={20} />
        <CustomText style={{ color: '#fff', fontSize: 11, marginTop: 4 }}>Delete</CustomText>
      </TouchableOpacity>
    </View>
  );
};

const ConversationItem = ({ item, onPress, onSwipeAction, colors }) => (
  <Swipeable renderRightActions={(prog, drag) => renderRightActions(prog, drag, item, onSwipeAction)}>
    <TouchableOpacity
      style={[styles.convItem, { backgroundColor: colors.background }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: item.participantColor + '15', borderColor: item.participantColor + '33', overflow: 'hidden' }]}>
          {item.participantImage ? (
            <Image source={{ uri: item.participantImage }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <CustomText style={[styles.avatarText, { color: item.participantColor }]}>
              {item.participantInitials}
            </CustomText>
          )}
        </View>
        {item.isOnline && (
          <View style={styles.onlineDotWrapper}>
            <PresenceDot size={12} borderSize={2} borderColor={colors.background} />
          </View>
        )}
      </View>

        <View style={styles.convBody}>
        <View style={styles.convRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <CustomText style={[styles.convName, { color: colors.foreground, fontWeight: item.unreadCount > 0 ? '800' : '700' }]} numberOfLines={1}>
                {item.participantName}
              </CustomText>
            </View>
            {item.isLocked && <Lock color={colors.primary} size={13} style={{ marginTop: 2, opacity: 0.8 }} />}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <CustomText style={[styles.convTime, { 
              color: item.unreadCount > 0 ? '#25D366' : colors.muted, 
              fontWeight: item.unreadCount > 0 ? '800' : '500',
              fontSize: 12
            }]}>
              {formatTime(item.time)}
            </CustomText>
            {item.unreadCount > 0 && <View style={[styles.unreadDot, { backgroundColor: '#25D366', width: 8, height: 8, marginTop: 4 }]} />}
          </View>
        </View>
        <View style={styles.convRow}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
            {item.isPinned && <PinOff color={colors.primary} size={12} style={{ marginRight: 6 }} />}
            <CustomText style={[styles.convLast, { 
              color: item.unreadCount > 0 ? colors.foreground : colors.muted, 
              fontWeight: item.unreadCount > 0 ? '700' : '400' 
            }]} numberOfLines={1}>
              {item.lastMessage}
            </CustomText>
          </View>
          {item.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: '#25D366', minWidth: 20, height: 20, borderRadius: 10 }]}>
              <CustomText style={[styles.badgeText, { fontSize: 10, fontWeight: '900' }]}>{item.unreadCount}</CustomText>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  </Swipeable>
);

const SearchUserItem = ({ item, onPress, loading, colors }) => (
  <TouchableOpacity
    style={[styles.searchUserItem, { backgroundColor: colors.background }]}
    onPress={() => onPress(item)}
    activeOpacity={0.75}
    disabled={loading}
  >
    <View style={[styles.searchUserAvatar, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '33', overflow: 'hidden' }]}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <CustomText style={[styles.searchUserAvatarText, { color: colors.primary }]}>
          {item.initials}
        </CustomText>
      )}
    </View>
    <View style={styles.searchUserBody}>
      <CustomText style={[styles.searchUserName, { color: colors.foreground }]} numberOfLines={1}>
        {item.name}
      </CustomText>
      <CustomText style={[styles.searchUserRole, { color: colors.muted }]} numberOfLines={1}>
        {(item.role || 'USER').toString().toLowerCase()}
      </CustomText>
    </View>
    {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <MessageCircle color={colors.muted} size={20} />}
  </TouchableOpacity>
);

// Add Lock to name row instead for better visibility

export default function ChatListScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [conversations, setConversations] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [startingChatId, setStartingChatId] = useState(null);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteContact, setInviteContact] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'archived' | 'locked'
  const [loading, setLoading] = useState(true);
  const [localConversations, setLocalConversations] = useState([]);
  const [createMenuVisible, setCreateMenuVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createType, setCreateType] = useState('channel');
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const searchRequestRef = useRef(0);

  // Try to grab whichever drawer context is available
  const buyerCtx = useContext(BuyerDrawerContext);
  const sellerCtx = useContext(SellerDrawerContext);
  const courierCtx = useContext(CourierDrawerContext);
  const agentCtx = useContext(AgentDrawerContext);

  const toggleDrawer = () => {
    try {
      if (navigation?.toggleDrawer) {
        navigation.toggleDrawer();
        return;
      }
    } catch (e) {}
    
    const role = user?.role?.toUpperCase();
    if (role === 'SELLER') {
      sellerCtx?.toggleDrawer?.();
    } else if (role === 'AGENT') {
      agentCtx?.toggleDrawer?.();
    } else if (role === 'COURIER') {
      courierCtx?.toggleDrawer?.();
    } else {
      buyerCtx?.toggleDrawer?.();
    }
  };

  const loadData = useCallback(() => {
    Promise.all([
      chatService.getConversations(user?.id, filterType),
      chatService.getStatuses(user?.id, true) // Pass userId for prioritization
    ]).then(([convData, statusData]) => {
      // Sort pinned to top dynamically
      const sorted = [...localConversations, ...convData].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.time) - new Date(a.time);
      });
      setConversations(sorted);
      setStatuses(statusData);
      
      // Update filtered synchronously to prevent flickering "No conversations" text
      let res = sorted;
      if (search) {
        res = res
          .map(c => ({ ...c, _searchScore: conversationSearchScore(search, c) }))
          .filter(c => c._searchScore < 999)
          .sort((a, b) => a._searchScore - b._searchScore || new Date(b.time) - new Date(a.time));
      }
      if (filterType === 'unread') {
        res = res.filter(c => c.unreadCount > 0);
      }
      setFiltered(res);

      setLoading(false);
    }).catch(err => {
      console.warn('API load failed:', err);
      setLoading(false);
    });
  }, [user?.id, filterType, search, localConversations]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      
      if (user?.id) {
        // Legacy ping removed - handled by PresenceProvider WebSocket
      }
      
      // Periodically refresh statuses
      const interval = setInterval(() => {
        chatService.getStatuses(user?.id, true).then(setStatuses);
      }, 30000);
      
      return () => {
        clearInterval(interval);
      };
    }, [loadData, user?.id])
  );

  useEffect(() => {
    let result = conversations;
    
    // Hide deleted conversations always
    result = result.filter(c => !c.hasDeleted);

    if (filterType === 'locked') {
      result = result.filter(c => c.isLocked);
    } else {
      // Show non-locked for other types
      result = result.filter(c => !c.isLocked);

      // Filter by type
      if (filterType === 'all') {
        // Show only non-archived in 'All'
        result = result.filter(c => !c.isArchived);
      } else if (filterType === 'unread') {
        result = result.filter(c => c.unreadCount > 0 && !c.isArchived);
      } else if (filterType === 'archived') {
        result = result.filter(c => c.isArchived);
      }
    }

    // Text Search filter
    if (search.trim()) {
      result = result
        .map(c => ({ ...c, _searchScore: conversationSearchScore(search, c) }))
        .filter(c => c._searchScore < 999)
        .sort((a, b) => a._searchScore - b._searchScore || new Date(b.time) - new Date(a.time));
    }
    
    setFiltered(result);
  }, [search, filterType, conversations]);

  useEffect(() => {
    const q = search.trim();
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;

    if (!user?.id || q.length < 2) {
      setUserResults([]);
      setSearchingUsers(false);
      return;
    }

    setSearchingUsers(true);
    const timer = setTimeout(async () => {
      const results = await chatService.searchUsers(q, user.id);
      if (searchRequestRef.current === requestId) {
        setUserResults(results);
        setSearchingUsers(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [search, user?.id]);

  const handleLockedTabPress = async () => {
    if (filterType === 'locked') return;

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        'Authentication Required',
        'Biometric or Passcode security is required to view locked chats. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'View Locked Chats',
      fallbackLabel: 'Enter Passcode',
    });

    if (result.success) {
      setFilterType('locked');
    }
  };

  const openChatSettings = () => {
    Alert.alert(
      'Chat Settings',
      'Manage how conversations are shown on this device.',
      [
        { text: filterType === 'archived' ? 'Show All Chats' : 'Show Archived', onPress: () => setFilterType(filterType === 'archived' ? 'all' : 'archived') },
        { text: filterType === 'unread' ? 'Show All Chats' : 'Show Unread', onPress: () => setFilterType(filterType === 'unread' ? 'all' : 'unread') },
        { text: 'Locked Chats', onPress: handleLockedTabPress },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCreateModal = (type) => {
    setCreateMenuVisible(false);
    setCreateType(type);
    setCreateTitle('');
    setCreateDescription('');
    setCreateModalVisible(true);
  };

  const handleCreateSpace = () => {
    const title = createTitle.trim();
    if (!title) {
      Alert.alert('Name Required', `Please enter a ${createType} name.`);
      return;
    }

    const config = {
      channel: { prefix: 'Channel', icon: '#0ea5e9', last: 'Channel created' },
      group: { prefix: 'Group', icon: '#22c55e', last: 'Group created' },
      ad: { prefix: 'Ad', icon: '#f59e0b', last: 'Advertisement draft created' },
    }[createType];

    const conversation = {
      id: `local-${createType}-${Date.now()}`,
      participantId: `local-${createType}-${Date.now()}`,
      participantName: `${config.prefix}: ${title}`,
      participantColor: config.icon,
      participantInitials: createType === 'ad' ? 'AD' : title.split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase(),
      participantImage: null,
      lastMessage: createDescription.trim() || config.last,
      time: new Date(),
      unreadCount: 0,
      isOnline: false,
      isPinned: true,
      isArchived: false,
      hasDeleted: false,
      isHidden: false,
      isLocked: false,
      isBlockedByMe: false,
      isLocalSpace: true,
      spaceType: createType,
    };

    setLocalConversations(prev => [conversation, ...prev]);
    setCreateModalVisible(false);
  };

  const handleOpen = async (conv) => {
    if (conv.isLocalSpace) {
      navigation.navigate('ChatDetail', { conversation: conv });
      return;
    }
    if (conv.isLocked) {
      navigation.navigate('ChatDetail', { conversation: conv, authenticated: true });
    } else {
      navigation.navigate('ChatDetail', { conversation: conv });
    }
  };

  const handleOpenUserResult = async (person) => {
    if (!person?.id || !user?.id || startingChatId) return;

    const existing = conversations.find(c => c.participantId === person.id && !c.hasDeleted);
    if (existing) {
      handleOpen(existing);
      return;
    }

    setStartingChatId(person.id);
    try {
      const conversationId = await chatService.createConversation(person.id, user.id);
      const conversation = {
        id: conversationId,
        participantId: person.id,
        participantName: person.name,
        participantColor: colors.primary,
        participantInitials: person.initials || (person.name || 'U').charAt(0).toUpperCase(),
        participantImage: person.image || null,
        lastMessage: 'Started a conversation',
        time: new Date(),
        unreadCount: 0,
        isOnline: false,
        isPinned: false,
        isArchived: false,
        hasDeleted: false,
        isHidden: false,
        isLocked: false,
        isBlockedByMe: false,
      };
      navigation.navigate('ChatDetail', { conversation });
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Could not start this conversation.');
    } finally {
      setStartingChatId(null);
    }
  };

  const openConversationFromInvite = (conversationId, person) => {
    const conversation = {
      id: conversationId,
      participantId: person.id,
      participantName: person.name || 'AMO User',
      participantColor: colors.primary,
      participantInitials: (person.name || 'U').charAt(0).toUpperCase(),
      participantImage: person.image || null,
      lastMessage: 'Started a conversation',
      time: new Date(),
      unreadCount: 0,
      isOnline: false,
      isPinned: false,
      isArchived: false,
      hasDeleted: false,
      isHidden: false,
      isLocked: false,
      isBlockedByMe: false,
    };
    navigation.navigate('ChatDetail', { conversation });
    loadData();
  };

  const handleChooseFromContacts = async () => {
    setLoadingContacts(true);

    try {
      if (!Contacts || typeof Contacts.requestPermissionsAsync !== 'function') {
        throw new Error('Contacts feature is not supported on this platform.');
      }

      const isAvailable = await Contacts.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Contacts are not available on this device.');
      }

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Contacts permission is required. You can still enter a number manually.'
        );
        setLoadingContacts(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
  fields: [
    Contacts.Fields.Name,
    Contacts.Fields.PhoneNumbers,
    Contacts.Fields.Emails,
    Contacts.Fields.FirstName,
    Contacts.Fields.LastName,
  ],
});

// 👇 Add these two lines right here
console.log('📱 Total contacts from device:', data?.length);
console.log('📱 Sample contact:', JSON.stringify(data?.[0], null, 2));


      if (!data || data.length === 0) {
        Alert.alert('No Contacts', 'No contacts found on your device.');
        setLoadingContacts(false);
        return;
      }

      const formatted = data.map(c => {
        const phoneNumbers = c.phoneNumbers || [];
        const validPhoneObj = phoneNumbers.find(p => p.number && p.number.replace(/[^\d+]/g, '').trim());
        const phone = validPhoneObj ? validPhoneObj.number.replace(/[^\d+]/g, '') : null;

        const emails = c.emails || [];
        const validEmailObj = emails.find(e => e.email && e.email.trim());
        const email = validEmailObj ? validEmailObj.email : null;

        const initials = c.name
          ? c.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : 'U';
        return { id: c.id, name: c.name || 'Unknown Contact', phone, email, initials, matchedUser: null };
      }).filter(c => c.phone || c.email);

      // Sort alphabetically
      formatted.sort((a, b) => a.name.localeCompare(b.name));
      setContacts(formatted);

      // Dismiss the invite modal
      setInviteVisible(false);
      setLoadingContacts(false);

      // Open the picker after a small delay to let the invite modal finish closing
      setTimeout(() => {
        setShowContactPicker(true);
      }, 400);

      // Do backend matching in the background — does NOT block the picker
      if (user?.id && formatted.length > 0) {
        chatService.checkContacts(formatted, user.id)
          .then(({ matched }) => {
            if (!matched || matched.length === 0) return;
            setContacts(prev => {
              const updated = prev.map(c => {
                const match = matched.find(
                  m => (c.phone && m.phone === c.phone) || (c.email && m.email === c.email)
                );
                return match ? { ...c, matchedUser: match } : c;
              });
              // Re-sort: AMO users first
              updated.sort((a, b) => {
                if (a.matchedUser && !b.matchedUser) return -1;
                if (!a.matchedUser && b.matchedUser) return 1;
                return a.name.localeCompare(b.name);
              });
              return updated;
            });
          })
          .catch(() => {}); // silent fail — picker already open
      }
    } catch (err) {
      console.warn('Failed to read contacts:', err);
      Alert.alert('Error', err.message || 'Failed to read contacts from your device.');
      setLoadingContacts(false);
    }
  };

  const handleSelectContact = (contact) => {
    const selectedValue = contact.phone || contact.email;
    if (selectedValue) {
      setInviteContact(selectedValue);
    }
    setShowContactPicker(false);
    // Let the contact picker fully close first, then reopen the invite modal
    setTimeout(() => {
      setInviteVisible(true);
    }, 400);
  };

  const handleInviteSubmit = async () => {
    const contact = inviteContact.trim();
    if (!contact || inviteLoading || !user?.id) return;

    setInviteLoading(true);
    try {
      const result = await chatService.inviteToChat(contact, user.id);
      if (result.status === 'existing') {
        setInviteVisible(false);
        setInviteContact('');
        openConversationFromInvite(result.conversationId, result.user);
        return;
      }

      if (result.type === 'phone') {
        const separator = Platform.OS === 'ios' ? '&' : '?';
        const body = encodeURIComponent(`Join me on AMO Isoko chat: ${result.inviteUrl}`);
        await Linking.openURL(`sms:${result.contact}${separator}body=${body}`);
        setInviteVisible(false);
        setInviteContact('');
        return;
      }

      Alert.alert('Invite Sent', 'We sent an invitation email with a secure chat link.');
      setInviteVisible(false);
      setInviteContact('');
    } catch (e) {
      Alert.alert('Invite Failed', e.message || 'Could not create this invite.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSwipeAction = (action, conv) => {
    if (action === 'delete') {
      chatService.deleteConversation(conv.id, user?.id).then(() => loadData());
    } else if (action === 'pin') {
      chatService.togglePinConversation(conv.id, user?.id, conv.isPinned).then(() => loadData());
    } else if (action === 'archive') {
      chatService.toggleArchiveConversation(conv.id, user?.id, conv.isArchived).then(() => loadData());
    }
  };

  const handleViewStatus = async (index) => {
    const statusToView = statuses[index];
    if (!statusToView) return;

    setLoading(true); // Show spinner while fetching full data
    try {
      const fullStatus = await chatService.getStatusDetail(statusToView.id, user?.id);
      // Replace only this one status in our list with full data for the viewer
      const updatedStatuses = [...statuses];
      updatedStatuses[index] = fullStatus;
      
      navigation.navigate('StatusViewer', { statuses: updatedStatuses, initialIndex: index });
    } catch (e) {
      Alert.alert('Error', 'Failed to load status content');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStatus = () => {
    const myStatusIndex = statuses.findIndex(s => s.sellerUserId === user?.id);
    const hasStatus = myStatusIndex !== -1;

    if (hasStatus) {
      Alert.alert(
        'My Status',
        'What would you like to do?',
        [
          { text: 'View Status', onPress: () => handleViewStatus(myStatusIndex) },
          { text: 'Add New', onPress: showAddOptions },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else {
      showAddOptions();
    }
  };

  const showAddOptions = () => {
    Alert.alert(
      'Post Status',
      'Share a photo with your customers',
      [
        { text: 'Camera', onPress: handleLaunchCamera },
        { text: 'Gallery', onPress: handleLaunchLibrary },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleLaunchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Rejected', 'Camera access is needed to post status');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16], // Standard story aspect
      quality: 0.1, // Ultra-aggressive compression for maximum speed
      base64: true,
    });

    if (!result.canceled) {
      processStatusUpload(result.assets[0]);
    }
  };

  const handleLaunchLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Rejected', 'Gallery access is needed to post status');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16], // Standard story aspect
      quality: 0.1, // Ultra-aggressive compression for maximum speed
      base64: true,
    });

    if (!result.canceled) {
      processStatusUpload(result.assets[0]);
    }
  };

  const processStatusUpload = async (asset) => {
    setLoading(true);
    // Since we don't have a full blob storage, we use base64 for now
    const content = `data:image/jpeg;base64,${asset.base64}`;
    const ok = await chatService.addStatus(user?.id, {
      type: 'image',
      content
    });

    if (ok) {
      const fresh = await chatService.getStatuses(user?.id, true);
      setStatuses(fresh);
      Alert.alert('Success', 'Status posted successfully!');
    } else {
      Alert.alert('Error', 'Failed to post status. Verify you are a registered seller.');
    }
    setLoading(false);
  };

  const renderStatusItem = ({ item, index }) => {
    const isNew = true; // For demo; in real app check if viewed
    return (
      <TouchableOpacity onPress={() => handleViewStatus(index)} style={styles.statusItem}>
        <View style={[styles.statusAvatarRing, { borderColor: isNew ? colors.primary : colors.glassBorder }]}>
          <View style={[styles.statusAvatar, { backgroundColor: item.sellerColor + '15', overflow: 'hidden' }]}>
            {item.sellerImage ? (
              <Image source={{ uri: item.sellerImage }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <CustomText style={[styles.statusAvatarText, { color: item.sellerColor }]}>{item.sellerInitials}</CustomText>
            )}
          </View>
        </View>
        <CustomText style={[styles.statusName, { color: colors.foreground }]} numberOfLines={1}>
          {item.sellerName.split(' ')[0]}
        </CustomText>
      </TouchableOpacity>
    );
  };

  const renderStatusBar = () => {
    const isSeller = user?.role === 'seller' || sellerCtx;
    const myStatus = statuses.find(s => s.sellerUserId === user?.id);
    const othersStatuses = statuses.filter(s => s.sellerUserId !== user?.id);

    return (
      <View style={styles.statusBarWrapper}>
        <View style={styles.statusLabelRow}>
          <CustomText style={[styles.statusLabel, { color: colors.foreground }]}>Status</CustomText>
        </View>
        <View style={styles.statusBarContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={othersStatuses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.statusListContent}
            ListHeaderComponent={
              isSeller ? (
                <TouchableOpacity onPress={handleAddStatus} style={styles.statusItem}>
                  {myStatus ? (
                    // Seller HAS a status: Show solid ring
                    <View style={[styles.statusAvatarRing, { borderColor: colors.primary }]}>
                      <View style={[styles.statusAvatar, { backgroundColor: colors.glass, overflow: 'hidden' }]}>
                        {myStatus.sellerImage || user?.image ? (
                          <Image source={{ uri: myStatus.sellerImage || user?.image }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <CustomText style={[styles.statusAvatarText, { color: colors.primary }]}>{myStatus.sellerInitials}</CustomText>
                        )}
                        <View style={[styles.addPlusBtnMini, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                          <Plus color="#fff" size={10} />
                        </View>
                      </View>
                    </View>
                  ) : (
                    // Seller NO status: Show dashed ring
                    <View style={[styles.addStatusCircle, { borderColor: colors.border || 'rgba(150,150,150,0.3)' }]}>
                      <View style={[styles.addPlusBtn, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                        <Plus color="#fff" size={16} />
                      </View>
                    </View>
                  )}
                  <CustomText style={[styles.statusName, { color: colors.foreground }]} numberOfLines={1}>
                    My Status
                  </CustomText>
                </TouchableOpacity>
              ) : null
            }
            renderItem={renderStatusItem}
          />
        </View>
      </View>
    );
  };

  const renderSearchSuggestions = () => {
    const q = search.trim();
    if (q.length < 2) return null;

    return (
      <View style={styles.searchSuggestions}>
        <View style={styles.searchSuggestionsHeader}>
          <CustomText style={[styles.searchSuggestionsTitle, { color: colors.foreground }]}>People</CustomText>
          {searchingUsers && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
        {userResults.map((item) => (
          <SearchUserItem
            key={item.id}
            item={item}
            onPress={handleOpenUserResult}
            loading={startingChatId === item.id}
            colors={colors}
          />
        ))}
        {!searchingUsers && userResults.length === 0 && (
          <TouchableOpacity
            style={[styles.invitePrompt, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
            onPress={() => {
              setInviteContact(search.trim());
              setInviteVisible(true);
            }}
            activeOpacity={0.8}
          >
            <MessageCircle color={colors.primary} size={20} />
            <View style={{ flex: 1 }}>
              <CustomText style={[styles.invitePromptTitle, { color: colors.foreground }]}>Invite to chat</CustomText>
              <CustomText style={[styles.invitePromptSub, { color: colors.muted }]} numberOfLines={2}>
                No account found. Invite them by email or phone number.
              </CustomText>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
  <TouchableOpacity onPress={toggleDrawer} style={styles.headerIconBtn}>
    <Menu color={colors.foreground} size={24} />
  </TouchableOpacity>
  <View style={{ flex: 1, alignItems: 'center' }}>
    <CustomText style={[styles.headerTitle, { color: colors.foreground }]}>Messages</CustomText>
  </View>
 <TouchableOpacity
    onPress={() => {
      setInviteVisible(true);
    }}
    style={[styles.headerIconBtn, {
      backgroundColor: '#e67e22',
      borderRadius: 20,
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    }]}
  >
    <Plus color="#ffffff" size={20} />
  </TouchableOpacity>
</View>

      {/* Search Bar & Filters */}
      <View style={styles.topFilterSection}>
        <View style={[styles.searchBar, { backgroundColor: colors.glass }]}>
          <Search color={colors.muted} size={20} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search people or conversations..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>

        {/* Pills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.pillsScrollContent}
          style={styles.pillsRow}
        >
          <TouchableOpacity 
            style={[styles.filterPill, filterType === 'all' && { backgroundColor: colors.primary }]} 
            onPress={() => setFilterType('all')}
          >
            <CustomText style={[styles.pillText, { color: filterType === 'all' ? '#fff' : colors.muted }]}>All</CustomText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterPill, filterType === 'unread' && { backgroundColor: colors.primary }]} 
            onPress={() => setFilterType('unread')}
          >
            <CustomText style={[styles.pillText, { color: filterType === 'unread' ? '#fff' : colors.muted }]}>Unread</CustomText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterPill, filterType === 'archived' && { backgroundColor: colors.primary }]} 
            onPress={() => setFilterType('archived')}
          >
            <CustomText style={[styles.pillText, { color: filterType === 'archived' ? '#fff' : colors.muted }]}>Archived</CustomText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterPill, filterType === 'locked' && { backgroundColor: colors.primary }]} 
            onPress={handleLockedTabPress}
          >
            <CustomText style={[styles.pillText, { color: filterType === 'locked' ? '#fff' : colors.muted }]}>Locked</CustomText>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              {renderStatusBar()}
              {renderSearchSuggestions()}
            </>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 100 }}>
              <MessageCircle color={colors.glassBorder} size={56} />
              <CustomText style={[styles.emptyText, { color: colors.muted, marginTop: 16 }]}>
                {search.trim() ? 'No matching conversations' : 'No conversations yet'}
              </CustomText>
              <CustomText style={[styles.emptySubText, { color: colors.muted, textAlign: 'center', marginTop: 8 }]}>
                {search.trim() ? 'Matching people appear above' : 'Start a conversation from a product page or order'}
              </CustomText>
            </View>
          }
          renderItem={({ item }) => (
            <ConversationItem item={item} onPress={handleOpen} onSwipeAction={handleSwipeAction} colors={colors} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        />
      )}

      <Modal visible={inviteVisible} transparent animationType="fade" onRequestClose={() => setInviteVisible(false)}>
        <View style={styles.inviteOverlay}>
          <View style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <TouchableOpacity 
              onPress={() => setInviteVisible(false)} 
              style={styles.inviteCloseBtn}
              disabled={inviteLoading}
            >
              <X color={colors.foreground} size={20} />
            </TouchableOpacity>

            <CustomText style={[styles.inviteTitle, { color: colors.foreground, paddingRight: 24 }]}>Invite to Chat</CustomText>
            <CustomText style={[styles.inviteText, { color: colors.muted }]}>
              Enter an email or phone number. If they already have an account, the chat opens immediately.
            </CustomText>
            
            <TextInput
              value={inviteContact}
              onChangeText={setInviteContact}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email or phone number"
              placeholderTextColor={colors.muted}
              style={[styles.inviteInput, { color: colors.foreground, borderColor: colors.glassBorder, backgroundColor: colors.background }]}
            />

            <View style={styles.inviteActions}>
              <TouchableOpacity
                onPress={handleChooseFromContacts}
                style={[styles.inviteButton, { flex: 1, minWidth: 0, borderColor: colors.primary + '80', borderWidth: 1, backgroundColor: colors.primary + '0a', paddingHorizontal: 4 }]}
                disabled={inviteLoading || loadingContacts}
              >
                {loadingContacts ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Users color={colors.primary} size={14} />
                    <CustomText style={[styles.inviteContactsBtnText, { color: colors.primary, fontSize: 12, marginLeft: 4 }]} numberOfLines={1}>Contacts</CustomText>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleInviteSubmit}
                style={[styles.inviteButton, { flex: 1, minWidth: 0, backgroundColor: colors.primary, opacity: inviteLoading ? 0.6 : 1, paddingHorizontal: 4 }]}
                disabled={inviteLoading}
              >
                {inviteLoading ? <ActivityIndicator size="small" color="#fff" /> : <CustomText style={[styles.invitePrimaryText, { fontSize: 12 }]} numberOfLines={1}>Continue</CustomText>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showContactPicker} transparent animationType="slide" onRequestClose={() => setShowContactPicker(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.pickerOverlay}
        >
          <View style={[styles.pickerContent, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={styles.pickerHeader}>
              <CustomText style={[styles.pickerTitle, { color: colors.foreground }]}>Select a Contact ({contacts.length})</CustomText>
              <TouchableOpacity onPress={() => setShowContactPicker(false)} style={styles.pickerCloseBtn}>
                <X color={colors.foreground} size={20} />
              </TouchableOpacity>
            </View>

            <View style={[styles.pickerSearchRow, { backgroundColor: colors.background }]}>
              <Search color={colors.muted} size={18} />
              <TextInput
                value={contactSearch}
                onChangeText={setContactSearch}
                placeholder="Search contacts..."
                placeholderTextColor={colors.muted}
                style={[styles.pickerSearchInput, { color: colors.foreground }]}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            <FlatList
              style={styles.pickerFlatList}
              data={contacts.filter(c => {
                const q = contactSearch.toLowerCase();
                return (
                  c.name.toLowerCase().includes(q) ||
                  (c.phone && c.phone.includes(q)) ||
                  (c.email && c.email.toLowerCase().includes(q))
                );
              })}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.pickerListContent}
              showsVerticalScrollIndicator={true}
              initialNumToRender={30}
              maxToRenderPerBatch={40}
              windowSize={10}
              removeClippedSubviews={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectContact(item)}
                  style={[styles.contactItem, { borderBottomColor: colors.glassBorder }]}
                >
                  <View style={[styles.contactAvatar, { backgroundColor: colors.primary + '18' }]}>
                    <CustomText style={[styles.contactAvatarText, { color: colors.primary }]}>{item.initials}</CustomText>
                  </View>
                  <View style={styles.contactInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <CustomText style={[styles.contactName, { color: colors.foreground }]}>{item.name}</CustomText>
                      {item.matchedUser && (
                        <View style={{ marginLeft: 8, backgroundColor: '#25D366' + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <CustomText style={{ color: '#25D366', fontSize: 10, fontWeight: '800' }}>ON AMO</CustomText>
                        </View>
                      )}
                    </View>
                    <CustomText style={[styles.contactDetail, { color: colors.muted }]}>
                      {item.phone || item.email}
                    </CustomText>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                  <CustomText style={{ color: colors.muted, fontSize: 13 }}>No matching contacts found</CustomText>
                </View>
              }
              ListFooterComponent={
                Platform.OS === 'ios' ? (
                  <View style={{ paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.glassBorder, marginTop: 12, alignItems: 'center' }}>
                    <CustomText style={{ color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
                      Can't see all your contacts? Go to iOS Settings &gt; Amo Market &gt; Contacts and select "All Contacts".
                    </CustomText>
                  </View>
                ) : null
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Render local drawer so it overlays exactly on this screen */}
      {user?.role?.toUpperCase() === 'SELLER' && sellerCtx?.visible && sellerCtx?.setVisible && (
        <SellerDrawerComponent visible={sellerCtx.visible} onClose={() => sellerCtx.setVisible(false)} navigation={navigation} />
      )}
      {user?.role?.toUpperCase() === 'AGENT' && agentCtx?.visible && agentCtx?.setVisible && (
        <AgentDrawerComponent visible={agentCtx.visible} onClose={() => agentCtx.setVisible(false)} navigation={navigation} />
      )}
      {user?.role?.toUpperCase() === 'COURIER' && courierCtx?.visible && courierCtx?.setVisible && (
        <CourierDrawerComponent visible={courierCtx.visible} onClose={() => courierCtx.setVisible(false)} navigation={navigation} />
      )}
      {(!user?.role || user?.role?.toUpperCase() === 'BUYER' || user?.role?.toUpperCase() === 'USER') && buyerCtx?.visible && buyerCtx?.setVisible && (
        <BuyerDrawerComponent visible={buyerCtx.visible} onClose={() => buyerCtx.setVisible(false)} navigation={navigation} />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  headerIconBtn: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  topFilterSection: {
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 16,
    marginLeft: 12,
  },
  searchSuggestions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchSuggestionsHeader: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchSuggestionsTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  searchUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  searchUserAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  searchUserAvatarText: {
    fontSize: 16,
    fontWeight: '900',
  },
  searchUserBody: {
    flex: 1,
    minWidth: 0,
  },
  searchUserName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  searchUserRole: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  invitePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  invitePromptTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  invitePromptSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  inviteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  inviteCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    position: 'relative',
  },
  inviteCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  inviteTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  inviteText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  inviteInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 18,
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  inviteButton: {
    minWidth: 104,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  invitePrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  pillsRow: { 
    marginVertical: 4,
  },
  pillsScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 8,
  },
  filterPill: { 
    paddingHorizontal: 18, 
    paddingVertical: 8, 
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillText: { 
    fontSize: 14, 
    fontWeight: '700' 
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16, // More spacious
  },
  avatarWrap: { position: 'relative', marginRight: 16 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  onlineDotWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  convBody: { 
    flex: 1,
    height: 60,
    justifyContent: 'center',
  },
  convRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  convName: { 
    fontSize: 17, 
    fontWeight: '700', 
    flex: 1, 
    marginRight: 8,
    marginBottom: 4,
  },
  convTime: { 
    fontSize: 12, 
    fontWeight: '500',
    opacity: 0.8,
  },
  convLast: { 
    fontSize: 14, 
    flex: 1, 
    marginRight: 8,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#25D366',
    marginTop: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  statusLabelRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statusBarWrapper: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  statusBarContainer: {
    marginBottom: 4,
  },
  statusItem: { alignItems: 'center', marginRight: 20, width: 72 },
  statusAvatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    padding: 2,
  },
  statusAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusAvatarText: { fontSize: 20, fontWeight: '900' },
  statusName: { 
    fontSize: 12, 
    fontWeight: '600', 
    textAlign: 'center',
    opacity: 0.9,
  },
  statusListContent: { paddingHorizontal: 20 },
  addStatusCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addPlusBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#030712',
  },
  addPlusBtnMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderWidth: 2,
    borderColor: '#030712',
  },
  inviteContactsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 12,
    width: '100%',
  },
  inviteContactsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '95%',
    paddingTop: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'solid',
    display: 'flex',
    flexDirection: 'column',
  },
  pickerFlatList: {
    flex: 1,
    minHeight: 0,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  pickerCloseBtn: {
    padding: 6,
  },
  pickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  pickerSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    padding: 0,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  contactDetail: {
    fontSize: 12,
  },
  pickerListContent: {
    paddingBottom: 40,
  },
});
