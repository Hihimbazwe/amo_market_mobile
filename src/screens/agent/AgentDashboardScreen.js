import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator, Alert } from 'react-native';
import { Menu, Search, Package, CheckCircle, Wallet, Star, Navigation, RefreshCw, Truck, TrendingUp, ArrowUpRight, ShieldCheck, MapPin } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { AgentDrawerContext } from '../../context/AgentDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { agentService } from '../../api/agentService';

const AgentDashboardScreen = () => {
  const { toggleDrawer } = React.useContext(AgentDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const navigation = useNavigation();
  const firstName = user?.name?.split(' ')[0] || 'Agent';

  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsActive, setGpsActive] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [o, p] = await Promise.all([
        agentService.getOrders(),
        agentService.getProfile()
      ]);
      setOrders(o || []);
      setProfile(p || null);
    } catch (error) {
      console.error('Failed to load agent data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleShareLocation = async () => {
    setGpsActive(true);
    try {
      // In a real app, we'd use Expo Location here. For now, we mock the coordinates.
      // But we call the service which hits the real backend.
      await agentService.updateLocation(-1.9441, 30.0619); // Example Kigali coordinates
      Alert.alert(t('locationSharedTitle'), t('locationUpdatedTracking'));
    } catch (error) {
      Alert.alert(t('error'), t('failedToShareLocation'));
    } finally {
      setGpsActive(false);
    }
  };

  const activeOrders = orders.filter((o) => ["PENDING", "PAID", "SHIPPED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(o.status)).length;
  const completedOrders = orders.filter((o) => o.status === "COMPLETED" || o.status === "DELIVERED").length;
  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  const stats = [
    { label: t("activeOrdersAgent"), value: String(activeOrders), icon: Package, color: "#F97316" },
    { label: t("completed"), value: String(completedOrders), icon: CheckCircle, color: "#10B981" },
    { label: t("totalRevenue"), value: `Rwf ${totalRevenue.toLocaleString()}`, icon: Wallet, color: "#3B82F6" },
    { label: t("rating"), value: profile?.rating ? `${profile.rating.toFixed(1)}/5` : "—", icon: Star, color: "#EAB308" },
  ];

  const formatPrice = (price) => 'Rwf ' + (price || 0).toLocaleString();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">{t('agentDashboard')}</CustomText>
        <TouchableOpacity onPress={loadData} style={[styles.refreshButton, { backgroundColor: colors.glass }]}>
          <RefreshCw color={colors.primary} size={20} className={loading ? "animate-spin" : ""} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View flex={1}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CustomText variant="h2">{t('agentWelcome', { name: firstName })}</CustomText>
              {profile?.verified && <ShieldCheck color={colors.primary} size={18} />}
            </View>
            <CustomText style={{ color: colors.muted, marginTop: 4 }}>{t('agentReadyDeliveries')}</CustomText>
          </View>
          <TouchableOpacity 
            onPress={handleShareLocation}
            disabled={gpsActive}
            style={[styles.locationBtn, { backgroundColor: gpsActive ? 'rgba(16, 185, 129, 0.1)' : colors.glass, borderColor: gpsActive ? '#10B981' : colors.border }]}
          >
            <Navigation color={gpsActive ? "#10B981" : colors.muted} size={18} />
            <CustomText style={{ color: gpsActive ? "#10B981" : colors.muted, fontSize: 12, fontWeight: 'bold' }}>
              {gpsActive ? t('sharing') : t('gps')}
            </CustomText>
          </TouchableOpacity>
        </View>

        {loading && orders.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {stats.map((stat, i) => (
                <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.iconBox, { backgroundColor: `${stat.color}15` }]}>
                    <stat.icon color={stat.color} size={20} />
                  </View>
                  <CustomText style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</CustomText>
                  <CustomText style={styles.statLabel}>{stat.label.toUpperCase()}</CustomText>
                </View>
              ))}
            </View>

            {/* Verification Banner */}
            {profile && !profile.verified && (
              <TouchableOpacity 
                style={[styles.verificationBanner, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                onPress={() => navigation.navigate('AgentProfile')}
              >
                <View style={[styles.bannerIcon, { backgroundColor: `${colors.primary}25` }]}>
                  <ShieldCheck size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomText style={{ color: colors.primary, fontWeight: 'bold' }}>{t('getVerified')}</CustomText>
                  <CustomText style={{ color: colors.muted, fontSize: 11 }}>{t('getVerifiedDesc')}</CustomText>
                </View>
                <ArrowUpRight color={colors.primary} size={18} />
              </TouchableOpacity>
            )}

            {/* Quick Actions */}
            <View style={styles.quickActions}>
               <TouchableOpacity 
                 style={[styles.qAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                 onPress={() => navigation.navigate('DeliveryRequests')}
               >
                 <Truck color="#F97316" size={24} />
                 <CustomText style={[styles.qActionText, { color: colors.foreground }]}>{t('requests')}</CustomText>
               </TouchableOpacity>
               <TouchableOpacity 
                 style={[styles.qAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                 onPress={() => navigation.navigate('AgentOrders')}
               >
                 <Package color="#3B82F6" size={24} />
                 <CustomText style={[styles.qActionText, { color: colors.foreground }]}>{t('myDeliveries')}</CustomText>
               </TouchableOpacity>
               <TouchableOpacity 
                 style={[styles.qAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                 onPress={() => navigation.navigate('AgentCoverage')}
               >
                 <MapPin color="#10B981" size={24} />
                 <CustomText style={[styles.qActionText, { color: colors.foreground }]}>{t('coverage')}</CustomText>
               </TouchableOpacity>
            </View>

            {/* Recent Orders */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <CustomText style={styles.sectionTitle}>{t('recentDeliveries')}</CustomText>
                <TouchableOpacity onPress={() => navigation.navigate('AgentOrders')}>
                  <CustomText style={[styles.seeAllText, { color: colors.primary }]}>{t('viewAll')}</CustomText>
                </TouchableOpacity>
              </View>
              
              {orders.length === 0 ? (
                <View style={[styles.emptyRecent, { backgroundColor: colors.glass }]}>
                  <Package color={colors.muted} size={32} />
                  <CustomText style={{ color: colors.muted, marginTop: 12, fontSize: 13 }}>{t('noRecentDeliveries')}</CustomText>
                </View>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <TouchableOpacity 
                    key={order.id} 
                    style={[styles.orderRow, { borderBottomColor: colors.border }]}
                    onPress={() => navigation.navigate('AgentOrders')}
                  >
                    <View style={[styles.orderIconBox, { backgroundColor: colors.glass }]}>
                      <Truck color={colors.muted} size={18} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <CustomText style={{ fontWeight: 'bold', color: colors.foreground }} numberOfLines={1}>
                        {order.items?.[0]?.product?.title || 'Delivery Order'}
                      </CustomText>
                      <CustomText style={{ color: colors.muted, fontSize: 11 }}>{order.recipientName}</CustomText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <CustomText style={{ fontWeight: 'bold', color: colors.foreground }}>{formatPrice(order.totalAmount)}</CustomText>
                      <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}15` }]}>
                        <CustomText style={{ color: colors.primary, fontSize: 9, fontWeight: 'bold' }}>{order.status}</CustomText>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderBottomWidth: 1, justifyContent: 'space-between'
  },
  menuButton: { padding: 8, borderRadius: 12 },
  refreshButton: { padding: 8, borderRadius: 12 },
  content: { padding: 16 },
  welcomeSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  locationBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '48%',
    borderRadius: 16, padding: 16, borderWidth: 1,
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5, color: '#94a3b8' },
  verificationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1,
  },
  bannerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  qAction: { 
    flex: 1, alignItems: 'center', gap: 8, padding: 16, 
    borderRadius: 16, borderWidth: 1 
  },
  qActionText: { fontSize: 12, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  seeAllText: { fontSize: 12, fontWeight: 'bold' },
  emptyRecent: {
    padding: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)'
  },
  orderRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1
  },
  orderIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 }
});

export default AgentDashboardScreen;
