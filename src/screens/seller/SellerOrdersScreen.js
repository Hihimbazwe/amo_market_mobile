import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Menu, Search, ShoppingBag, ChevronRight, User, RefreshCcw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';
import NotificationIcon from '../../components/NotificationIcon';


// Mock orders removed - now fetching from backend

// Status mapping moved inside component for dynamic theme support

const SellerOrdersScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const navigation = useNavigation();
  const [filter, setFilter] = useState('ALL');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const statusColors = {
    PENDING: { bg: colors.glass, text: colors.muted },
    PROCESSING: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
    PAID: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
    SHIPPED: { bg: 'rgba(249, 115, 22, 0.1)', text: colors.primary },
    DELIVERED: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
    COMPLETED: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
    CANCELLED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' },
  };

  const fetchOrders = async () => {
    if (!user?.id) return;
    try {
      const data = await sellerService.getOrders(user.id);
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchOrders();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filteredOrders = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  const formatPrice = (val) => 'Rwf ' + (val || 0).toLocaleString();

  const renderOrderItem = ({ item }) => {
    const orderTitle = item.items && item.items.length > 0 && item.items[0].product ? item.items[0].product.title : 'Order Items';
    const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    return (
      <TouchableOpacity style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.orderHeader}>
          <View>
            <CustomText style={[styles.orderId, { color: colors.foreground }]}>#{item.id.slice(-8).toUpperCase()}</CustomText>
            <CustomText style={styles.orderDate}>{dateStr}</CustomText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status]?.bg || colors.glass }]}>
            <CustomText style={[styles.statusText, { color: statusColors[item.status]?.text || colors.muted }]}>
              {item.status}
            </CustomText>
          </View>
        </View>
        
        <View style={[styles.orderBody, { borderBottomColor: colors.border }]}>
          <View style={styles.orderInfoRow}>
            <User color={colors.muted} size={14} />
            <CustomText style={styles.orderInfoText}>{item.buyer?.name || 'Buyer'}</CustomText>
          </View>
          <View style={styles.orderInfoRow}>
            <ShoppingBag color={colors.muted} size={14} />
            <CustomText style={styles.orderInfoText}>{item.items.length} item{item.items.length > 1 ? 's' : ''}: {orderTitle}</CustomText>
          </View>
        </View>
        
        <View style={styles.orderFooter}>
          <CustomText style={[styles.orderAmount, { color: colors.foreground }]}>{formatPrice(item.payment?.amount || 0)}</CustomText>
          <View style={styles.viewDetails}>
            <CustomText style={styles.viewDetailsText}>DETAILS</CustomText>
            <ChevronRight color={colors.primary} size={14} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>Orders</CustomText>
        <NotificationIcon />
      </View>
      
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['ALL', 'PENDING', 'PAID', 'SHIPPED', 'DELIVERED'].map((f) => (
            <TouchableOpacity 
              key={f} 
              onPress={() => setFilter(f)}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
            >
              <CustomText style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f}
              </CustomText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ShoppingBag color={colors.isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} size={64} />
              <CustomText style={styles.emptyText}>No orders found.</CustomText>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              style={[styles.replacementsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('SellerReplacements')}
              activeOpacity={0.8}
            >
              <View style={[styles.replacementsIcon, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
                <RefreshCcw color="#F97316" size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <CustomText style={[styles.replacementsTitle, { color: colors.foreground }]}>Replacements</CustomText>
                <CustomText style={[styles.replacementsSub, { color: colors.muted }]}>View and manage replacement requests</CustomText>
              </View>
              <ChevronRight color={colors.muted} size={18} />
            </TouchableOpacity>
          }
        />
      )}
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
  filterSection: { paddingVertical: 12, borderBottomWidth: 1 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  filterTabActive: { backgroundColor: '#F97316' },
  filterTabText: { fontSize: 12, fontWeight: 'bold' },
  filterTabTextActive: { color: 'white' },
  listContent: { padding: 16, paddingBottom: 100 },
  orderCard: {
    borderRadius: 16, padding: 16, borderHorizontalWidth: 0, borderWidth: 1,
    marginBottom: 16
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  orderId: { fontSize: 16, fontWeight: 'bold' },
  orderDate: { fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  orderBody: { gap: 8, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1 },
  orderInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderInfoText: { fontSize: 13 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderAmount: { fontSize: 16, fontWeight: '900' },
  viewDetails: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDetailsText: { fontSize: 11, fontWeight: '900' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', height: 300 },
  emptyText: { marginTop: 16, fontSize: 14, fontWeight: '600' },
  replacementsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 16, marginTop: 8, marginHorizontal: 0, borderWidth: 1,
  },
  replacementsIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  replacementsTitle: { fontSize: 14, fontWeight: '700' },
  replacementsSub: { fontSize: 11, marginTop: 2 },
});

export default SellerOrdersScreen;
