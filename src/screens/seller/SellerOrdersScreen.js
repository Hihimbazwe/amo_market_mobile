import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Menu, Search, ShoppingBag, Filter, ChevronRight, User, Truck, CheckCircle2, Clock, Smartphone } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';


// Mock orders removed - now fetching from backend

const statusColors = {
  PENDING: { bg: 'rgba(255, 255, 255, 0.05)', text: Colors.muted },
  PROCESSING: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
  PAID: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' },
  SHIPPED: { bg: 'rgba(249, 115, 22, 0.1)', text: '#F97316' },
  DELIVERED: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
  COMPLETED: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
  CANCELLED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' },
};

const SellerOrdersScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
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
        <CustomText variant="h2">Orders</CustomText>
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
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ShoppingBag color={colors.isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} size={64} />
              <CustomText style={styles.emptyText}>No orders found.</CustomText>
            </View>
          }
        />
      )}
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
  filterSection: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  filterTabActive: { backgroundColor: '#F97316' },
  filterTabText: { color: Colors.muted, fontSize: 12, fontWeight: 'bold' },
  filterTabTextActive: { color: Colors.white },
  listContent: { padding: 16, paddingBottom: 100 },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, padding: 16, borderHorizontalWidth: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  orderId: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  orderDate: { color: Colors.muted, fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  orderBody: { gap: 8, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  orderInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderInfoText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderAmount: { color: Colors.white, fontSize: 16, fontWeight: '900' },
  viewDetails: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDetailsText: { color: '#F97316', fontSize: 11, fontWeight: '900' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', height: 300 },
  emptyText: { color: Colors.muted, marginTop: 16, fontSize: 14, fontWeight: '600' }
});

export default SellerOrdersScreen;
