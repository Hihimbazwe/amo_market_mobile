import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Menu, Zap, Check, Star, Shield, CreditCard, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';

// Plan derived from backend profile
// 'FREE' | 'STANDARD' | 'ELITE' (mapped from enum)

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 'Rwf 0',
    period: 'forever',
    color: '#6B7280',
    iconColor: '#9CA3AF',
    features: ['5 product listings', 'Standard visibility', '5% transaction fee', 'Email support'],
    missing: ['Featured listings', 'Analytics', 'Priority support', 'Lower fees'],
  },
  {
    id: 'STANDARD',
    name: 'Standard',
    price: 'Rwf 15,000',
    period: 'per month',
    color: '#3B82F6',
    iconColor: '#60A5FA',
    features: ['50 product listings', 'Enhanced visibility', '3% transaction fee', 'Priority email', 'Basic analytics'],
    missing: ['Featured listings', 'Priority support'],
  },
  {
    id: 'ELITE',
    name: 'Elite',
    price: 'Rwf 45,000',
    period: 'per month',
    color: '#F97316',
    iconColor: '#FB923C',
    badge: '🔥 Best Value',
    features: ['Unlimited listings', 'Featured placement', '1.5% transaction fee', '24/7 priority support', 'Advanced analytics', 'Dedicated manager'],
    missing: [],
  },
];

export default function SellerMembershipScreen() {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchProfile = async () => {
    if (!user?.id) return;
    try {
      const data = await sellerService.getMembership(user.id);
      setProfile(data);
    } catch (error) {
      console.error('Error fetching membership:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchProfile();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleUpgrade = (plan) => {
    const currentPlan = profile?.membershipType || 'FREE';
    if (plan.id === currentPlan) return;
    
    Alert.alert(
      `Update to ${plan.name}`,
      `Would you like to switch to the ${plan.name} plan (${plan.price} ${plan.period})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => performUpgrade(plan.id) },
      ]
    );
  };

  const performUpgrade = async (planId) => {
    try {
      await sellerService.upgradeMembership(user.id, planId);
      Alert.alert('Success', 'Membership updated successfully.');
      fetchProfile();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update membership');
    }
  };

  const currentPlanId = profile?.membershipType || 'FREE';
  const currentPlan = PLANS.find(p => p.id === currentPlanId) || PLANS[0];
  const expiryDate = profile?.membershipExpires ? new Date(profile.membershipExpires).toLocaleDateString() : 'N/A';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Membership</CustomText>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
        }
      >
        {loading && !profile ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <>
            {/* Current Plan Hero */}
        <View style={[styles.heroCard, { backgroundColor: `${currentPlan.color}15`, borderColor: `${currentPlan.color}30` }]}>
          <View style={styles.heroLeft}>
            <View style={styles.planBadge}>
              <Star color={currentPlan.color} size={14} fill={currentPlan.color} />
              <CustomText style={[styles.planBadgeText, { color: currentPlan.color }]}>{currentPlanId} PLAN</CustomText>
            </View>
            <CustomText style={[styles.heroTitle, { color: colors.foreground }]}>You're on{'\n'}{currentPlan.name}</CustomText>
            <CustomText style={styles.heroSub}>{currentPlanId === 'FREE' ? 'Upgrade for more features' : `Expires ${expiryDate} · ${currentPlan.price}`}</CustomText>
          </View>
          <View style={styles.heroRight}>
            <Shield color={currentPlan.color} size={60} />
          </View>
        </View>

        {/* Upgrade Callout */}
        <TouchableOpacity
          style={styles.upgradeCallout}
          onPress={() => handleUpgrade(PLANS.find(p => p.id === 'ELITE'))}
        >
          <View style={{ flex: 1 }}>
            <CustomText style={styles.upgradeCalloutTitle}>Upgrade to Elite</CustomText>
            <CustomText style={styles.upgradeCalloutSub}>Unlock unlimited listings & 1.5% fees</CustomText>
          </View>
          <Zap color={Colors.white} size={20} fill={Colors.white} />
        </TouchableOpacity>

        {/* Plan Cards */}
        <CustomText style={styles.sectionLabel}>ALL PLANS</CustomText>
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                isCurrent && { borderColor: plan.color, borderWidth: 1.5 },
              ]}
            >
              {plan.badge && (
                <View style={[styles.planBestBadge, { backgroundColor: `${plan.color}20` }]}>
                  <CustomText style={[styles.planBestBadgeText, { color: plan.color }]}>{plan.badge}</CustomText>
                </View>
              )}
              <View style={styles.planTop}>
                <View>
                  <CustomText style={[styles.planName, { color: plan.color }]}>{plan.name}</CustomText>
                  <View style={styles.planPriceRow}>
                    <CustomText style={[styles.planPrice, { color: colors.foreground }]}>{plan.price}</CustomText>
                    <CustomText style={styles.planPeriod}> / {plan.period}</CustomText>
                  </View>
                </View>
                {isCurrent ? (
                  <View style={[styles.currentChip, { backgroundColor: `${plan.color}20` }]}>
                    <CustomText style={[styles.currentChipText, { color: plan.color }]}>CURRENT</CustomText>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.upgradeBtn, { backgroundColor: plan.color }]}
                    onPress={() => handleUpgrade(plan)}
                  >
                    <CustomText style={styles.upgradeBtnText}>
                    {plan.id === 'FREE' ? 'Current' : 'Upgrade'}
                    </CustomText>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.featureList}>
                {plan.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Check color="#10B981" size={14} />
                    <CustomText style={[styles.featureText, { color: colors.foreground }]}>{f}</CustomText>
                  </View>
                ))}
                {plan.missing.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Check color="rgba(255,255,255,0.1)" size={14} />
                    <CustomText style={[styles.featureText, { color: 'rgba(255,255,255,0.2)', textDecorationLine: 'line-through' }]}>
                      {f}
                    </CustomText>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Billing CTA */}
        <TouchableOpacity style={[styles.billingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <CreditCard color={colors.muted} size={22} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <CustomText style={[styles.billingTitle, { color: colors.foreground }]}>Billing & Invoices</CustomText>
            <CustomText style={styles.billingSub}>View payment history and download receipts</CustomText>
          </View>
          <ChevronRight color={colors.muted} size={20} />
        </TouchableOpacity>

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
  heroCard: {
    backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 24, padding: 24, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
  },
  heroLeft: { flex: 1 },
  heroRight: { marginLeft: 16, opacity: 0.3 },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  planBadgeText: { color: '#F97316', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  heroTitle: { color: Colors.white, fontSize: 24, fontWeight: '900', lineHeight: 30, marginBottom: 8 },
  heroSub: { color: Colors.muted, fontSize: 12 },
  upgradeCallout: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F97316', borderRadius: 16, padding: 18, marginBottom: 28,
    shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  upgradeCalloutTitle: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  upgradeCalloutSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  sectionLabel: { color: Colors.muted, fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 12 },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 14, overflow: 'hidden',
  },
  planBestBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  planBestBadgeText: { fontSize: 11, fontWeight: 'bold' },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planName: { fontSize: 18, fontWeight: '900' },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  planPrice: { color: Colors.white, fontSize: 20, fontWeight: '900' },
  planPeriod: { color: Colors.muted, fontSize: 12 },
  currentChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  currentChipText: { fontSize: 11, fontWeight: 'bold' },
  upgradeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  upgradeBtnText: { color: Colors.white, fontSize: 13, fontWeight: 'bold' },
  featureList: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: Colors.white, fontSize: 13 },
  billingCard: {
    flexDirection: 'row', alignItems: 'center', padding: 18, marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  billingTitle: { color: Colors.white, fontSize: 15, fontWeight: 'bold' },
  billingSub: { color: Colors.muted, fontSize: 12, marginTop: 2 },
});
