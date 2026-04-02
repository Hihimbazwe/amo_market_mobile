import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Menu, Package, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';

const mockOrders = [
  { id: 'ORD-1029', date: '2023-11-20', total: 'RWF 45,000', status: 'Delivered' },
  { id: 'ORD-1030', date: '2023-11-22', total: 'RWF 15,500', status: 'Processing' },
  { id: 'ORD-1031', date: '2023-11-25', total: 'RWF 85,000', status: 'Shipped' },
];

const getStatusColor = (status) => {
  switch (status) {
    case 'Delivered': return '#10B981'; // green
    case 'Processing': return '#F59E0B'; // yellow
    case 'Shipped': return '#3B82F6'; // blue
    default: return Colors.muted;
  }
};

const filterTabs = ['All', 'Processing', 'Shipped', 'Delivered'];

const BuyerOrdersScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const [activeTab, setActiveTab] = useState('All');

  const filteredOrders = mockOrders.filter(
    (order) => activeTab === 'All' || order.status === activeTab
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Menu color={Colors.white} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">My Orders</CustomText>
      </View>
      
      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filterTabs.map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.filterTab, activeTab === tab && styles.filterTabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <CustomText style={[styles.filterTabText, activeTab === tab && styles.filterTabTextActive]}>
                {tab}
              </CustomText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Package color={Colors.muted} size={48} />
            <CustomText variant="subtitle" style={{ marginTop: 16 }}>No '{activeTab}' orders found.</CustomText>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <TouchableOpacity key={order.id} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <View>
                  <CustomText style={styles.orderId}>{order.id}</CustomText>
                  <CustomText style={styles.orderDate}>{order.date}</CustomText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                  <CustomText style={[styles.orderStatus, { color: getStatusColor(order.status) }]}>
                    {order.status}
                  </CustomText>
                </View>
              </View>
              <View style={styles.orderBottom}>
                <CustomText style={styles.orderTotal}>{order.total}</CustomText>
                <ChevronRight color={Colors.muted} size={20} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  filterTabActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)', // brand orange translucent
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.5)',
  },
  filterTabText: {
    color: Colors.muted,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#F97316', // brand primary
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
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  orderDate: {
    color: Colors.muted,
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
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  orderTotal: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default BuyerOrdersScreen;
