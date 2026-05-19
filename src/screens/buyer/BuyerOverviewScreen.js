import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Menu, Search, Zap, ShoppingBag, Wallet, ShieldAlert, Bell, Clock, Store } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { orderService } from '../../api/orderService';
import { disputeService } from '../../api/disputeService';
import { Loader2, Package } from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';
import { Alert } from 'react-native';


const mockOrders = [
  { id: 'ORD-1029', title: 'Wireless Headphones', amount: 'Rwf 45,000', status: 'DELIVERED' },
  { id: 'ORD-1030', title: 'Office Chair', amount: 'Rwf 15,500', status: 'PROCESSING' },
];

const BuyerOverviewScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation();
  const firstName = user?.name?.split(' ')[0] || 'there';
  
  const [orders, setOrders] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingPickupOrder, setUpcomingPickupOrder] = useState(null);
  const [hoursRemaining, setHoursRemaining] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        const [ordersData, disputesData] = await Promise.all([
          orderService.getOrders(user.id),
          disputeService.getDisputes(user.id)
        ]);
        setOrders(ordersData);
        setDisputes(disputesData);
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const parsePickupSlot = (slotStr) => {
    if (!slotStr) return null;
    try {
      const parts = slotStr.split(' at ');
      if (parts.length !== 2) return null;
      const now = new Date();
      // Try to parse with the current year
      const dateStr = `${parts[0]}, ${now.getFullYear()} ${parts[1]}`;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d;
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
          
          // Show if within 4 hours upcoming OR up to 2 hours LATE
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">{t('dashboard')}</CustomText>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Futuristic Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.glass }]}>
          <Search color={colors.primary} size={20} style={styles.searchIcon} />
          <TextInput 
            placeholder={t('searchPlaceholder')} 
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>

        {/* Pickup Reminder Banner */}
        {upcomingPickupOrder && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Orders')}
            style={[styles.reminderBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
          >
            <View style={[styles.reminderIconBox, { backgroundColor: colors.primary + '20' }]}>
              <Store color={colors.primary} size={24} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <CustomText style={{ color: colors.primary, fontWeight: '900', fontSize: 13, marginBottom: 2 }}>
                {hoursRemaining < 0 ? "PICKUP TIME PASSED" : "UPCOMING PICKUP"}
              </CustomText>
              <CustomText style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
                Order #{upcomingPickupOrder.id.slice(-8).toUpperCase()} is ready for collection ({upcomingPickupOrder.pickupSlot}).
              </CustomText>
            </View>
          </TouchableOpacity>
        )}

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <CustomText variant="h2">{t('buyerDashboard')}</CustomText>
            <CustomText style={{ color: colors.muted, marginTop: 4 }}>{t('welcomeBack')}, {firstName}!</CustomText>
          </View>
          <TouchableOpacity
            style={[styles.shopBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Zap color={colors.white} size={16} />
            <CustomText style={styles.shopBtnText}>{t('shopNow')}</CustomText>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <ShoppingBag color="#3B82F6" size={20} />
            </View>
            <CustomText style={[styles.statValue, { color: colors.foreground }]}>{orders.length}</CustomText>
            <CustomText style={[styles.statLabel, { color: colors.muted }]}>{t('activeOrders')}</CustomText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Wallet color="#10B981" size={20} />
            </View>
            <CustomText style={[styles.statValue, { color: colors.foreground }]}>
              Rwf {orders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()}
            </CustomText>
            <CustomText style={[styles.statLabel, { color: colors.muted }]}>{t('totalSpent')}</CustomText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
              <ShieldAlert color="#F97316" size={20} />
            </View>
            <CustomText style={[styles.statValue, { color: colors.foreground }]}>{disputes.length}</CustomText>
            <CustomText style={[styles.statLabel, { color: colors.muted }]}>{t('dispute').toUpperCase()}</CustomText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
              <Bell color="#A855F7" size={20} />
            </View>
            <CustomText style={[styles.statValue, { color: colors.foreground }]}>0</CustomText>
            <CustomText style={[styles.statLabel, { color: colors.muted }]}>{t('notification').toUpperCase()}</CustomText>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CustomText style={[styles.sectionTitle, { color: colors.foreground }]}>{t('recentOrders')}</CustomText>
            <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
              <CustomText style={[styles.seeAllText, { color: colors.primary }]}>{t('viewAll')}</CustomText>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
               <Loader2 color={colors.primary} size={24} className="animate-spin" />
            </View>
          ) : orders.length === 0 ? (
            <CustomText style={{ color: colors.muted, textAlign: 'center', marginVertical: 20 }}>{t('noRecentOrders')}</CustomText>
          ) : (
            orders.slice(0, 3).map((order) => (
              <View key={order.id} style={[styles.orderRow, { borderBottomColor: colors.glassBorder }]}>
                <View>
                  <CustomText style={[styles.orderId, { color: colors.foreground }]}>#{order.id.slice(-6).toUpperCase()}</CustomText>
                  <CustomText style={[styles.orderTitle, { color: colors.muted }]}>{order.items?.[0]?.product?.title || 'Order Item'}</CustomText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <CustomText style={[styles.orderAmount, { color: colors.foreground }]}>Rwf {order.total?.toLocaleString()}</CustomText>
                  <CustomText style={[styles.orderStatus, { color: colors.primary }]}>{order.status}</CustomText>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Promo Cards */}
        <View style={[styles.promoCard, { backgroundColor: colors.secondary }]}>
          <CustomText style={styles.promoSub}>{t('premiumAccount')}</CustomText>
          <CustomText style={[styles.promoTitle, { color: colors.white }]}>{t('unlockCashback')}</CustomText>
          <CustomText style={styles.promoDesc}>{t('upgradeAmoPlus')}</CustomText>
        </View>

        <View style={[styles.promoCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
            <Clock color={colors.primary} size={16} />
            <CustomText style={[styles.promoTitle, { color: colors.foreground }]}>{t('buyerProtection')}</CustomText>
          </View>
          <CustomText style={[styles.promoDesc, { color: colors.muted }]}>{t('protectionDesc')}</CustomText>
        </View>

      </ScrollView>
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
  content: { padding: 16 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 16, marginBottom: 24,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: 50, fontSize: 16 },
  welcomeSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  shopBtnText: { color: '#ffffff', fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '48%',
    borderRadius: 16, padding: 16, borderWidth: 1,
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 10, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  seeAllText: { fontSize: 12, fontWeight: 'bold' },
  orderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1,
  },
  orderId: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  orderTitle: { fontSize: 12 },
  orderAmount: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  orderStatus: { fontSize: 10, fontWeight: 'bold' },
  promoCard: {
    borderRadius: 16, padding: 20, marginBottom: 16,
  },
  promoSub: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  promoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  promoDesc: { fontSize: 12, lineHeight: 18 },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    borderStyle: 'dashed',
  },
  reminderIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BuyerOverviewScreen;
