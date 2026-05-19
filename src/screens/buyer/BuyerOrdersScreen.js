import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Linking, ActivityIndicator, Alert, TextInput } from 'react-native';
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
  Search as SearchIcon,
  ShoppingBag,
  PackageCheck,
  CheckCircle2,
  X,
  MapPin,
  Store,
  Clock,
  ChevronDown,
  RotateCcw
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
    case 'PREPARED':
    case 'PENDING': return '#F59E0B'; // yellow
    case 'SHIPPED': return '#3B82F6'; // blue
    case 'CANCELLED': return '#EF4444'; // red
    default: return '#94a3b8';
  }
};

const filterTabs = ['All', 'PENDING', 'PAID', 'PREPARED', 
  // 'SHIPPED', 'DELIVERED', 
  'CANCELLED'];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [upcomingPickupOrder, setUpcomingPickupOrder] = useState(null);
  const [hoursRemaining, setHoursRemaining] = useState(0);

  const [deliveryCodeVisible, setDeliveryCodeVisible] = useState(false);
  const [deliveryCodeData, setDeliveryCodeData] = useState(null);
  const [deliveryCodeLoading, setDeliveryCodeLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [editPickupVisible, setEditPickupVisible] = useState(false);
  const [editPickupSlot, setEditPickupSlot] = useState('');
  const [editLocationId, setEditLocationId] = useState('');
  const [allLocations, setAllLocations] = useState([]);
  const [savingPickup, setSavingPickup] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState('');

  const fetchOrders = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await orderService.getOrders(user.id);
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        console.error('Data is not an array:', data);
        setOrders([]);
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      Alert.alert(t('error'), t('failedToFetchOrders') + ": " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const fetchLocations = async () => {
      if (!user?.id) return;
      try {
        const locs = await orderService.getPickupLocations(user.id);
        setAllLocations(Array.isArray(locs) ? locs : []);
      } catch (err) {
        console.error("Failed to fetch locations", err);
      }
    };
    fetchLocations();
  }, [user?.id]);

  const parsePickupSlot = (slotStr) => {
    if (!slotStr) return null;
    try {
      // Handle multiple slots by taking the first one
      let firstSlot = slotStr.includes(' | ') ? slotStr.split(' | ')[0] : slotStr;
      
      // Strip sellerId: prefix if present
      if (firstSlot.includes(':') && firstSlot.indexOf(':') < 30) {
        const parts = firstSlot.split(':');
        if (parts.length > 1 && (parts[0].startsWith('c') || parts[0].length >= 10)) {
          firstSlot = parts.slice(1).join(':');
        }
      }

      if (firstSlot.includes(' at ')) {
        const parts = firstSlot.split(' at ');
        if (parts.length !== 2) return null;
        const now = new Date();
        const dateStr = `${parts[0]}, ${now.getFullYear()} ${parts[1]}`;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      }
      
      const d = new Date(firstSlot);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (!orders || orders.length === 0) return;
    let soonest = null;
    let minDiff = Infinity;

    orders.forEach(order => {
      if (order.pickupType === 'PICKUP' && order.pickupSlot && ['PENDING', 'PAID', 'PREPARED'].includes(order.status?.toUpperCase())) {
        const slotDate = parsePickupSlot(order.pickupSlot);
        if (slotDate) {
          const diffMs = slotDate.getTime() - new Date().getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours >= -2 && diffHours <= 4 && diffHours < minDiff) {
            minDiff = diffHours;
            soonest = order;
          }
        }
      }
    });

    if (soonest) {
      setUpcomingPickupOrder(soonest);
      setHoursRemaining(minDiff);
    } else {
      setUpcomingPickupOrder(null);
    }
  }, [orders]);

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === 'All' || order.status?.toUpperCase() === activeTab.toUpperCase();
    
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      order.id.toLowerCase().includes(query) ||
      order.items?.some(item => item.product?.title?.toLowerCase().includes(query));
      
    return matchesTab && matchesSearch;
  });

  const handleOpenOptions = (order) => {
    setSelectedOrder(order);
    setOptionsVisible(true);
  };

  const handleDownloadInvoice = () => {
    if (!selectedOrder) return;
    const url = `${API_BASE_URL}/api/orders/${selectedOrder.id}/invoice?userId=${user.id}`;
    // The server side now handles the connection retries to prevent the 500 error.
    Linking.openURL(url).catch(err => {
      console.error("Couldn't load page", err);
      Alert.alert("Error", "Could not open the invoice. Please try again.");
    });
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

  const handleCancelOrder = async () => {
    if (!user?.id || !selectedOrder) return;
    setCancelling(true);
    try {
      await orderService.cancelOrder(user.id, selectedOrder.id);
      setShowCancelModal(false);
      setOptionsVisible(false);
      await fetchOrders();
      Alert.alert(t('success'), t('orderCancelledSuccess'));
    } catch (error) {
      console.error('Cancel order error:', error);
      Alert.alert(t('error'), error.message || t('failedToCancelOrder'));
    } finally {
      setCancelling(false);
    }
  };

  const handleEditPickupSave = async () => {
    if (!user?.id || !selectedOrder) return;
    setSavingPickup(true);
    try {
      await orderService.updatePickupTime(user.id, selectedOrder.id, editLocationId || null, editPickupSlot);
      setEditPickupVisible(false);
      setOptionsVisible(false);
      await fetchOrders();
      Alert.alert(t('success') || "Success", "Pickup time updated successfully");
    } catch (error) {
      console.error('Update pickup error:', error);
      Alert.alert(t('error') || "Error", error.message || "Failed to update pickup time");
    } finally {
      setSavingPickup(false);
    }
  };

  const handleReturnRequest = async () => {
    if (!user?.id || !selectedOrder || !returnReason.trim()) return;
    setSubmittingReturn(true);
    setReturnError('');
    try {
      await orderService.submitReturnRequest(user.id, selectedOrder.id, returnReason);
      setReturnModalVisible(false);
      setOptionsVisible(false);
      setReturnReason('');
      await fetchOrders();
      Alert.alert(t('success') || "Success", "Return request submitted successfully");
    } catch (error) {
      console.error('Return request error:', error);
      setReturnError(error.message || "Failed to submit return request");
    } finally {
      setSubmittingReturn(false);
    }
  };

  const canCancel = (order) => {
    if (!order) return false;
    const isPickup = order.pickupType === "PICKUP";
    if (isPickup) {
      return !["PICKED_UP", "COMPLETED", "CANCELLED", "PREPARED"].includes(order.status);
    }
    return !["PICKED_UP", "COMPLETED", "CANCELLED", "PREPARED", "DELIVERED", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(order.status);
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

      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }]}>
          <SearchIcon color={colors.muted} size={20} />
          <TextInput
            placeholder={t('searchOrders') || "Search by Order ID or Product..."}
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color={colors.muted} size={18} />
            </TouchableOpacity>
          )}
        </View>
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

      {upcomingPickupOrder && (
        <View style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', borderColor: 'rgba(249, 115, 22, 0.3)', borderWidth: 1, margin: 16, marginBottom: 0, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center' }}>
          <Store color="#f97316" size={28} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <CustomText style={{ color: '#f97316', fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>Upcoming Pickup Reminder</CustomText>
            <CustomText style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
              Your order #{upcomingPickupOrder.id.slice(-8).toUpperCase()} is scheduled for pickup in roughly {Math.ceil(hoursRemaining)} hour{Math.ceil(hoursRemaining) !== 1 ? 's' : ''} ({upcomingPickupOrder.pickupSlot}).
            </CustomText>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.emptyState}>
             <Loader2 color={colors.primary} size={32} />
             <CustomText style={{ marginTop: 12 }}>{t('loadingOrders')}</CustomText>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Package color={colors.muted} size={48} />
            <CustomText variant="subtitle" style={{ marginTop: 16 }}>
              {t('noOrdersFound')}
            </CustomText>
            <CustomText style={{ fontSize: 10, color: colors.muted, marginTop: 8, opacity: 0.5 }}>
              Logged in as: {user?.email} ({user?.id?.slice(0,8)}...)
            </CustomText>
            <TouchableOpacity onPress={fetchOrders} style={{ marginTop: 20, padding: 10 }}>
               <CustomText style={{ color: colors.primary, fontWeight: 'bold' }}>{t('retry')}</CustomText>
            </TouchableOpacity>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const statusColor = getStatusColor(order.status);
            const isPickup = order.pickupType === 'PICKUP';

            // Group items by seller for pickup orders
            const sellerGroups = {};
            if (isPickup && order.items?.length > 0) {
              const slots = order.pickupSlot?.split(' | ') || [];
              const locations = order.address?.split(' | ') || [];
              
              const uniqueSellerIds = [];
              order.items.forEach(item => {
                const sId = item.product?.seller?.id || item.product?.sellerId || 'unknown';
                if (!uniqueSellerIds.includes(sId)) uniqueSellerIds.push(sId);
              });

              order.items.forEach(item => {
                const sellerId = item.product?.seller?.id || item.product?.sellerId || 'unknown';
                const sellerIndex = uniqueSellerIds.indexOf(sellerId);
                
                let pTime = (slots[sellerIndex] || order.pickupSlot || 'Time not set').trim();
                // Strip sellerId: prefix if present
                if (pTime.includes(':') && pTime.indexOf(':') < 30) {
                  const parts = pTime.split(':');
                  if (parts.length > 1 && (parts[0].startsWith('c') || parts[0].length >= 10)) {
                    pTime = parts.slice(1).join(':');
                  }
                }

                if (!sellerGroups[sellerId]) {
                  sellerGroups[sellerId] = {
                    sellerName: item.product?.seller?.user?.name || item.product?.sellerName || 'Store',
                    location: (locations[sellerIndex] || item.product?.seller?.locationAddress || 'Location not set').trim(),
                    pickupTime: pTime,
                    items: []
                  };
                }
                sellerGroups[sellerId].items.push(item);
              });
            }

            return (
              <TouchableOpacity 
                key={order.id} 
                style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                onPress={() => handleOpenOptions(order)}
              >
                {/* Card Header — minimalist */}
                <View style={styles.cardHeader}>
                  <View style={[styles.refBadge, { backgroundColor: colors.primary + '10', paddingHorizontal: 6, paddingVertical: 2 }]}>
                    <CustomText style={[styles.ref, { color: colors.primary, fontSize: 9 }]}>#{order.id.slice(-6).toUpperCase()}</CustomText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}10`, borderColor: 'transparent', paddingVertical: 2 }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor, width: 4, height: 4 }]} />
                    <CustomText style={[styles.badgeText, { color: statusColor, fontSize: 9 }]}>{t(order.status?.toLowerCase())}</CustomText>
                  </View>
                </View>

                {isPickup && Object.keys(sellerGroups).length > 0 ? (
                  <View style={styles.cardBody}>
                    {Object.entries(sellerGroups).map(([sellerId, group]) => (
                      <View key={sellerId} style={{ marginBottom: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                          <Store size={10} color={colors.muted} />
                          <CustomText style={{ fontSize: 12, fontWeight: '700', color: colors.foreground, marginLeft: 4 }}>
                            {group.sellerName}
                          </CustomText>
                        </View>
                        {group.items.map((item, pIdx) => (
                          <CustomText key={pIdx} style={{ fontSize: 11, color: colors.muted, marginLeft: 14 }}>
                            {item.quantity}× {item.product?.title || 'Item'}
                          </CustomText>
                        ))}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.cardBody}>
                    <CustomText style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>
                      {order.items?.[0]?.product?.title || t('order')}
                      {order.items.length > 1 && ` + ${order.items.length - 1} more`}
                    </CustomText>
                    <CustomText style={{ fontSize: 11, color: colors.muted }}>
                      {order.items.map(i => i.product?.seller?.user?.name || 'Store').filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                    </CustomText>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.priceColumn}>
                    <CustomText style={{ color: colors.muted, fontSize: 10 }}>{t('totalAmount')}</CustomText>
                    <CustomText style={{ fontWeight: '900', color: colors.foreground, fontSize: 15 }}>
                      Rwf {order.totalAmount?.toLocaleString() || order.total?.toLocaleString()}
                    </CustomText>
                  </View>
                  <ChevronRight size={16} color={colors.muted} opacity={0.5} />
                </View>
              </TouchableOpacity>
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
                    <CustomText style={styles.optionLabel}>{t('view QR Code')}</CustomText>
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
                        setEditPickupSlot(selectedOrder.pickupSlot || '');
                        setEditLocationId(selectedOrder.pickupLocationId || '');
                        setEditPickupVisible(true);
                    }}
                    >
                    <Edit2 size={20} color={colors.primary} />
                    <CustomText style={styles.optionLabel}>{t('edit pickup') || "Edit Pickup"}</CustomText>
                    </TouchableOpacity>
                )}

                {/* After-Sales Request (Commented out as requested) */}
                {/*
                {(selectedOrder?.status === 'DELIVERED' || selectedOrder?.status === 'COMPLETED') && (
                    <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => {
                        setOptionsVisible(false);
                        navigation.navigate('Replacements', { initiateReplacementForOrderId: selectedOrder.id });
                    }}
                    >
                    <RotateCcw size={20} color="#F97316" />
                    <CustomText style={[styles.optionLabel, { color: '#F97316' }]}>After-Sales Request</CustomText>
                    </TouchableOpacity>
                )}
                */}

                {/* Request Return Option */}
                {(() => {
                  if (!selectedOrder) return null;
                  const isCompletedOrDelivered = ['COMPLETED', 'PICKED_UP', 'DELIVERED'].includes(selectedOrder.status?.toUpperCase());
                  const isReturn = ['RETURN_REQUESTED', 'RETURN_IN_TRANSIT', 'RETURN_COMPLETED', 'RETURNED_TO_SELLER', 'REFUNDED'].includes(selectedOrder.status?.toUpperCase());

                  if (isCompletedOrDelivered && !isReturn) {
                    return (
                      <TouchableOpacity 
                        style={styles.optionItem}
                        onPress={() => {
                          setOptionsVisible(false);
                          setReturnReason('');
                          setReturnError('');
                          setReturnModalVisible(true);
                        }}
                      >
                        <RotateCcw size={20} color="#F97316" />
                        <CustomText style={[styles.optionLabel, { color: '#F97316' }]}>Request Return</CustomText>
                      </TouchableOpacity>
                    );
                  }
                  return null;
                })()}

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

                {/* Cancel Order */}
                {canCancel(selectedOrder) && (
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => {
                      setOptionsVisible(false);
                      setShowCancelModal(true);
                    }}
                  >
                    <AlertTriangle size={20} color="#ef4444" />
                    <CustomText style={[styles.optionLabel, { color: '#ef4444' }]}>{t('cancelOrder')}</CustomText>
                  </TouchableOpacity>
                )}

                {/* Download Invoice */}
                {selectedOrder?.status !== "PENDING" && selectedOrder?.status !== "CANCELLED" && (
                    <TouchableOpacity 
                        style={styles.optionItem}
                        onPress={handleDownloadInvoice}
                    >
                        <FileText size={20} color="#3b82f6" />
                        <CustomText style={[styles.optionLabel, { color: '#3b82f6' }]}>{t('download Invoice')}</CustomText>
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

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.cancelModalOverlay}>
          <View style={[styles.cancelModalContent, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={styles.cancelModalHeader}>
              <View style={[styles.cancelModalIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <AlertTriangle size={24} color="#ef4444" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <CustomText variant="h3">{t('cancelOrder')}?</CustomText>
                <CustomText style={{ fontSize: 11, color: colors.muted }}>#{selectedOrder?.id?.slice(-8).toUpperCase()}</CustomText>
              </View>
            </View>
            
            <CustomText style={{ color: colors.muted, marginVertical: 16 }}>
              {t('cancelOrderConfirmDesc')}
            </CustomText>

            {selectedOrder?.totalAmount > 0 && (
              <View style={[styles.refundBox, { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <CheckCircle2 size={16} color="#22c55e" />
                <CustomText style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 12, marginLeft: 8 }}>
                  Rwf {selectedOrder.totalAmount.toLocaleString()} {t('refundToWallet')}
                </CustomText>
              </View>
            )}

            <View style={styles.cancelModalActions}>
              <TouchableOpacity 
                style={[styles.cancelModalBtn, { backgroundColor: colors.glass }]} 
                onPress={() => setShowCancelModal(false)}
              >
                <CustomText style={{ fontWeight: 'bold' }}>{t('keepOrder')}</CustomText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.cancelModalBtn, { backgroundColor: '#ef4444' }]} 
                onPress={handleCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? <ActivityIndicator size="small" color="#fff" /> : (
                  <CustomText style={{ color: '#fff', fontWeight: 'bold' }}>{t('yesCancel')}</CustomText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Return Request Modal */}
      <Modal
        visible={returnModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReturnModalVisible(false)}
      >
        <View style={styles.cancelModalOverlay}>
          <View style={[styles.cancelModalContent, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={styles.cancelModalHeader}>
              <View style={[styles.cancelModalIconBox, { backgroundColor: 'rgba(234, 179, 8, 0.1)' }]}>
                <RefreshCw size={24} color="#eab308" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <CustomText variant="h3">Request Return</CustomText>
                <CustomText style={{ fontSize: 11, color: colors.muted }}>#{selectedOrder?.id?.slice(-8).toUpperCase()}</CustomText>
              </View>
            </View>

            <TextInput
              style={{ 
                backgroundColor: colors.inputBg, 
                borderColor: colors.glassBorder, 
                borderWidth: 1, 
                color: colors.foreground, 
                borderRadius: 12, 
                padding: 12, 
                minHeight: 80, 
                textAlignVertical: 'top',
                marginVertical: 16 
              }}
              placeholder="Describe the reason for return (e.g. wrong item, damaged, etc.)..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              value={returnReason}
              onChangeText={setReturnReason}
            />

            {returnError ? (
              <CustomText style={{ color: '#ef4444', fontSize: 12, marginBottom: 16 }}>{returnError}</CustomText>
            ) : null}

            <View style={styles.cancelModalActions}>
              <TouchableOpacity 
                style={[styles.cancelModalBtn, { backgroundColor: colors.glass }]} 
                onPress={() => setReturnModalVisible(false)}
              >
                <CustomText style={{ fontWeight: 'bold' }}>Cancel</CustomText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.cancelModalBtn, { backgroundColor: colors.primary }]} 
                onPress={handleReturnRequest}
                disabled={submittingReturn || !returnReason.trim()}
              >
                {submittingReturn ? <ActivityIndicator size="small" color="#fff" /> : (
                  <CustomText style={{ color: '#fff', fontWeight: 'bold' }}>Submit</CustomText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Pickup Modal */}
      <Modal visible={editPickupVisible} transparent animationType="fade" onRequestClose={() => setEditPickupVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: colors.glassBorder }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Edit2 size={20} color={colors.primary} style={{ marginRight: 12 }} />
                <CustomText style={{ fontSize: 18, fontWeight: '900', color: colors.foreground }}>{t('edit pickup') || "Edit Pickup Time"}</CustomText>
              </View>
              <TouchableOpacity onPress={() => setEditPickupVisible(false)}>
                <X size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <CustomText style={{ color: colors.muted, fontSize: 13, marginBottom: 16 }}>
              Order #{selectedOrder?.id?.slice(-8).toUpperCase()}
            </CustomText>

            {/* Location Picker */}
            <CustomText style={{ fontSize: 11, fontWeight: 'bold', color: colors.muted, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 }}>Pickup Location</CustomText>
            <TouchableOpacity 
              style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              onPress={() => setLocationPickerVisible(!locationPickerVisible)}
            >
              <CustomText style={{ color: editLocationId ? colors.foreground : colors.muted, fontSize: 14 }}>
                {editLocationId 
                  ? allLocations.find(l => l.id === editLocationId)?.name || "Select location..."
                  : "Select location..."}
              </CustomText>
              <ChevronDown size={16} color={colors.muted} />
            </TouchableOpacity>

            {locationPickerVisible && (
              <View style={{ backgroundColor: colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 16, maxHeight: 150 }}>
                <ScrollView nestedScrollEnabled>
                  {allLocations.map((loc) => (
                    <TouchableOpacity 
                      key={loc.id} 
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder }}
                      onPress={() => {
                        setEditLocationId(loc.id);
                        setLocationPickerVisible(false);
                      }}
                    >
                      <CustomText style={{ color: colors.foreground, fontSize: 13, fontWeight: 'bold' }}>{loc.name}</CustomText>
                      <CustomText style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{loc.address}</CustomText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Time Input */}
            <CustomText style={{ fontSize: 11, fontWeight: 'bold', color: colors.muted, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 }}>Pickup Slot</CustomText>
            <TextInput
              style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, color: colors.foreground, padding: 14, fontSize: 14, marginBottom: 24 }}
              placeholder="e.g. 2026-05-15 14:00"
              placeholderTextColor={colors.muted}
              value={editPickupSlot}
              onChangeText={setEditPickupSlot}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setEditPickupVisible(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center' }}>
                <CustomText style={{ color: colors.muted, fontWeight: '800' }}>{t('cancel') || "Cancel"}</CustomText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEditPickupSave} disabled={savingPickup || (!editPickupSlot.trim() && !editLocationId)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                {savingPickup ? <ActivityIndicator size="small" color="#fff" /> : null}
                <CustomText style={{ color: '#fff', fontWeight: '800', marginLeft: savingPickup ? 8 : 0 }}>{t('save') || "Save"}</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  searchSection: { paddingHorizontal: 20, paddingVertical: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 14, paddingHorizontal: 12, borderWidth: 1 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, paddingVertical: 8 },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  topFilterSection: { paddingBottom: 8, borderBottomWidth: 0 },
  pillsRow: { marginVertical: 4 },
  pillsScrollContent: { paddingHorizontal: 16, gap: 10, paddingVertical: 8 },
  filterPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  pillText: { fontSize: 14, fontWeight: '700' },
  content: { padding: 16 },
  orderCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, overflow: 'hidden' },
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
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  priceColumn: { gap: 2 },
  optionsHint: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(230, 126, 34, 0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  cardFooterAction: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 12, opacity: 0.6 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  optionsContainer: { width: '100%', padding: 24, borderRadius: 24, borderWidth: 1, maxHeight: '80%' },
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
  qrFooterText: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 24, lineHeight: 16 },

  // Cancel Modal Styles
  cancelModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  cancelModalContent: { width: '100%', padding: 24, borderRadius: 32, borderWidth: 1 },
  cancelModalHeader: { flexDirection: 'row', alignItems: 'center' },
  cancelModalIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  refundBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  // Pickup order styles
  pickupBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  pickupBannerText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  storeGroupFlat: { overflow: 'hidden', marginBottom: 4 },
  storeHeader: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  storeIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  storeName: { fontSize: 13, fontWeight: '800' },
  storeLocation: { fontSize: 11, marginLeft: 4, flex: 1 },
  miniStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  miniStatusText: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
  storeProducts: { paddingHorizontal: 12, paddingBottom: 8 },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  productQtyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  productQtyText: { fontSize: 11, fontWeight: '800' },
  productTitle: { flex: 1, fontSize: 13, fontWeight: '600' },
  productPrice: { fontSize: 11, fontWeight: '700' },
  pickupProgress: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8 },
  progressDot: { width: 10, height: 10, borderRadius: 5 },
  progressLine: { flex: 1, height: 2, marginHorizontal: 2 },
  pickupProgressLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 10, paddingTop: 4 },
  progressLabel: { fontSize: 8, fontWeight: '700', textAlign: 'center', flex: 1 },
  cancelModalActions: { flexDirection: 'row', gap: 12 },
  cancelModalBtn: { flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sellerSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  sellerHeader: { flexDirection: 'row', alignItems: 'center' },
  trackRouteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  pickupTimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pickupTimeText: { fontSize: 10, fontWeight: '800' },
});

export default BuyerOrdersScreen;
