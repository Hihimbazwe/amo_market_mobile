import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import {
  Menu,
  ArrowUpRight,
  Smartphone,
  Building2,
  Clock,
  ArrowLeft,
  CreditCard
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { sellerService } from '../../api/sellerService';

const METHODS = [
  { id: 'MOBILE_MONEY', label: 'MTN MoMo', sub: 'Mobile Money', icon: Smartphone, color: '#f59e0b' },
  { id: 'BANK', label: 'Bank Transfer', sub: 'Local Bank Account', icon: Building2, color: '#3b82f6' },
];

export default function SellerWithdrawScreen({ navigation }) {
  const { toggleDrawer } = useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('MOBILE_MONEY');
  const [submitting, setSubmitting] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await sellerService.getWallet(user.id);
      setWallet(data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
  };

  const handleWithdraw = async () => {
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t('invalidAmount'), t('enterValidAmount'));
      return;
    }
    if (wallet && numAmount > wallet.balance) {
      Alert.alert(t('insufficientBalance'), t('cannotExceedBalance'));
      return;
    }
    
    setSubmitting(true);
    try {
      await sellerService.requestWithdrawal(
        user.id, 
        numAmount, 
        selectedMethod, 
        selectedMethod === 'MOBILE_MONEY' ? 'MTN MoMo Payout' : 'Bank Payout'
      );
      Alert.alert(t('requestSubmitted'), t('withdrawalSubmittedSuccess'));
      setAmount('');
      fetchWallet();
      navigation.goBack();
    } catch (error) {
      Alert.alert(t('error'), error.message || t('failedToSubmitWithdrawal'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !wallet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.glass }]}>
          <ArrowLeft color={colors.foreground} size={22} />
        </TouchableOpacity>
        <CustomText variant="h2">{t('withdrawFunds')}</CustomText>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Balance Card */}
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
          <View style={styles.pendingRow}>
             <Clock size={12} color="rgba(255,255,255,0.7)" />
             <CustomText style={styles.pendingText}>
               {t('pendingEscrow', { amount: `Rwf ${(wallet?.pendingBalance ?? 0).toLocaleString()}` })}
             </CustomText>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('withdrawalAmount')}</CustomText>
          <View style={[styles.amountInputRow, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <CustomText style={[styles.currencyPrefix, { color: colors.primary }]}>Rwf</CustomText>
            <TextInput
              style={[styles.amountInput, { color: colors.foreground }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.quickAmounts}>
            {[10000, 50000, wallet?.balance || 0].map((q) => (
              <TouchableOpacity
                key={q}
                style={[styles.quickChip, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '25' }]}
                onPress={() => setAmount(q.toString())}
              >
                <CustomText style={[styles.quickChipText, { color: colors.primary }]}>
                  {q === wallet?.balance ? 'MAX' : `Rwf ${q.toLocaleString()}`}
                </CustomText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('payoutMethod')}</CustomText>
          {METHODS.map((m) => {
            const Icon = m.icon;
            const selected = selectedMethod === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.methodCard, 
                  { backgroundColor: colors.card, borderColor: colors.glassBorder },
                  selected && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                ]}
                onPress={() => setSelectedMethod(m.id)}
              >
                <View style={[styles.methodIconBox, { backgroundColor: m.color + '20' }]}>
                  <Icon color={m.color} size={22} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <CustomText style={[styles.methodLabel, { color: colors.foreground }]}>{m.label}</CustomText>
                  <CustomText variant="caption" style={{ color: colors.muted }}>{m.sub}</CustomText>
                </View>
                <View style={[styles.radio, { borderColor: colors.glassBorder }, selected && { borderColor: colors.primary }]}>
                  {selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <CustomButton
          title={t('submitWithdrawal')}
          loading={submitting}
          onPress={handleWithdraw}
          style={styles.submitBtn}
        />

        {/* Withdrawal History Shortlist */}
        {wallet?.withdrawals?.length > 0 && (
          <View style={styles.section}>
             <View style={styles.sectionHeader}>
                <History color={colors.primary} size={18} />
                <CustomText style={[styles.sectionTitle, { color: colors.foreground }]}>{t('recentWithdrawals')}</CustomText>
             </View>
             {wallet.withdrawals.slice(0, 3).map((item, index) => (
                <View key={item.id} style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                  <View style={{ flex: 1 }}>
                    <CustomText style={[styles.historyId, { color: colors.foreground }]}>#{item.id.slice(-6).toUpperCase()}</CustomText>
                    <CustomText variant="caption" style={{ color: colors.muted }}>{new Date(item.createdAt).toLocaleDateString()}</CustomText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <CustomText style={[styles.historyAmount, { color: colors.foreground }]}>-Rwf {item.amount.toLocaleString()}</CustomText>
                    <CustomText style={{ color: item.status === 'COMPLETED' ? '#10b981' : '#f59e0b', fontSize: 10, fontWeight: 'bold' }}>
                      {item.status}
                    </CustomText>
                  </View>
                </View>
             ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  content: { padding: 16, paddingBottom: 60 },
  balanceCard: {
    borderRadius: 24, padding: 24, marginBottom: 24,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  balanceAmount: { color: 'white', fontSize: 34, fontWeight: '900', marginTop: 6 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  pendingText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' },
  amountInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 20,
    borderWidth: 1,
  },
  currencyPrefix: { fontSize: 20, fontWeight: '900', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '900', height: 72 },
  quickAmounts: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quickChip: {
    flex: 1, borderRadius: 12, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1,
  },
  quickChipText: { fontSize: 11, fontWeight: 'bold' },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 20, marginBottom: 12,
    borderWidth: 1,
  },
  methodIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontWeight: 'bold', fontSize: 15 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  submitBtn: { marginTop: 12, marginBottom: 40 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  historyRow: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 
  },
  historyId: { fontWeight: 'bold', fontSize: 14 },
  historyAmount: { fontWeight: '900', fontSize: 14 },
});
