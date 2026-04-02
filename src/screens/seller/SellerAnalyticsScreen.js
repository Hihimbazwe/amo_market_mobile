import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Menu, TrendingUp, Users, ShoppingBag, BarChart2, ArrowUpRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';


// Removed hardcoded data constants as they are now fetched from the backend

const PERIODS = ['7D', '30D', '3M', '1Y'];

export default function SellerAnalyticsScreen() {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [period, setPeriod] = useState('7D');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const fetchAnalytics = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
          const data = await sellerService.getAnalytics(user.id, period);
          setAnalytics(data);
        } catch (error) {
          console.error('Error fetching analytics:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchAnalytics();
    }, [user, period])
  );

  const formatPrice = (val) => {
      if (!val) return 'Rwf 0';
      if (val >= 1000000) return `Rwf ${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `Rwf ${(val / 1000).toFixed(0)}K`;
      return `Rwf ${val}`;
  };

  const barData = analytics?.barData || [];
  const displayData = barData.slice(-7);
  const maxVal = Math.max(...displayData.map(d => d.value), 1);

  const topProducts = analytics?.topProducts || [];
  const maxProductRevenue = Math.max(...topProducts.map(p => p.revenue), 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Store Analytics</CustomText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && !analytics ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <>
            {/* Key Metrics */}
            <View style={styles.metricsGrid}>
              {[
                { label: 'REVENUE', value: formatPrice(analytics?.revenue), delta: '+18%', color: '#10B981', icon: TrendingUp },
                { label: 'VISITORS', value: analytics?.views || '0', delta: '+9%', color: '#3B82F6', icon: Users },
                { label: 'ORDERS', value: analytics?.orders || '0', delta: '+24%', color: '#A855F7', icon: ShoppingBag },
                { label: 'SOLD', value: analytics?.productsSold || '0', delta: '+1.2%', color: '#F97316', icon: BarChart2 },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <View key={m.label} style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.metricIcon, { backgroundColor: `${m.color}15` }]}>
                      <Icon color={m.color} size={18} />
                    </View>
                    <CustomText style={[styles.metricValue, { color: colors.foreground }]}>{m.value}</CustomText>
                    <CustomText style={styles.metricLabel}>{m.label}</CustomText>
                    <View style={styles.metricDelta}>
                      <ArrowUpRight color="#10B981" size={10} />
                      <CustomText style={styles.metricDeltaText}>{m.delta}</CustomText>
                    </View>
                  </View>
                );
              })}
            </View>

        {/* Revenue Chart */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <CustomText style={styles.chartTitle}>Revenue Over Time</CustomText>
            <View style={styles.periodPicker}>
              {PERIODS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodChip, { backgroundColor: colors.glass }, period === p && { backgroundColor: colors.primary }]}
                  onPress={() => setPeriod(p)}
                >
                  <CustomText style={[styles.periodText, period === p && { color: colors.white }]}>{p}</CustomText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bar Chart */}
          <View style={styles.barChart}>
            {displayData.map((d, i) => {
              const heightPct = (d.value / maxVal) * 100;
              return (
                <View key={i} style={styles.barGroup}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(heightPct, 5)}%`,
                          backgroundColor: i === displayData.length - 1 ? colors.primary : colors.isDarkMode ? 'rgba(249,115,22,0.35)' : 'rgba(249,115,22,0.2)',
                        },
                      ]}
                    />
                  </View>
                  <CustomText style={styles.barLabel}>{d.day}</CustomText>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          <CustomText style={styles.sectionTitle}>Top Products</CustomText>
          <View style={styles.listCard}>
            {topProducts.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <CustomText style={{ color: Colors.muted }}>No products sold yet.</CustomText>
              </View>
            ) : (
              topProducts.map((p, i) => {
                const pct = Math.round((p.revenue / maxProductRevenue) * 100);
                return (
                  <View key={p.name} style={[styles.productRow, i < topProducts.length - 1 && styles.rowDivider]}>
                    <View style={styles.rankBadge}>
                      <CustomText style={styles.rankText}>#{i + 1}</CustomText>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <CustomText style={styles.productName} numberOfLines={1}>{p.name}</CustomText>
                      <CustomText style={styles.productRevenue}>Rwf {p.revenue.toLocaleString()}</CustomText>
                      {/* Progress bar */}
                      <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                    <CustomText style={styles.productPct}>{p.sales} sales</CustomText>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Category Breakdown (Static for now as backend doesn't provide it yet) */}
        <View style={styles.section}>
          <CustomText style={styles.sectionTitle}>Sales by Category</CustomText>
          <View style={styles.listCard}>
            {[
              { name: 'Products', pct: 100, color: '#3B82F6' },
            ].map((c, i, arr) => (
              <View key={c.name} style={[styles.categoryRow, i < arr.length - 1 && styles.rowDivider]}>
                <View style={[styles.catDot, { backgroundColor: c.color }]} />
                <CustomText style={styles.catName}>{c.name}</CustomText>
                <View style={styles.catBarBg}>
                  <View style={[styles.catBarFill, { width: `${c.pct}%`, backgroundColor: c.color }]} />
                </View>
                <CustomText style={[styles.catPct, { color: c.color }]}>{c.pct}%</CustomText>
              </View>
            ))}
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
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  metricCard: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', position: 'relative',
  },
  metricIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  metricValue: { color: Colors.white, fontSize: 20, fontWeight: '900' },
  metricLabel: { color: Colors.muted, fontSize: 9, fontWeight: 'bold', letterSpacing: 0.8, marginTop: 2 },
  metricDelta: {
    position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  metricDeltaText: { color: '#10B981', fontSize: 10, fontWeight: 'bold' },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 24,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitle: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  periodPicker: { flexDirection: 'row', gap: 6 },
  periodChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  periodChipActive: { backgroundColor: '#F97316' },
  periodText: { color: Colors.muted, fontSize: 11, fontWeight: 'bold' },
  periodTextActive: { color: Colors.white },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 },
  barGroup: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barContainer: { width: '100%', height: '85%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6, minHeight: 4 },
  barLabel: { color: Colors.muted, fontSize: 8, marginTop: 6, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  listCard: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  productRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rankBadge: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(249,115,22,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { color: '#F97316', fontSize: 12, fontWeight: '900' },
  productName: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  productRevenue: { color: Colors.muted, fontSize: 11, marginTop: 2, marginBottom: 6 },
  progressBg: { height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill: { height: 4, borderRadius: 4, backgroundColor: '#F97316' },
  productPct: { color: Colors.muted, fontSize: 12, fontWeight: 'bold', marginLeft: 12 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { color: Colors.white, fontSize: 13, fontWeight: '600', width: 90 },
  catBarBg: { flex: 1, height: 6, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)' },
  catBarFill: { height: 6, borderRadius: 4 },
  catPct: { fontSize: 12, fontWeight: 'bold', width: 36, textAlign: 'right' },
});
