import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, Image, TextInput } from 'react-native';
import { Menu, RefreshCcw, CheckCircle2, XCircle, Clock, ChevronRight, CheckCircle, Package, Play, Truck, QrCode } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { sellerService } from '../../api/sellerService';
import NotificationIcon from '../../components/NotificationIcon';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const SellerReturnsScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const [returns, setReturns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [verifyCode, setVerifyCode] = React.useState('');
  const [verifying, setVerifying] = React.useState(false);

  const handleVerifyReturn = async () => {
    if (!verifyCode.trim()) {
      Alert.alert(t('error'), 'Please enter a verification code.');
      return;
    }
    setVerifying(true);
    try {
      await sellerService.verifyReplacementReturn(user.id, verifyCode.trim().toUpperCase());
      Alert.alert(t('success'), 'Return verified successfully!');
      setVerifyCode('');
      fetchReturns();
    } catch (error) {
      Alert.alert(t('error'), error.message || 'Failed to verify return code.');
    } finally {
      setVerifying(false);
    }
  };

  const fetchReturns = async () => {
    if (!user?.id) return;
    try {
      const data = await sellerService.getReplacements(user.id);
      setReturns(data);
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchReturns();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReturns();
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await sellerService.updateReplacementStatus(user.id, id, status);
      Alert.alert(t('success'), `Return request status updated to ${status.toLowerCase()}`);
      fetchReturns();
    } catch (error) {
       Alert.alert(t('error'), error.message || 'Failed to update status');
    }
  };

  const renderReturnItem = ({ item }) => {
    const title = item.order?.items[0]?.product?.title || 'Order Item';
    const dateStr = new Date(item.createdAt).toLocaleDateString();

    const getStatusColor = (status) => {
      switch (status) {
        case 'PENDING':
          return { bg: 'rgba(249, 115, 22, 0.1)', color: '#F97316' };
        case 'APPROVED':
        case 'RECEIVED_BY_SELLER':
        case 'DELIVERED':
        case 'COMPLETED':
        case 'REFUNDED':
          return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981' };
        case 'REJECTED':
          return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' };
        default:
          return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' };
      }
    };
    const sc = getStatusColor(item.status);

    const renderStatusActions = (reqItem) => {
      switch (reqItem.status) {
        case 'PENDING':
          return (
            <View style={styles.actions}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => handleUpdateStatus(reqItem.id, 'APPROVED')}
              >
                <CheckCircle color="white" size={14} />
                <CustomText style={styles.actionBtnText}>Approve Return</CustomText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleUpdateStatus(reqItem.id, 'REJECTED')}
              >
                <XCircle color="#EF4444" size={14} />
                <CustomText style={[styles.actionBtnText, { color: '#EF4444' }]}>Reject Return</CustomText>
              </TouchableOpacity>
            </View>
          );

        case 'APPROVED':
        case 'RECEIVED_BY_SELLER':
          if (reqItem.type === 'REFUND') {
            return (
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                  onPress={() => handleUpdateStatus(reqItem.id, 'REFUND_PROCESSING')}
                >
                  <RefreshCcw color="white" size={14} />
                  <CustomText style={styles.actionBtnText}>Process Refund</CustomText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => handleUpdateStatus(reqItem.id, 'REFUNDED')}
                >
                  <CheckCircle color="white" size={14} />
                  <CustomText style={styles.actionBtnText}>Mark Refunded</CustomText>
                </TouchableOpacity>
              </View>
            );
          } else {
            return (
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                  onPress={() => handleUpdateStatus(reqItem.id, 'PROCESSING')}
                >
                  <Play color="white" size={14} />
                  <CustomText style={styles.actionBtnText}>Start Processing</CustomText>
                </TouchableOpacity>
              </View>
            );
          }

        case 'PROCESSING':
          if (reqItem.type !== 'REFUND') {
            return (
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#F97316' }]}
                  onPress={() => handleUpdateStatus(reqItem.id, 'SHIPPED_REPLACEMENT')}
                >
                  <Truck color="white" size={14} />
                  <CustomText style={styles.actionBtnText}>Ship Item</CustomText>
                </TouchableOpacity>
              </View>
            );
          }
          return null;

        case 'REFUND_PROCESSING':
          if (reqItem.type === 'REFUND') {
            return (
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => handleUpdateStatus(reqItem.id, 'REFUNDED')}
                >
                  <CheckCircle color="white" size={14} />
                  <CustomText style={styles.actionBtnText}>Mark Refunded</CustomText>
                </TouchableOpacity>
              </View>
            );
          }
          return null;

        case 'SHIPPED_REPLACEMENT':
        case 'DELIVERED':
          if (reqItem.type !== 'REFUND') {
            return (
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => handleUpdateStatus(reqItem.id, 'COMPLETED')}
                >
                  <CheckCircle2 color="white" size={14} />
                  <CustomText style={styles.actionBtnText}>Complete Request</CustomText>
                </TouchableOpacity>
              </View>
            );
          }
          return null;

        default:
          return null;
      }
    };

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <CustomText style={[styles.idText, { color: colors.muted }]}>#{item.id.slice(-6).toUpperCase()}</CustomText>
            <CustomText style={[styles.titleText, { color: colors.foreground }]}>{title}</CustomText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <CustomText style={[styles.statusText, { color: sc.color }]}>
              {item.status.replace('_', ' ')}
            </CustomText>
          </View>
        </View>
        
        <View style={[styles.cardBody, { backgroundColor: colors.glass }]}>
          <View style={styles.infoRow}>
            <CustomText style={styles.label}>{t('orderLabel') || 'Order:'}</CustomText>
            <CustomText style={[styles.value, { color: colors.foreground }]}>#{item.orderId.slice(-8).toUpperCase()}</CustomText>
          </View>
          <View style={styles.infoRow}>
            <CustomText style={styles.label}>{t('reasonLabel') || 'Reason:'}</CustomText>
            <CustomText style={[styles.value, { color: colors.foreground }]}>{item.reason}</CustomText>
          </View>
          {item.description ? (
            <View style={[styles.infoRow, { flexDirection: 'column', gap: 4 }]}>
              <CustomText style={styles.label}>{t('descriptionLabel') || 'Description:'}</CustomText>
              <CustomText style={[styles.value, { color: colors.foreground, fontWeight: 'normal' }]}>{item.description}</CustomText>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <CustomText style={styles.label}>{t('dateLabel') || 'Date:'}</CustomText>
            <CustomText style={[styles.value, { color: colors.foreground }]}>{dateStr}</CustomText>
          </View>
          {item.pickupCode && !item.pickupCode.startsWith('USED_') ? (
            <View style={[styles.infoRow, { marginTop: 4, backgroundColor: 'rgba(249, 115, 22, 0.08)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.2)' }]}>
              <CustomText style={[styles.label, { color: '#F97316', fontWeight: 'bold' }]}>Verification Code:</CustomText>
              <CustomText style={[styles.value, { color: '#F97316', fontFamily: 'monospace' }]}>{item.pickupCode}</CustomText>
            </View>
          ) : null}
          {item.evidence && item.evidence.length > 0 ? (
            <View style={[styles.infoRow, { flexDirection: 'column', gap: 8, marginTop: 4 }]}>
              <CustomText style={styles.label}>{t('evidenceLabel') || 'Evidence:'}</CustomText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {item.evidence.map((img, idx) => (
                  <Image key={idx} source={{ uri: img }} style={styles.evidenceThumbnail} />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {renderStatusActions(item)}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>Return Requests</CustomText>
        <NotificationIcon />
      </View>
      
      {loading && returns.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={returns}
          renderItem={renderReturnItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <View style={{ marginBottom: 20 }}>
              {/* Verify Return Box */}
              <View style={[styles.verifyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.verifyHeader}>
                  <QrCode color={colors.primary} size={20} />
                  <CustomText style={[styles.verifyTitle, { color: colors.foreground }]}>Verify Return</CustomText>
                </View>
                <CustomText style={[styles.verifyDesc, { color: colors.muted }]}>
                  Enter the verification code to confirm receipt of a return.
                </CustomText>
                <View style={styles.verifyInputRow}>
                  <TextInput
                    style={[styles.verifyInput, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.foreground }]}
                    value={verifyCode}
                    onChangeText={(txt) => setVerifyCode(txt.toUpperCase())}
                    placeholder="Enter Code (e.g. A1B2C3)"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <TouchableOpacity 
                    style={[styles.verifySubmitBtn, { backgroundColor: colors.primary }]}
                    onPress={handleVerifyReturn}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <CustomText style={styles.verifySubmitBtnText}>Verify</CustomText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.headerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <RefreshCcw color={colors.primary} size={24} />
                <CustomText style={styles.headerDesc}>Manage buyer return requests and process refunds quickly.</CustomText>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package color={colors.isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} size={64} />
              <CustomText style={styles.emptyText}>No return requests yet</CustomText>
            </View>
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
  listContent: { padding: 16, paddingBottom: 100 },
  headerBox: { 
    flexDirection: 'row', alignItems: 'center', gap: 16, 
    padding: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, marginBottom: 24
  },
  headerDesc: { flex: 1, fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 16
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  idText: { fontSize: 11, fontWeight: 'bold' },
  titleText: { fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  cardBody: { gap: 8, marginBottom: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12 },
  infoRow: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 12 },
  value: { fontSize: 12, fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  evidenceThumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  verifyCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  verifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifyDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  verifyInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  verifyInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  verifySubmitBtn: {
    width: 80,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifySubmitBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
  },
});

export default SellerReturnsScreen;
