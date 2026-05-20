import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Bell, Trash2, CheckCircle, ChevronLeft, Package, CreditCard, ShieldAlert, Info } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import CustomText from '../components/CustomText';
import { formatDistanceToNow } from 'date-fns';

const NotificationsScreen = ({ navigation }) => {
  const { notifications, loading, fetchNotifications, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications();
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getIcon = (title) => {
    const t = title.toLowerCase();
    if (t.includes('order')) return <Package color={colors.primary} size={20} />;
    if (t.includes('payment') || t.includes('wallet')) return <CreditCard color="#10B981" size={20} />;
    if (t.includes('dispute') || t.includes('replacement')) return <ShieldAlert color="#EF4444" size={20} />;
    return <Bell color={colors.muted} size={20} />;
  };

  const renderRightActions = (id) => {
    return (
      <TouchableOpacity
        style={[styles.deleteActionBtn, { backgroundColor: '#ef4444' }]}
        onPress={() => deleteNotification(id)}
        activeOpacity={0.8}
      >
        <Trash2 color="#fff" size={20} />
        <CustomText style={styles.deleteActionText}>Delete</CustomText>
      </TouchableOpacity>
    );
  };

  const renderNotification = ({ item }) => {
    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item.id)}
        onSwipeableOpen={() => deleteNotification(item.id)}
      >
        <View style={[styles.notifCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.glass }]}>
            {getIcon(item.title)}
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          
          <View style={styles.notifBody}>
            <View style={styles.notifHeader}>
              <CustomText style={[styles.notifTitle, { color: colors.foreground }]}>{item.title}</CustomText>
              <TouchableOpacity onPress={() => deleteNotification(item.id)}>
                <Trash2 color={colors.muted} size={16} />
              </TouchableOpacity>
            </View>
            <CustomText style={[styles.notifMessage, { color: colors.muted }]}>{item.message}</CustomText>
            <CustomText style={styles.notifTime}>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</CustomText>
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.glass }]}>
          <ChevronLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1, marginLeft: 12 }}>Notifications</CustomText>
        {notifications.length > 0 && (
          <View style={styles.headerRightContainer}>
            <TouchableOpacity onPress={markAllAsRead} style={styles.headerActionBtn}>
              <CheckCircle color={colors.primary} size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAllNotifications} style={styles.headerActionBtn}>
              <Trash2 color="#ef4444" size={20} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchNotifications} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Bell color={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} size={64} />
              <CustomText variant="subtitle" style={{ marginTop: 16 }}>No notifications yet.</CustomText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderBottomWidth: 1, justifyContent: 'space-between'
  },
  backBtn: { padding: 8, borderRadius: 12 },
  markReadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  markReadText: { fontSize: 12, fontWeight: 'bold' },
  listContent: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  
  notifCard: {
    flexDirection: 'row', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12, gap: 16
  },
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fff' },
  notifBody: { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  notifTitle: { fontSize: 15, fontWeight: 'bold' },
  notifMessage: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  notifTime: { fontSize: 11, color: '#94a3b8' },
  headerRightContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerActionBtn: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  deleteActionBtn: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 12,
    marginLeft: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }
  },
  deleteActionText: { color: '#fff', fontSize: 10, marginTop: 4, fontWeight: 'bold' }
});

export default NotificationsScreen;
