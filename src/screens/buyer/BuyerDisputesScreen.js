import React, { useEffect, useState, useContext } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Menu, AlertCircle, Loader2 } from 'lucide-react-native';

const getReasonLabel = (reason, t) => {
  const map = {
    'not-as-described': t('notAsDescribed'),
    'damaged': t('arrivedDamaged'),
    'missing': t('missingParts'),
    'never-arrived': t('neverArrived'),
    'counterfeit': t('counterfeit'),
    'wrong-item': t('wrongItem'),
  };
  return map[reason] || reason;
};
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { disputeService } from '../../api/disputeService';
import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';
import NotificationIcon from '../../components/NotificationIcon';
import NewDisputeModal from '../../components/modals/NewDisputeModal';
import { useLanguage } from '../../context/LanguageContext';

const BuyerDisputesScreen = () => {
  const { toggleDrawer } = useContext(DrawerContext);
  const { colors } = useTheme();
  const route = useRoute();
  const { user } = useAuth();
  const { t } = useLanguage();
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
        <CustomText variant="h2" style={{ flex: 1 }}>{t('dispute')}</CustomText>
        <NotificationIcon />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <CustomText variant="subtitle" style={{ color: colors.muted }}>{t('activeCases')}</CustomText>
          <CustomButton title={t('openCase')} style={{ paddingHorizontal: 16 }} onPress={() => setIsModalVisible(true)} />
        </View>

        {loading ? (
          <View style={styles.emptyState}>
             <Loader2 color={colors.primary} size={32} className="animate-spin" />
             <CustomText style={{ marginTop: 12 }}>{t('loadingDisputes')}</CustomText>
          </View>
        ) : disputes.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertCircle color={colors.muted} size={48} />
            <CustomText variant="subtitle" style={{ marginTop: 16 }}>{t('noActiveDisputes')}</CustomText>
          </View>
        ) : (
          disputes.map((dispute) => {
            const productName = dispute.order?.items?.[0]?.product?.title || 'Order Item';
            const reasonLabel = getReasonLabel(dispute.reason, t);
            const date = new Date(dispute.createdAt).toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <View key={dispute.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.error + '40' }]}>
                <View style={styles.cardTop}>
                  <CustomText style={[styles.idText, { color: colors.foreground }]} numberOfLines={1}>{productName}</CustomText>
                  <View style={[styles.statusBadge, { backgroundColor: colors.error + '15' }]}>
                    <CustomText style={[styles.statusText, { color: colors.error }]}>{t(dispute.status.toLowerCase()) || dispute.status}</CustomText>
                  </View>
                </View>
                <CustomText style={[styles.reasonText, { color: colors.muted }]}>
                  <CustomText style={{ fontWeight: 'bold', color: colors.muted }}>{t('reason')}: </CustomText>{reasonLabel}
                </CustomText>
                <CustomText style={[styles.dateText, { color: colors.muted }]}>{date}</CustomText>
              </View>
            );
          })
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  idText: { fontWeight: 'bold', fontSize: 15, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontWeight: 'bold', fontSize: 11 },
  reasonText: { fontSize: 13, marginBottom: 6 },
  dateText: { fontSize: 11 },
});

export default BuyerDisputesScreen;
