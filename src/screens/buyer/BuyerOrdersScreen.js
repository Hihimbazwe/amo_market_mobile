import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Loader2, 
  Menu, 
  Package, 
  ChevronRight, 
  Navigation as TrackIcon, 
  AlertTriangle, 
  MoreVertical, 
  QrCode,
  Star,
  Edit2,
  FileText,
  RefreshCw,
  ShoppingBag,
  PackageCheck,
  X
} from 'lucide-react-native';
import CustomText from '../../components/CustomText';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../api/orderService';
import NotificationIcon from '../../components/NotificationIcon';
import { useLanguage } from '../../context/LanguageContext';
import CustomButton from '../../components/CustomButton';
import { API_BASE_URL } from '@env';

const getStatusColor = (status) => {
  const s = status?.toUpperCase();
  switch (s) {
    case 'COMPLETED':
    case 'DELIVERED': return '#10B981'; // green
    case 'PROCESSING':
    case 'PAID':
    case 'PENDING': return '#F59E0B'; // yellow
    case 'SHIPPED': return '#3B82F6'; // blue
    case 'CANCELLED': return '#EF4444'; // red
    default: return '#94a3b8';
  }
};

const filterTabs = ['All', 'PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const BuyerOrdersScreen = ({ navigation }) => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(false);

  // Delivery Code Modal states
  const [deliveryCodeVisible, setDeliveryCodeVisible] = useState(false);
  const [deliveryCodeData, setDeliveryCodeData] = useState(null);
  const [deliveryCodeLoading, setDeliveryCodeLoading] = useState(false);

  const fetchOrders = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await orderService.getOrders(user.id);
      setOrders(data);
    } catch (error) {
      console.error('Fetch orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  const filteredOrders = orders.filter(
    (order) => activeTab === 'All' || order.status?.toUpperCase() === activeTab.toUpperCase()
  );

  const handleOpenOptions = (order) => {
    setSelectedOrder(order);
    setOptionsVisible(true);
  };

  const handleDownloadInvoice = () => {
    if (!selectedOrder) return;
    const url = `${API_BASE_URL}/api/orders/${selectedOrder.id}/invoice`;
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    setOptionsVisible(false);
  };

  const handleOpenDeliveryCode = async (order) => {
    setSelectedOrder(order);
    setOptionsVisible(false);
    setDeliveryCodeVisible(true);
    setDeliveryCodeData(null);
    setDeliveryCodeLoading(true);
    
    try {
      const data = await orderService.getDeliveryCode(user.id, order.id);
      setDeliveryCodeData(data);
    } catch (error) {
      console.error('Fetch delivery code error:', error);
    } finally {
      setDeliveryCodeLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>{t('myOrders')}</CustomText>
        <NotificationIcon />
      </View>
      
      <View style={styles.topFilterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.pillsScrollContent}
          style={styles.pillsRow}
        >
          {filterTabs.map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[
                styles.filterPill, 
                activeTab === tab && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <CustomText style={[
                styles.pillText, 
                { color: activeTab === tab ? '#fff' : colors.muted }
              ]}>
                {tab === 'All' ? t('all') : t(tab.toLowerCase()) || tab}
              </CustomText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.emptyState}>
             <Loader2 color={colors.primary} size={32} />
             <CustomText style={{ marginTop: 12 }}>{t('loadingOrders')}</CustomText>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Package color={colors.muted} size={48} />
            <CustomText variant="subtitle" style={{ marginTop: 16 }}>{t('noOrdersFound').replace('{tab}', activeTab === 'All' ? t('all') : t(activeTab.toLowerCase()) || activeTab)}</CustomText>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const isEligible = order.status === 'DELIVERED' || order.status === 'COMPLETED';
            return (
              <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                <View style={styles.orderTop}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <CustomText style={[styles.orderId, { color: colors.foreground }]} numberOfLines={1}>
                      {order.items?.[0]?.product?.title || order.items?.[0]?.product?.name || 'Order'}
                    </CustomText>
                    <CustomText style={[styles.orderDate, { color: colors.muted }]}>
                      {new Date(order.createdAt).toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </CustomText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                       <CustomText style={{ fontSize: 10, color: colors.muted, fontWeight: 'bold' }}>#{order.id.slice(-8).toUpperCase()}</CustomText>
                       {order.pickupType === "PICKUP" && (
                         <View style={[styles.pickupBadge, { backgroundColor: colors.primary + '15' }]}>
                           <QrCode size={8} color={colors.primary} />
                           <CustomText style={{ fontSize: 8, color: colors.primary, fontWeight: 'bold', marginLeft: 4 }}>PICKUP</CustomText>
                         </View>
                       )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20', marginRight: 8 }]}>
                      <CustomText style={[styles.orderStatus, { color: getStatusColor(order.status) }]}>
                        {t(order.status.toLowerCase()) || order.status}
                      </CustomText>
                    </View>
                    <TouchableOpacity onPress={() => handleOpenOptions(order)} style={{ padding: 4 }}>
                        <MoreVertical color={colors.muted} size={20} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.orderBottom, { borderTopColor: colors.glassBorder }]}>
                  <CustomText style={[styles.orderTotal, { color: colors.foreground }]}>Rwf {order.totalAmount?.toLocaleString() || order.total?.toLocaleString()}</CustomText>
                  
                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                      style={[styles.smallBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                      onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
                    >
                      <TrackIcon size={12} color={colors.primary} />
                      <CustomText style={[styles.btnText, { color: colors.primary }]}>{t('track')}</CustomText>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.smallBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                      onPress={() => navigation.navigate('Disputes', { orderId: order.id })}
                    >
                      <AlertTriangle size={12} color={colors.error || '#EF4444'} />
                      <CustomText style={[styles.btnText, { color: colors.error || '#EF4444' }]}>{t('report')}</CustomText>
                    </TouchableOpacity>

                    {isEligible && (
                        <TouchableOpacity 
                        style={[styles.smallBtn, { backgroundColor: colors.glass, borderColor: colors.primary }]}
                        onPress={() => navigation.navigate('Replacements', { initiateReplacementForOrderId: order.id })}
                        >
                        <CustomText style={[styles.btnText, { color: colors.primary }]}>{t('replace')}</CustomText>
                        </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Options Modal */}
      <Modal
        visible={optionsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOptionsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setOptionsVisible(false)}
        >
          <View style={[styles.optionsContainer, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
             <View style={styles.modalHeader}>
                <View style={styles.modalHandle} />
                <CustomText variant="h3" style={{ textAlign: 'center', marginBottom: 20 }}>{t('orderOptions')}</CustomText>
             </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Track Order */}
                <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => {
                    setOptionsVisible(false);
                    navigation.navigate('OrderTracking', { orderId: selectedOrder.id });
                }}
                >
                <TrackIcon size={20} color={colors.primary} />
                <CustomText style={styles.optionLabel}>{t('trackOrder')}</CustomText>
                </TouchableOpacity>

                {/* Rate Agent */}
                {(selectedOrder?.status === "DELIVERED" || selectedOrder?.status === "COMPLETED") && selectedOrder?.agentId && (
                    <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => {
                        setOptionsVisible(false);
                        navigation.navigate('OrderTracking', { orderId: selectedOrder.id });
                    }}
                    >
                    <Star size={20} color="#fbbf24" />
                    <CustomText style={styles.optionLabel}>{t('rateAgent')}</CustomText>
                    </TouchableOpacity>
                )}

                {/* View Pickup QR */}
                {selectedOrder?.pickupType === "PICKUP" && selectedOrder?.pickupCode && (
                    <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => {
                        setOptionsVisible(false);
                        navigation.navigate('OrderTracking', { orderId: selectedOrder.id });
                    }}
                    >
                    <QrCode size={20} color={colors.primary} />
                    <CustomText style={styles.optionLabel}>{t('viewPickupQR')}</CustomText>
                    </TouchableOpacity>
                )}

                {/* Delivery Code (QR) */}
                {["PAID","SHIPPED","DELIVERED","COMPLETED"].includes(selectedOrder?.status) && (
                <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => handleOpenDeliveryCode(selectedOrder)}
                >
                    <PackageCheck size={20} color={colors.primary} />
                    <CustomText style={[styles.optionLabel, { color: colors.primary }]}>{t('deliveryCode')}</CustomText>
                </TouchableOpacity>
                )}

                {/* Edit Pickup */}
                {selectedOrder?.pickupType === "PICKUP" && !(["SHIPPED", "COMPLETED", "CANCELLED"].includes(selectedOrder?.status)) && (
                    <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => {
                        setOptionsVisible(false);
                        navigation.navigate('OrderTracking', { orderId: selectedOrder.id });
                    }}
                    >
                    <Edit2 size={20} color={colors.primary} />
                    <CustomText style={styles.optionLabel}>{t('editPickup')}</CustomText>
                    </TouchableOpacity>
                )}

                {/* Request Return */}
                {["DELIVERED", "COMPLETED", "OUT_FOR_DELIVERY", "SHIPPED"].includes(selectedOrder?.status) && (
                    <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => {
                        setOptionsVisible(false);
                        navigation.navigate('OrderTracking', { orderId: selectedOrder.id });
                    }}
                    >
                    <RefreshCw size={20} color="#fbbf24" />
                    <CustomText style={[styles.optionLabel, { color: '#fbbf24' }]}>{t('requestReturn')}</CustomText>
                    </TouchableOpacity>
                )}

                {/* Report Issue */}
                <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => {
                    setOptionsVisible(false);
                    navigation.navigate('Disputes', { orderId: selectedOrder.id });
                }}
                >
                <AlertTriangle size={20} color={colors.error || '#EF4444'} />
                <CustomText style={[styles.optionLabel, { color: colors.error || '#EF4444' }]}>{t('reportIssue')}</CustomText>
                </TouchableOpacity>

                {/* Download Invoice */}
                {selectedOrder?.status !== "PENDING" && selectedOrder?.status !== "CANCELLED" && (
                    <TouchableOpacity 
                        style={styles.optionItem}
                        onPress={handleDownloadInvoice}
                    >
                        <FileText size={20} color="#3b82f6" />
                        <CustomText style={[styles.optionLabel, { color: '#3b82f6' }]}>{t('downloadInvoice')}</CustomText>
                    </TouchableOpacity>
                )}

                <View style={{ height: 1, backgroundColor: colors.glassBorder, marginVertical: 12 }} />
                
                <CustomButton 
                title={t('close')} 
                variant="outline" 
                onPress={() => setOptionsVisible(false)} 
                style={{ marginBottom: 20 }}
                />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delivery QR Code Modal (Professional Style like Web) */}
      <Modal
        visible={deliveryCodeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeliveryCodeVisible(false)}
      >
        <TouchableOpacity 
          style={styles.qrModalOverlay} 
          activeOpacity={1} 
          onPress={() => setDeliveryCodeVisible(false)}
        >
          <View style={[styles.qrModalContent, { backgroundColor: colors.card, borderColor: colors.primary + '30' }]} onStartShouldSetResponder={() => true}>
            <View style={styles.qrHeader}>
              <View style={styles.qrHeaderTitle}>
                <View style={[styles.qrIconBox, { backgroundColor: colors.primary + '15' }]}>
                  <PackageCheck size={20} color={colors.primary} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <CustomText style={{ fontWeight: 'bold' }}>{t('deliveryCode')}</CustomText>
                  <CustomText style={{ fontSize: 10, color: colors.muted }}>Order #{selectedOrder?.id?.slice(-8).toUpperCase()}</CustomText>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDeliveryCodeVisible(false)} style={styles.qrCloseBtn}>
                <X size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {deliveryCodeData?.courierName && (
              <View style={[styles.courierInfo, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                <CustomText style={{ fontSize: 11, fontWeight: 'bold', color: colors.muted }}>
                  🚴 {deliveryCodeData.courierName} — {deliveryCodeData.courierPhone}
                </CustomText>
              </View>
            )}

            <View style={[styles.qrDisplayBox, { backgroundColor: '#000', borderColor: colors.primary + '20' }]}>
              {deliveryCodeLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : deliveryCodeData?.deliveryCode ? (
                <View style={{ alignItems: 'center' }}>
                  <CustomText style={styles.qrCodeLabel}>{t('verificationCode').toUpperCase()}</CustomText>
                  <CustomText style={[styles.qrCodeText, { color: colors.primary }]}>{deliveryCodeData.deliveryCode}</CustomText>
                </View>
              ) : (
                <CustomText style={{ fontSize: 12, color: colors.muted }}>{t('noCodeAvailable')}</CustomText>
              )}
            </View>

            <CustomText style={styles.qrFooterText}>
              Share this 6-digit code with the delivery agent when receiving your package.
            </CustomText>

            <CustomButton 
              title={t('close')} 
              onPress={() => setDeliveryCodeVisible(false)} 
              style={{ width: '100%' }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  topFilterSection: { paddingBottom: 8, borderBottomWidth: 1 },
  pillsRow: { marginVertical: 4 },
  pillsScrollContent: { paddingHorizontal: 16, gap: 10, paddingVertical: 8 },
  filterPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  pillText: { fontSize: 14, fontWeight: '700' },
  content: { padding: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  orderCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderId: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  orderDate: { fontSize: 12 },
  pickupBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  orderStatus: { fontWeight: 'bold', fontSize: 12 },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
  orderTotal: { fontWeight: 'bold', fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 8 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  btnText: { fontSize: 11, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  optionsContainer: { padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, maxHeight: '80%' },
  modalHeader: { alignItems: 'center' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  optionLabel: { marginLeft: 16, fontSize: 14, fontWeight: 'bold' },

  // QR Modal Styles
  qrModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  qrModalContent: { width: '100%', maxWidth: 320, borderRadius: 32, padding: 24, borderWidth: 1, alignItems: 'center' },
  qrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  qrHeaderTitle: { flexDirection: 'row', alignItems: 'center' },
  qrIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  qrCloseBtn: { padding: 4 },
  courierInfo: { width: '100%', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  qrDisplayBox: { width: '100%', minHeight: 200, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1, padding: 20, marginBottom: 20 },
  qrCodeLabel: { fontSize: 10, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 8 },
  qrCodeText: { fontSize: 42, fontWeight: '900', letterSpacing: 6 },
  qrFooterText: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 24, lineHeight: 16 }
});

export default BuyerOrdersScreen;
