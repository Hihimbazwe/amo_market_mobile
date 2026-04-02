import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Menu, AlertCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';
import { Colors } from '../../theme/colors';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';

const mockDisputes = [
  { id: 'DSP-001', orderId: 'ORD-1029', reason: 'Item defective', status: 'Ongoing', date: 'Oct 25, 2023' },
];

const BuyerDisputesScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Menu color={Colors.white} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Disputes</CustomText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <CustomText variant="subtitle">Active Cases</CustomText>
          <CustomButton title="Open Case" style={{ height: 40, paddingHorizontal: 16 }} />
        </View>

        {mockDisputes.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertCircle color={Colors.muted} size={48} />
            <CustomText variant="subtitle" style={{ marginTop: 16 }}>No active disputes.</CustomText>
          </View>
        ) : (
          mockDisputes.map((dispute) => (
            <View key={dispute.id} style={styles.card}>
              <View style={styles.cardTop}>
                <CustomText style={styles.idText}>{dispute.id}</CustomText>
                <CustomText style={styles.statusText}>{dispute.status}</CustomText>
              </View>
              <CustomText style={styles.reasonText}>Reason: {dispute.reason}</CustomText>
              <CustomText style={styles.dateText}>Order: {dispute.orderId}  •  {dispute.date}</CustomText>
            </View>
          ))
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
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  idText: { color: Colors.white, fontWeight: 'bold' },
  statusText: { color: '#EF4444', fontWeight: 'bold' },
  reasonText: { color: Colors.white, fontSize: 16, marginBottom: 8 },
  dateText: { color: Colors.muted, fontSize: 12 },
});

export default BuyerDisputesScreen;
