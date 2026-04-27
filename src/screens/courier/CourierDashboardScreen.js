import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck, CheckCircle, AlertCircle, Wallet, Package, MapPin, RefreshCw, Navigation, ChevronLeft } from 'lucide-react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCourierDrawer } from '../../context/CourierDrawerContext';
import { courierService } from '../../api/courierService';
import * as Location from 'expo-location';

const STATUS_COLORS = {
  PENDING: '#eab308',
  PICKED_UP: '#3b82f6',
  IN_TRANSIT: '#a855f7',
  OUT_FOR_DELIVERY: '#f97316',
  DELIVERED: '#22c55e',
  FAILED: '#ef4444',
};

export default function CourierDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { toggleDrawer } = useCourierDrawer();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await courierService.getShipments(user.id);
      setShipments(data);
    } catch (e) {
      console.error('Courier dashboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleShareLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location access is required to share your location.');
      return;
    }
    setSharingLocation(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      await courierService.shareLocation(user.id, loc.coords.latitude, loc.coords.longitude);
      Alert.alert('✅ Success', 'Your location has been shared.');
    } catch (e) {
      Alert.alert('Error', 'Failed to share location.');
    } finally {
      setSharingLocation(false);
    }
  };

  const active = shipments.filter(s => ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status)).length;
  const delivered = shipments.filter(s => s.status === 'DELIVERED').length;
  const failed = shipments.filter(s => s.status === 'FAILED').length;
  const earnings = shipments.filter(s => s.status === 'DELIVERED').reduce((sum, s) => sum + ((s.amount || 0) * 0.1), 0);

  const stats = [
    { label: 'Active', value: String(active), icon: Truck, color: '#f97316' },
    { label: 'Delivered', value: String(delivered), icon: CheckCircle, color: '#22c55e' },
    { label: 'Failed', value: String(failed), icon: AlertCircle, color: '#ef4444' },
    { label: 'Est. Earnings', value: `Rwf ${earnings.toLocaleString()}`, icon: Wallet, color: '#f97316' },
  ];

  const firstName = user?.name?.split(' ')[0] || 'Courier';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuBtn, { backgroundColor: colors.glass }]}>
          <View style={styles.menuIcon}>
            {[0,1,2].map(i => <View key={i} style={[styles.menuLine, { backgroundColor: colors.foreground }]} />)}
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
           <CustomText style={{ fontSize: 12, color: colors.muted }}>Welcome back, {firstName}</CustomText>
        </View>
        <TouchableOpacity
          onPress={handleShareLocation}
          disabled={sharingLocation}
          style={[styles.locationBtn, { backgroundColor: sharingLocation ? 'rgba(34,197,94,0.15)' : colors.glass, borderColor: sharingLocation ? '#22c55e' : colors.border }]}
        >
          {sharingLocation
            ? <ActivityIndicator size="small" color="#22c55e" />
            : <Navigation color={colors.muted} size={18} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.primary} />}
      >
        {/* Stats Grid */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <View key={s.label} style={[styles.statCard, { backgroundColor: `${s.color}15`, borderColor: `${s.color}30` }]}>
                  <View style={styles.statRow}>
                    <CustomText style={[styles.statLabel, { color: colors.muted }]}>{s.label}</CustomText>
                    <Icon color={s.color} size={16} />
                  </View>
                  <CustomText style={[styles.statValue, { color: s.color }]}>{s.value}</CustomText>
                </View>
              );
            })}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <CustomText style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</CustomText>
          <View style={styles.actionsRow}>
            {[
              { label: 'My Shipments', screen: 'CourierShipments', icon: Package },
              { label: 'Earnings', screen: 'CourierEarnings', icon: Wallet },
              { label: 'Profile', screen: 'CourierProfile', icon: MapPin },
            ].map(a => {
              const Icon = a.icon;
              return (
                <TouchableOpacity
                  key={a.label}
                  style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate(a.screen)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
                    <Icon color="#f97316" size={20} />
                  </View>
                  <CustomText style={[styles.actionLabel, { color: colors.foreground }]}>{a.label}</CustomText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recent Shipments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CustomText style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Shipments</CustomText>
            <TouchableOpacity onPress={() => navigation.navigate('CourierShipments')}>
              <CustomText style={{ color: '#f97316', fontSize: 12, fontWeight: '700' }}>View all →</CustomText>
            </TouchableOpacity>
          </View>

          {!loading && shipments.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Package color={colors.muted} size={36} />
              <CustomText style={[styles.emptyTitle, { color: colors.foreground }]}>No shipments yet</CustomText>
              <CustomText style={{ color: colors.muted, fontSize: 13, textAlign: 'center' }}>Shipments assigned to you will appear here</CustomText>
            </View>
          )}

          {shipments.slice(0, 5).map(s => {
            const statusColor = STATUS_COLORS[s.status] || '#94a3b8';
            return (
              <TouchableOpacity 
                key={s.id} 
                onPress={() => navigation.navigate('CourierShipments')}
                style={[styles.shipmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <View style={[styles.shipmentIcon, { backgroundColor: `${statusColor}15` }]}>
                  <Package color={statusColor} size={20} />
                </View>
                
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.shipmentTop}>
                    <CustomText style={[styles.shipmentName, { color: colors.foreground }]}>{s.recipientName}</CustomText>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}35` }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <CustomText style={[styles.statusText, { color: statusColor }]}>{s.status?.replace(/_/g, ' ')}</CustomText>
                    </View>
                  </View>
                  
                  <View style={styles.shipmentAddr}>
                    <MapPin color={colors.muted} size={11} />
                    <CustomText style={[styles.shipmentAddrText, { color: colors.muted }]} numberOfLines={1}>{s.address}</CustomText>
                  </View>
                  
                  <View style={styles.shipmentFooter}>
                    <CustomText style={[styles.shipmentRef, { color: colors.muted }]}>#{s.orderId?.slice(-8).toUpperCase()}</CustomText>
                    <ChevronLeft color={colors.muted} size={14} style={{ transform: [{ rotate: '180deg' }] }} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 14, borderBottomWidth: 1 },
  menuBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuIcon: { gap: 4, width: 18 },
  menuLine: { height: 2, borderRadius: 2, width: '100%' },
  locationBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  loadingBox: { height: 160, justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  statCard: { 
    width: '47%', 
    height: 100,
    borderRadius: 20, 
    borderWidth: 1, 
    padding: 16,
    justifyContent: 'center'
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { fontSize: 22, fontWeight: '900' },
  section: { paddingHorizontal: 16, paddingTop: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionCard: { 
    flex: 1, 
    borderRadius: 20, 
    borderWidth: 1, 
    paddingVertical: 18, 
    paddingHorizontal: 8,
    alignItems: 'center', 
    gap: 10 
  },
  actionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 10, fontWeight: '800', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: 'center', gap: 10, marginBottom: 16 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  shipmentCard: { 
    borderRadius: 18, 
    borderWidth: 1, 
    padding: 12, 
    marginBottom: 10, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  shipmentIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  shipmentTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 8, 
    borderWidth: 1,
    gap: 4
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  shipmentName: { fontSize: 14, fontWeight: '800' },
  shipmentAddr: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  shipmentAddrText: { fontSize: 11, flex: 1 },
  shipmentFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)'
  },
  shipmentRef: { fontSize: 10, fontFamily: 'monospace', opacity: 0.7 },
});
