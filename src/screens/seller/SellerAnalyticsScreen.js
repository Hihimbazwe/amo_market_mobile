import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Menu, TrendingUp, Users, ShoppingBag, BarChart2, ArrowUpRight } from 'lucide-react-native';
import { Svg, Path, LinearGradient, Stop, Defs, Line, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import NotificationIcon from '../../components/NotificationIcon';
import { useTranslation } from 'react-i18next';

const PERIODS = ['7D', '30D', '3M', '1Y'];

const CHART_W = 300;
const CHART_H = 130;

// Smooth bezier line chart using SVG — matches web recharts visual style
function LineChart({ data, color }) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
        <CustomText style={{ color: '#64748b', fontSize: 12 }}>No revenue data yet</CustomText>
      </View>
    );
  }

  const max = Math.max(...data.map(d => d.value), 1);
  const pts = data.map((d, i) => ({
    x: data.length === 1 ? CHART_W / 2 : (i / (data.length - 1)) * CHART_W,
    y: CHART_H - (d.value / max) * (CHART_H - 10) - 2,
  }));

  // Build smooth cubic bezier path
  let linePath = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx1 = (pts[i - 1].x + pts[i].x) / 2;
    linePath += ` C ${cpx1},${pts[i - 1].y} ${cpx1},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  const areaPath = `${linePath} L ${pts[pts.length - 1].x},${CHART_H} L ${pts[0].x},${CHART_H} Z`;

  return (
    <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ overflow: 'hidden' }}>
      <Defs>
        <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.25" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {/* Horizontal guide lines */}
      {[0.25, 0.5, 0.75, 1].map(pct => (
        <Line
          key={pct}
          x1="0" y1={CHART_H - pct * (CHART_H - 10)}
          x2={CHART_W} y2={CHART_H - pct * (CHART_H - 10)}
          stroke="rgba(255,255,255,0.04)" strokeWidth="1"
        />
      ))}
      <Path d={areaPath} fill="url(#chartGrad)" />
      <Path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Data point dots */}
      {pts.map((pt, i) => (
        <Path key={i} d={`M ${pt.x},${pt.y} m -3,0 a 3,3 0 1,0 6,0 a 3,3 0 1,0 -6,0`}
          fill={color} />
      ))}
    </Svg>
  );
}

export default function SellerAnalyticsScreen() {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const [period, setPeriod] = useState('7D');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const fetch = async () => {
        if (!user?.id) return;
        setLoading(true);
        setError(null);
        try {
          const body = await sellerService.getAnalytics(user.id, period);
          if (!active) return;

          if (body) {
            const placed = body.orders || 0;
            const topProducts = body.topProducts || [];
            const barData = body.barData || [];

            // --- Derived data (same logic as web page.tsx) ---

            // Category revenue from top product names
            const catMap = {};
            topProducts.forEach(p => {
              const key = p.name.split(' ')[0];
              catMap[key] = (catMap[key] || 0) + p.revenue;
            });
            const categoryRevenue = Object.entries(catMap)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value);

            // Age groups
            const ageGroups = [
              { label: '18-24', value: Math.round(placed * 0.18) },
              { label: '25-34', value: Math.round(placed * 0.35) },
              { label: '35-44', value: Math.round(placed * 0.27) },
              { label: '45-54', value: Math.round(placed * 0.13) },
              { label: '55+',   value: Math.round(placed * 0.07) },
            ];

            // Location distribution
            const locationData = [
              { name: 'Kigali', value: 52 },
              { name: 'North',  value: 14 },
              { name: 'South',  value: 16 },
              { name: 'East',   value: 11 },
              { name: 'West',   value: 7  },
            ];

            // Fulfillment funnel
            const orderFunnel = [
              { name: 'Placed',    value: placed,                       color: '#f97316' },
              { name: 'Shipped',   value: Math.round(placed * 0.75),    color: '#3b82f6' },
              { name: 'Delivered', value: Math.round(placed * 0.60),    color: '#10b981' },
              { name: 'Returned',  value: Math.round(placed * 0.05),    color: '#ef4444' },
            ];

            // Gross vs net (web pattern)
            const grossVsNet = barData.map(d => ({
              day:   d.day,
              gross: d.value,
              net:   Math.round(d.value * 0.72),
            }));

            // New vs repeat customers
            const newCustomers    = Math.round(placed * 0.6);
            const repeatCustomers = Math.round(placed * 0.4);

            setData({
              ...body,
              categoryRevenue,
              ageGroups,
              locationData,
              orderFunnel,
              grossVsNet,
              newCustomers,
              repeatCustomers,
            });
          }
        } catch (err) {
          console.error('Error fetching analytics:', err);
          setError('Could not load analytics. Pull down to retry.');
        } finally {
          if (active) setLoading(false);
        }
      };
      fetch();
      return () => { active = false; };
    }, [user, period])
  );

  const fmt = (val) => {
    if (!val) return 'Rwf 0';
    if (val >= 1_000_000) return `Rwf ${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000)     return `Rwf ${(val / 1_000).toFixed(0)}K`;
    return `Rwf ${Number(val).toLocaleString()}`;
  };

  const barData     = data?.barData     || [];
  const topProducts = data?.topProducts || [];
  const maxProdRev  = Math.max(...topProducts.map(p => p.revenue), 1);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>Store Analytics</CustomText>
        <NotificationIcon />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Period Tabs */}
        <View style={[styles.periodRow, { borderBottomColor: colors.border }]}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={styles.periodTab}>
              <CustomText style={[
                styles.periodTabText,
                { color: period === p ? colors.primary : colors.muted },
              ]}>{p}</CustomText>
              {period === p && <View style={[styles.periodUnderline, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <CustomText style={[styles.loadingText, { color: colors.muted }]}>Loading analytics…</CustomText>
          </View>
        ) : error ? (
          <View style={styles.loadingBox}>
            <CustomText style={{ color: colors.error || '#ef4444', textAlign: 'center' }}>{error}</CustomText>
          </View>
        ) : (
          <>
            {/* ── Stat Cards (2×2 grid) ── */}
            <View style={styles.metricsGrid}>
              {[
                { label: 'TOTAL REVENUE', value: fmt(data?.revenue), color: '#10B981', icon: TrendingUp },
                { label: 'PROFILE VIEWS', value: String(data?.views ?? 0), color: '#3B82F6', icon: Users },
                { label: 'ORDERS',        value: String(data?.orders ?? 0), color: '#A855F7', icon: ShoppingBag },
                { label: 'PRODUCTS SOLD', value: String(data?.productsSold ?? 0), color: '#F97316', icon: BarChart2 },
              ].map(m => {
                const Icon = m.icon;
                return (
                  <View key={m.label} style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.metricIcon, { backgroundColor: `${m.color}18` }]}>
                      <Icon color={m.color} size={18} />
                    </View>
                    <CustomText style={[styles.metricValue, { color: colors.foreground }]}>{m.value}</CustomText>
                    <CustomText style={[styles.metricLabel, { color: colors.muted }]}>{m.label}</CustomText>
                    <View style={styles.metricDelta}>
                      <ArrowUpRight color="#10B981" size={10} />
                      <CustomText style={styles.metricDeltaText}>+0%</CustomText>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ── Daily Sales Trend (Line Chart) ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CustomText style={[styles.cardTitle, { color: colors.foreground }]}>Daily Sales Trend</CustomText>
              <CustomText style={[styles.cardSub, { color: colors.muted }]}>
                {barData.length} days · Gross revenue
              </CustomText>
              <View style={styles.chartWrap}>
                <LineChart data={barData} color={colors.primary} />
              </View>
              {/* X-axis labels */}
              {barData.length > 0 && (
                <View style={styles.xLabels}>
                  {(barData.length <= 10 ? barData : barData.filter((_, i) => i % Math.ceil(barData.length / 7) === 0))
                    .map((d, i) => (
                      <CustomText key={i} style={[styles.xLabel, { color: colors.muted }]}>{d.day}</CustomText>
                    ))}
                </View>
              )}
            </View>

            {/* ── Top Products ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CustomText style={[styles.cardTitle, { color: colors.foreground }]}>Top Products</CustomText>
              {topProducts.length === 0 ? (
                <CustomText style={[styles.emptyText, { color: colors.muted }]}>No products sold yet.</CustomText>
              ) : (
                topProducts.map((p, i) => {
                  const pct = Math.round((p.revenue / maxProdRev) * 100);
                  return (
                    <View key={p.name} style={[styles.productRow, i < topProducts.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <View style={[styles.rankBadge, { backgroundColor: `${colors.primary}18` }]}>
                        <CustomText style={[styles.rankText, { color: colors.primary }]}>#{i + 1}</CustomText>
                      </View>
                      <View style={styles.productInfo}>
                        <CustomText style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</CustomText>
                        <CustomText style={[styles.productRevenue, { color: colors.muted }]}>Rwf {p.revenue.toLocaleString()} · {p.sales} sold</CustomText>
                        <View style={[styles.progressBg, { backgroundColor: colors.glass }]}>
                          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* ── Order Fulfillment Funnel ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CustomText style={[styles.cardTitle, { color: colors.foreground }]}>Order Fulfillment Funnel</CustomText>
              {data.orderFunnel.map((s, i) => {
                const widthPct = 100 - i * 14;
                return (
                  <View key={s.name} style={styles.funnelRow}>
                    <View style={[styles.funnelBar, { width: `${widthPct}%`, backgroundColor: s.color + '18', borderColor: s.color }]}>
                      <CustomText style={[styles.funnelLabel, { color: s.color }]}>{s.name}</CustomText>
                      <CustomText style={[styles.funnelVal, { color: s.color }]}>{s.value}</CustomText>
                    </View>
                  </View>
                );
              })}
              {/* Legend */}
              <View style={styles.funnelLegend}>
                {data.orderFunnel.map(s => (
                  <View key={s.name} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                    <CustomText style={[styles.legendText, { color: colors.muted }]}>{s.name}</CustomText>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Revenue by Category ── */}
            {data.categoryRevenue && data.categoryRevenue.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <CustomText style={[styles.cardTitle, { color: colors.foreground }]}>Revenue by Category</CustomText>
                {data.categoryRevenue.map((c, i, arr) => {
                  const maxCat = Math.max(...arr.map(x => x.value), 1);
                  const pct = Math.round((c.value / maxCat) * 100);
                  return (
                    <View key={c.name} style={[styles.categoryRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <View style={[styles.catDot, { backgroundColor: colors.primary }]} />
                      <CustomText style={[styles.catName, { color: colors.foreground }]}>{c.name}</CustomText>
                      <View style={[styles.catBarBg, { backgroundColor: colors.glass }]}>
                        <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                      </View>
                      <CustomText style={[styles.catPct, { color: colors.primary }]}>{fmt(c.value)}</CustomText>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Buyer Age Groups ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CustomText style={[styles.cardTitle, { color: colors.foreground }]}>Buyer Demographics</CustomText>
              <CustomText style={[styles.cardSub, { color: colors.muted }]}>Estimated age distribution</CustomText>
              {data.ageGroups.map(g => {
                const maxAge = Math.max(...data.ageGroups.map(x => x.value), 1);
                const pct = (g.value / maxAge) * 100;
                return (
                  <View key={g.label} style={styles.demoRow}>
                    <CustomText style={[styles.demoLabel, { color: colors.muted }]}>{g.label}</CustomText>
                    <View style={[styles.demoBarBg, { backgroundColor: colors.glass }]}>
                      <View style={[styles.demoBarFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <CustomText style={[styles.demoVal, { color: colors.foreground }]}>{g.value}</CustomText>
                  </View>
                );
              })}
            </View>

            {/* ── Repeat vs New Customers ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CustomText style={[styles.cardTitle, { color: colors.foreground }]}>New vs Repeat Customers</CustomText>
              <View style={styles.customerRow}>
                {[
                  { label: 'New', value: data.newCustomers, color: '#f97316' },
                  { label: 'Repeat', value: data.repeatCustomers, color: '#22c55e' },
                ].map(seg => {
                  const total = (data.newCustomers + data.repeatCustomers) || 1;
                  const pct   = Math.round((seg.value / total) * 100);
                  return (
                    <View key={seg.label} style={styles.customerSeg}>
                      <View style={[styles.customerBar, { backgroundColor: seg.color + '18', borderColor: seg.color }]}>
                        <CustomText style={[styles.customerVal, { color: seg.color }]}>{seg.value}</CustomText>
                        <CustomText style={[styles.customerPct, { color: seg.color }]}>{pct}%</CustomText>
                      </View>
                      <CustomText style={[styles.customerLabel, { color: colors.muted }]}>{seg.label}</CustomText>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── Location Distribution ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CustomText style={[styles.cardTitle, { color: colors.foreground }]}>Location Distribution</CustomText>
              {data.locationData.map((loc, i, arr) => (
                <View key={loc.name} style={[styles.categoryRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <View style={[styles.catDot, { backgroundColor: colors.primary }]} />
                  <CustomText style={[styles.catName, { color: colors.foreground }]}>{loc.name}</CustomText>
                  <View style={[styles.catBarBg, { backgroundColor: colors.glass }]}>
                    <View style={[styles.catBarFill, { width: `${loc.value}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <CustomText style={[styles.catPct, { color: colors.primary }]}>{loc.value}%</CustomText>
                </View>
              ))}
            </View>

          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  menuButton:      { marginRight: 16, padding: 8, borderRadius: 12 },
  content:         { padding: 16, paddingBottom: 80 },

  // Period tabs (matches web tab style)
  periodRow:       { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 20 },
  periodTab:       { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  periodTabText:   { fontSize: 12, fontWeight: '700' },
  periodUnderline: { position: 'absolute', bottom: -1, left: '20%', right: '20%', height: 2, borderRadius: 2 },

  loadingBox:      { paddingVertical: 60, alignItems: 'center', gap: 12 },
  loadingText:     { fontSize: 13 },

  // Stat cards
  metricsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  metricCard:      { width: '47%', borderRadius: 20, padding: 16, borderWidth: 1 },
  metricIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  metricValue:     { fontSize: 20, fontWeight: '900' },
  metricLabel:     { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginTop: 2 },
  metricDelta:     { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  metricDeltaText: { color: '#10B981', fontSize: 10, fontWeight: '700' },

  // Generic card
  card:            { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 20 },
  cardTitle:       { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  cardSub:         { fontSize: 11, marginBottom: 16 },
  emptyText:       { fontSize: 13, textAlign: 'center', paddingVertical: 24 },

  // Line chart
  chartWrap:       { marginVertical: 12 },
  xLabels:         { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  xLabel:          { fontSize: 9 },

  // Top products
  productRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rankBadge:       { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankText:        { fontSize: 12, fontWeight: '900' },
  productInfo:     { flex: 1 },
  productName:     { fontSize: 14, fontWeight: '700' },
  productRevenue:  { fontSize: 11, marginTop: 2, marginBottom: 6 },
  progressBg:      { height: 4, borderRadius: 4 },
  progressFill:    { height: 4, borderRadius: 4 },

  // Funnel
  funnelRow:       { alignItems: 'center', marginBottom: 10 },
  funnelBar:       { height: 48, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  funnelLabel:     { fontSize: 12, fontWeight: '700' },
  funnelVal:       { fontSize: 14, fontWeight: '900' },
  funnelLegend:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, justifyContent: 'center' },
  legendItem:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:       { width: 8, height: 8, borderRadius: 4 },
  legendText:      { fontSize: 10 },

  // Category / location rows
  categoryRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  catDot:          { width: 10, height: 10, borderRadius: 5 },
  catName:         { fontSize: 13, fontWeight: '600', width: 80 },
  catBarBg:        { flex: 1, height: 6, borderRadius: 4, overflow: 'hidden' },
  catBarFill:      { height: 6, borderRadius: 4 },
  catPct:          { fontSize: 11, fontWeight: '700', width: 60, textAlign: 'right' },

  // Demographics
  demoRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  demoLabel:       { width: 46, fontSize: 11, fontWeight: '700' },
  demoBarBg:       { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  demoBarFill:     { height: '100%', borderRadius: 4 },
  demoVal:         { width: 28, fontSize: 11, fontWeight: '700', textAlign: 'right' },

  // Customers
  customerRow:     { flexDirection: 'row', gap: 16, marginTop: 8 },
  customerSeg:     { flex: 1, alignItems: 'center' },
  customerBar:     { width: '100%', height: 80, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  customerVal:     { fontSize: 22, fontWeight: '900' },
  customerPct:     { fontSize: 11, fontWeight: '700', marginTop: 2 },
  customerLabel:   { fontSize: 12, fontWeight: '600', marginTop: 8 },
});
