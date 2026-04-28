import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Menu, AlertCircle, Clock, CheckCircle2, ShieldAlert, MessageSquare, ChevronRight, Gavel } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import NotificationIcon from '../../components/NotificationIcon';
import { useTranslation } from 'react-i18next';

// Mock disputes removed

const SellerDisputesScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const [disputes, setDisputes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchDisputes = async () => {
    if (!user?.id) return;
    try {
      const data = await sellerService.getDisputes(user.id);
      setDisputes(data);
    } catch (error) {
      console.error('Error fetching disputes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchDisputes();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDisputes();
  };

  const renderDisputeItem = ({ item }) => {
    const title = item.order?.items[0]?.product?.title || 'Order Item';
    const lastMsg = item.description || item.reason;
    const dateStr = new Date(item.createdAt).toLocaleDateString();

    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.idContainer}>
            <ShieldAlert color={colors.primary} size={14} />
            <CustomText style={[styles.idText, { color: colors.primary }]}>#{item.id.slice(-6).toUpperCase()}</CustomText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'OPEN' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
            <CustomText style={[styles.statusText, { color: item.status === 'OPEN' ? '#EF4444' : '#10B981' }]}>{t(item.status?.toLowerCase())}</CustomText>
          </View>
        </View>
        
        <CustomText style={[styles.titleText, { color: colors.foreground }]}>{title}</CustomText>
        <CustomText style={styles.orderId}>{t('common:order')} #{item.orderId.slice(-8).toUpperCase()}</CustomText>
        
        <View style={[styles.messageBox, { backgroundColor: colors.glass }]}>
          <MessageSquare color={colors.muted} size={12} />
          <CustomText style={[styles.messageText, { color: colors.muted }]} numberOfLines={1}>{lastMsg}</CustomText>
        </View>
        
        <View style={styles.cardFooter}>
          <CustomText style={styles.dateText}>{dateStr}</CustomText>
          <View style={styles.detailsBtn}>
            <CustomText style={[styles.detailsText, { color: colors.primary }]}>{t('viewDispute')}</CustomText>
            <ChevronRight color={colors.primary} size={14} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>{t('disputes')}</CustomText>
        <NotificationIcon />
      </View>
      
      {loading && disputes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={disputes}
          renderItem={renderDisputeItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Gavel color={colors.primary} size={24} />
              <CustomText style={[styles.infoTitle, { color: colors.foreground }]}>{t('resolutionCenter')}</CustomText>
              <CustomText style={styles.infoDesc}>{t('resolutionCenterDesc')}</CustomText>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ShieldAlert color={colors.isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} size={64} />
              <CustomText style={styles.emptyText}>{t('noActiveDisputes')}</CustomText>
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
  infoBox: { 
    alignItems: 'center', padding: 24, 
    borderRadius: 24, marginBottom: 24, borderHorizontalWidth: 0, borderWidth: 1
  },
  infoTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  infoDesc: { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  card: {
    borderRadius: 20, padding: 16, 
    borderWidth: 1, marginBottom: 16
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  idContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  idText: { fontSize: 12, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: 'bold' },
  titleText: { fontSize: 16, fontWeight: 'bold' },
  orderId: { fontSize: 11, marginTop: 4 },
  messageBox: { 
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, 
    borderRadius: 12, marginTop: 16 
  },
  messageText: { fontSize: 12, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  dateText: { fontSize: 11 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailsText: { fontSize: 11, fontWeight: '900' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', height: 200 },
  emptyText: { marginTop: 16, fontSize: 14, fontWeight: '600' }
});

export default SellerDisputesScreen;
