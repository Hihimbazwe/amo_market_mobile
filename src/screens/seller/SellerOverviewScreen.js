import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator } from 'react-native';
import { Menu, Search, Package, ShoppingBag, Wallet, BarChart2, Zap, ArrowUpRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

import { sellerService } from '../../api/sellerService';
import { productService } from '../../api/productService';


const SellerOverviewScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const navigation = useNavigation();
  const firstName = user?.name?.split(' ')[0] || 'Seller';

  const [data, setData] = React.useState({
    revenue: 0,
    activeProducts: 0,
    pendingShipments: 0,
    walletBalance: 0,
    recentOrders: []
  });
  const [loading, setLoading] = React.useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadDashboard = async () => {
        if (!user?.id) return;
        setLoading(true); // Ensure loading state shows on refresh if preferred, or just fetch silently
        try {
          const [analytics, products, wallet, orders] = await Promise.all([
            sellerService.getAnalytics(user.id, '7D'),
            productService.getMyProducts(user.id),
            sellerService.getWallet(user.id),
            sellerService.getOrders(user.id)
          ]);

          setData({
            revenue: analytics.revenue || 0,
            activeProducts: products.filter(p => p.published).length,
            pendingShipments: orders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').length,
            walletBalance: wallet.balance || 0,
            recentOrders: orders.slice(0, 5)
          });
        } catch (err) {
          console.error('Failed to load dashboard:', err);
        } finally {
          setLoading(false);
        }
      };
      loadDashboard();
    }, [user])
  );

  const formatPrice = (price) => 'Rwf ' + (price || 0).toLocaleString();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Seller Dashboard</CustomText>
      </View>
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Futuristic Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.glass }]}>
          <Search color={colors.primary} size={20} style={styles.searchIcon} />
          <TextInput 
            placeholder="Search products, orders, analytics..." 
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <CustomText variant="h2">Store Overview</CustomText>
            <CustomText style={{ color: Colors.muted, marginTop: 4 }}>Hello, {firstName}! How's business?</CustomText>
          </View>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => navigation.navigate('SellerProducts')}
          >
            <Package color={Colors.white} size={16} />
            <CustomText style={styles.actionBtnText}>Add</CustomText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <>
            {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
              <Wallet color="#F97316" size={20} />
            </View>
            <CustomText style={[styles.statValue, { color: colors.foreground }]}>{formatPrice(data.revenue)}</CustomText>
            <CustomText style={styles.statLabel}>TOTAL REVENUE</CustomText>
            <View style={styles.trendBadge}>
              <ArrowUpRight color="#10B981" size={10} />
              <CustomText style={styles.trendText}>+12%</CustomText>
            </View>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Package color="#3B82F6" size={20} />
            </View>
            <CustomText style={[styles.statValue, { color: colors.foreground }]}>{data.activeProducts}</CustomText>
            <CustomText style={styles.statLabel}>ACTIVE PRODUCTS</CustomText>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
              <ShoppingBag color="#A855F7" size={20} />
            </View>
            <CustomText style={[styles.statValue, { color: colors.foreground }]}>{data.pendingShipments}</CustomText>
            <CustomText style={styles.statLabel}>PENDING SHIPMENTS</CustomText>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Wallet color="#10B981" size={20} />
            </View>
            <CustomText style={[styles.statValue, { color: colors.foreground }]}>{formatPrice(data.walletBalance)}</CustomText>
            <CustomText style={styles.statLabel}>WALLET BALANCE</CustomText>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CustomText style={styles.sectionTitle}>Recent Orders</CustomText>
            <TouchableOpacity onPress={() => navigation.navigate('SellerOrders')}>
              <CustomText style={styles.seeAllText}>VIEW ALL</CustomText>
            </TouchableOpacity>
          </View>
          {data.recentOrders.length === 0 ? (
            <CustomText style={{ color: Colors.muted, fontStyle: 'italic', paddingVertical: 10 }}>No recent orders.</CustomText>
          ) : (
            data.recentOrders.map((order) => {
              const itemTitle = order.items && order.items.length > 0 && order.items[0].product ? order.items[0].product.title : 'Order Items';
              const orderTotal = formatPrice(order.payment?.amount || 0);
              return (
                <View key={order.id} style={[styles.orderRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.productIcon, { backgroundColor: colors.glass }]}>
                    <Package color={colors.muted} size={20} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <CustomText style={[styles.orderId, { color: colors.foreground }]}>#{order.id.slice(-6).toUpperCase()}</CustomText>
                    <CustomText style={styles.orderTitle} numberOfLines={1}>{itemTitle}</CustomText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <CustomText style={[styles.orderAmount, { color: colors.foreground }]}>{orderTotal}</CustomText>
                    <View style={[styles.statusBadge, { backgroundColor: order.status === 'PAID' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(249, 115, 22, 0.1)' }]}>
                      <CustomText style={[styles.statusText, { color: order.status === 'PAID' ? '#3B82F6' : '#F97316' }]}>{order.status}</CustomText>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Upgrade Card */}
        <TouchableOpacity style={styles.upgradeCard} onPress={() => navigation.navigate('SellerMembership')}>
          <View style={styles.upgradeContent}>
            <View style={styles.upgradeIcon}>
              <Zap color={Colors.white} size={20} fill={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <CustomText style={styles.upgradeTitle}>Upgrade to Elite Seller</CustomText>
              <CustomText style={styles.upgradeDesc}>Get lower fees, priority support and featured listings.</CustomText>
            </View>
            <ArrowUpRight color={Colors.white} size={20} />
          </View>
        </TouchableOpacity>
        </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  content: { padding: 16 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, paddingHorizontal: 16, marginBottom: 24,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, color: Colors.white, height: 50, fontSize: 16 },
  welcomeSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F97316', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  actionBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '48%', backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    position: 'relative', overflow: 'hidden'
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { color: Colors.white, fontSize: 18, fontWeight: '900', marginBottom: 4 },
  statLabel: { color: Colors.muted, fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  trendBadge: {
    position: 'absolute', top: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6
  },
  trendText: { color: '#10B981', fontSize: 10, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  seeAllText: { color: '#F97316', fontSize: 12, fontWeight: 'bold' },
  orderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  productIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center'
  },
  orderId: { color: Colors.white, fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  orderTitle: { color: Colors.muted, fontSize: 11 },
  orderAmount: { color: Colors.white, fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: 'bold' },
  upgradeCard: {
    backgroundColor: '#F97316', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  upgradeContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upgradeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  upgradeTitle: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  upgradeDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
});

export default SellerOverviewScreen;
