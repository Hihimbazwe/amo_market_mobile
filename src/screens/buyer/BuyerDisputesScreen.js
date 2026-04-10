import React, { useEffect, useState, useContext } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Menu, AlertCircle, Loader2 } from 'lucide-react-native';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { disputeService } from '../../api/disputeService';
import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';
import NotificationIcon from '../../components/NotificationIcon';
import NewDisputeModal from '../../components/modals/NewDisputeModal';

const BuyerDisputesScreen = () => {
  const { toggleDrawer } = useContext(DrawerContext);
  const { colors } = useTheme();
  const route = useRoute();
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    if (route.params?.orderId) {
      setSelectedOrderId(route.params.orderId);
      setIsModalVisible(true);
    }
  }, [route.params?.orderId]);

  const fetchDisputes = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await disputeService.getDisputes(user.id);
      setDisputes(data);
    } catch (error) {
      console.error('Fetch disputes error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [user?.id]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>Disputes</CustomText>
        <NotificationIcon />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <CustomText variant="subtitle" style={{ color: colors.muted }}>Active Cases</CustomText>
          <CustomButton title="Open Case" style={{ paddingHorizontal: 16 }} onPress={() => setIsModalVisible(true)} />
        </View>

        {loading ? (
          <View style={styles.emptyState}>
             <Loader2 color={colors.primary} size={32} className="animate-spin" />
             <CustomText style={{ marginTop: 12 }}>Loading disputes...</CustomText>
          </View>
        ) : disputes.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertCircle color={colors.muted} size={48} />
            <CustomText variant="subtitle" style={{ marginTop: 16 }}>No active disputes.</CustomText>
          </View>
        ) : (
          disputes.map((dispute) => (
            <View key={dispute.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.error + '40' }]}>
              <View style={styles.cardTop}>
                <CustomText style={[styles.idText, { color: colors.foreground }]}>#{dispute.id.slice(-8).toUpperCase()}</CustomText>
                <CustomText style={[styles.statusText, { color: colors.error }]}>{dispute.status}</CustomText>
              </View>
              <CustomText style={[styles.reasonText, { color: colors.foreground }]}>Reason: {dispute.reason}</CustomText>
              <CustomText style={[styles.dateText, { color: colors.muted }]}>Order: #{dispute.orderId?.slice(-8).toUpperCase()}  •  {new Date(dispute.createdAt).toLocaleDateString()}</CustomText>
            </View>
          ))
        )}
      </ScrollView>

      <NewDisputeModal 
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        orderId={selectedOrderId}
        userId={user?.id}
        onSuccess={fetchDisputes}
      />
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
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  card: {
    borderRadius: 16, padding: 16,
    borderWidth: 1, marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  idText: { fontWeight: 'bold' },
  statusText: { fontWeight: 'bold' },
  reasonText: { fontSize: 16, marginBottom: 8 },
  dateText: { fontSize: 12 },
});

export default BuyerDisputesScreen;
