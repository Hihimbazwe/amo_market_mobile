import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { 
  Menu, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownToLine, 
  Clock, 
  History, 
  CreditCard,
  TrendingUp,
  ArrowDownLeft
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { walletService } from '../../api/walletService';
import { sellerService } from '../../api/sellerService';

const SellerWalletScreen = ({ navigation }) => {
  const { toggleDrawer } = useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await sellerService.getWallet(user.id);
      setWallet(data);
    } catch (error) {
      console.error('Error fetching seller wallet:', error);
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

  const renderTransaction = (tx) => {
    const isWithdraw = tx.method !== undefined || tx.type === 'WITHDRAWAL';
    const Icon = isWithdraw ? ArrowUpRight : ArrowDownLeft;
    const statusColor = tx.status === 'COMPLETED' ? '#10b981' : tx.status === 'FAILED' ? '#ef4444' : '#f59e0b';
    
    return (
      <View key={tx.id} style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        <View style={styles.txLeft}>
          <View style={[styles.iconBox, { backgroundColor: !isWithdraw ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }]}>
            <Icon color={!isWithdraw ? '#10b981' : '#ef4444'} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <CustomText style={[styles.txType, { color: colors.foreground }]} numberOfLines={1}>
              {!isWithdraw ? t('productSale') : `${t('withdrawal')} (${tx.method})`}
            </CustomText>
            <CustomText style={[styles.txDate, { color: colors.muted }]}>
              {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </CustomText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <CustomText style={[styles.txAmount, { color: !isWithdraw ? '#10b981' : colors.foreground }]}>
            {!isWithdraw ? '+' : '-'}Rwf {tx.amount?.toLocaleString()}
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
        showsVerticalScrollIndicator={false}
      >
        {/* Seller Balance Card */}
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
              onPress={() => navigation.navigate('SellerWithdraw')}
            >
              <ArrowUpRight size={18} color={colors.primary} />
              <CustomText style={[styles.actionBtnText, { color: colors.primary }]}>{t('withdraw')}</CustomText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionBtnOutline}
              onPress={() => { /* Potential Payout Methods Navigation */ }}
            >
              <Clock size={18} color="#fff" />
              <CustomText style={[styles.actionBtnText, { color: '#fff' }]}>{t('payoutMethods')}</CustomText>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <CustomText style={[styles.statLabel, { color: colors.muted }]}>{t('pendingUpper')}</CustomText>
            <CustomText style={[styles.statValue, { color: colors.foreground }]}>Rwf {(wallet?.pendingBalance ?? 0).toLocaleString()}</CustomText>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <CustomText style={[styles.statLabel, { color: colors.muted }]}>{t('lifetimeEarnings')}</CustomText>
            <CustomText style={[styles.statValue, { color: colors.foreground }]}>Rwf {(wallet?.lifetimeEarnings ?? 0).toLocaleString()}</CustomText>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <History color={colors.primary} size={20} />
            <CustomText variant="h2">{t('transactionHistory')}</CustomText>
          </View>
          <CustomText variant="caption" style={{ color: colors.muted }}>
            {wallet?.transactions?.length ?? 0} {t('records')}
          </CustomText>
        </View>

        {!wallet || !wallet.transactions || wallet.transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.card }]}>
              <Wallet color={colors.muted} size={40} />
            </View>
            <CustomText variant="subtitle" style={{ marginTop: 16, color: colors.muted }}>{t('noTransactions')}</CustomText>
          </View>
        ) : (
          wallet?.transactions?.map(renderTransaction)
        )}

        {/* Payout Method Shortcut */}
        <TouchableOpacity 
          style={[styles.payoutCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
          onPress={() => { /* Navigate to payout settings */ }}
        >
          <View style={styles.payoutLeft}>
            <View style={[styles.payoutIcon, { backgroundColor: colors.primary + '15' }]}>
               <Building2 size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
               <CustomText style={[styles.payoutTitle, { color: colors.foreground }]}>{t('payoutMethods')}</CustomText>
               <CustomText variant="caption" style={{ color: colors.muted }}>{t('managePayoutAccounts')}</CustomText>
            </View>
          </View>
          <ChevronRight size={20} color={colors.muted} />
        </TouchableOpacity>
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
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
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
    flex: 1,
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
    fontSize: 14,
  },
  txDate: {
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontWeight: '900',
    fontSize: 14,
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
    marginTop: 20,
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
  payoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 40,
  },
  payoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  payoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payoutTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  }
});

export default SellerWalletScreen;
