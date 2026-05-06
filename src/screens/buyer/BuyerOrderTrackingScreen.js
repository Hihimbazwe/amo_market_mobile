import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Linking,
  TextInput,
  Dimensions,
  Image,
  Modal,
  Alert,
  Platform
} from 'react-native';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Navigation, 
  MapPin, 
  Package, 
  User, 
  Phone,
  Star,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  QrCode,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Wifi,
  WifiOff,
  ChevronRight,
  Info
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../api/orderService';
import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';
import { useLanguage } from '../../context/LanguageContext';
import QRCode from 'react-native-qrcode-svg';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const getForwardSteps = (t) => [
  { key: "PENDING",   label: t('orderPlaced'), icon: Package },
  { key: "PICKED_UP", label: t('shipped'),      icon: Truck },
  { key: "IN_TRANSIT",       label: t('inTransit'),           icon: Navigation },
  { key: "OUT_FOR_DELIVERY", label: t('readyForCollection'), icon: MapPin },
  { key: "DELIVERED",        label: t('delivered'),            icon: CheckCircle2 },
];

const getPickupSteps = (t) => [
  { key: "PENDING",   label: t('orderPlaced'),    icon: Package },
  { key: "PREPARED",  label: t('prepared'),        icon: Package },
  { key: "PICKED_UP", label: t('pickedUp'),       icon: CheckCircle2 },
];

const getReturnSteps = (t) => [
  { key: "RETURN_REQUESTED",  label: t('returnRequested'), icon: RotateCcw },
  { key: "RETURN_IN_TRANSIT", label: t('agentCollecting'),  icon: Truck },
  { key: "RETURN_COMPLETED",  label: t('sellerReceived'),  icon: Package },
  { key: "REFUNDED",          label: t('refunded'),         icon: CheckCircle2 },
];

const STATUS_TO_STEP = {
  PENDING:   "PENDING",
  PAID:      "PENDING",
  CONFIRMED: "PENDING",
  SHIPPED:   "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  COMPLETED: "DELIVERED",
  CANCELLED: "PENDING",
};

const PICKUP_STATUS_TO_STEP = {
  PENDING:   "PENDING",
  PAID:      "PENDING",
  CONFIRMED: "PENDING",
  PREPARED:  "PREPARED",
  PICKED_UP: "PICKED_UP",
  COMPLETED: "PICKED_UP",
  CANCELLED: "PENDING",
};

const RETURN_STATUSES = ["RETURN_REQUESTED", "RETURN_IN_TRANSIT", "RETURN_COMPLETED", "RETURNED_TO_SELLER", "REFUNDED"];

const getStepIndex = (steps, status) => {
  const idx = steps.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
};

const BuyerOrderTrackingScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [order, setOrder] = useState(null);
  const [agentLoc, setAgentLoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [mapZoom, setMapZoom] = useState(15);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deliveryCodeVisible, setDeliveryCodeVisible] = useState(false);
  const [pickupCodeVisible, setPickupCodeVisible] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!user?.id || !orderId) return;
    try {
      const data = await orderService.getOrderDetails(user.id, orderId);
      setOrder(data);
    } catch (error) {
      console.error('Fetch order tracking error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, orderId]);

  const fetchAgentLocation = useCallback(async (agentId) => {
    if (!user?.id) return;
    setLocLoading(true);
    try {
      const data = await orderService.getAgentLocation(user.id, agentId);
      setAgentLoc(data);
    } catch (error) {
      console.error('Fetch agent location error:', error);
    } finally {
      setLocLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (order?.agentId && ["SHIPPED", "DELIVERED"].includes(order.status)) {
      fetchAgentLocation(order.agentId);
      const interval = setInterval(() => fetchAgentLocation(order.agentId), 30000);
      return () => clearInterval(interval);
    }
  }, [order?.agentId, order?.status, fetchAgentLocation]);

  const handleCancelOrder = async () => {
    if (!user?.id || !orderId) return;
    setCancelling(true);
    try {
      await orderService.cancelOrder(user.id, orderId);
      setShowCancelModal(false);
      await fetchOrder();
      Alert.alert(t('success'), t('orderCancelledSuccess'));
    } catch (error) {
      console.error('Cancel order error:', error);
      Alert.alert(t('error'), error.message || t('failedToCancelOrder'));
    } finally {
      setCancelling(false);
    }
  };

  const handleRateAgent = async () => {
    if (!order?.agentId || !ratingScore || !user?.id) return;
    setSubmittingRating(true);
    try {
      await orderService.rateAgent(user.id, {
        agentId: order.agentId,
        orderId: order.id,
        score: ratingScore,
        comment: ratingComment
      });
      setRatingDone(true);
    } catch (error) {
      console.error('Rate agent error:', error);
    } finally {
      setSubmittingRating(false);
    }
  };

  const isReturn = useMemo(() => {
    if (!order) return false;
    return RETURN_STATUSES.includes(order.status);
  }, [order]);

  const isPickup = useMemo(() => order?.pickupType === "PICKUP", [order]);

  const activeSteps = useMemo(() => {
    if (isReturn) return getReturnSteps(t);
    if (isPickup) return getPickupSteps(t);
    return getForwardSteps(t);
  }, [isReturn, isPickup, t]);

  const currentStep = useMemo(() => {
    if (!order) return 0;
    const statusToStep = isPickup ? PICKUP_STATUS_TO_STEP : STATUS_TO_STEP;
    const resolvedStep = activeSteps.some(s => s.key === order.status)
      ? order.status
      : (statusToStep[order.status] ?? "PENDING");
    return getStepIndex(activeSteps, resolvedStep);
  }, [order, activeSteps, isPickup]);

  const stepTimestamps = useMemo(() => {
    if (!order?.TrackingEvent) return {};
    const map = {};
    order.TrackingEvent.forEach(ev => {
      if (!map[ev.status]) map[ev.status] = ev.createdAt;
    });
    if (!map["PENDING"]) map["PENDING"] = order.createdAt;
    return map;
  }, [order]);

  const canCancel = useMemo(() => {
    if (!order) return false;
    if (isPickup) {
      return !["PICKED_UP", "COMPLETED", "CANCELLED", "PREPARED"].includes(order.status);
    }
    return !["PICKED_UP", "COMPLETED", "CANCELLED", "PREPARED", "DELIVERED", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(order.status);
  }, [order, isPickup]);

  // Delivery code logic for DELIVERY orders
  const courier = order?.Courier;
  const deliveryCode = courier?.qrToken || order?.trackingCode;
  const isCodeUsed = !!deliveryCode?.startsWith("USED_") || courier?.handedOver === true;
  
  const showDeliveryCode = useMemo(() => {
    return order?.pickupType === "DELIVERY" && !!deliveryCode && order.status === "OUT_FOR_DELIVERY";
  }, [order, deliveryCode]);

  const isReadyForCollection = useMemo(() => {
    return order?.pickupType === "PICKUP" && 
           !!order?.pickupCode && 
           order.status !== "PENDING" && 
           order.status !== "PENDING_PAYMENT";
  }, [order]);

  const qrPayload = useMemo(() => {
    if (!order || !order.pickupCode) return "";
    return [
      `Code: ${order.pickupCode}`,
      `Order: #${order.id.slice(-8).toUpperCase()}`,
      `Buyer: ${order.buyer?.name || order.recipientName}`,
      `Phone: ${order.phoneNumber}`,
      order.pickupLocation ? `Location: ${order.pickupLocation.name} — ${order.pickupLocation.address}` : "",
    ].filter(Boolean).join("\n");
  }, [order]);

  const isActive = ["PAID", "SHIPPED", "DELIVERED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(order?.status);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
                <ArrowLeft color={colors.foreground} size={24} />
            </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
            <CustomText>{t('orderNotFound')}</CustomText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <CustomText variant="h2">{t('orderTracking')}</CustomText>
          <CustomText style={{ fontSize: 10, color: colors.muted, fontWeight: 'bold' }}>#{order.id.slice(-8).toUpperCase()}</CustomText>
        </View>
        <TouchableOpacity onPress={fetchOrder} style={{ padding: 8 }}>
          <RefreshCw color={colors.muted} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrder(); }} tintColor={colors.primary} />}
      >
        {/* Cancel Confirmation Modal */}
        <Modal
          visible={showCancelModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCancelModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <AlertTriangle size={24} color="#ef4444" />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <CustomText variant="h3">{t('cancelOrder')}?</CustomText>
                  <CustomText style={{ fontSize: 11, color: colors.muted }}>#{order.id.slice(-8).toUpperCase()}</CustomText>
                </View>
              </View>
              
              <CustomText style={{ color: colors.muted, marginVertical: 16 }}>
                {t('cancelOrderConfirmDesc')}
              </CustomText>

              {order.totalAmount > 0 && (
                <View style={[styles.refundBox, { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)' }]}>
                  <CheckCircle2 size={16} color="#22c55e" />
                  <CustomText style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 12, marginLeft: 8 }}>
                    Rwf {order.totalAmount.toLocaleString()} {t('refundToWallet')}
                  </CustomText>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: colors.glass }]} 
                  onPress={() => setShowCancelModal(false)}
                >
                  <CustomText style={{ fontWeight: 'bold' }}>{t('keepOrder')}</CustomText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: '#ef4444' }]} 
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

        {/* Progress Timeline */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: isReturn ? 'rgba(239, 68, 68, 0.2)' : colors.glassBorder }]}>
          <View style={styles.sectionHeader}>
            <CustomText style={styles.sectionLabel}>{isReturn ? t('returnProgress') : (isPickup ? t('pickupProgress') : t('deliveryProgress'))}</CustomText>
            {isReturn && (
              <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <RotateCcw size={10} color="#ef4444" />
                <CustomText style={{ fontSize: 8, color: '#ef4444', fontWeight: 'bold', marginLeft: 4 }}>{t('returnActive')}</CustomText>
              </View>
            )}
          </View>

          <View style={styles.timelineWrapper}>
            <View style={[styles.progressLine, { backgroundColor: colors.glassBorder }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: isReturn ? '#ef4444' : colors.primary, 
                    width: `${(currentStep / (activeSteps.length - 1)) * 100}%` 
                  }
                ]} 
              />
            </View>
            <View style={styles.stepsRow}>
              {activeSteps.map((step, i) => {
                const isDone = i <= currentStep;
                const isActiveStep = i === currentStep;
                const ts = stepTimestamps[step.key];
                const Icon = step.icon;
                
                return (
                  <View key={step.key} style={[styles.stepItem, { width: (width - 64) / activeSteps.length }]}>
                    <View style={[
                      styles.stepIcon, 
                      { 
                        backgroundColor: isDone ? (isReturn ? '#ef4444' : colors.primary) : colors.card,
                        borderColor: isDone ? (isReturn ? '#ef4444' : colors.primary) : colors.glassBorder,
                        borderWidth: 2
                      },
                      isActiveStep && { transform: [{ scale: 1.1 }], shadowColor: isReturn ? '#ef4444' : colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }
                    ]}>
                      <Icon size={14} color={isDone ? '#fff' : colors.muted} />
                    </View>
                    <CustomText style={[
                      styles.stepLabel, 
                      { color: isDone ? colors.foreground : colors.muted }
                    ]} numberOfLines={2}>
                      {step.label}
                    </CustomText>
                    {ts && isDone && (
                      <CustomText style={styles.stepTime}>
                        {new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}\n{new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </CustomText>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Delivery Code Card — for DELIVERY orders */}
        {showDeliveryCode && (
          <View style={[styles.card, { backgroundColor: 'rgba(249, 115, 22, 0.05)', borderColor: 'rgba(249, 115, 22, 0.2)' }]}>
            <View style={styles.qrHeader}>
              <View style={[styles.qrIconBox, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                <QrCode size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <CustomText style={{ fontWeight: 'bold', color: colors.primary }}>
                  {isCodeUsed ? t('deliveryCodeUsed') : t('yourDeliveryCode')}
                </CustomText>
                <CustomText style={{ fontSize: 11, color: colors.muted }}>
                  {isCodeUsed ? t('codeVerifiedDesc') : t('shareCodeWithAgent')}
                </CustomText>
              </View>
            </View>

            {isCodeUsed ? (
              <View style={[styles.codeUsedBox, { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <CustomText style={styles.codeVerifiedText}>VERIFIED</CustomText>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <CheckCircle2 size={12} color="#22c55e" />
                  <CustomText style={{ fontSize: 11, color: '#22c55e', fontWeight: 'bold', marginLeft: 4 }}>{t('successfullyDelivered')}</CustomText>
                </View>
              </View>
            ) : (
              <View style={styles.codeRevealContainer}>
                <View style={[styles.codeDisplayBox, { backgroundColor: 'rgba(0,0,0,0.2)', borderColor: colors.glassBorder }]}>
                  {deliveryCodeVisible ? (
                    <CustomText style={styles.codeMainText}>{deliveryCode}</CustomText>
                  ) : (
                    <CustomText style={[styles.codeMainText, { opacity: 0.2 }]}>••••••</CustomText>
                  )}
                </View>
                <TouchableOpacity 
                  onPress={() => setDeliveryCodeVisible(!deliveryCodeVisible)}
                  style={[styles.revealBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                >
                  <CustomText style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12 }}>
                    {deliveryCodeVisible ? t('hideCode') : t('revealCode')}
                  </CustomText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Ready for Collection — QR Code Card for PICKUP */}
        {isReadyForCollection && (
          <View style={[styles.card, { backgroundColor: 'rgba(249, 115, 22, 0.05)', borderColor: 'rgba(249, 115, 22, 0.2)' }]}>
            <View style={styles.qrHeader}>
              <View style={[styles.qrIconBox, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                <QrCode size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <CustomText style={{ fontWeight: 'bold', color: colors.primary }}>{t('yourPickupCode')}</CustomText>
                <CustomText style={{ fontSize: 11, color: colors.muted }}>{t('showQrToSeller')}</CustomText>
              </View>
            </View>
            
            <View style={styles.qrContent}>
              {!pickupCodeVisible ? (
                <CustomButton 
                  title={t('showPickupCode')}
                  onPress={() => setPickupCodeVisible(true)}
                  style={{ width: '100%' }}
                />
              ) : (
                <View style={{ alignItems: 'center', width: '100%' }}>
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={qrPayload}
                      size={200}
                      color={isDarkMode ? '#fff' : '#000'}
                      backgroundColor="transparent"
                    />
                  </View>
                  <View style={styles.codeDisplay}>
                    <CustomText style={styles.codeLabel}>{t('yourPickupCode')}</CustomText>
                    <CustomText style={styles.codeText}>{order.pickupCode}</CustomText>
                  </View>

                  {order.pickupLocation && (
                    <View style={[styles.pickupInfoCard, { backgroundColor: 'rgba(0,0,0,0.2)', borderColor: colors.glassBorder }]}>
                      <CustomText style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>{t('pickupLocation')}</CustomText>
                      <CustomText style={{ fontWeight: 'bold', fontSize: 14 }}>{order.pickupLocation.name}</CustomText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <MapPin size={12} color={colors.muted} />
                        <CustomText style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }}>{order.pickupLocation.address}</CustomText>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity 
                    onPress={() => setPickupCodeVisible(false)}
                    style={{ marginTop: 16 }}
                  >
                    <CustomText style={{ color: colors.primary, fontWeight: 'bold' }}>{t('hideCode')}</CustomText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Agent Card */}
        {order.agent && isActive && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: agentLoc?.lat ? 'rgba(34, 197, 94, 0.2)' : colors.glassBorder }]}>
            <View style={styles.agentHeader}>
              <View style={[styles.avatar, { backgroundColor: `${colors.primary}15` }]}>
                <CustomText style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>
                  {(order.agent.user.name || 'A').slice(0, 2).toUpperCase()}
                </CustomText>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CustomText style={{ fontWeight: 'bold' }}>{order.agent.user.name}</CustomText>
                  {order.agent.verified && (
                    <View style={[styles.verifyBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
                      <ShieldCheck color={colors.primary} size={10} />
                      <CustomText style={{ fontSize: 8, color: colors.primary, fontWeight: '900', marginLeft: 2 }}>{t('verified')}</CustomText>
                    </View>
                  )}
                </View>
                <View style={styles.ratingRow}>
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={10} color={s <= Math.round(order.agent.rating) ? '#fbbf24' : colors.muted} fill={s <= Math.round(order.agent.rating) ? '#fbbf24' : 'transparent'} />
                  ))}
                  <CustomText style={styles.ratingText}>{order.agent.rating.toFixed(1)} ({order.agent.ratingCount || 0})</CustomText>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.locateBtn, { backgroundColor: `${colors.primary}15` }]}
                onPress={() => order.agentId && fetchAgentLocation(order.agentId)}
                disabled={locLoading}
              >
                {locLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Navigation color={colors.primary} size={18} />}
                <CustomText style={{ fontSize: 10, color: colors.primary, fontWeight: 'bold', marginLeft: 4 }}>{t('locate')}</CustomText>
              </TouchableOpacity>
            </View>

            {agentLoc ? (
              agentLoc.lat ? (
                <View style={styles.mapContainer}>
                  <View style={styles.mapHeader}>
                    <Wifi size={12} color="#22c55e" />
                    <CustomText style={styles.mapStatus}>{t('liveLocationActive')}</CustomText>
                    {agentLoc.lastLocationAt && (
                      <CustomText style={styles.mapTime}>
                        {t('updatedAt')} {new Date(agentLoc.lastLocationAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </CustomText>
                    )}
                  </View>
                  
                  <View style={styles.mapControls}>
                    <CustomText style={styles.mapControlsLabel}>{t('zoomLevel')}:</CustomText>
                    <TouchableOpacity onPress={() => setMapZoom(z => Math.max(1, z - 1))} style={styles.zoomBtn}>
                      <ZoomOut size={16} color={colors.foreground} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMapZoom(z => Math.min(21, z + 1))} style={styles.zoomBtn}>
                      <ZoomIn size={16} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.webviewWrapper}>
                    <WebView
                      source={{ uri: `https://maps.google.com/maps?q=${agentLoc.lat},${agentLoc.lng}&z=${mapZoom}&output=embed` }}
                      style={styles.webview}
                      scrollEnabled={false}
                    />
                  </View>
                  
                  {order.agent.phone && (
                    <TouchableOpacity 
                      style={styles.phoneRow}
                      onPress={() => Linking.openURL(`tel:${order.agent.phone}`)}
                    >
                      <Phone size={14} color={colors.primary} />
                      <CustomText style={styles.phoneText}>{order.agent.phone}</CustomText>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <WifiOff size={16} color={colors.muted} />
                  <CustomText style={styles.placeholderText}>{t('agentHasntSharedLocation')}</CustomText>
                </View>
              )
            ) : null}
          </View>
        )}

        {/* Order Details */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          <CustomText style={styles.sectionLabel}>{t('orderDetails')}</CustomText>
          <View style={styles.infoRow}>
            <User size={14} color={colors.muted} />
            <View style={styles.infoCol}>
              <CustomText style={styles.infoLabel}>{t('recipient')}</CustomText>
              <CustomText style={styles.infoValue}>{order.recipientName}</CustomText>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Phone size={14} color={colors.muted} />
            <View style={styles.infoCol}>
              <CustomText style={styles.infoLabel}>{t('phone')}</CustomText>
              <CustomText style={styles.infoValue}>{order.phoneNumber}</CustomText>
            </View>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={14} color={colors.muted} />
            <View style={styles.infoCol}>
              <CustomText style={styles.infoLabel}>{t('address')}</CustomText>
              <CustomText style={styles.infoValue}>{order.address || (order.pickupType === 'PICKUP' ? t('pickupAtStore') : '')}</CustomText>
            </View>
          </View>
          
          <View style={[styles.totalRow, { borderTopColor: colors.glassBorder }]}>
            <CustomText style={styles.totalLabel}>{t('total')}</CustomText>
            <CustomText style={[styles.totalValue, { color: colors.primary }]}>Rwf {order.totalAmount.toLocaleString()}</CustomText>
          </View>
        </View>

        {/* Tracking History */}
        {order.TrackingEvent?.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <CustomText style={styles.sectionLabel}>{t('trackingHistory')}</CustomText>
            <View style={styles.historyList}>
              {order.TrackingEvent.slice().reverse().map((ev, i) => (
                <View key={ev.id} style={styles.historyItem}>
                  <View style={styles.historyIndicator}>
                    <View style={[styles.indicatorDot, { backgroundColor: i === 0 ? colors.primary : colors.glassBorder }]} />
                    {i < order.TrackingEvent.length - 1 && <View style={[styles.indicatorLine, { backgroundColor: colors.glassBorder }]} />}
                  </View>
                  <View style={styles.historyContent}>
                    <CustomText style={styles.historyDesc}>{ev.description}</CustomText>
                    {ev.location && (
                      <View style={styles.historyLocRow}>
                        <MapPin size={10} color={colors.muted} />
                        <CustomText style={styles.historyLoc}>{ev.location}</CustomText>
                      </View>
                    )}
                    <CustomText style={styles.historyTime}>{new Date(ev.createdAt).toLocaleString()}</CustomText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Rating Section */}
        {(order.status === "DELIVERED" || order.status === "COMPLETED") && order.agentId && (
          <View style={[styles.card, { backgroundColor: 'rgba(251, 191, 36, 0.05)', borderColor: 'rgba(251, 191, 36, 0.2)' }]}>
            <View style={styles.sectionHeader}>
              <Star size={16} color="#fbbf24" fill="#fbbf24" />
              <CustomText style={[styles.sectionLabel, { color: '#b45309', marginBottom: 0, marginLeft: 8 }]}>{t('rateAgent')}</CustomText>
            </View>
            
            {ratingDone ? (
              <View style={styles.ratingDoneBox}>
                <CheckCircle2 size={24} color="#22c55e" />
                <CustomText style={styles.ratingDoneText}>{t('thankYouRating')}</CustomText>
              </View>
            ) : (
              <View style={styles.ratingInputBox}>
                <View style={styles.starsRow}>
                  {[1,2,3,4,5].map(s => (
                    <TouchableOpacity key={s} onPress={() => setRatingScore(s)}>
                      <Star size={32} color={s <= ratingScore ? '#fbbf24' : colors.muted} fill={s <= ratingScore ? '#fbbf24' : 'transparent'} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.commentInput, { color: colors.foreground, backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                  placeholder={t('leaveComment')}
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={3}
                  value={ratingComment}
                  onChangeText={setRatingComment}
                />
                <CustomButton
                  title={t('submitRating')}
                  onPress={handleRateAgent}
                  loading={submittingRating}
                  disabled={!ratingScore}
                  style={{ marginTop: 12 }}
                />
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {canCancel && (
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#ef4444' }]}
              onPress={() => setShowCancelModal(true)}
            >
              <AlertTriangle size={16} color="#ef4444" />
              <CustomText style={[styles.actionBtnText, { color: '#ef4444' }]}>{t('cancelOrder')}</CustomText>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: colors.glassBorder }]}
            onPress={() => navigation.navigate('Replacements', { initiateReplacementForOrderId: order.id })}
          >
            <Package size={16} color={colors.muted} />
            <CustomText style={[styles.actionBtnText, { color: colors.foreground }]}>{t('requestReplacement')}</CustomText>
          </TouchableOpacity>
          {!canCancel && (
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#ef4444' }]}
              onPress={() => navigation.navigate('Disputes', { orderId: order.id })}
            >
              <AlertTriangle size={16} color="#ef4444" />
              <CustomText style={[styles.actionBtnText, { color: '#ef4444' }]}>{t('reportIssue')}</CustomText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  content: { padding: 16 },
  card: { padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', tracking: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginLeft: 'auto' },
  
  // Timeline
  timelineWrapper: { marginTop: 8, marginBottom: 12 },
  progressLine: { height: 4, borderRadius: 2, position: 'absolute', top: 16, left: 24, right: 24 },
  progressFill: { height: '100%', borderRadius: 2 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center' },
  stepIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  stepLabel: { fontSize: 8, fontWeight: 'bold', textAlign: 'center', marginTop: 8 },
  stepTime: { fontSize: 7, color: '#94a3b8', textAlign: 'center', marginTop: 2 },
  
  // QR Code & Codes
  qrHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  qrIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qrContent: { alignItems: 'center', paddingVertical: 10 },
  qrWrapper: { padding: 16, borderRadius: 20 },
  codeDisplay: { marginTop: 20, alignItems: 'center' },
  codeLabel: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  codeText: { fontSize: 28, fontWeight: '900', letterSpacing: 4, color: '#f97316' },

  codeUsedBox: { borderRadius: 20, borderWidth: 1, padding: 20, alignItems: 'center' },
  codeVerifiedText: { fontSize: 24, fontWeight: '900', letterSpacing: 4, color: '#22c55e', opacity: 0.5, textDecorationLine: 'line-through' },
  codeRevealContainer: { alignItems: 'center' },
  codeDisplayBox: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 32, paddingVertical: 16, marginBottom: 12 },
  codeMainText: { fontSize: 32, fontWeight: '900', letterSpacing: 8, color: '#f97316', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  revealBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },

  pickupInfoCard: { width: '100%', marginTop: 20, borderRadius: 20, borderWidth: 1, padding: 16 },

  // Agent
  agentHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  verifyBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, marginLeft: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText: { fontSize: 10, color: '#94a3b8', marginLeft: 4 },
  locateBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  
  // Map
  mapContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
  mapHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mapStatus: { fontSize: 11, fontWeight: 'bold', color: '#22c55e', marginLeft: 6 },
  mapTime: { fontSize: 10, color: '#94a3b8', marginLeft: 'auto' },
  mapControls: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mapControlsLabel: { fontSize: 10, color: '#94a3b8', marginRight: 8 },
  zoomBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 8 },
  webviewWrapper: { height: 220, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  webview: { flex: 1 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  phoneText: { fontSize: 12, fontWeight: 'bold' },
  mapPlaceholder: { padding: 30, alignItems: 'center', justifyContent: 'center', gap: 10 },
  placeholderText: { fontSize: 11, color: '#94a3b8' },

  // Order Info
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: 'bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1 },
  totalLabel: { fontSize: 14, fontWeight: 'bold' },
  totalValue: { fontSize: 18, fontWeight: '900' },

  // History
  historyList: { marginTop: 8 },
  historyItem: { flexDirection: 'row', gap: 16 },
  historyIndicator: { alignItems: 'center', width: 12 },
  indicatorDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  indicatorLine: { width: 2, flex: 1, marginVertical: 4 },
  historyContent: { flex: 1, paddingBottom: 20 },
  historyDesc: { fontSize: 13, fontWeight: 'bold' },
  historyLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  historyLoc: { fontSize: 11, color: '#94a3b8' },
  historyTime: { fontSize: 10, color: '#94a3b8', marginTop: 6 },

  // Rating
  ratingDoneBox: { alignItems: 'center', padding: 20, gap: 10 },
  ratingDoneText: { fontSize: 14, fontWeight: 'bold', color: '#22c55e' },
  ratingInputBox: { marginTop: 8 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  commentInput: { borderWidth: 1, borderRadius: 16, padding: 12, fontSize: 13, textAlignVertical: 'top', minHeight: 80 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 32, borderWidth: 1, padding: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  modalIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  refundBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  actionsContainer: { flexDirection: 'column', gap: 12, marginTop: 8, marginBottom: 40 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 20, borderWidth: 1, gap: 8 },
  actionBtnText: { fontWeight: 'bold', fontSize: 14 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default BuyerOrderTrackingScreen;
 