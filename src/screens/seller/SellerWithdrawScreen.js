import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert,
} from 'react-native';
import {
  Menu, ArrowDownToLine, Smartphone, Building2, ChevronDown, ChevronRight, Clock,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';
import { Colors } from '../../theme/colors';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';
import { ActivityIndicator, RefreshControl } from 'react-native';

// Mock data removed

const METHODS = [
  { id: 'MOBILE_MONEY', label: 'MTN MOMO', sub: 'Mobile Money', icon: Smartphone, color: '#F59E0B' },
  { id: 'BANK', label: 'Bank Transfer', sub: 'Local Bank Account', icon: Building2, color: '#3B82F6' },
];

export default function SellerWithdrawScreen() {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('MOBILE_MONEY');
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchWallet = async () => {
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
  };

  React.useEffect(() => {
    fetchWallet();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
  };

  const handleWithdraw = async () => {
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }
    if (wallet && numAmount > wallet.balance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available balance.');
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
      Alert.alert('Request Submitted', 'Your withdrawal request has been submitted and is processing.');
      setAmount('');
      fetchWallet();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (val) => 'Rwf ' + (val || 0).toLocaleString();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Withdraw Funds</CustomText>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
        }
      >
        {loading && !wallet ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <CustomText style={styles.balanceLabel}>AVAILABLE BALANCE</CustomText>
              <CustomText style={styles.balanceAmount}>{formatPrice(wallet?.balance)}</CustomText>
              <View style={styles.balanceMeta}>
                <CustomText style={styles.balanceMetaText}>Pending: {formatPrice(wallet?.pendingEscrow || 0)}</CustomText>
              </View>
            </View>

        {/* Amount Input */}
        <View style={styles.inputSection}>
          <CustomText style={styles.sectionLabel}>WITHDRAWAL AMOUNT</CustomText>
          <View style={[styles.amountInputRow, { backgroundColor: colors.glass, borderColor: colors.border }]}>
            <CustomText style={styles.currencyPrefix}>Rwf</CustomText>
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
                style={[styles.quickChip, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }]}
                onPress={() => setAmount(q.toString())}
              >
                <CustomText style={styles.quickChipText}>Rwf {q.toLocaleString()}</CustomText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payout Method */}
        <View style={styles.section}>
          <CustomText style={styles.sectionLabel}>PAYOUT METHOD</CustomText>
          {METHODS.map((m) => {
            const Icon = m.icon;
            const selected = selectedMethod === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodCard, { backgroundColor: colors.card, borderColor: colors.border }, selected && { borderColor: m.color, backgroundColor: `${m.color}10` }]}
                onPress={() => setSelectedMethod(m.id)}
              >
                <View style={[styles.methodIconBox, { backgroundColor: `${m.color}20` }]}>
                  <Icon color={m.color} size={22} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <CustomText style={[styles.methodLabel, { color: colors.foreground }]}>{m.label}</CustomText>
                  <CustomText style={styles.methodSub}>{m.sub}</CustomText>
                </View>
                <View style={[styles.radio, { borderColor: colors.border }, selected && { borderColor: m.color }]}>
                  {selected && <View style={[styles.radioDot, { backgroundColor: m.color }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <CustomButton
          title="Submit Withdrawal"
          loading={submitting}
          onPress={handleWithdraw}
          style={styles.submitBtn}
        />

        {/* Withdrawal History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock color="#F97316" size={18} />
            <CustomText style={styles.sectionTitle}>Recent Withdrawals</CustomText>
          </View>
          <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(!wallet?.withdrawals || wallet.withdrawals.length === 0) ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <CustomText style={{ color: colors.muted }}>No withdrawal history.</CustomText>
              </View>
            ) : (
              wallet.withdrawals.map((item, index) => (
                <View key={item.id} style={[styles.historyRow, index < wallet.withdrawals.length - 1 && [styles.historyDivider, { borderBottomColor: colors.border }]]}>
                  <View style={styles.historyLeft}>
                    <CustomText style={[styles.historyId, { color: colors.foreground }]}>#{item.id.slice(-6).toUpperCase()}</CustomText>
                    <CustomText style={styles.historyMeta}>{item.method.replace('_', ' ')} · {new Date(item.createdAt).toLocaleDateString()}</CustomText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <CustomText style={styles.historyAmount}>- {formatPrice(item.amount)}</CustomText>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? 'rgba(16,185,129,0.1)' : 'rgba(249,115,22,0.1)' }]}>
                      <CustomText style={[styles.statusText, { color: item.status === 'COMPLETED' ? '#10B981' : '#F97316' }]}>
                        {item.status}
                      </CustomText>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  content: { padding: 16, paddingBottom: 60 },
  balanceCard: {
    backgroundColor: '#0284c7', borderRadius: 24, padding: 24, marginBottom: 24,
    shadowColor: '#0284c7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  balanceAmount: { color: Colors.white, fontSize: 34, fontWeight: '900', marginTop: 6 },
  balanceMeta: { flexDirection: 'row', gap: 8, marginTop: 12 },
  balanceMetaText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  inputSection: { marginBottom: 24 },
  sectionLabel: { color: Colors.muted, fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 12 },
  amountInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  currencyPrefix: { color: Colors.muted, fontSize: 20, fontWeight: 'bold', marginRight: 8 },
  amountInput: { flex: 1, color: Colors.white, fontSize: 28, fontWeight: '900', height: 64 },
  quickAmounts: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quickChip: {
    flex: 1, backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 10, paddingVertical: 8,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)',
  },
  quickChipText: { color: '#F97316', fontSize: 12, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  methodCardSelected: { borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,0.05)' },
  methodIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { color: Colors.white, fontWeight: 'bold', fontSize: 15 },
  methodSub: { color: Colors.muted, fontSize: 12, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#F97316' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F97316' },
  submitBtn: { marginBottom: 32 },
  historyCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  historyDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  historyLeft: {},
  historyId: { color: Colors.white, fontWeight: 'bold', fontSize: 13 },
  historyMeta: { color: Colors.muted, fontSize: 11, marginTop: 2 },
  historyAmount: { color: '#EF4444', fontWeight: '900', fontSize: 14 },
  statusBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: 'bold' },
});
