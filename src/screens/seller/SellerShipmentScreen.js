import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  ActivityIndicator, RefreshControl, Alert, Modal, TouchableWithoutFeedback,
  TextInput
} from 'react-native';
import {
  Menu, Search, Truck, Package, MapPin, Phone, Weight,
  Calendar, MoreVertical, UserPlus, ShieldCheck, Star, X, Loader2
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';
import NotificationIcon from '../../components/NotificationIcon';
import { useTranslation } from 'react-i18next';

const SellerShipmentScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const navigation = useNavigation();

  const [tab, setTab] = useState('UNASSIGNED');
  const [orders, setOrders] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Modals
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [assigningCourier, setAssigningCourier] = useState(false);

  const [showAgentModal, setShowAgentModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assigningAgent, setAssigningAgent] = useState(false);

  const [shippingId, setShippingId] = useState(null);

  const statusStyles = {
    PENDING: { bg: 'rgba(107, 114, 128, 0.1)', text: '#9CA3AF' },
    PAID: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60A5FA' },
    SHIPPED: { bg: 'rgba(249, 115, 22, 0.1)', text: '#FB923C' },
    DELIVERED: { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ADE80' },
    AWAITING_PICKUP: { bg: 'rgba(234, 179, 8, 0.1)', text: '#FACC15' },
    IN_TRANSIT: { bg: 'rgba(168, 85, 247, 0.1)', text: '#C084FC' },
    PICKED_UP: { bg: 'rgba(168, 85, 247, 0.1)', text: '#C084FC' },
  };

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [oRes, cRes, aRes] = await Promise.all([
        sellerService.getOrders(user.id),
        sellerService.getCouriers(user.id),
        sellerService.getAgents(user.id),
      ]);
      setOrders(oRes || []);
      setCouriers(cRes || []);
      setAgents(aRes || []);
    } catch (err) {
      console.error('Failed to load shipment data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch =
      o.id.toLowerCase().includes(q) ||
      (o.recipientName || '').toLowerCase().includes(q) ||
      (o.items || []).some((i) => (i.product?.title || '').toLowerCase().includes(q));
    
    if (tab === 'UNASSIGNED') return matchSearch && !o.Courier;
    if (tab === 'ASSIGNED') return matchSearch && !!o.Courier;
    return matchSearch;
  });

  const handleShip = async (orderId) => {
    setShippingId(orderId);
    try {
      await sellerService.shipOrder(user.id, orderId);
      Alert.alert(t('success'), t('orderMarkedShipped'));
      loadData();
    } catch (err) {
      Alert.alert(t('error'), err.message || t('failedToMarkShipped'));
    } finally {
      setShippingId(null);
    }
  };

  const handleAssignCourier = async () => {
    if (!selectedOrder || !selectedCourierId) return;
    setAssigningCourier(true);
    try {
      await sellerService.assignCourier(user.id, selectedOrder.id, selectedCourierId);
      Alert.alert(t('success'), t('courierAssigned'));
      setShowCourierModal(false);
      loadData();
    } catch (err) {
      Alert.alert(t('error'), t('failedToAssignCourier'));
    } finally {
      setAssigningCourier(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedOrder || !selectedAgentId) return;
    setAssigningAgent(true);
    try {
      await sellerService.assignAgent(user.id, selectedOrder.id, selectedAgentId);
      Alert.alert(t('success'), t('agentAssigned'));
      setShowAgentModal(false);
      loadData();
    } catch (err) {
      Alert.alert(t('error'), t('failedToAssignAgent'));
    } finally {
      setAssigningAgent(false);
    }
  };

  const totalWeight = (o) => (o.items || []).reduce((s, i) => s + (i.product?.weight || 0), 0);

  const renderItem = ({ item }) => {
    const sStyle = statusStyles[item.shippingStatus] || statusStyles[item.status] || { bg: 'rgba(255,255,255,0.05)', text: colors.muted };
    
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <CustomText style={styles.orderRef}>#{item.id.slice(-8).toUpperCase()}</CustomText>
            <View style={styles.dateRow}>
              <Calendar size={10} color={colors.muted} />
              <CustomText style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</CustomText>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sStyle.bg }]}>
            <CustomText style={[styles.statusText, { color: sStyle.text }]}>
              {(item.shippingStatus || item.status).replace(/_/g, ' ')}
            </CustomText>
          </View>
        </View>

        <View style={styles.cardBody}>
          <CustomText style={styles.productNames} numberOfLines={1}>
            {item.items.map(i => i.product?.title).join(', ')}
          </CustomText>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MapPin size={12} color={colors.muted} />
              <CustomText style={styles.infoText} numberOfLines={1}>{item.address}</CustomText>
            </View>
            <View style={styles.infoItem}>
              <Weight size={12} color={colors.muted} />
              <CustomText style={styles.infoText}>{totalWeight(item).toFixed(1)} kg</CustomText>
            </View>
          </View>

          <View style={styles.assignmentGrid}>
            <View style={styles.assignBox}>
              <CustomText style={styles.assignLabel}>{t('courier').toUpperCase()}</CustomText>
              {item.Courier ? (
                <View>
                  <CustomText style={styles.assignValue}>{item.Courier.courierName}</CustomText>
                  <CustomText style={styles.assignSub}>{item.Courier.courierPhone}</CustomText>
                </View>
              ) : (
                <CustomText style={styles.unassigned}>{t('unassigned')}</CustomText>
              )}
            </View>
            <View style={styles.assignBox}>
              <CustomText style={styles.assignLabel}>{t('agent').toUpperCase()}</CustomText>
              {item.agent ? (
                <View>
                  <CustomText style={styles.assignValue}>{item.agent.user?.name}</CustomText>
                  <CustomText style={[styles.assignSub, { color: '#EAB308' }]}>★ {item.agent.rating?.toFixed(1)}</CustomText>
                </View>
              ) : (
                <CustomText style={styles.unassigned}>{t('noAgent')}</CustomText>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => {
            setSelectedOrder(item);
            setActionModalVisible(true);
          }}
        >
          <MoreVertical size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>{t('shipping')}</CustomText>
        <NotificationIcon />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['UNASSIGNED', 'ASSIGNED', 'ALL'].map((tabKey) => (
          <TouchableOpacity 
            key={tabKey} 
            onPress={() => setTab(tabKey)}
            style={[styles.tab, tab === tabKey && { borderBottomColor: colors.primary }]}
          >
            <CustomText style={[styles.tabText, { color: tab === tabKey ? colors.primary : colors.muted }]}>
              {t(tabKey.toLowerCase())}
            </CustomText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={18} color={colors.muted} />
          <TextInput
            style={{ flex: 1, color: colors.foreground, marginLeft: 8, fontSize: 14 }}
            placeholder={t('searchOrders')}
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={(text) => setSearch(text)}
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Package size={48} color={colors.muted} style={{ opacity: 0.3 }} />
              <CustomText style={{ color: colors.muted, marginTop: 12 }}>{t('noOrdersFound')}</CustomText>
            </View>
          }
        />
      )}

      {/* Action Menu */}
      <Modal visible={actionModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setActionModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {selectedOrder && (
                  <>
                    {(selectedOrder.status === 'PAID' || selectedOrder.status === 'PROCESSING') && selectedOrder.Courier && (
                      <TouchableOpacity 
                        style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                        onPress={() => {
                          setActionModalVisible(false);
                          handleShip(selectedOrder.id);
                        }}
                      >
                        <Truck size={18} color="#10B981" />
                        <CustomText style={styles.menuItemText}>Mark as Shipped</CustomText>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                      onPress={() => {
                        setActionModalVisible(false);
                        setSelectedCourierId(selectedOrder.Courier?.id || '');
                        setShowCourierModal(true);
                      }}
                    >
                      <Truck size={18} color="#F97316" />
                      <CustomText style={styles.menuItemText}>{selectedOrder.Courier ? t('reassignCourier') : t('assignCourier')}</CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.menuItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        setSelectedAgentId(selectedOrder.agentId || '');
                        setShowAgentModal(true);
                      }}
                    >
                      <UserPlus size={18} color="#A855F7" />
                      <CustomText style={styles.menuItemText}>{selectedOrder.agent ? t('reassignAgent') : t('assignAgent')}</CustomText>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Courier Assignment Modal */}
      <Modal visible={showCourierModal} transparent animationType="slide">
        <View style={styles.slideModalOverlay}>
          <View style={[styles.slideModalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <CustomText variant="h2">{t('selectCourier')}</CustomText>
              <TouchableOpacity onPress={() => setShowCourierModal(false)}><X size={24} color={colors.muted} /></TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {couriers.map(c => (
                <TouchableOpacity 
                  key={c.id} 
                  style={[styles.itemRow, { borderColor: colors.border }, selectedCourierId === c.id && { borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,0.05)' }]}
                  onPress={() => setSelectedCourierId(c.id)}
                >
                  <View style={[styles.avatar, { backgroundColor: 'rgba(249,115,22,0.1)' }]}>
                    <Truck size={20} color="#F97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CustomText style={styles.itemName}>{c.name}</CustomText>
                    <CustomText style={styles.itemSub}>{c.company} · {c.phone}</CustomText>
                  </View>
                  {selectedCourierId === c.id && <View style={styles.checkCircle} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleAssignCourier}
              disabled={assigningCourier || !selectedCourierId}
            >
              {assigningCourier ? <Loader2 size={20} color="white" className="animate-spin" /> : <CustomText style={styles.submitBtnText}>{t('assignCourier')}</CustomText>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Agent Assignment Modal */}
      <Modal visible={showAgentModal} transparent animationType="slide">
        <View style={styles.slideModalOverlay}>
          <View style={[styles.slideModalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <CustomText variant="h2">{t('selectAgent')}</CustomText>
              <TouchableOpacity onPress={() => setShowAgentModal(false)}><X size={24} color={colors.muted} /></TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {agents.map(a => (
                <TouchableOpacity 
                  key={a.id} 
                  style={[styles.itemRow, { borderColor: colors.border }, selectedAgentId === a.id && { borderColor: '#A855F7', backgroundColor: 'rgba(168,85,247,0.05)' }]}
                  onPress={() => setSelectedAgentId(a.id)}
                >
                  <View style={[styles.avatar, { backgroundColor: 'rgba(168,85,247,0.1)' }]}>
                    <CustomText style={{ color: '#A855F7', fontWeight: 'bold' }}>{a.user?.name?.slice(0, 2).toUpperCase()}</CustomText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <CustomText style={styles.itemName}>{a.user?.name}</CustomText>
                      {a.verified && <ShieldCheck size={14} color="#F97316" />}
                    </View>
                    <CustomText style={styles.itemSub}>{a.city} · ★ {a.rating?.toFixed(1)}</CustomText>
                  </View>
                  {selectedAgentId === a.id && <View style={[styles.checkCircle, { backgroundColor: '#A855F7' }]} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: '#A855F7' }]}
              onPress={handleAssignAgent}
              disabled={assigningAgent || !selectedAgentId}
            >
              {assigningAgent ? <Loader2 size={20} color="white" className="animate-spin" /> : <CustomText style={styles.submitBtnText}>{t('assignAgent')}</CustomText>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: 'bold' },
  searchContainer: { padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1 },
  list: { padding: 16, paddingBottom: 100 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16, position: 'relative' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderRef: { fontSize: 15, fontWeight: 'bold', color: '#94a3b8' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dateText: { fontSize: 11, color: '#94a3b8' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  cardBody: { gap: 10 },
  productNames: { fontSize: 14, fontWeight: '700' },
  infoGrid: { flexDirection: 'row', gap: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  infoText: { fontSize: 12, color: '#94a3b8' },
  assignmentGrid: { flexDirection: 'row', gap: 12, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  assignBox: { flex: 1 },
  assignLabel: { fontSize: 9, fontWeight: 'bold', color: '#64748b', marginBottom: 4 },
  assignValue: { fontSize: 12, fontWeight: 'bold' },
  assignSub: { fontSize: 10, color: '#94a3b8' },
  unassigned: { fontSize: 11, color: '#64748b', fontStyle: 'italic' },
  actionBtn: { position: 'absolute', bottom: 16, right: 16, padding: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { padding: 40, alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  menuCard: { width: '80%', borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  menuItemText: { fontSize: 15, fontWeight: '600' },
  slideModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  slideModalContent: { height: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 10, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: 'bold' },
  itemSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  checkCircle: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F97316' },
  submitBtn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default SellerShipmentScreen;
