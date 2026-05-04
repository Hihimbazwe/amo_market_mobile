import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, RefreshControl, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { Menu, Search, ShoppingBag, Package as PackageIcon, ChevronRight, User, RefreshCcw, Truck, UserCheck, X, MoreVertical, Star, ShieldCheck, MapPin, Phone } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import NotificationIcon from '../../components/NotificationIcon';

const SellerOrdersScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const navigation = useNavigation();
  const [filter, setFilter] = useState('ALL');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replacementsCount, setReplacementsCount] = useState(0);

  // Assign agent modal state
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [targetOrderId, setTargetOrderId] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Action Menu Modal State
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedOrderForActions, setSelectedOrderForActions] = useState(null);

  // Assign courier modal state
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [couriers, setCouriers] = useState([]);
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [selectedCourierId, setSelectedCourierId] = useState('');

  const statusColors = {
    PENDING: { bg: colors.glass, text: colors.muted },
    PROCESSING: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
    PAID: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
    SHIPPED: { bg: 'rgba(249, 115, 22, 0.1)', text: colors.primary },
    DELIVERED: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
    COMPLETED: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
    CANCELLED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' },
  };

  const fetchOrdersAndReplacements = async () => {
    if (!user?.id) return;
    try {
      const [data, reps] = await Promise.all([
        sellerService.getOrders(user.id),
        sellerService.getReplacements(user.id).catch(() => []) 
      ]);
      setOrders(data);
      if (Array.isArray(reps)) {
        setReplacementsCount(reps.filter((r) => r.status === 'OPEN' || r.status === 'PENDING').length);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchOrdersAndReplacements();
    }, [user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrdersAndReplacements();
  };

  const openAgentModal = async (order) => {
    setTargetOrderId(order.id);
    setSelectedAgentId(order.agentId || '');
    setShowAgentModal(true);
    setLoadingAgents(true);
    try {
      const data = await sellerService.getAgents(user.id);
      setAgents(data);
    } catch (err) {
      Alert.alert(t('error'), t('failedToFetchAgents'));
      setShowAgentModal(false);
    } finally {
      setLoadingAgents(false);
    }
  };

  const submitAssignAgent = async () => {
    try {
      // we use selectedAgentId or null to assign/remove
      await sellerService.assignAgent(user.id, targetOrderId, selectedAgentId || null);
      Alert.alert(t('success'), selectedAgentId ? t('agentAssigned') : t('agentRemoved'));
      setShowAgentModal(false);
      fetchOrdersAndReplacements();
    } catch (err) {
      Alert.alert(t('error'), err.message || t('failedToAssignAgent'));
    }
  };

  const openCourierModal = async (order) => {
    setTargetOrderId(order.id);
    setSelectedCourierId(order.Courier?.id || '');
    setShowCourierModal(true);
    setLoadingCouriers(true);
    try {
      const data = await sellerService.getCouriers(user.id);
      setCouriers(data);
    } catch (err) {
      Alert.alert(t('error'), t('failedToFetchCouriers'));
      setShowCourierModal(false);
    } finally {
      setLoadingCouriers(false);
    }
  };

  const submitAssignCourier = async () => {
    if (!selectedCourierId) {
      Alert.alert(t('selectionRequired'), t('selectCourierToAssign'));
      return;
    }
    try {
      await sellerService.assignCourier(user.id, targetOrderId, selectedCourierId);
      Alert.alert(t('success'), t('courierAssigned'));
      setShowCourierModal(false);
      fetchOrdersAndReplacements();
    } catch (err) {
      Alert.alert(t('error'), err.message || t('failedToAssignCourier'));
    }
  };

  const handleShipOrder = (orderId) => {
    Alert.alert(t('shipOrder'), t('shipOrderConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('ship'),
        onPress: async () => {
          try {
            await sellerService.shipOrder(user.id, orderId);
            Alert.alert(t('success'), t('orderMarkedShipped'));
            fetchOrdersAndReplacements();
          } catch (err) {
            Alert.alert(t('error'), err.message || t('failedToShipOrder'));
          }
        }
      }
    ]);
  };

  const filteredOrders = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  const formatPrice = (val) => 'Rwf ' + (val || 0).toLocaleString();

  const renderOrderItem = ({ item }) => {
    const orderTitle = item.items && item.items.length > 0 && item.items[0].product ? item.items[0].product.title : t('orderItems');
    const statusColor = statusColors[item.status]?.text || '#94a3b8';
    
    return (
      <TouchableOpacity 
        style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          setSelectedOrderForActions(item);
          setActionModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.refBadge, { backgroundColor: colors.primary + '15' }]}>
            <PackageIcon size={12} color={colors.primary} />
            <CustomText style={[styles.ref, { color: colors.primary }]}>#{item.id.slice(-8).toUpperCase()}</CustomText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}35` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <CustomText style={[styles.badgeText, { color: statusColor }]}>{t(item.status?.toLowerCase())}</CustomText>
          </View>
        </View>

        <View style={styles.cardBody}>
          <CustomText variant="h3" style={[styles.name, { color: colors.foreground }]}>{orderTitle}</CustomText>
          
          <View style={styles.locationContainer}>
            <View style={[styles.locationIconBox, { backgroundColor: colors.primary + '10' }]}>
              <User color={colors.primary} size={16} />
            </View>
            <View style={styles.locationInfo}>
              <CustomText style={[styles.locationLabel, { color: colors.muted }]}>{t('recipient')}</CustomText>
              <CustomText style={[styles.addressText, { color: colors.foreground }]} numberOfLines={1}>
                {item.recipientName || t('unknownBuyer')}
              </CustomText>
            </View>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.itemsBadge}>
              <ShoppingBag size={12} color={colors.muted} />
              <CustomText style={{ fontSize: 11, color: colors.muted }}>{t('itemsCount', { count: item.items.length })}</CustomText>
            </View>
            <CustomText style={{ fontWeight: '900', color: colors.foreground, fontSize: 16 }}>
              {formatPrice(item.payment?.amount || item.total || 0)}
            </CustomText>
          </View>
        </View>

        {/* Action Indicator */}
        <View style={styles.cardFooterAction}>
          <CustomText style={{ fontSize: 11, color: colors.muted, fontWeight: '600' }}>{t('')}</CustomText>
          <MoreVertical color={colors.muted} size={16} />
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
        <CustomText variant="h2" style={{ flex: 1 }}>{t('orders')}</CustomText>
        <NotificationIcon />
      </View>

      {/* Replacement Badge Banner */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
        <TouchableOpacity
          style={[styles.replacementsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('SellerReplacements')}
          activeOpacity={0.8}
        >
          <View style={[styles.replacementsIcon, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
            <RefreshCcw color="#F97316" size={20} />
            {replacementsCount > 0 && (
              <View style={styles.badgeIndicator}>
                <CustomText style={styles.badgeText}>{replacementsCount}</CustomText>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <CustomText style={[styles.replacementsTitle, { color: colors.foreground }]}>{t('replacementRequests')}</CustomText>
            <CustomText style={[styles.replacementsSub, { color: colors.muted }]}>{t('manageRMA')}</CustomText>
          </View>
          <ChevronRight color={colors.muted} size={18} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.topFilterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.pillsScrollContent}
          style={styles.pillsRow}
        >
          {['ALL', 'PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED'].map((f) => (
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
                {f === 'ALL' ? t('all') : t(f.toLowerCase())}
              </CustomText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ShoppingBag color={colors.isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} size={64} />
              <CustomText style={[styles.emptyText, { color: colors.muted }]}>{t('noOrdersFoundWithFilter', { filter: filter !== 'ALL' ? t(filter.toLowerCase()) : '' })}</CustomText>
            </View>
          }
        />
      )}

      {/* Action Menu Modal */}
      <Modal visible={actionModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setActionModalVisible(false)}>
          <View style={styles.overlayCentered}>
            <TouchableWithoutFeedback>
              <View style={[styles.actionMenuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {selectedOrderForActions && (
                  <>
                    {/* Ship and Agent assignment options removed as requested by USER */}

                    {/* Assign Courier Option */}
                    {['PAID', 'PROCESSING', 'PENDING', 'SHIPPED'].includes(selectedOrderForActions.status?.toUpperCase()) && (
                      <TouchableOpacity 
                        style={[styles.actionMenuItem]}
                        onPress={() => {
                          setActionModalVisible(false);
                          openCourierModal(selectedOrderForActions);
                        }}
                      >
                        <Truck size={18} color={colors.primary} />
                        <CustomText style={styles.actionMenuText}>{selectedOrderForActions.Courier ? t('changeCourier') : t('assignCourier')}</CustomText>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Agents Modal */}
      <Modal visible={showAgentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border, height: '70%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <CustomText variant="h2">{t('assignDeliveryAgent')}</CustomText>
                {targetOrderId && <CustomText style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>{t('order')} #{targetOrderId.slice(-8).toUpperCase()}</CustomText>}
              </View>
              <TouchableOpacity onPress={() => setShowAgentModal(false)} style={styles.closeBtn}>
                <X color={colors.muted} size={24} />
              </TouchableOpacity>
            </View>
            
            {loadingAgents ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : agents.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <CustomText style={{ color: colors.muted }}>{t('noAgentsFound')}</CustomText>
              </View>
            ) : (
              <ScrollView style={{ flex: 1, paddingRight: 4 }}>
                <TouchableOpacity
                  style={[styles.agentRow, selectedAgentId === '' ? styles.agentRowSelected : styles.agentRowUnselected]}
                  onPress={() => setSelectedAgentId('')}
                >
                  <View style={[styles.radioOuter, selectedAgentId === '' ? styles.radioOuterSelected : styles.radioOuterUnselected]} />
                  <CustomText style={{ fontWeight: 'bold', fontSize: 13, color: colors.foreground }}>{t('noAgentManual')}</CustomText>
                </TouchableOpacity>

                {agents.filter(a => a.verified).length > 0 && <CustomText style={styles.sectionHeading}>{t('verifiedAgents')}</CustomText>}
                {agents.filter(a => a.verified).map((agent) => (
                   <TouchableOpacity
                     key={agent.id}
                     style={[styles.agentRow, selectedAgentId === agent.id ? styles.agentRowSelected : styles.agentRowUnselected]}
                     onPress={() => setSelectedAgentId(agent.id)}
                   >
                     <View style={[styles.radioOuter, selectedAgentId === agent.id ? styles.radioOuterSelected : styles.radioOuterUnselected]} />
                     
                     <View style={styles.agentAvatar}>
                       <CustomText style={styles.agentAvatarText}>{(agent.user?.name || 'A').slice(0, 2).toUpperCase()}</CustomText>
                     </View>

                     <View style={{ flex: 1 }}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                         <CustomText style={{ fontWeight: 'bold', fontSize: 13, color: colors.foreground }} numberOfLines={1}>{agent.user?.name || t('agent')}</CustomText>
                         <View style={styles.verifiedBadge}>
                           <CustomText style={styles.verifiedText}>{t('verified')}</CustomText>
                         </View>
                       </View>
                       
                       <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                         <CustomText style={{ fontSize: 10, color: colors.muted, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>{agent.city || 'Kigali'}</CustomText>
                         {agent.phone && (
                           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                             <Phone size={10} color={colors.muted} />
                             <CustomText style={{ fontSize: 10, color: colors.muted }}>{agent.phone}</CustomText>
                           </View>
                         )}
                       </View>
                     </View>

                     <View style={{ alignItems: 'flex-end' }}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                         <Star size={12} color="#FACC15" fill="#FACC15" />
                         <CustomText style={{ fontSize: 12, fontWeight: 'bold', color: colors.foreground }}>{(agent.rating || 5).toFixed(1)}</CustomText>
                       </View>
                     </View>
                   </TouchableOpacity>
                ))}

                {agents.filter(a => !a.verified).length > 0 && <CustomText style={[styles.sectionHeading, { color: colors.muted }]}>{t('otherAgents')}</CustomText>}
                {agents.filter(a => !a.verified).map((agent) => (
                   <TouchableOpacity
                     key={agent.id}
                     style={[styles.agentRow, selectedAgentId === agent.id ? styles.agentRowSelected : styles.agentRowUnselected]}
                     onPress={() => setSelectedAgentId(agent.id)}
                   >
                     <View style={[styles.radioOuter, selectedAgentId === agent.id ? styles.radioOuterSelected : styles.radioOuterUnselected]} />
                     
                     <View style={styles.agentAvatar}>
                       <CustomText style={styles.agentAvatarText}>{(agent.user?.name || 'A').slice(0, 2).toUpperCase()}</CustomText>
                     </View>

                     <View style={{ flex: 1 }}>
                       <CustomText style={{ fontWeight: 'bold', fontSize: 13, color: colors.foreground }} numberOfLines={1}>{agent.user?.name || 'Agent'}</CustomText>
                       <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                         <CustomText style={{ fontSize: 10, color: colors.muted, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>{agent.city || 'Kigali'}</CustomText>
                       </View>
                     </View>

                     <View style={{ alignItems: 'flex-end' }}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                         <Star size={12} color="#D1D5DB" />
                         <CustomText style={{ fontSize: 12, fontWeight: 'bold', color: colors.foreground }}>{(agent.rating || 0).toFixed(1)}</CustomText>
                       </View>
                     </View>
                   </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {!loadingAgents && (
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAgentModal(false)}>
                  <CustomText style={{ fontWeight: 'bold', color: colors.muted }}>{t('cancel')}</CustomText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitAssignBtn, { backgroundColor: colors.primary }]} onPress={submitAssignAgent}>
                  <UserCheck size={16} color="white" />
                  <CustomText style={{ fontWeight: 'bold', color: 'white' }}>{selectedAgentId ? t('assignAgent') : t('removeAgent')}</CustomText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Couriers Modal */}
      <Modal visible={showCourierModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border, height: '70%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <CustomText variant="h2">{t('assignCourier')}</CustomText>
                {targetOrderId && <CustomText style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>{t('order')} #{targetOrderId.slice(-8).toUpperCase()}</CustomText>}
              </View>
              <TouchableOpacity onPress={() => setShowCourierModal(false)} style={styles.closeBtn}>
                <X color={colors.muted} size={24} />
              </TouchableOpacity>
            </View>
            
            {loadingCouriers ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : couriers.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <CustomText style={{ color: colors.muted }}>{t('noCouriersFound')}</CustomText>
              </View>
            ) : (
              <ScrollView style={{ flex: 1, paddingRight: 4 }}>
                {couriers.map((courier) => (
                   <TouchableOpacity
                     key={courier.id}
                     style={[styles.agentRow, selectedCourierId === courier.id ? styles.agentRowSelected : styles.agentRowUnselected]}
                     onPress={() => setSelectedCourierId(courier.id)}
                   >
                     <View style={[styles.radioOuter, selectedCourierId === courier.id ? styles.radioOuterSelected : styles.radioOuterUnselected]} />
                     
                     <View style={[styles.agentAvatar, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
                       <Truck color="#3B82F6" size={20} />
                     </View>
 
                     <View style={{ flex: 1 }}>
                       <CustomText style={{ fontWeight: 'bold', fontSize: 13, color: colors.foreground }} numberOfLines={1}>{courier.name}</CustomText>
                       <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                         <CustomText style={{ fontSize: 10, color: colors.muted }}>{courier.company || 'Private'}</CustomText>
                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                           <Phone size={10} color={colors.muted} />
                           <CustomText style={{ fontSize: 10, color: colors.muted }}>{courier.phone}</CustomText>
                         </View>
                       </View>
                       <CustomText style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>Area: {courier.coverageArea || 'N/A'}</CustomText>
                     </View>
                   </TouchableOpacity>
                ))}
              </ScrollView>
            )}
 
            {!loadingCouriers && (
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCourierModal(false)}>
                  <CustomText style={{ fontWeight: 'bold', color: colors.muted }}>{t('cancel')}</CustomText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitAssignBtn, { backgroundColor: colors.primary }, !selectedCourierId && { opacity: 0.5 }]} 
                  onPress={submitAssignCourier}
                  disabled={!selectedCourierId}
                >
                  <Truck size={16} color="white" />
                  <CustomText style={{ fontWeight: 'bold', color: 'white' }}>{t('assignCourier')}</CustomText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

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
  listContent: { padding: 16, paddingBottom: 100 },
  orderCard: { borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  refBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  ref: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  cardBody: { gap: 4 },
  name: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  locationContainer: { flexDirection: 'row', paddingVertical: 8, gap: 12, alignItems: 'center' },
  locationIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 1 },
  addressText: { fontSize: 13, fontWeight: '500' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  itemsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  cardFooterAction: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12, opacity: 0.6 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', height: 300 },
  emptyText: { marginTop: 16, fontSize: 14, fontWeight: '600' },
  replacementsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 16, borderWidth: 1,
  },
  replacementsIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  replacementsTitle: { fontSize: 15, fontWeight: '700' },
  replacementsSub: { fontSize: 11, marginTop: 4 },
  badgeIndicator: {
    position: 'absolute', top: -5, right: -5,
    backgroundColor: '#EF4444', height: 18, minWidth: 18, borderRadius: 9, 
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: '#030712'
  },
  badgeText: { color: 'white', fontSize: 9, fontWeight: '900' },
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0,0,0,0.85)' 
  },
  modalContent: { height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  closeBtn: { padding: 4 },
  agentRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 12 },
  agentRowSelected: { borderColor: 'rgba(249,115,22,0.5)', backgroundColor: 'rgba(249,115,22,0.05)' },
  agentRowUnselected: { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'transparent' },
  radioOuter: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  radioOuterSelected: { borderColor: '#F97316', backgroundColor: '#F97316' },
  radioOuterUnselected: { borderColor: 'rgba(255,255,255,0.2)' },
  agentAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(249,115,22,0.15)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', alignItems: 'center', justifyContent: 'center' },
  agentAvatarText: { color: '#F97316', fontWeight: '900', fontSize: 16 },
  verifiedBadge: { backgroundColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.2)', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  verifiedText: { color: '#F97316', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  sectionHeading: { fontSize: 10, fontWeight: '900', color: '#F97316', letterSpacing: 1, marginVertical: 8, marginLeft: 4 },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  submitAssignBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  moreButton: { padding: 8, marginRight: -8 },
  overlayCentered: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  actionMenuCard: { width: '100%', borderRadius: 24, borderWidth: 1, overflow: 'hidden', padding: 8 },
  actionMenuHeader: { padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  actionMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  actionMenuText: { fontSize: 15, fontWeight: '600' },
});

export default SellerOrdersScreen;
