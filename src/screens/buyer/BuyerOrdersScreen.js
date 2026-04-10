import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loader2, Menu, Package, ChevronRight, Navigation as TrackIcon, AlertTriangle } from 'lucide-react-native';
import CustomText from '../../components/CustomText';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../api/orderService';
import NotificationIcon from '../../components/NotificationIcon';
const getStatusColor = (status) => {
  const s = status?.toUpperCase();
  switch (s) {
    case 'COMPLETED':
    case 'DELIVERED': return '#10B981'; // green
    case 'PROCESSING':
    case 'PENDING': return '#F59E0B'; // yellow
    case 'SHIPPED': return '#3B82F6'; // blue
    case 'CANCELLED': return '#EF4444'; // red
    default: return '#94a3b8';
  }
};

const filterTabs = ['All', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const BuyerOrdersScreen = ({ navigation }) => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const { colors } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.id) return;
      try {
        const data = await orderService.getOrders(user.id);
        setOrders(data);
      } catch (error) {
        console.error('Fetch orders error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user?.id]);

  const filteredOrders = orders.filter(
    (order) => activeTab === 'All' || order.status?.toUpperCase() === activeTab.toUpperCase()
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>My Orders</CustomText>
        <NotificationIcon />
      </View>
      
      {/* Filters */}
      <View style={[styles.filterContainer, { borderBottomColor: colors.glassBorder }]}>
        <View style={styles.filterScroll}>
          {filterTabs.map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[
                styles.filterTab, 
                { backgroundColor: colors.glass },
                activeTab === tab && { backgroundColor: 'rgba(249, 115, 22, 0.1)', borderColor: colors.primary, borderWidth: 1 }
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <CustomText style={[
                styles.filterTabText, 
                { color: colors.muted },
                activeTab === tab && { color: colors.primary }
              ]}>
                {tab}
              </CustomText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.emptyState}>
             <Loader2 color={colors.primary} size={32} className="animate-spin" />
             <CustomText style={{ marginTop: 12 }}>Loading orders...</CustomText>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Package color={colors.muted} size={48} />
            <CustomText variant="subtitle" style={{ marginTop: 16 }}>No '{activeTab}' orders found.</CustomText>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const isEligible = order.status === 'DELIVERED' || order.status === 'COMPLETED';
            return (
              <TouchableOpacity key={order.id} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                <View style={styles.orderTop}>
                  <View>
                    <CustomText style={[styles.orderId, { color: colors.foreground }]}>#{order.id.slice(-8).toUpperCase()}</CustomText>
                    <CustomText style={[styles.orderDate, { color: colors.muted }]}>{new Date(order.createdAt).toLocaleDateString()}</CustomText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <CustomText style={[styles.orderStatus, { color: getStatusColor(order.status) }]}>
                      {order.status}
                    </CustomText>
                  </View>
                </View>
                <View style={[styles.orderBottom, { borderTopColor: colors.glassBorder }]}>
                  <CustomText style={[styles.orderTotal, { color: colors.foreground }]}>Rwf {order.total?.toLocaleString()}</CustomText>
                  
                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                      style={[styles.smallBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                      onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
                    >
                      <TrackIcon size={12} color={colors.primary} />
                      <CustomText style={[styles.btnText, { color: colors.primary }]}>Track</CustomText>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.smallBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                      onPress={() => navigation.navigate('Disputes', { orderId: order.id })}
                    >
                      <AlertTriangle size={12} color={colors.error || '#EF4444'} />
                      <CustomText style={[styles.btnText, { color: colors.error || '#EF4444' }]}>Report</CustomText>
                    </TouchableOpacity>

                    {isEligible && (
                        <TouchableOpacity 
                        style={[styles.smallBtn, { backgroundColor: colors.glass, borderColor: colors.primary }]}
                        onPress={() => navigation.navigate('Replacements', { initiateReplacementForOrderId: order.id })}
                        >
                        <CustomText style={[styles.btnText, { color: colors.primary }]}>Replace</CustomText>
                        </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  menuButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
  },
  filterContainer: {
    borderBottomWidth: 1,
  },
  filterScroll: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  filterTabText: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  content: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  orderCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatus: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  orderTotal: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  btnText: {
    fontSize: 11,
    fontWeight: 'bold',
  }
});

export default BuyerOrdersScreen;
