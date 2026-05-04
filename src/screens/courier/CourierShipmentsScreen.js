import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StatusBar, Alert, Modal, ScrollView, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Package, MapPin, Phone, ChevronLeft, CheckCircle2, 
  MoreVertical, Truck, UserPlus, X, Search, ShieldCheck, Loader2
} from 'lucide-react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { courierService } from '../../api/courierService';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '@env';
import { useTranslation } from 'react-i18next';

const STATUS_COLORS = {
  PENDING: '#eab308',
  PICKED_UP: '#3b82f6',
  IN_TRANSIT: '#a855f7',
  OUT_FOR_DELIVERY: '#f97316',
  DELIVERED: '#22c55e',
  FAILED: '#ef4444',
};

const FILTERS = ['ALL', 'PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];

export default function CourierShipmentsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation(['dashboard', 'common']);
  
  const [shipments, setShipments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  
  const [agentModalVisible, setAgentModalVisible] = useState(false);
  const [assigningAgent, setAssigningAgent] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  const [confirmingStatus, setConfirmingStatus] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [sData, aData] = await Promise.all([
        courierService.getShipments(user.id),
        courierService.getAgents(user.id)
      ]);
      setShipments(sData);
      setAgents(aData);
    } catch (e) {
      console.error('Courier fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleUpdateStatus = async (shipmentId, status) => {
    setConfirmingStatus(true);
    try {
      await courierService.updateStatus(user.id, shipmentId, status);
      Alert.alert(t('success'), `${t('statusUpdatedTo')} ${t(status.toLowerCase())}`);
      fetchData(true);
      setActionModalVisible(false);
    } catch (e) {
      Alert.alert(t('error'), e.message || t('failedToUpdateStatus'));
    } finally {
      setConfirmingStatus(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedAgentId || !selectedShipment) return;
    setAssigningAgent(true);
    try {
      await courierService.assignAgent(user.id, selectedShipment.id, selectedAgentId);
      Alert.alert(t('success'), t('agentAssigned'));
      setAgentModalVisible(false);
      fetchData(true);
    } catch (e) {
      Alert.alert(t('error'), e.message || t('failedToAssignAgent'));
    } finally {
      setAssigningAgent(false);
    }
  };

  const handleMarkDelivered = (shipment) => {
    Alert.alert(
      t('confirmDelivery'),
      t('markDeliveredConfirm', { orderId: shipment.orderId?.slice(-8).toUpperCase() }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/courier/shipments/${shipment.id}/deliver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': user.id, 'ngrok-skip-browser-warning': 'true' },
              });
              if (res.ok) {
                Alert.alert(`✅ ${t('ready')}`, t('shipmentDeliveredSuccess'));
                fetchData(true);
              } else {
                Alert.alert(t('error'), t('failedToUpdateStatus'));
              }
            } catch (e) {
              Alert.alert(t('error'), t('networkError'));
            }
          },
        },
      ]
    );
  };

  const filtered = filter === 'ALL' ? shipments : shipments.filter(s => s.status === filter);

  const renderItem = ({ item }) => {
    const statusColor = STATUS_COLORS[item.status] || '#cbd5e1';
    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          setSelectedShipment(item);
          setActionModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.refBadge, { backgroundColor: colors.primary + '15' }]}>
            <Package size={12} color={colors.primary} />
            <CustomText style={[styles.ref, { color: colors.primary }]}>#{item.orderId?.slice(-8).toUpperCase()}</CustomText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}35` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <CustomText style={[styles.badgeText, { color: statusColor }]}>{t(item.status?.toLowerCase())}</CustomText>
          </View>
        </View>

        <View style={styles.cardBody}>
          <CustomText variant="h3" style={[styles.name, { color: colors.foreground }]}>{item.recipientName}</CustomText>
          
          <View style={styles.locationContainer}>
            <View style={[styles.locationIconBox, { backgroundColor: colors.primary + '10' }]}>
              <MapPin color={colors.primary} size={16} />
            </View>
            <View style={styles.locationInfo}>
              <CustomText style={[styles.locationLabel, { color: colors.muted }]}>{t('deliveryAddress')}</CustomText>
              <CustomText style={[styles.addressText, { color: colors.foreground }]} numberOfLines={2}>
                {item.address}
              </CustomText>
            </View>
          </View>

          <View style={styles.contactRow}>
            {item.phoneNumber && (
              <View style={styles.contactItem}>
                <Phone color={colors.primary} size={14} />
                <CustomText style={[styles.contactText, { color: colors.foreground }]}>{item.phoneNumber}</CustomText>
              </View>
            )}
          </View>
        </View>

        {/* Dynamic Action Button */}
        <View style={styles.actionContainer}>
          {item.status === 'PENDING' && (
            <TouchableOpacity
              onPress={() => handleUpdateStatus(item.id, 'IN_TRANSIT')}
              style={[styles.actionBtn, { backgroundColor: '#A855F7' }]}
            >
              <Truck color="#fff" size={16} />
              <CustomText style={styles.actionBtnText}>{t('markAsInTransit')}</CustomText>
            </TouchableOpacity>
          )}

          {(item.status === 'IN_TRANSIT' || item.status === 'PICKED_UP') && (
            <TouchableOpacity
              onPress={() => handleUpdateStatus(item.id, 'OUT_FOR_DELIVERY')}
              style={[styles.actionBtn, { backgroundColor: 'transparent', borderColor: '#F97316', borderWidth: 1 }]}
            >
              <Truck color="#F97316" size={16} />
              <CustomText style={[styles.actionBtnText, { color: '#F97316' }]}>{t('markAsOutForDelivery')}</CustomText>
            </TouchableOpacity>
          )}

        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.glass }]}>
          <ChevronLeft color={colors.foreground} size={22} />
        </TouchableOpacity>
        <CustomText style={[styles.title, { color: colors.foreground }]}>{t('myShipments')}</CustomText>
      </View>

      {/* Filter chips */}
      <View style={styles.topFilterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.pillsScrollContent}
          style={styles.pillsRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterPill,
                filter === f && { backgroundColor: colors.primary }
              ]}
            >
              <CustomText style={[
                styles.pillText,
                { color: filter === f ? '#fff' : colors.muted }
              ]}>
                {t(f.toLowerCase())}
              </CustomText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingBox}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.primary} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyBox}>
              <Package color={colors.muted} size={40} />
              <CustomText style={{ color: colors.foreground, fontWeight: '800', marginTop: 12 }}>{t('noShipments')}</CustomText>
              <CustomText style={{ color: colors.muted, fontSize: 13 }}>{t('noShipmentsFilter')}</CustomText>
            </View>
          )}
        />
      )}

      {/* Action Menu Modal */}
      <Modal visible={actionModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setActionModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {selectedShipment && (
                  <>
                    <TouchableOpacity 
                      style={[styles.menuItem]}
                      onPress={() => handleUpdateStatus(selectedShipment.id, 'OUT_FOR_DELIVERY')}
                    >
                      <Truck size={18} color="#F97316" />
                      <CustomText style={styles.menuItemText}>{t('markAsOutForDelivery')}</CustomText>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Agent Selection Modal */}
      <Modal visible={agentModalVisible} transparent animationType="slide">
        <View style={styles.slideModalOverlay}>
          <View style={[styles.slideModalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <CustomText variant="h2">{t('selectDeliveryAgent')}</CustomText>
              <TouchableOpacity onPress={() => setAgentModalVisible(false)}><X size={24} color={colors.muted} /></TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1 }}>
              {agents.map(a => (
                <TouchableOpacity 
                  key={a.id} 
                  style={[styles.itemRow, { borderColor: colors.border }, selectedAgentId === a.id && { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.05)' }]}
                  onPress={() => setSelectedAgentId(a.id)}
                >
                  <View style={[styles.avatar, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                    <CustomText style={{ color: '#3B82F6', fontWeight: 'bold' }}>{a.user?.name?.slice(0, 2).toUpperCase()}</CustomText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <CustomText style={styles.itemName}>{a.user?.name}</CustomText>
                      {a.verified && <ShieldCheck size={14} color="#3B82F6" />}
                    </View>
                    <CustomText style={styles.itemSub}>{a.city} · ★ {a.rating?.toFixed(1)}</CustomText>
                  </View>
                  {selectedAgentId === a.id && <View style={[styles.checkCircle, { backgroundColor: '#3B82F6' }]} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: '#3B82F6' }]}
              onPress={handleAssignAgent}
              disabled={assigningAgent || !selectedAgentId}
            >
              {assigningAgent ? <ActivityIndicator size="small" color="white" /> : <CustomText style={styles.submitBtnText}>{t('assignAgent')}</CustomText>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900' },
  topFilterSection: {
    paddingBottom: 8,
    borderBottomWidth: 1,
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
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, gap: 16 },
  card: { borderRadius: 24, borderWidth: 1, padding: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  refBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  ref: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  cardBody: { gap: 12 },
  name: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  locationContainer: { flexDirection: 'row', paddingVertical: 12, gap: 12, alignItems: 'center' },
  locationIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 1 },
  addressText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  contactRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactText: { fontSize: 13, fontWeight: '600' },
  actionContainer: { marginTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
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
  checkCircle: { width: 10, height: 10, borderRadius: 5 },
  submitBtn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
