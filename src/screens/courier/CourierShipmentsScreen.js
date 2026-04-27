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
      Alert.alert('Success', `Status updated to ${status.replace(/_/g, ' ')}`);
      fetchData(true);
      setActionModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update status');
    } finally {
      setConfirmingStatus(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedAgentId || !selectedShipment) return;
    setAssigningAgent(true);
    try {
      await courierService.assignAgent(user.id, selectedShipment.id, selectedAgentId);
      Alert.alert('Success', 'Agent assigned successfully');
      setAgentModalVisible(false);
      fetchData(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to assign agent');
    } finally {
      setAssigningAgent(false);
    }
  };

  const handleMarkDelivered = (shipment) => {
    Alert.alert(
      'Confirm Delivery',
      `Mark order #${shipment.orderId?.slice(-8).toUpperCase()} as delivered?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/courier/shipments/${shipment.id}/deliver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': user.id, 'ngrok-skip-browser-warning': 'true' },
              });
              if (res.ok) {
                Alert.alert('✅ Done', 'Shipment marked as delivered.');
                fetchData(true);
              } else {
                Alert.alert('Error', 'Failed to update shipment status.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error.');
            }
          },
        },
      ]
    );
  };

  const filtered = filter === 'ALL' ? shipments : shipments.filter(s => s.status === filter);

  const renderItem = ({ item }) => {
    const statusColor = STATUS_COLORS[item.status] || '#94a3b8';
    const isActive = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(item.status);
    
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <CustomText style={[styles.ref, { color: colors.muted }]}>#{item.orderId?.slice(-8).toUpperCase()}</CustomText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.badge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}35` }]}>
              <CustomText style={[styles.badgeText, { color: statusColor }]}>{item.status?.replace(/_/g, ' ')}</CustomText>
            </View>
            <TouchableOpacity 
              onPress={() => {
                setSelectedShipment(item);
                setActionModalVisible(true);
              }}
              style={styles.moreBtn}
            >
              <MoreVertical color={colors.muted} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        <CustomText style={[styles.name, { color: colors.foreground }]}>{item.recipientName}</CustomText>

        <View style={styles.infoRow}>
          <MapPin color={colors.muted} size={13} />
          <CustomText style={[styles.infoText, { color: colors.muted }]} numberOfLines={1}>{item.address}</CustomText>
        </View>

        {item.phoneNumber && (
          <View style={styles.infoRow}>
            <Phone color={colors.muted} size={13} />
            <CustomText style={[styles.infoText, { color: colors.muted }]}>{item.phoneNumber}</CustomText>
          </View>
        )}

        {isActive && (
          <TouchableOpacity
            onPress={() => handleMarkDelivered(item)}
            style={styles.deliverBtn}
            activeOpacity={0.8}
          >
            <CheckCircle2 color="#fff" size={16} />
            <CustomText style={styles.deliverBtnText}>Mark as Delivered</CustomText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.glass }]}>
          <ChevronLeft color={colors.foreground} size={22} />
        </TouchableOpacity>
        <CustomText style={[styles.title, { color: colors.foreground }]}>My Shipments</CustomText>
      </View>

      {/* Filter chips */}
      <View>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={f => f}
          contentContainerStyle={styles.filterBar}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              onPress={() => setFilter(f)}
              style={[
                styles.chip,
                { 
                  borderColor: filter === f ? '#f97316' : colors.border, 
                  backgroundColor: filter === f ? 'rgba(249,115,22,0.12)' : colors.card 
                }
              ]}
            >
              <CustomText style={{ fontSize: 12, fontWeight: '700', color: filter === f ? '#f97316' : colors.muted }}>
                {f.replace(/_/g, ' ')}
              </CustomText>
            </TouchableOpacity>
          )}
        />
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
              <CustomText style={{ color: colors.foreground, fontWeight: '800', marginTop: 12 }}>No shipments</CustomText>
              <CustomText style={{ color: colors.muted, fontSize: 13 }}>No shipments match this filter</CustomText>
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
                      style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                      onPress={() => handleUpdateStatus(selectedShipment.id, 'IN_TRANSIT')}
                    >
                      <Truck size={18} color="#A855F7" />
                      <CustomText style={styles.menuItemText}>Mark as In Transit</CustomText>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                      onPress={() => handleUpdateStatus(selectedShipment.id, 'OUT_FOR_DELIVERY')}
                    >
                      <Truck size={18} color="#F97316" />
                      <CustomText style={styles.menuItemText}>Out for Delivery</CustomText>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.menuItem}
                      onPress={() => {
                        setActionModalVisible(false);
                        setAgentModalVisible(true);
                      }}
                    >
                      <UserPlus size={18} color="#3B82F6" />
                      <CustomText style={styles.menuItemText}>Assign Delivery Agent</CustomText>
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
              <CustomText variant="h2">Select Delivery Agent</CustomText>
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
              {assigningAgent ? <ActivityIndicator size="small" color="white" /> : <CustomText style={styles.submitBtnText}>Assign Agent</CustomText>}
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
  filterBar: { paddingHorizontal: 16, height: 60, alignItems: 'center', gap: 8 },
  chip: { paddingHorizontal: 16, height: 36, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 11, fontFamily: 'monospace' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  moreBtn: { padding: 4 },
  name: { fontSize: 15, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, flex: 1 },
  deliverBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  deliverBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
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
