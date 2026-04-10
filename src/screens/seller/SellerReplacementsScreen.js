import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { Menu, RefreshCcw, CheckCircle2, XCircle, Clock, ChevronRight, CheckCircle, Package } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { sellerService } from '../../api/sellerService';
import NotificationIcon from '../../components/NotificationIcon';
import { useAuth } from '../../context/AuthContext';

const SellerReplacementsScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [replacements, setReplacements] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchReplacements = async () => {
    if (!user?.id) return;
    try {
      const data = await sellerService.getReplacements(user.id);
      setReplacements(data);
    } catch (error) {
      console.error('Error fetching replacements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchReplacements();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReplacements();
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await sellerService.updateReplacementStatus(user.id, id, status);
      Alert.alert('Success', `Replacement ${status.toLowerCase()} successfully.`);
      fetchReplacements();
    } catch (error) {
       Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const renderReplacementItem = ({ item }) => {
    const title = item.order?.items[0]?.product?.title || 'Order Item';
    const dateStr = new Date(item.createdAt).toLocaleDateString();

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <CustomText style={[styles.idText, { color: colors.muted }]}>#{item.id.slice(-6).toUpperCase()}</CustomText>
            <CustomText style={[styles.titleText, { color: colors.foreground }]}>{title}</CustomText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'PENDING' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
            <CustomText style={[styles.statusText, { color: item.status === 'PENDING' ? '#F97316' : '#10B981' }]}>
              {item.status}
            </CustomText>
          </View>
        </View>
        
        <View style={[styles.cardBody, { backgroundColor: colors.glass }]}>
          <View style={styles.infoRow}>
            <CustomText style={styles.label}>Order:</CustomText>
            <CustomText style={[styles.value, { color: colors.foreground }]}>#{item.orderId.slice(-8).toUpperCase()}</CustomText>
          </View>
          <View style={styles.infoRow}>
            <CustomText style={styles.label}>Reason:</CustomText>
            <CustomText style={[styles.value, { color: colors.foreground }]}>{item.reason}</CustomText>
          </View>
          {item.description ? (
            <View style={[styles.infoRow, { flexDirection: 'column', gap: 4 }]}>
              <CustomText style={styles.label}>Description:</CustomText>
              <CustomText style={[styles.value, { color: colors.foreground, fontWeight: 'normal' }]}>{item.description}</CustomText>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <CustomText style={styles.label}>Date:</CustomText>
            <CustomText style={[styles.value, { color: colors.foreground }]}>{dateStr}</CustomText>
          </View>
          {item.evidence && item.evidence.length > 0 ? (
            <View style={[styles.infoRow, { flexDirection: 'column', gap: 8, marginTop: 4 }]}>
              <CustomText style={styles.label}>Evidence:</CustomText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {item.evidence.map((img, idx) => (
                  <Image key={idx} source={{ uri: img }} style={styles.evidenceThumbnail} />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {item.status === 'PENDING' && (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleUpdateStatus(item.id, 'APPROVED')}
            >
              <CheckCircle color="white" size={14} />
              <CustomText style={styles.actionBtnText}>Approve</CustomText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleUpdateStatus(item.id, 'REJECTED')}
            >
              <XCircle color="#EF4444" size={14} />
              <CustomText style={[styles.actionBtnText, { color: '#EF4444' }]}>Reject</CustomText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>Replacements</CustomText>
        <NotificationIcon />
      </View>
      
      {loading && replacements.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={replacements}
          renderItem={renderReplacementItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <View style={[styles.headerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <RefreshCcw color={colors.primary} size={24} />
              <CustomText style={styles.headerDesc}>Manage buyer replacement requests and defective items.</CustomText>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package color={colors.isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} size={64} />
              <CustomText style={styles.emptyText}>No replacement requests yet.</CustomText>
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
    borderBottomWidth: 1,
  },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  listContent: { padding: 16, paddingBottom: 100 },
  headerBox: { 
    flexDirection: 'row', alignItems: 'center', gap: 16, 
    padding: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, marginBottom: 24
  },
  headerDesc: { flex: 1, fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 16
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  idText: { fontSize: 11, fontWeight: 'bold' },
  titleText: { fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  cardBody: { gap: 8, marginBottom: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12 },
  infoRow: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 12 },
  value: { fontSize: 12, fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10 },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  actionBtnText: { fontWeight: 'bold', fontSize: 13 },
  evidenceThumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.05)' }
});

export default SellerReplacementsScreen;
