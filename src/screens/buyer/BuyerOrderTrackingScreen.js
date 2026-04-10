import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator
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
  RefreshCw
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../api/orderService';
import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';

const shippingSteps = [
  { key: "AWAITING_PICKUP",    label: "Order Placed",       icon: Package },
  { key: "PICKED_UP",          label: "Picked Up",          icon: Truck },
  { key: "IN_TRANSIT",         label: "In Transit",         icon: Navigation },
  { key: "OUT_FOR_DELIVERY",   label: "Out for Delivery",   icon: MapPin },
  { key: "DELIVERED",          label: "Delivered",          icon: CheckCircle2 },
];

const getStepIndex = (status) => {
  const stepOrder = shippingSteps.map((s) => s.key);
  const idx = stepOrder.indexOf(status);
  return idx === -1 ? 0 : idx;
};

const BuyerOrderTrackingScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

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
            <TouchableOpacity onPress={() => navigation.back()} style={styles.backBtn}>
                <ArrowLeft color={colors.foreground} size={24} />
            </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
            <CustomText>Order not found</CustomText>
        </View>
      </SafeAreaView>
    );
  }

  const currentStep = getStepIndex(order.shippingStatus || order.status);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <CustomText variant="h2">Order Tracking</CustomText>
          <CustomText style={{ fontSize: 10, color: colors.muted, fontWeights: 'bold' }}>#{order.id.slice(-8).toUpperCase()}</CustomText>
        </View>
        <TouchableOpacity onPress={fetchOrder} style={{ padding: 8 }}>
          <RefreshCw color={colors.muted} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrder(); }} tintColor={colors.primary} />}
      >
        {/* Progress Timeline */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          <CustomText style={styles.sectionLabel}>Delivery Progress</CustomText>
          <View style={styles.timelineContainer}>
            <View style={[styles.progressLine, { backgroundColor: colors.glassBorder }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: colors.primary, 
                    width: `${(currentStep / (shippingSteps.length - 1)) * 100}%` 
                  }
                ]} 
              />
            </View>
            <View style={styles.stepsRow}>
              {shippingSteps.map((step, i) => {
                const isDone = i <= currentStep;
                const isActive = i === currentStep;
                return (
                  <View key={step.key} style={styles.stepItem}>
                    <View style={[
                      styles.stepIcon, 
                      { 
                        backgroundColor: isDone ? colors.primary : colors.card,
                        borderColor: isDone ? colors.primary : colors.glassBorder,
                        borderWidth: 2
                      },
                      isActive && { transform: [{ scale: 1.1 }] }
                    ]}>
                      <step.icon size={14} color={isDone ? '#fff' : colors.muted} />
                    </View>
                    <CustomText style={[
                      styles.stepLabel, 
                      { color: isDone ? colors.foreground : colors.muted }
                    ]}>
                      {step.label}
                    </CustomText>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Agent Details */}
        {order.agent && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
             <View style={styles.agentHeader}>
                <View style={[styles.avatar, { backgroundColor: `${colors.primary}15` }]}>
                    <CustomText style={{ color: colors.primary, fontWeight: 'bold' }}>
                        {(order.agent.user.name || 'A').slice(0, 2).toUpperCase()}
                    </CustomText>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <CustomText style={{ fontWeight: 'bold' }}>{order.agent.user.name}</CustomText>
                        {order.agent.verified && (
                            <View style={[styles.verifyBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
                                <ShieldCheck color={colors.primary} size={10} />
                                <CustomText style={{ fontSize: 8, color: colors.primary, fontWeight: 'black', marginLeft: 2 }}>VERIFIED</CustomText>
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
                <TouchableOpacity style={[styles.callBtn, { backgroundColor: `${colors.primary}15` }]}>
                    <Phone color={colors.primary} size={20} />
                </TouchableOpacity>
             </View>
          </View>
        )}

        {/* Order Info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <CustomText style={styles.sectionLabel}>Order Details</CustomText>
            <View style={styles.infoRow}>
                <User size={14} color={colors.muted} />
                <CustomText style={styles.infoText}>Recipient: <CustomText style={{ fontWeight: 'bold' }}>{order.recipientName}</CustomText></CustomText>
            </View>
            <View style={styles.infoRow}>
                <Phone size={14} color={colors.muted} />
                <CustomText style={styles.infoText}>Phone: <CustomText style={{ fontWeight: 'bold' }}>{order.phoneNumber}</CustomText></CustomText>
            </View>
            <View style={styles.infoRow}>
                <MapPin size={14} color={colors.muted} />
                <CustomText style={styles.infoText}>Address: <CustomText style={{ fontWeight: 'bold' }}>{order.address}</CustomText></CustomText>
            </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsBox}>
            <CustomButton 
                variant="outline" 
                title="Report Issue" 
                style={{ flex: 1, borderColor: colors.error }} 
                textStyle={{ color: colors.error }}
                onPress={() => navigation.navigate('Disputes', { orderId: order.id })}
            />
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
  card: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 16 },
  timelineContainer: { marginTop: 8, marginBottom: 12 },
  progressLine: { height: 3, borderRadius: 2, position: 'absolute', top: 15, left: 20, right: 20 },
  progressFill: { height: '100%', borderRadius: 2 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', width: 60 },
  stepIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 8, fontWeight: 'bold', textAlign: 'center', marginTop: 8 },
  agentHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  verifyBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginLeft: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText: { fontSize: 10, color: '#94a3b8', marginLeft: 4 },
  callBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  infoText: { fontSize: 13 },
  actionsBox: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 40 },
});

export default BuyerOrderTrackingScreen;
