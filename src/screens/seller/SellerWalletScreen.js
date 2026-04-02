import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Menu, Wallet, ArrowDownToLine, ArrowUpRight, TrendingUp, Clock, History, CreditCard } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';

// Mock transactions removed

const SellerWalletScreen = ({ navigation }) => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [wallet, setWallet] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

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

  const renderTransactionItem = ({ item }) => {
     // Backend transactions might be Withdrawals or Sales
     // In amomarket, withdrawals are in transactions list if we fetched recent ones.
     const isWithdraw = item.method !== undefined || item.type === 'WITHDRAW';
     const amount = item.amount || 0;
     const dateStr = new Date(item.createdAt).toLocaleDateString();
     
     return (
       <View style={[styles.txRow, { borderBottomColor: colors.border }]} key={item.id}>
        <View style={[styles.txIcon, { backgroundColor: !isWithdraw ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
          {!isWithdraw ? <TrendingUp color="#10B981" size={18} /> : <ArrowDownToLine color="#EF4444" size={18} />}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <CustomText style={[styles.txType, { color: colors.foreground }]}>{!isWithdraw ? 'Product Sale' : `Withdrawal (${item.method || 'Bank'})`}</CustomText>
          <CustomText style={styles.txDate}>{dateStr}</CustomText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <CustomText style={[styles.txAmount, { color: !isWithdraw ? '#10B981' : '#EF4444' }]}>
            {`${!isWithdraw ? '+' : '-'} Rwf ${amount.toLocaleString()}`}
          </CustomText>
          <CustomText style={styles.txStatus}>{item.status}</CustomText>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Wallet</CustomText>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
        }
      >
        {loading && !wallet ? (
          <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceInfo}>
                <CustomText style={styles.balanceLabel}>AVAILABLE BALANCE</CustomText>
                <CustomText style={styles.balanceAmount}>Rwf {(wallet?.balance || 0).toLocaleString()}</CustomText>
              </View>
              <View style={styles.balanceActions}>
                <TouchableOpacity style={styles.withdrawBtn} onPress={() => navigation.navigate('SellerWithdraw')}>
                  <ArrowDownToLine color={Colors.white} size={20} />
                  <CustomText style={styles.withdrawBtnText}>Withdraw</CustomText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <CustomText style={styles.miniStatLabel}>PENDING</CustomText>
                <CustomText style={[styles.miniStatValue, { color: colors.foreground }]}>Rwf {(wallet?.pendingBalance || 0).toLocaleString()}</CustomText>
              </View>
              <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <CustomText style={styles.miniStatLabel}>LIFETIME</CustomText>
                <CustomText style={[styles.miniStatValue, { color: colors.foreground }]}>Rwf {(wallet?.lifetimeEarnings || 0).toLocaleString()}</CustomText>
              </View>
            </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <History color="#F97316" size={20} />
          <CustomText style={styles.sectionTitle}>Transaction History</CustomText>
        </View>

        {/* Transactions list implemented as children of ScrollView for simplicity in this mockup, 
            but would normally use a FlatList or SectionList if very long */}
        <View style={styles.txList}>
          {wallet?.transactions?.length > 0 ? (
            wallet.transactions.map((item) => renderTransactionItem({ item }))
          ) : (
            <CustomText style={{ color: Colors.muted, textAlign: 'center', padding: 20 }}>No transactions yet.</CustomText>
          )}
        </View>
          </>
        )}

        {/* Payout Methods Card */}
        <TouchableOpacity style={[styles.methodsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.methodIcon, { backgroundColor: colors.isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }]}>
              <CreditCard color={colors.isDarkMode ? colors.white : colors.primary} size={20} />
            </View>
            <View>
              <CustomText style={[styles.methodTitle, { color: colors.foreground }]}>Payout Methods</CustomText>
              <CustomText style={styles.methodDesc}>Manage bank & MOMO accounts</CustomText>
            </View>
          </View>
          <ArrowUpRight color={colors.muted} size={20} />
        </TouchableOpacity>

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
  balanceCard: {
    backgroundColor: '#0284c7', borderRadius: 24, padding: 24, marginBottom: 16,
    shadowColor: '#0284c7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  balanceAmount: { color: Colors.white, fontSize: 32, fontWeight: '900', marginTop: 8 },
  balanceActions: { marginTop: 24 },
  withdrawBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 16, gap: 10
  },
  withdrawBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  miniStatCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  miniStatLabel: { color: Colors.muted, fontSize: 10, fontWeight: 'bold' },
  miniStatValue: { color: Colors.white, fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingHorizontal: 4 },
  sectionTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  txList: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 8, marginBottom: 24 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, 
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txType: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  txDate: { color: Colors.muted, fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '900' },
  txStatus: { color: Colors.muted, fontSize: 10, marginTop: 2 },
  methodsCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  methodIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.2)', alignItems: 'center', justifyContent: 'center' },
  methodTitle: { color: Colors.white, fontSize: 15, fontWeight: 'bold' },
  methodDesc: { color: Colors.muted, fontSize: 11, marginTop: 2 },
});

export default SellerWalletScreen;
