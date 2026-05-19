import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Dimensions, Image,
  Alert, Platform, StatusBar, Modal, TextInput
} from 'react-native';
import {
  ArrowLeft, CheckCircle2, Truck, MapPin, Package, Store,
  Phone, Star, AlertTriangle, RefreshCw, QrCode, RotateCcw,
  ExternalLink, Navigation, Clock, ShieldCheck, Wifi, WifiOff,
  ZoomIn, ZoomOut, User, Edit2, X
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../api/orderService';
import CustomText from '../../components/CustomText';
import { useLanguage } from '../../context/LanguageContext';
import QRCode from 'react-native-qrcode-svg';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

// ─── Status helpers ───────────────────────────────────────────────
const FORWARD_STEPS = [
  { key: 'PENDING',          label: 'Order Placed',         icon: Package },
  // { key: 'SHIPPED',          label: 'Shipped',              icon: Truck },
  { key: 'IN_TRANSIT',       label: 'In Transit',           icon: Navigation },
  { key: 'OUT_FOR_DELIVERY', label: 'Ready for Collection', icon: MapPin },
  // { key: 'DELIVERED',        label: 'Delivered',            icon: CheckCircle2 },
];
const PICKUP_STEPS = [
  { key: 'PENDING',   label: 'Order Placed',    icon: Package },
  { key: 'PREPARED',  label: 'Prepared',        icon: Package },
  { key: 'PICKED_UP', label: 'Picked Up',       icon: CheckCircle2 },
];
const RETURN_STEPS = [
  { key: 'RETURN_REQUESTED',  label: 'Return Requested', icon: RotateCcw },
  { key: 'RETURN_IN_TRANSIT', label: 'Agent Collecting', icon: Truck },
  { key: 'RETURN_COMPLETED',  label: 'Seller Received',  icon: Package },
  { key: 'REFUNDED',          label: 'Refunded',         icon: CheckCircle2 },
];
const RETURN_STATUSES = ['RETURN_REQUESTED','RETURN_IN_TRANSIT','RETURN_COMPLETED','RETURNED_TO_SELLER','REFUNDED'];

const STATUS_TO_STEP = { PENDING:'PENDING', PAID:'PENDING', CONFIRMED:'PENDING', SHIPPED:'OUT_FOR_DELIVERY', DELIVERED:'DELIVERED', COMPLETED:'DELIVERED', CANCELLED:'PENDING' };
const PICKUP_STATUS_TO_STEP = { PENDING:'PENDING', PAID:'PENDING', CONFIRMED:'PENDING', PREPARED:'PREPARED', PICKED_UP:'PICKED_UP', COMPLETED:'PICKED_UP', CANCELLED:'PENDING' };

const stepIndex = (steps, status) => {
  const i = steps.findIndex(s => s.key === status);
  return i === -1 ? 0 : i;
};

const formatCoverageArea = (coverageArea) => {
  if (!coverageArea) return "";
  try {
    const parsed = JSON.parse(coverageArea);
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        const parts = [];
        if (item.sector) parts.push(item.sector.charAt(0).toUpperCase() + item.sector.slice(1));
        if (item.district) parts.push(item.district.charAt(0).toUpperCase() + item.district.slice(1));
        if (item.province) parts.push(item.province.charAt(0).toUpperCase() + item.province.slice(1));
        return parts.join(", ");
      }).join(" • ");
    }
  } catch (e) {}
  return coverageArea;
};

// ─── Sub-components ───────────────────────────────────────────────
const StatusBadge = ({ status, pickupType }) => {
  let color = '#f97316';
  let text = status.replace(/_/g, ' ');
  if (['DELIVERED','COMPLETED','PICKED_UP'].includes(status)) { color = '#22c55e'; }
  else if (['CANCELLED','FAILED_DELIVERY'].includes(status)) { color = '#ef4444'; }
  else if (['SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','PREPARED'].includes(status)) { color = '#3b82f6'; }
  
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: color + '20', borderWidth: 1, borderColor: color + '40', alignSelf: 'flex-start' }}>
      <CustomText style={{ fontSize: 10, fontWeight: '800', color: color, letterSpacing: 0.5 }}>{text}</CustomText>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────
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
  
  const [deliveryCodeVisible, setDeliveryCodeVisible] = useState(false);
  const [pickupCodeVisible, setPickupCodeVisible] = useState(false);
  
  const [returnCodeData, setReturnCodeData] = useState(null);
  const [returnCodeVisible, setReturnCodeVisible] = useState(false);
  const [fetchingReturnCode, setFetchingReturnCode] = useState(false);
  
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingDone, setRatingDone] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const [errorMsg, setErrorMsg] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [buyerLocation, setBuyerLocation] = useState(null);

  const [editingPickup, setEditingPickup] = useState(null);
  const [editSlot, setEditSlot] = useState('');
  const [editLocationId, setEditLocationId] = useState('');
  const [allLocations, setAllLocations] = useState([]);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [savingPickup, setSavingPickup] = useState(false);

  useEffect(() => {
    let locationSubscription = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 50 },
        (loc) => setBuyerLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
      );
    })();

    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  const fetchOrder = useCallback(async () => {
    if (!user?.id || !orderId) { setLoading(false); return; }
    try {
      const data = await orderService.getOrderDetails(user.id, orderId);
      setOrder(data);
      setErrorMsg(null);
    } catch (e) {
      console.error('order tracking fetch error:', e);
      setErrorMsg(e.message || 'Failed to load order');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, orderId]);

  const fetchReturnCode = useCallback(async () => {
    if (!user?.id || !orderId) return;
    setFetchingReturnCode(true);
    try {
      const data = await orderService.getReturnCode(user.id, orderId);
      setReturnCodeData(data);
    } catch (e) {
      console.error('Failed to fetch return code:', e);
    } finally {
      setFetchingReturnCode(false);
    }
  }, [user?.id, orderId]);

  useEffect(() => {
    if (order && RETURN_STATUSES.includes(order.status) && !returnCodeData && !fetchingReturnCode) {
      fetchReturnCode();
    }
  }, [order?.status, returnCodeData, fetchingReturnCode, fetchReturnCode]);

  const fetchAgentLocation = useCallback(async (agentId) => {
    if (!agentId) return;
    setLocLoading(true);
    try {
      // Assuming you have an endpoint or method to fetch agent location
      // Using dummy or silent fail if api doesn't exist for mobile
      // const res = await fetch(`/api/agent/gps?agentId=${agentId}`);
      // if (res.ok) setAgentLoc(await res.json());
    } catch(e) {}
    finally { setLocLoading(false); }
  }, []);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const isReturn = RETURN_STATUSES.includes(order?.status);
  const isPickup = order?.pickupType === 'PICKUP';
  const activeSteps = isReturn ? RETURN_STEPS : isPickup ? PICKUP_STEPS : FORWARD_STEPS;
  
  const statusToStep = isPickup ? PICKUP_STATUS_TO_STEP : STATUS_TO_STEP;
  const resolvedStep = activeSteps.some(s => s.key === order?.status)
    ? order?.status
    : (statusToStep[order?.status] ?? "PENDING");

  const currentStep = stepIndex(activeSteps, resolvedStep);
  const isActive = ["PAID", "SHIPPED", "DELIVERED"].includes(order?.status);

  // QR Payload
  const qrPayload = order ? [
    `Code: ${order.pickupCode}`,
    `Order: #${order.id?.slice(-8).toUpperCase()}`,
    `Buyer: ${order.buyer?.name || order.recipientName}`,
    `Phone: ${order.phoneNumber}`
  ].filter(Boolean).join('\n') : '';

  const isReadyForCollection = isPickup && !!order?.pickupCode && order?.status !== "PENDING";
  const isPickupCodeInvalid = order?.status === "PICKED_UP" || order?.status === "COMPLETED" || order?.status === "CANCELLED";
  
  const canCancelPickup = isPickup && !["PICKED_UP", "COMPLETED", "CANCELLED", "PREPARED"].includes(order?.status);
  const canCancelDelivery = !isPickup && !["PICKED_UP", "COMPLETED", "CANCELLED", "PREPARED", "DELIVERED", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(order?.status);
  const canCancel = canCancelPickup || canCancelDelivery;

  const courier = order?.Courier;
  const deliveryCode = courier?.qrToken ?? null;
  const isCodeUsed = !!deliveryCode?.startsWith("USED_") || courier?.handedOver === true;
  let codeExpiresAt = null;
  if (courier?.qrPayload) {
    try { codeExpiresAt = new Date(JSON.parse(courier.qrPayload).codeExpiresAt); } catch {}
  }
  const isCodeExpired = codeExpiresAt ? codeExpiresAt < new Date() : false;
  const isCodeInvalid = isCodeUsed || isCodeExpired;
  const showDeliveryCode = !isPickup && !!deliveryCode && order?.status === "OUT_FOR_DELIVERY";

  const stepTimestamps = {};
  if (order?.TrackingEvent) {
    order.TrackingEvent.forEach(ev => {
      if (!stepTimestamps[ev.status]) stepTimestamps[ev.status] = ev.createdAt;
    });
  }
  if (order && !stepTimestamps["AWAITING_PICKUP"]) stepTimestamps["AWAITING_PICKUP"] = order.createdAt;

  const uniqueSellers = useMemo(() => {
    if (!order?.items) return [];
    const map = {};
    const slots = order.pickupSlot?.split(' | ') || [];
    const uniqueSellerIds = [];
    
    order.items.forEach(item => {
      const sId = item.product?.seller?.id || item.product?.sellerId;
      if (sId && !uniqueSellerIds.includes(sId)) uniqueSellerIds.push(sId);
    });

    order.items.forEach(item => {
      const seller = item.product?.seller;
      if (seller) {
        const sId = seller.id;
        const sIdx = uniqueSellerIds.indexOf(sId);
        const name = seller.user?.name || 'Store';
        const locName = seller.locationName?.trim() || '';
        const locAddr = seller.locationAddress?.trim() || '';
        
        let finalLocation = locName;
        if (locAddr) {
          if (locName && locAddr.toLowerCase().includes(locName.toLowerCase())) {
            finalLocation = locAddr;
          } else if (locName && locName.toLowerCase().includes(locAddr.toLowerCase())) {
            finalLocation = locName;
          } else if (locName) {
            finalLocation = `${locName} - ${locAddr}`;
          } else {
            finalLocation = locAddr;
          }
        }

        let pTime = slots[sIdx] || order.pickupSlot || '';
        // Strip sellerId: prefix if present
        if (pTime.includes(':') && pTime.indexOf(':') < 30) {
          const parts = pTime.split(':');
          if (parts.length > 1 && (parts[0].startsWith('c') || parts[0].length >= 10)) {
            pTime = parts.slice(1).join(':');
          }
        }

        map[sId] = {
          id: sId,
          name,
          phone: seller.phone || '',
          lat: seller.locationLat,
          lng: seller.locationLng,
          locationName: finalLocation,
          pickupTime: pTime,
        };
      }
    });
    return Object.values(map);
  }, [order]);

  const handleRateAgent = async () => {
    if (!ratingScore || !order?.agentId) return;
    setSubmittingRating(true);
    try {
      await orderService.rateAgent(user.id, { agentId: order.agentId, orderId: order.id, score: ratingScore, comment: ratingComment });
      setRatingDone(true);
    } catch (e) { console.error(e); }
    finally { setSubmittingRating(false); }
  };

  const handleCancelOrder = async () => {
    setCancelling(true);
    setShowCancelModal(false);
    try {
      await orderService.cancelOrder(user.id, order.id);
      fetchOrder();
    } catch (e) { Alert.alert("Error", e.message || "Failed to cancel order"); }
    finally { setCancelling(false); }
  };

  const handleEditPickupSave = async () => {
    if (!editingPickup) return;
    setSavingPickup(true);
    try {
      await orderService.updatePickupTime(user.id, order.id, editLocationId || null, editSlot);
      setEditingPickup(null);
      fetchOrder();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to update pickup time");
    } finally {
      setSavingPickup(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: '#0b1120' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0b1120" />
        <ActivityIndicator size="large" color="#f97316" />
        <CustomText style={{ color: '#6b7280', marginTop: 12, fontSize: 13 }}>Loading order tracking...</CustomText>
      </View>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: '#0b1120' }]}>
        <Package size={48} color="#374151" />
        <CustomText style={{ color: '#6b7280', marginTop: 12, textAlign: 'center', paddingHorizontal: 20 }}>
          {errorMsg ? `Error: ${errorMsg}` : 'Order not found'}
        </CustomText>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnSm}>
          <ArrowLeft size={18} color="#f97316" />
          <CustomText style={{ color: '#f97316', fontWeight: '700', marginLeft: 8 }}>Go Back</CustomText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const primaryColor = isReturn ? '#ef4444' : '#f97316'; // Orange matches web

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1120' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1120" />

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#111827', borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: '#1f2937' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <AlertTriangle size={20} color="#f87171" />
              </View>
              <View>
                <CustomText style={{ fontSize: 18, fontWeight: '900', color: '#f3f4f6' }}>Cancel Order?</CustomText>
                <CustomText style={{ fontSize: 12, color: '#9ca3af' }}>#{order.id.slice(-8).toUpperCase()}</CustomText>
              </View>
            </View>
            <CustomText style={{ color: '#9ca3af', fontSize: 14, lineHeight: 22, marginBottom: 20 }}>
              Are you sure you want to cancel this order? This action cannot be undone.
            </CustomText>
            {order.totalAmount > 0 && (
              <View style={{ backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', padding: 12, borderRadius: 12, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}>
                <CheckCircle2 size={16} color="#4ade80" />
                <CustomText style={{ color: '#4ade80', fontSize: 12, fontWeight: '800', marginLeft: 8 }}>
                  Rwf {order.totalAmount.toLocaleString()} will be refunded
                </CustomText>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowCancelModal(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#374151', alignItems: 'center' }}>
                <CustomText style={{ color: '#d1d5db', fontWeight: '800' }}>Keep Order</CustomText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancelOrder} disabled={cancelling} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#ef4444', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                {cancelling ? <ActivityIndicator size="small" color="#fff" /> : <AlertTriangle size={16} color="#fff" />}
                <CustomText style={{ color: '#fff', fontWeight: '800', marginLeft: 8 }}>Yes, Cancel</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Pickup Modal */}
      <Modal visible={!!editingPickup} transparent animationType="fade" onRequestClose={() => setEditingPickup(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#111827', borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: '#1f2937' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Edit2 size={20} color="#fb923c" style={{ marginRight: 12 }} />
                <CustomText style={{ fontSize: 18, fontWeight: '900', color: '#f3f4f6' }}>Edit Pickup Time</CustomText>
              </View>
              <TouchableOpacity onPress={() => setEditingPickup(null)}>
                <X size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <CustomText style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>
              Store: {editingPickup?.name}
            </CustomText>

            {/* Location Picker */}
            <CustomText style={{ fontSize: 11, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 }}>Pickup Location</CustomText>
            <TouchableOpacity 
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              onPress={() => setLocationPickerVisible(!locationPickerVisible)}
            >
              <CustomText style={{ color: editLocationId ? '#f3f4f6' : '#6b7280', fontSize: 14 }}>
                {editLocationId 
                  ? allLocations.find(l => l.id === editLocationId)?.name || "Select location..."
                  : "Select location..."}
              </CustomText>
              <CustomText style={{ color: '#6b7280' }}>▼</CustomText>
            </TouchableOpacity>

            {locationPickerVisible && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16, maxHeight: 150 }}>
                <ScrollView nestedScrollEnabled>
                  {allLocations.map((loc) => (
                    <TouchableOpacity 
                      key={loc.id} 
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
                      onPress={() => {
                        setEditLocationId(loc.id);
                        setLocationPickerVisible(false);
                      }}
                    >
                      <CustomText style={{ color: '#f3f4f6', fontSize: 13, fontWeight: 'bold' }}>{loc.name}</CustomText>
                      <CustomText style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>{loc.address}</CustomText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Time Input */}
            <CustomText style={{ fontSize: 11, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 }}>Pickup Slot</CustomText>
            <TextInput
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, color: '#f3f4f6', padding: 14, fontSize: 14, marginBottom: 24 }}
              placeholder="e.g. 2026-05-15 14:00"
              placeholderTextColor="#6b7280"
              value={editSlot}
              onChangeText={setEditSlot}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setEditingPickup(null)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#374151', alignItems: 'center' }}>
                <CustomText style={{ color: '#d1d5db', fontWeight: '800' }}>Cancel</CustomText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEditPickupSave} disabled={savingPickup || (!editSlot.trim() && !editLocationId)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#fb923c', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                {savingPickup ? <ActivityIndicator size="small" color="#fff" /> : null}
                <CustomText style={{ color: '#fff', fontWeight: '800', marginLeft: savingPickup ? 8 : 0 }}>Save</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Orders')} style={styles.headerIconBtn}>
          <ArrowLeft size={20} color="#9ca3af" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <CustomText style={{ fontSize: 20, fontWeight: '900', color: '#f3f4f6', marginRight: 8 }}>Order Tracking</CustomText>
            <StatusBadge status={order.status} pickupType={order.pickupType} />
          </View>
          <CustomText style={{ fontSize: 12, color: '#6b7280', fontWeight: '600', marginTop: 2 }}>#{order.id.slice(-8).toUpperCase()}</CustomText>
        </View>
        <TouchableOpacity onPress={() => { setRefreshing(true); fetchOrder(); }} style={styles.headerIconBtnOutline}>
          <RefreshCw size={16} color="#f3f4f6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrder(); }} tintColor={primaryColor} />}
      >
        {/* Progress Timeline */}
        <View style={[styles.glassCard, isReturn ? { borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)' } : {}]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <CustomText style={styles.cardTitle}>{isReturn ? "RETURN PROGRESS" : "DELIVERY PROGRESS"}</CustomText>
            {isReturn && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}>
                <RotateCcw size={10} color="#f87171" />
                <CustomText style={{ fontSize: 10, fontWeight: '800', color: '#f87171', marginLeft: 4 }}>Return in progress</CustomText>
              </View>
            )}
          </View>
          
          <View>
            <View style={{ position: 'absolute', top: 20, left: 24, right: 24, height: 2, backgroundColor: '#1f2937', borderRadius: 2 }}>
              <View style={{ height: '100%', backgroundColor: primaryColor, borderRadius: 2, width: `${(currentStep / (activeSteps.length - 1)) * 100}%` }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {activeSteps.map((step, i) => {
                const done = i <= currentStep;
                const active = i === currentStep;
                const Icon = step.icon;
                const ts = stepTimestamps[step.key];
                return (
                  <View key={step.key} style={{ alignItems: 'center', width: 64 }}>
                    <View style={[
                      { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: '#0b1120', zIndex: 10 },
                      done ? { backgroundColor: primaryColor, borderColor: primaryColor } : { borderColor: 'rgba(255,255,255,0.1)' },
                      active ? { transform: [{ scale: 1.1 }], borderColor: `rgba(${isReturn ? '239,68,68' : '249,115,22'},0.5)`, borderWidth: 4 } : {}
                    ]}>
                      <Icon size={18} color={done ? '#fff' : 'rgba(255,255,255,0.3)'} />
                    </View>
                    <CustomText style={{ fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 8, color: done ? '#f3f4f6' : '#4b5563' }}>
                      {step.label}
                    </CustomText>
                    {ts && done && (
                      <CustomText style={{ fontSize: 9, color: '#6b7280', textAlign: 'center', marginTop: 2 }}>
                        {new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        {'\n'}{new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </CustomText>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Return Code Card */}
        {isReturn && (
          <View style={[styles.glassCard, returnCodeData?.returnCode ? { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)' } : { borderColor: 'rgba(255,255,255,0.05)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={[styles.iconBox, returnCodeData?.returnCode ? { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.3)' } : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                <QrCode size={20} color={returnCodeData?.returnCode ? "#ef4444" : "#9ca3af"} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <CustomText style={{ fontSize: 15, fontWeight: '800', color: returnCodeData?.returnCode ? '#ef4444' : '#f3f4f6' }}>
                  Your Return Code
                </CustomText>
                <CustomText style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  Show this code to the seller to complete your return
                </CustomText>
              </View>
            </View>

            {!returnCodeData ? (
              <TouchableOpacity
                onPress={fetchReturnCode}
                disabled={fetchingReturnCode}
                style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 14, gap: 8 }}
              >
                {fetchingReturnCode ? <ActivityIndicator size="small" color="#fff" /> : <QrCode size={16} color="#fff" />}
                <CustomText style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                  {fetchingReturnCode ? "Generating..." : "Get Return Code"}
                </CustomText>
              </TouchableOpacity>
            ) : (
              <View style={{ alignItems: 'center' }}>
                {!returnCodeVisible ? (
                  <TouchableOpacity
                    onPress={() => setReturnCodeVisible(true)}
                    style={{ backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 }}
                  >
                    <CustomText style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Show Return Code</CustomText>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 16 }}>
                      <QRCode
                        value={`ReturnCode:${returnCodeData.returnCode}\nOrder:#${order.id?.slice(-8).toUpperCase()}`}
                        size={160}
                        color="#000"
                        backgroundColor="#fff"
                      />
                    </View>
                    <CustomText style={{ fontSize: 10, color: '#9ca3af', letterSpacing: 1.5, fontWeight: '800', marginBottom: 4 }}>YOUR RETURN CODE</CustomText>
                    <CustomText style={{ fontSize: 36, fontWeight: '900', letterSpacing: 12, color: '#ef4444' }}>{returnCodeData.returnCode}</CustomText>
                    {returnCodeData.type && (
                      <CustomText style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, textTransform: 'capitalize' }}>
                        {returnCodeData.type.toLowerCase()} request · {returnCodeData.status?.replace(/_/g, ' ').toLowerCase()}
                      </CustomText>
                    )}
                    <TouchableOpacity
                      onPress={() => setReturnCodeVisible(false)}
                      style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}
                    >
                      <CustomText style={{ fontSize: 12, fontWeight: '800', color: '#ef4444' }}>Hide Code</CustomText>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Return / Exchange Section (Mirroring Web) */}
        {(order?.status?.toUpperCase() === "COMPLETED" || order?.status?.toUpperCase() === "PICKED_UP" || order?.status?.toUpperCase() === "DELIVERED") && !isReturn && (() => {

          const stepTimestamps = {};
          if (order.TrackingEvent) {
            order.TrackingEvent.forEach(ev => {
              if (!stepTimestamps[ev.status]) stepTimestamps[ev.status] = ev.createdAt;
            });
          }
          const completedAt = stepTimestamps["COLLECTED"] || stepTimestamps["PICKED_UP"] || order.updatedAt;
          const hoursSinceCompletion = (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60);
          const isEligible = hoursSinceCompletion < 48;

          return (
            <View style={[styles.glassCard, { borderColor: 'rgba(249,115,22,0.1)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.2)' }]}>
                  <RotateCcw size={20} color="#fb923c" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <CustomText style={{ fontSize: 16, fontWeight: '900', color: '#f3f4f6' }}>
                    Need a Return or Exchange?
                  </CustomText>
                  <CustomText style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    For electronics, you can request a refund or exchange within 48 hours of pickup.
                  </CustomText>
                </View>
              </View>

              {!isEligible ? (
                <View style={{ backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <AlertTriangle size={16} color="#f87171" />
                  <CustomText style={{ color: '#f87171', fontSize: 11, fontWeight: '800', marginLeft: 8 }}>
                    The 48-hour return window for this pickup order has closed.
                  </CustomText>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Replacements', { initiateReplacementForOrderId: order.id })}
                    style={{ flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)', gap: 4 }}
                  >
                    <CustomText style={{ color: '#f3f4f6', fontWeight: '800', fontSize: 13 }}>Request Exchange</CustomText>
                    <CustomText style={{ color: '#9ca3af', fontSize: 10, lineHeight: 14 }}>Swap this item for a replacement at the seller's location.</CustomText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Replacements', { initiateReplacementForOrderId: order.id })}
                    style={{ flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)', gap: 4 }}
                  >
                    <CustomText style={{ color: '#f3f4f6', fontWeight: '800', fontSize: 13 }}>Request Refund</CustomText>
                    <CustomText style={{ color: '#9ca3af', fontSize: 10, lineHeight: 14 }}>Return the item for a full refund subject to seller verification.</CustomText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })()}

        {/* Delivery Code Card */}
        {showDeliveryCode && (
          <View style={[styles.glassCard, isCodeInvalid ? { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' } : { borderColor: 'rgba(249,115,22,0.3)', backgroundColor: 'rgba(249,115,22,0.05)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={[styles.iconBox, isCodeInvalid ? { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' } : { backgroundColor: 'rgba(249,115,22,0.2)', borderColor: 'rgba(249,115,22,0.3)' }]}>
                <QrCode size={20} color={isCodeInvalid ? "#9ca3af" : "#fb923c"} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <CustomText style={{ fontSize: 15, fontWeight: '800', color: isCodeInvalid ? '#9ca3af' : '#fb923c' }}>
                  {isCodeUsed ? "Delivery Code Used" : isCodeExpired ? "Delivery Code Expired" : "Your Delivery Code"}
                </CustomText>
                <CustomText style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {isCodeUsed ? "This code was already verified by the agent." : isCodeExpired ? "This code has expired. Contact support if not delivered." : "Share this 6-digit code with the delivery agent to confirm receipt"}
                </CustomText>
              </View>
            </View>

            {isCodeInvalid ? (
              <View style={{ borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center', ...(isCodeUsed ? { borderColor: 'rgba(34,197,94,0.2)', backgroundColor: 'rgba(34,197,94,0.05)' } : { borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)' }) }}>
                <CustomText style={{ fontSize: 24, fontWeight: '900', letterSpacing: 8, color: isCodeUsed ? '#4ade80' : '#f87171', opacity: 0.5, textDecorationLine: 'line-through' }}>
                  {isCodeUsed ? "VERIFIED" : "EXPIRED"}
                </CustomText>
                {isCodeUsed && <CustomText style={{ fontSize: 12, color: '#4ade80', fontWeight: '800', marginTop: 4 }}>Successfully delivered</CustomText>}
                {isCodeExpired && codeExpiresAt && <CustomText style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>Expired {codeExpiresAt.toLocaleString()}</CustomText>}
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 32, paddingVertical: 20 }}>
                  <CustomText style={{ fontSize: 36, fontWeight: '900', letterSpacing: 12, color: deliveryCodeVisible ? '#fb923c' : 'rgba(251,146,60,0.3)' }}>
                    {deliveryCodeVisible ? deliveryCode : '••••••'}
                  </CustomText>
                </View>
                <TouchableOpacity onPress={() => setDeliveryCodeVisible(!deliveryCodeVisible)} style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)' }}>
                  <CustomText style={{ fontSize: 12, fontWeight: '800', color: '#fb923c' }}>{deliveryCodeVisible ? "Hide Code" : "Reveal Code"}</CustomText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Ready for Collection Pickup Code Card */}
        {isReadyForCollection && (
          <View style={[styles.glassCard, isPickupCodeInvalid ? { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' } : { borderColor: 'rgba(249,115,22,0.3)', backgroundColor: 'rgba(249,115,22,0.05)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={[styles.iconBox, isPickupCodeInvalid ? { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' } : { backgroundColor: 'rgba(249,115,22,0.2)', borderColor: 'rgba(249,115,22,0.3)' }]}>
                <QrCode size={20} color={isPickupCodeInvalid ? "#9ca3af" : "#fb923c"} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <CustomText style={{ fontSize: 15, fontWeight: '800', color: isPickupCodeInvalid ? '#9ca3af' : '#fb923c' }}>
                  {isPickupCodeInvalid ? "Pickup Code Used/Invalid" : "Your Pickup Code"}
                </CustomText>
                <CustomText style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {isPickupCodeInvalid ? "This pickup code is no longer valid." : "Show this code to the seller when collecting your order"}
                </CustomText>
              </View>
            </View>

            {isPickupCodeInvalid ? (
              <View style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, alignItems: 'center' }}>
                 <CustomText style={{ fontSize: 24, fontWeight: '900', letterSpacing: 8, color: '#9ca3af', opacity: 0.5, textDecorationLine: 'line-through' }}>EXPIRED</CustomText>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                {!pickupCodeVisible ? (
                  <TouchableOpacity onPress={() => setPickupCodeVisible(true)} style={{ backgroundColor: '#f97316', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, shadowColor: '#f97316', shadowOpacity: 0.3, shadowRadius: 10 }}>
                    <CustomText style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Show Pickup Code</CustomText>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 16 }}>
                      <QRCode value={qrPayload} size={160} color="#000" backgroundColor="#fff" />
                    </View>
                    <CustomText style={{ fontSize: 10, color: '#9ca3af', letterSpacing: 1.5, fontWeight: '800', marginBottom: 4 }}>YOUR PICKUP CODE</CustomText>
                    <CustomText style={{ fontSize: 36, fontWeight: '900', letterSpacing: 12, color: '#fb923c' }}>{order.pickupCode}</CustomText>
                    
                    <TouchableOpacity onPress={() => setPickupCodeVisible(false)} style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)' }}>
                      <CustomText style={{ fontSize: 12, fontWeight: '800', color: '#fb923c' }}>Hide Code</CustomText>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Agent GPS Card */}
        {order.agent && isActive && (
          <View style={[styles.glassCard, agentLoc?.lat ? { borderColor: 'rgba(34,197,94,0.2)', backgroundColor: 'rgba(34,197,94,0.05)' } : {}]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(249,115,22,0.1)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <CustomText style={{ color: '#fb923c', fontWeight: '900', fontSize: 16 }}>
                    {(order.agent.user?.name || "A").slice(0, 2).toUpperCase()}
                  </CustomText>
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <CustomText style={{ fontWeight: '800', color: '#f3f4f6', fontSize: 14 }}>{order.agent.user?.name}</CustomText>
                    {order.agent.verified && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(249,115,22,0.1)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 }}>
                        <ShieldCheck size={10} color="#fb923c" />
                        <CustomText style={{ fontSize: 9, fontWeight: '900', color: '#fb923c', marginLeft: 4 }}>VERIFIED</CustomText>
                      </View>
                    )}
                  </View>
                  <CustomText style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{order.agent.city}, {order.agent.country}</CustomText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={10} color={s <= Math.round(order.agent.rating) ? "#facc15" : "#374151"} fill={s <= Math.round(order.agent.rating) ? "#facc15" : "transparent"} />
                    ))}
                    <CustomText style={{ fontSize: 10, color: '#6b7280', marginLeft: 4 }}>{order.agent.rating.toFixed(1)} ({order.agent.ratingCount})</CustomText>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => fetchAgentLocation(order.agentId)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(249,115,22,0.1)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                {locLoading ? <ActivityIndicator size="small" color="#fb923c" /> : <Navigation size={12} color="#fb923c" />}
                <CustomText style={{ fontSize: 12, fontWeight: '800', color: '#fb923c', marginLeft: 6 }}>Locate</CustomText>
              </TouchableOpacity>
            </View>

            {agentLoc ? (
              agentLoc.lat ? (
                <View style={{ backgroundColor: 'transparent', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Wifi size={14} color="#4ade80" />
                    <CustomText style={{ color: '#4ade80', fontWeight: '800', fontSize: 12, marginLeft: 6 }}>Live Location Active</CustomText>
                    {agentLoc.lastLocationAt && (
                      <CustomText style={{ color: '#6b7280', fontSize: 10, marginLeft: 'auto' }}>
                        {new Date(agentLoc.lastLocationAt).toLocaleTimeString()}
                      </CustomText>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <CustomText style={{ color: '#9ca3af', fontSize: 11 }}>Lat: <CustomText style={{ color: '#f3f4f6', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{agentLoc.lat.toFixed(5)}</CustomText></CustomText>
                    <CustomText style={{ color: '#9ca3af', fontSize: 11 }}>Lng: <CustomText style={{ color: '#f3f4f6', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{agentLoc.lng.toFixed(5)}</CustomText></CustomText>
                  </View>
                  <View style={{ height: 200, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    <WebView 
                      source={{ html: `<html><body style="margin:0;padding:0;"><iframe width="100%" height="100%" frameborder="0" style="border:0" src="https://maps.google.com/maps?q=${agentLoc.lat},${agentLoc.lng}&z=${mapZoom}&output=embed" allowfullscreen></iframe></body></html>` }} 
                      style={{ flex: 1 }} 
                      scrollEnabled={false}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <WifiOff size={14} color="#fb923c" />
                  <CustomText style={{ color: '#9ca3af', fontSize: 12, marginLeft: 6 }}>Agent hasn't shared location yet.</CustomText>
                </View>
              )
            ) : null}

            {order.agent.phone && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                <Phone size={14} color="#fb923c" />
                <CustomText style={{ color: '#9ca3af', fontSize: 12, marginLeft: 6 }}>{order.agent.phone}</CustomText>
              </View>
            )}
          </View>
        )}

        {/* Location & Route Section */}
        <View style={styles.glassCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Navigation size={16} color="#fb923c" />
            </View>
            <CustomText style={[styles.cardTitle, { marginBottom: 0, marginLeft: 10 }]}>SELLER LOCATION & ROUTE</CustomText>
          </View>

          {uniqueSellers.map((s, i) => (
            <View key={i} style={{ marginBottom: i < uniqueSellers.length - 1 ? 24 : 0 }}>
              <View style={[styles.sellerRouteHeader, { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }]}>
                <View style={{ flex: 1 }}>
                  <CustomText style={{ color: '#f3f4f6', fontSize: 15, fontWeight: '800' }}>{s.name}</CustomText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <MapPin size={12} color="#6b7280" />
                    <CustomText style={{ color: '#6b7280', fontSize: 12, marginLeft: 4 }} numberOfLines={1}>{s.locationName || 'Address not available'}</CustomText>
                  </View>
                  {!!s.pickupTime && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Clock size={12} color="#fb923c" />
                      <CustomText style={{ color: '#fb923c', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Pickup: {s.pickupTime}</CustomText>
                      {isPickup && !["PICKED_UP", "COMPLETED", "CANCELLED"].includes(order.status) && (
                        <TouchableOpacity onPress={() => { setEditingPickup(s); setEditSlot(s.pickupTime); setEditLocationId(order.pickupLocationId || ''); }} style={{ marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 6 }}>
                          <CustomText style={{ color: '#fb923c', fontSize: 10, fontWeight: '700' }}>Edit</CustomText>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
                {!!s.phone && (
                  <TouchableOpacity 
                    onPress={() => Linking.openURL(`tel:${s.phone}`)}
                    style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.1)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Phone size={18} color="#4ade80" />
                  </TouchableOpacity>
                )}
              </View>

              {s.lat && s.lng ? (
                <View style={{ marginTop: 16 }}>
                  <View style={{ height: 220, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    <WebView 
                      source={{ 
                        html: `<html><body style="margin:0;padding:0;"><iframe width="100%" height="100%" frameborder="0" style="border:0" src="https://maps.google.com/maps?${buyerLocation ? `saddr=${buyerLocation.lat},${buyerLocation.lng}&daddr=${s.lat},${s.lng}` : `q=${s.lat},${s.lng}`}&z=14&output=embed" allowfullscreen></iframe></body></html>` 
                      }} 
                      style={{ flex: 1 }} 
                      scrollEnabled={false}
                    />
                    {!buyerLocation && (
                      <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.8)', padding: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#fb923c" />
                        <CustomText style={{ color: '#9ca3af', fontSize: 10, marginLeft: 8 }}>Waiting for your location to calculate route...</CustomText>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`)}
                    style={[styles.mapActionBtn, { backgroundColor: '#f97316' }]}
                  >
                    <ExternalLink size={16} color="#fff" />
                    <CustomText style={{ color: '#fff', fontWeight: '900', fontSize: 13, marginLeft: 8 }}>Get Directions in Google Maps</CustomText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ marginTop: 12, padding: 16, backgroundColor: 'rgba(239,68,68,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.1)', flexDirection: 'row', alignItems: 'center' }}>
                  <AlertTriangle size={16} color="#f87171" />
                  <CustomText style={{ color: '#f87171', fontSize: 12, marginLeft: 10 }}>Seller hasn't set their precise GPS location yet.</CustomText>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Order Info Details */}
        <View style={styles.glassCard}>
          <CustomText style={styles.cardTitle}>ORDER ITEMS</CustomText>
          <View style={{ marginTop: 4 }}>
            {order.items?.map((item, idx) => (
              <View key={idx} style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                <View style={{ flex: 1 }}>
                  <CustomText style={{ color: '#f3f4f6', fontSize: 13, fontWeight: '700' }}>
                    {item.product?.title || 'Item'}
                  </CustomText>
                  <CustomText style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
                    Qty: {item.quantity} × Rwf {(item.price || 0).toLocaleString()}
                  </CustomText>
                </View>
                <CustomText style={{ color: '#f3f4f6', fontSize: 13, fontWeight: '700' }}>
                  Rwf {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                </CustomText>
              </View>
            ))}
            <View style={[styles.detailRow, { borderBottomWidth: 0, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}>
              <CustomText style={{ color: '#9ca3af', fontSize: 14 }}>Order Total</CustomText>
              <CustomText style={{ color: '#fb923c', fontSize: 16, fontWeight: '900' }}>Rwf {order.totalAmount.toLocaleString()}</CustomText>
            </View>
          </View>
        </View>

        {/* Tracking History */}
        {order.TrackingEvent?.length > 0 && (
          <View style={styles.glassCard}>
            <CustomText style={styles.cardTitle}>TRACKING HISTORY</CustomText>
            <View style={{ marginTop: 16 }}>
              {order.TrackingEvent.slice().reverse().map((ev, i) => (
                <View key={ev.id} style={{ flexDirection: 'row', marginBottom: i === order.TrackingEvent.length - 1 ? 0 : 16 }}>
                  <View style={{ alignItems: 'center', marginRight: 16 }}>
                    <View style={[{ width: 10, height: 10, borderRadius: 5, marginTop: 4 }, i === 0 ? { backgroundColor: '#fb923c' } : { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                    {i < order.TrackingEvent.length - 1 && <View style={{ width: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 8 }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <CustomText style={{ color: '#f3f4f6', fontSize: 14, fontWeight: '700' }}>{ev.description}</CustomText>
                    {ev.location && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <MapPin size={12} color="#9ca3af" />
                        <CustomText style={{ color: '#9ca3af', fontSize: 12, marginLeft: 4 }}>{ev.location}</CustomText>
                      </View>
                    )}
                    <CustomText style={{ color: '#6b7280', fontSize: 10, marginTop: 6 }}>{new Date(ev.createdAt).toLocaleString()}</CustomText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Rate Agent */}
        {['DELIVERED', 'COMPLETED'].includes(order.status) && order.agentId && (
          <View style={[styles.glassCard, { borderColor: 'rgba(250,204,21,0.1)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Star size={16} color="#facc15" />
              <CustomText style={[styles.cardTitle, { color: '#facc15', marginBottom: 0, marginLeft: 8 }]}>RATE YOUR DELIVERY AGENT</CustomText>
            </View>
            {ratingDone ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.1)', padding: 12, borderRadius: 12 }}>
                <CheckCircle2 size={16} color="#4ade80" />
                <CustomText style={{ color: '#4ade80', fontSize: 13, fontWeight: '800', marginLeft: 8 }}>Thank you for your rating!</CustomText>
              </View>
            ) : (
              <View>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  {[1,2,3,4,5].map(s => (
                    <TouchableOpacity key={s} onPress={() => setRatingScore(s)}>
                      <Star size={32} color={s <= ratingScore ? "#facc15" : "rgba(255,255,255,0.1)"} fill={s <= ratingScore ? "#facc15" : "transparent"} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, color: '#f3f4f6', padding: 12, fontSize: 13, height: 80, textAlignVertical: 'top', marginBottom: 16 }}
                  placeholder="Leave a comment (optional)..."
                  placeholderTextColor="#6b7280"
                  multiline
                  value={ratingComment}
                  onChangeText={setRatingComment}
                />
                <TouchableOpacity onPress={handleRateAgent} disabled={submittingRating || !ratingScore} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: !ratingScore ? 'rgba(250,204,21,0.5)' : '#facc15', paddingVertical: 14, borderRadius: 14 }}>
                  {submittingRating ? <ActivityIndicator size="small" color="#000" /> : <Star size={16} color="#000" />}
                  <CustomText style={{ color: '#000', fontWeight: '800', fontSize: 14, marginLeft: 8 }}>Submit Rating</CustomText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {canCancel && (
            <TouchableOpacity onPress={() => setShowCancelModal(true)} disabled={cancelling} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.05)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', paddingVertical: 16, borderRadius: 16 }}>
              {cancelling ? <ActivityIndicator size="small" color="#f87171" /> : <AlertTriangle size={16} color="#f87171" />}
              <CustomText style={{ color: '#f87171', fontWeight: '800', fontSize: 13, marginLeft: 8 }}>Cancel Order</CustomText>
            </TouchableOpacity>
          )}
          {!isPickup && (
            <TouchableOpacity onPress={() => navigation.navigate('Replacements', { initiateReplacementForOrderId: order.id })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 16, borderRadius: 16 }}>
              <Package size={16} color="#9ca3af" />
              <CustomText style={{ color: '#9ca3af', fontWeight: '800', fontSize: 13, marginLeft: 8 }}>Replacement</CustomText>
            </TouchableOpacity>
          )}
          {!canCancel && (
            <TouchableOpacity onPress={() => navigation.navigate('Disputes', { orderId: order.id })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.05)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', paddingVertical: 16, borderRadius: 16 }}>
              <AlertTriangle size={16} color="#f87171" />
              <CustomText style={{ color: '#f87171', fontWeight: '800', fontSize: 13, marginLeft: 8 }}>Report Issue</CustomText>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerIconBtn: { padding: 8 },
  headerIconBtnOutline: { padding: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' },
  glassCard: { backgroundColor: '#111827', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1f2937', marginBottom: 24 },
  cardTitle: { fontSize: 10, fontWeight: '900', color: '#6b7280', letterSpacing: 1.5, marginBottom: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  sellerRouteHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1 },
  mapActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, marginTop: 12 },
});

export default BuyerOrderTrackingScreen;