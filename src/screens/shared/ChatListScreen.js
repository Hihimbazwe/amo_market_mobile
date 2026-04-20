import React, { useState, useEffect, useCallback, useContext } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import * as LocalAuthentication from 'expo-local-authentication';
import { Menu, Search, MessageCircle, Plus, Archive, Trash2, Pin, PinOff, Lock } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../api/chatService';

// Try to get whichever drawer context is available
import { BuyerDrawerContext } from '../../context/BuyerDrawerContext';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';

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
        <View style={[styles.avatar, { backgroundColor: item.participantColor + '15', borderColor: item.participantColor + '33' }]}>
          <CustomText style={[styles.avatarText, { color: item.participantColor }]}>
            {item.participantInitials}
          </CustomText>
        </View>
        {item.isOnline && <View style={[styles.onlineDot, { borderColor: colors.background }]} />}
      </View>

      {/* Body */}
      <View style={styles.convBody}>
        <View style={styles.convRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <CustomText style={[styles.convName, { color: colors.foreground }]} numberOfLines={1}>
              {item.participantName}
            </CustomText>
            {item.isLocked && <Lock color={colors.primary} size={14} style={{ marginLeft: 6, opacity: 0.8 }} />}
          </View>
          <CustomText style={[styles.convTime, { color: item.unreadCount > 0 ? colors.primary : colors.muted }]}>
            {formatTime(item.time)}
          </CustomText>
        </View>
        <View style={styles.convRow}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
            {item.isPinned && <PinOff color={colors.primary} size={12} style={{ marginRight: 6 }} />}
            <CustomText style={[styles.convLast, { color: colors.muted }]} numberOfLines={1}>
              {item.lastMessage}
            </CustomText>
          </View>
          {item.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <CustomText style={styles.badgeText}>{item.unreadCount}</CustomText>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  </Swipeable>
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
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'archived' | 'locked'
  const [loading, setLoading] = useState(true);

  // Try to grab whichever drawer context is available
  const buyerCtx = useContext(BuyerDrawerContext);
  const sellerCtx = useContext(SellerDrawerContext);
  const toggleDrawer = buyerCtx?.toggleDrawer || sellerCtx?.toggleDrawer || (() => {});

  const loadData = () => {
    Promise.all([
      chatService.getConversations(user?.id, filterType),
      chatService.getStatuses(user?.id, true) // Pass userId for prioritization
    ]).then(([convData, statusData]) => {
      // Sort pinned to top dynamically
      const sorted = convData.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.time) - new Date(a.time);
      });
      setConversations(sorted);
      setStatuses(statusData);
      
      // Update filtered synchronously to prevent flickering "No conversations" text
      let res = sorted;
      if (search) {
        res = res.filter(c => 
          c.participantName.toLowerCase().includes(search.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(search.toLowerCase())
        );
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
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Periodically refresh statuses
      const interval = setInterval(() => {
        chatService.getStatuses(user?.id, true).then(setStatuses);
      }, 30000);
      return () => clearInterval(interval);
    }, [user?.id, filterType])
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
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.participantName.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
      );
    }
    
    setFiltered(result);
  }, [search, filterType, conversations]);

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

  const handleOpen = async (conv) => {
    if (conv.isLocked) {
      navigation.navigate('ChatDetail', { conversation: conv, authenticated: true });
    } else {
      navigation.navigate('ChatDetail', { conversation: conv });
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
          <View style={[styles.statusAvatar, { backgroundColor: item.sellerColor + '15' }]}>
            <CustomText style={[styles.statusAvatarText, { color: item.sellerColor }]}>{item.sellerInitials}</CustomText>
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
                      <View style={[styles.statusAvatar, { backgroundColor: colors.glass }]}>
                        <CustomText style={[styles.statusAvatarText, { color: colors.primary }]}>{myStatus.sellerInitials}</CustomText>
                        <View style={[styles.addPlusBtnMini, { backgroundColor: colors.primary }]}>
                          <Plus color="#fff" size={10} />
                        </View>
                      </View>
                    </View>
                  ) : (
                    // Seller NO status: Show dashed ring
                    <View style={styles.addStatusCircle}>
                      <View style={[styles.addPlusBtn, { backgroundColor: colors.primary }]}>
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.headerIconBtn}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText style={[styles.headerTitle, { color: colors.foreground }]}>Messages</CustomText>
        <TouchableOpacity style={styles.headerIconBtn}>
          <MessageCircle color={colors.foreground} size={24} />
        </TouchableOpacity>
      </View>

      {/* Search Bar & Filters */}
      <View style={styles.topFilterSection}>
        <View style={[styles.searchBar, { backgroundColor: colors.glass }]}>
          <Search color={colors.muted} size={20} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations..."
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
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <MessageCircle color={colors.glassBorder} size={56} />
          <CustomText style={[styles.emptyText, { color: colors.muted }]}>No conversations yet</CustomText>
          <CustomText style={[styles.emptySubText, { color: colors.muted }]}>
            Start a conversation from a product page or order
          </CustomText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderStatusBar}
          renderItem={({ item }) => (
            <ConversationItem item={item} onPress={handleOpen} onSwipeAction={handleSwipeAction} colors={colors} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
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
  onlineDot: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 3,
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
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
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
});
