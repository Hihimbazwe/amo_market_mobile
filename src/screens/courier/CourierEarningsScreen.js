import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, TrendingUp, Package, CheckCircle, Calendar, ChevronLeft } from 'lucide-react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { courierService } from '../../api/courierService';
import { useFocusEffect } from '@react-navigation/native';

const PERIODS = ['week', 'month', 'all'];

export default function CourierEarningsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ totalEarned: 0, pendingPayout: 0, totalDeliveries: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('month');

  const fetchEarnings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await courierService.getEarnings(user.id, period);
      setRecords(data.records || []);
      setSummary(data.summary || { totalEarned: 0, pendingPayout: 0, totalDeliveries: 0, thisMonth: 0 });
    } catch (e) {
      console.error('Earnings fetch error:', e);
      // If the endpoint doesn't exist yet, just show empty state gracefully
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, period]);

  useFocusEffect(useCallback(() => { fetchEarnings(); }, [fetchEarnings]));

  const stats = [
    { label: 'Total Earned', value: `Rwf ${summary.totalEarned.toLocaleString()}`, icon: TrendingUp, color: '#22c55e' },
    { label: 'Pending Payout', value: `Rwf ${summary.pendingPayout.toLocaleString()}`, icon: Wallet, color: '#eab308' },
    { label: 'This Month', value: `Rwf ${summary.thisMonth.toLocaleString()}`, icon: Calendar, color: '#f97316' },
    { label: 'Deliveries', value: String(summary.totalDeliveries), icon: CheckCircle, color: '#f97316' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.glass }]}>
          <ChevronLeft color={colors.foreground} size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <CustomText style={[styles.title, { color: colors.foreground }]}>Earnings</CustomText>
          <CustomText style={{ fontSize: 12, color: colors.muted }}>Track your delivery commissions</CustomText>
        </View>
      </View>

      <FlatList
        data={records}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchEarnings(true)} tintColor={colors.primary} />}
        ListHeaderComponent={() => (
          <View>
            {/* Stats grid */}
            <View style={styles.statsGrid}>
              {stats.map(s => {
                const Icon = s.icon;
                return (
                  <View key={s.label} style={[styles.statCard, { backgroundColor: `${s.color}15`, borderColor: `${s.color}30` }]}>
                    <View style={styles.statRow}>
                      <CustomText style={[styles.statLabel, { color: colors.muted }]}>{s.label}</CustomText>
                      <Icon color={s.color} size={15} />
                    </View>
                    <CustomText style={[styles.statValue, { color: s.color }]}>{s.value}</CustomText>
                  </View>
                );
              })}
            </View>

            {/* Period filter */}
            <View style={styles.filterRow}>
              {PERIODS.map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[styles.chip, { borderColor: period === p ? '#f97316' : colors.border, backgroundColor: period === p ? 'rgba(249,115,22,0.12)' : colors.glass }]}
                >
                  <CustomText style={{ fontSize: 12, fontWeight: '700', color: period === p ? '#f97316' : colors.muted }}>
                    {p === 'all' ? 'All Time' : `This ${p.charAt(0).toUpperCase() + p.slice(1)}`}
                  </CustomText>
                </TouchableOpacity>
              ))}
            </View>

            <CustomText style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery History</CustomText>

            {loading && <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.record, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.recordTop}>
              <CustomText style={[styles.recordRef, { color: colors.muted }]}>#{item.orderId?.slice(-8).toUpperCase()}</CustomText>
              <View style={[
                styles.payoutBadge,
                { backgroundColor: item.status === 'PAID' ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
                  borderColor: item.status === 'PAID' ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)' }
              ]}>
                <CustomText style={{ fontSize: 10, fontWeight: '700', color: item.status === 'PAID' ? '#22c55e' : '#eab308' }}>
                  {item.status}
                </CustomText>
              </View>
            </View>
            <CustomText style={[styles.recordName, { color: colors.foreground }]}>{item.recipientName}</CustomText>
            <View style={styles.recordFooter}>
              <CustomText style={{ fontSize: 12, color: colors.muted }}>{new Date(item.deliveredAt).toLocaleDateString()}</CustomText>
              <CustomText style={{ fontSize: 16, fontWeight: '900', color: '#22c55e' }}>Rwf {item.commission?.toLocaleString()}</CustomText>
            </View>
          </View>
        )}
        ListEmptyComponent={() => !loading && (
          <View style={styles.emptyBox}>
            <Package color={colors.muted} size={40} />
            <CustomText style={{ color: colors.foreground, fontWeight: '800', marginTop: 12 }}>No earnings yet</CustomText>
            <CustomText style={{ color: colors.muted, fontSize: 13 }}>Complete deliveries to earn commissions</CustomText>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900' },
  listContent: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '47%', borderRadius: 16, borderWidth: 1, padding: 14 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '900' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '900', marginBottom: 12 },
  record: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  recordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  recordRef: { fontSize: 11, fontFamily: 'monospace' },
  payoutBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  recordName: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  recordFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 8 },
});
