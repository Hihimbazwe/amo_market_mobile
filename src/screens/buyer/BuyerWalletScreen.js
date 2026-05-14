import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  RefreshControl
} from 'react-native';
import { 
  Menu, 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  X, 
  Smartphone, 
  Building2, 
  Check,
  ChevronRight,
  CreditCard
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../api/walletService';

const BuyerWalletScreen = () => {
  const { toggleDrawer } = useContext(DrawerContext);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [topUpVisible, setTopUpVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('MOBILE_MONEY');
  const [details, setDetails] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await walletService.getWallet(user.id);
      setWallet(data);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchWallet();
    }, [fetchWallet])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
  };

  const handleTopUp = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (method === 'MOBILE_MONEY' && !details.trim()) {
      Alert.alert('Phone Required', 'Please enter your phone number.');
      return;
    }

    setActionLoading(true);
    try {
      await walletService.topUp(user.id, parseFloat(amount), method, details);
      Alert.alert('Success', 'Top up request submitted successfully.');
      setTopUpVisible(false);
      resetForms();
      fetchWallet();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to top up.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (parseFloat(amount) > wallet?.balance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available balance.');
      return;
    }
    if (!details.trim()) {
      Alert.alert('Details Required', 'Please provide account details.');
      return;
    }

    setActionLoading(true);
    try {
      await walletService.withdraw(user.id, parseFloat(amount), method, details);
      Alert.alert('Success', 'Withdrawal request submitted successfully.');
      setWithdrawVisible(false);
      resetForms();
      fetchWallet();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to withdraw.');
    } finally {
      setActionLoading(false);
    }
  };

  const resetForms = () => {
    setAmount('');
    setDetails('');
    setMethod('MOBILE_MONEY');
  };

  const quickAmounts = [1000, 5000, 10000, 50000];

  const renderTransaction = (tx) => {
    const isCredit = tx.type === 'REFUND' || tx.type === 'TOPUP';
    const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
    const statusColor = tx.status === 'COMPLETED' ? '#10b981' : tx.status === 'FAILED' ? '#ef4444' : '#f59e0b';
    
    return (
      <View key={tx.id} style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        <View style={styles.txLeft}>
          <View style={[styles.iconBox, { backgroundColor: isCredit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }]}>
            <Icon color={isCredit ? '#10b981' : '#ef4444'} size={20} />
          </View>
          <View>
            <CustomText style={[styles.txType, { color: colors.foreground }]}>
              {tx.type === 'WITHDRAWAL' ? t('withdrawal') : tx.type === 'TOPUP' ? t('topUp') : tx.type === 'REFUND' ? 'Refund' : 'Payment'}
            </CustomText>
            <CustomText style={[styles.txDate, { color: colors.muted }]}>
              {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </CustomText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <CustomText style={[styles.txAmount, { color: isCredit ? '#10b981' : colors.foreground }]}>
            {isCredit ? '+' : '-'}Rwf {tx.amount?.toLocaleString()}
          </CustomText>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
             <CustomText style={[styles.statusText, { color: statusColor }]}>{tx.status}</CustomText>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">{t('wallet')}</CustomText>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Main Balance Card */}
        <LinearGradient
          colors={[colors.primary, '#d35400']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.cardHeader}>
            <View>
              <CustomText style={styles.balanceLabel}>{t('availableBalance')}</CustomText>
              <CustomText style={styles.balanceAmount}>Rwf {(wallet?.balance ?? 0).toLocaleString()}</CustomText>
            </View>
            <CreditCard color="#fff" size={32} opacity={0.5} />
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.actionBtnWhite}
              onPress={() => { resetForms(); setTopUpVisible(true); }}
            >
              <Plus size={18} color={colors.primary} />
              <CustomText style={[styles.actionBtnText, { color: colors.primary }]}>{t('topUp')}</CustomText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionBtnOutline}
              onPress={() => { resetForms(); setWithdrawVisible(true); }}
            >
              <ArrowUpRight size={18} color="#fff" />
              <CustomText style={[styles.actionBtnText, { color: '#fff' }]}>{t('withdraw')}</CustomText>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Escrow Card */}
        {(wallet?.pendingEscrow ?? 0) > 0 && (
          <View style={[styles.escrowCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={[styles.escrowIcon, { backgroundColor: colors.primary + '15' }]}>
              <Clock size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <CustomText style={[styles.escrowTitle, { color: colors.foreground }]}>
                Rwf {wallet.pendingEscrow.toLocaleString()}
              </CustomText>
              <CustomText variant="caption" style={{ color: colors.muted }}>
                Funds held in escrow until delivery confirmation
              </CustomText>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <CustomText variant="h2">{t('recentTransactions')}</CustomText>
          <CustomText variant="caption" style={{ color: colors.muted }}>
            {wallet?.withdrawals?.length ?? 0} {t('records')}
          </CustomText>
        </View>

        {!wallet || !wallet.withdrawals || wallet.withdrawals.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.card }]}>
              <Wallet color={colors.muted} size={40} />
            </View>
            <CustomText variant="subtitle" style={{ marginTop: 16, color: colors.muted }}>{t('noTransactions')}</CustomText>
          </View>
        ) : (
          wallet?.withdrawals?.map(renderTransaction)
        )}
      </ScrollView>

      {/* Top Up Modal */}
      <Modal visible={topUpVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <CustomText variant="h2">{t('topUp')}</CustomText>
              <TouchableOpacity onPress={() => setTopUpVisible(false)}>
                <X color={colors.foreground} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <CustomText style={styles.label}>QUICK AMOUNT (Rwf)</CustomText>
              <View style={styles.quickAmountGrid}>
                {quickAmounts.map(a => (
                  <TouchableOpacity 
                    key={a}
                    onPress={() => setAmount(String(a))}
                    style={[
                      styles.quickAmountBtn, 
                      { borderColor: colors.glassBorder },
                      amount === String(a) && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                  >
                    <CustomText style={{ color: amount === String(a) ? '#fff' : colors.foreground, fontWeight: 'bold' }}>
                      {a.toLocaleString()}
                    </CustomText>
                  </TouchableOpacity>
                ))}
              </View>

              <CustomText style={styles.label}>CUSTOM AMOUNT</CustomText>
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                placeholder="e.g. 25000"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <CustomText style={styles.label}>PAYMENT METHOD</CustomText>
              <View style={styles.methodGrid}>
                {[
                  { id: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
                  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 }
                ].map(m => (
                  <TouchableOpacity 
                    key={m.id}
                    onPress={() => setMethod(m.id)}
                    style={[
                      styles.methodBtn,
                      { borderColor: colors.glassBorder, backgroundColor: colors.card },
                      method === m.id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                    ]}
                  >
                    <m.icon size={20} color={method === m.id ? colors.primary : colors.muted} />
                    <CustomText style={{ color: method === m.id ? colors.primary : colors.foreground, marginTop: 4, fontSize: 12, fontWeight: 'bold' }}>
                      {m.label}
                    </CustomText>
                  </TouchableOpacity>
                ))}
              </View>

              {method === 'MOBILE_MONEY' ? (
                <>
                  <CustomText style={styles.label}>PHONE NUMBER</CustomText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                    placeholder="+250 78x xxx xxx"
                    placeholderTextColor={colors.muted}
                    keyboardType="phone-pad"
                    value={details}
                    onChangeText={setDetails}
                  />
                </>
              ) : (
                <View style={[styles.bankInfo, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
                   <CustomText style={{ color: colors.primary, fontWeight: 'bold', marginBottom: 4 }}>Bank Transfer Instructions</CustomText>
                   <CustomText style={{ color: colors.foreground, fontSize: 13 }}>Bank: Bank of Kigali</CustomText>
                   <CustomText style={{ color: colors.foreground, fontSize: 13 }}>Acc: 00040-0123456-78</CustomText>
                   <CustomText style={{ color: colors.foreground, fontSize: 13 }}>Name: AMO Marketplace Ltd</CustomText>
                </View>
              )}

              <CustomButton 
                title={`${t('topUp')} Rwf ${parseFloat(amount || 0).toLocaleString()}`}
                loading={actionLoading}
                onPress={handleTopUp}
                style={{ marginTop: 24, marginBottom: 40 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal visible={withdrawVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <CustomText variant="h2">{t('withdraw')}</CustomText>
              <TouchableOpacity onPress={() => setWithdrawVisible(false)}>
                <X color={colors.foreground} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.availableInfo, { backgroundColor: colors.primary + '10' }]}>
                <CustomText style={{ color: colors.muted, fontSize: 12 }}>AVAILABLE BALANCE</CustomText>
                <CustomText style={{ color: colors.primary, fontWeight: 'bold', fontSize: 18 }}>Rwf {(wallet?.balance ?? 0).toLocaleString()}</CustomText>
              </View>

              <CustomText style={styles.label}>AMOUNT TO WITHDRAW (Rwf)</CustomText>
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                placeholder="e.g. 10000"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <CustomText style={styles.label}>WITHDRAWAL METHOD</CustomText>
              <View style={styles.methodGrid}>
                {[
                  { id: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
                  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 }
                ].map(m => (
                  <TouchableOpacity 
                    key={m.id}
                    onPress={() => setMethod(m.id)}
                    style={[
                      styles.methodBtn,
                      { borderColor: colors.glassBorder, backgroundColor: colors.card },
                      method === m.id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                    ]}
                  >
                    <m.icon size={20} color={method === m.id ? colors.primary : colors.muted} />
                    <CustomText style={{ color: method === m.id ? colors.primary : colors.foreground, marginTop: 4, fontSize: 12, fontWeight: 'bold' }}>
                      {m.label}
                    </CustomText>
                  </TouchableOpacity>
                ))}
              </View>

              <CustomText style={styles.label}>
                {method === 'MOBILE_MONEY' ? 'PHONE NUMBER' : 'BANK ACCOUNT DETAILS'}
              </CustomText>
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                placeholder={method === 'MOBILE_MONEY' ? "+250 78x xxx xxx" : "Acc Number / Full Name"}
                placeholderTextColor={colors.muted}
                value={details}
                onChangeText={setDetails}
                multiline={method === 'BANK_TRANSFER'}
              />

              <CustomButton 
                title={t('withdraw')}
                loading={actionLoading}
                onPress={handleWithdraw}
                style={{ marginTop: 24, marginBottom: 40 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  content: {
    padding: 16,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  actionBtnWhite: {
    flex: 1,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  actionBtnOutline: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 8,
  },
  actionBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  escrowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  escrowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  escrowTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txType: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  txDate: {
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontWeight: '900',
    fontSize: 15,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    padding: 40,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(0,0,0,0.4)', // Will be overridden or used with colors.muted
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 1,
  },
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  input: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: 'bold',
    borderWidth: 1,
  },
  methodGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  methodBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  bankInfo: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  availableInfo: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 8,
  }
});

export default BuyerWalletScreen;
