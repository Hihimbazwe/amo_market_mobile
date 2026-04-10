import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Menu, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useTheme } from '../../context/ThemeContext';

const mockTransactions = [
  { id: 'TX-100', type: 'deposit', amount: 'RWF 15,000', date: 'Oct 24, 2023', status: 'Completed' },
  { id: 'TX-99', type: 'withdrawal', amount: 'RWF 5,000', date: 'Oct 21, 2023', status: 'Completed' },
];

const BuyerWalletScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Wallet</CustomText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.balanceCard, { backgroundColor: colors.primary + '1a', borderColor: colors.primary + '33' }]}>
          <CustomText style={[styles.balanceLabel, { color: colors.muted }]}>Available Balance</CustomText>
          <CustomText style={[styles.balanceAmount, { color: colors.foreground }]}>RWF 45,000</CustomText>
          <View style={styles.actionButtons}>
            <CustomButton title="Deposit" style={styles.actionBtn} />
            <CustomButton title="Withdraw" style={[styles.actionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary }]} />
          </View>
        </View>

        <CustomText variant="h2" style={{ marginBottom: 16, marginTop: 32 }}>Recent Transactions</CustomText>
        {mockTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Wallet color={colors.muted} size={48} />
            <CustomText variant="subtitle" style={{ marginTop: 16 }}>No transactions yet.</CustomText>
          </View>
        ) : (
          mockTransactions.map((tx) => (
            <View key={tx.id} style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              <View style={styles.txLeft}>
                <View style={[styles.iconBox, { backgroundColor: tx.type === 'deposit' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }]}>
                  {tx.type === 'deposit' ? <ArrowDownRight color="#10B981" size={20} /> : <ArrowUpRight color="#EF4444" size={20} />}
                </View>
                <View>
                  <CustomText style={[styles.txType, { color: colors.foreground }]}>{tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</CustomText>
                  <CustomText style={[styles.txDate, { color: colors.muted }]}>{tx.date}</CustomText>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <CustomText style={[styles.txAmount, { color: tx.type === 'deposit' ? '#10B981' : colors.foreground }]}>
                  {tx.type === 'deposit' ? '+' : '-'}{tx.amount}
                </CustomText>
                <CustomText style={[styles.txStatus, { color: colors.muted }]}>{tx.status}</CustomText>
              </View>
            </View>
          ))
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
  content: {
    padding: 16,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 48,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txType: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  txDate: {
    fontSize: 12,
  },
  txAmount: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  txStatus: {
    fontSize: 12,
  },
});

export default BuyerWalletScreen;
