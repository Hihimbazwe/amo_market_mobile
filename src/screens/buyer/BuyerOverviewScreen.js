import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Menu, Search, Zap, ShoppingBag, Wallet, ShieldAlert, Bell, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useAuth } from '../../context/AuthContext';

const mockOrders = [
  { id: 'ORD-1029', title: 'Wireless Headphones', amount: 'Rwf 45,000', status: 'DELIVERED' },
  { id: 'ORD-1030', title: 'Office Chair', amount: 'Rwf 15,500', status: 'PROCESSING' },
];

const BuyerOverviewScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Menu color={Colors.white} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Dashboard</CustomText>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Futuristic Search Bar */}
        <View style={styles.searchContainer}>
          <Search color="#F97316" size={20} style={styles.searchIcon} />
          <TextInput 
            placeholder="Search products, orders..." 
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.searchInput}
          />
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <CustomText variant="h2">Buyer Dashboard</CustomText>
            <CustomText style={{ color: Colors.muted, marginTop: 4 }}>Welcome back, {firstName}!</CustomText>
          </View>
          <TouchableOpacity style={styles.shopBtn}>
            <Zap color={Colors.white} size={16} />
            <CustomText style={styles.shopBtnText}>Shop</CustomText>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <ShoppingBag color="#3B82F6" size={20} />
            </View>
            <CustomText style={styles.statValue}>2</CustomText>
            <CustomText style={styles.statLabel}>ACTIVE ORDERS</CustomText>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Wallet color="#10B981" size={20} />
            </View>
            <CustomText style={styles.statValue}>Rwf 60,500</CustomText>
            <CustomText style={styles.statLabel}>TOTAL SPENT</CustomText>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
              <ShieldAlert color="#F97316" size={20} />
            </View>
            <CustomText style={styles.statValue}>0</CustomText>
            <CustomText style={styles.statLabel}>DISPUTES</CustomText>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
              <Bell color="#A855F7" size={20} />
            </View>
            <CustomText style={styles.statValue}>3</CustomText>
            <CustomText style={styles.statLabel}>NOTIFICATIONS</CustomText>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CustomText style={styles.sectionTitle}>Recent Orders</CustomText>
            <TouchableOpacity><CustomText style={styles.seeAllText}>VIEW ALL</CustomText></TouchableOpacity>
          </View>
          {mockOrders.map((order) => (
            <View key={order.id} style={styles.orderRow}>
              <View>
                <CustomText style={styles.orderId}>{order.id}</CustomText>
                <CustomText style={styles.orderTitle}>{order.title}</CustomText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <CustomText style={styles.orderAmount}>{order.amount}</CustomText>
                <CustomText style={styles.orderStatus}>{order.status}</CustomText>
              </View>
            </View>
          ))}
        </View>

        {/* Promo Cards */}
        <View style={styles.promoCard}>
          <CustomText style={styles.promoSub}>PREMIUM ACCOUNT</CustomText>
          <CustomText style={styles.promoTitle}>Unlock 5% Cashback</CustomText>
          <CustomText style={styles.promoDesc}>Upgrade to AMO Plus to get instant cashback.</CustomText>
        </View>

        <View style={[styles.promoCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
            <Clock color="#F97316" size={16} />
            <CustomText style={styles.promoTitle}>Buyer Protection</CustomText>
          </View>
          <CustomText style={styles.promoDesc}>Always communicate and pay through AMO to ensure 72h protection.</CustomText>
        </View>

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
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F97316', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  shopBtnText: { color: Colors.white, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '48%', backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { color: Colors.white, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  statLabel: { color: Colors.muted, fontSize: 10, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  seeAllText: { color: '#F97316', fontSize: 12, fontWeight: 'bold' },
  orderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  orderId: { color: Colors.white, fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  orderTitle: { color: Colors.muted, fontSize: 12 },
  orderAmount: { color: Colors.white, fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  orderStatus: { color: '#F97316', fontSize: 10, fontWeight: 'bold' },
  promoCard: {
    backgroundColor: '#0284c7', borderRadius: 16, padding: 20, marginBottom: 16,
  },
  promoSub: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  promoTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  promoDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 18 },
});

export default BuyerOverviewScreen;
