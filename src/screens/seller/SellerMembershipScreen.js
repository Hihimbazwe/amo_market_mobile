import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl, Modal, TextInput, Dimensions } from 'react-native';
import {
  Menu, Zap, Check, Star, Shield, CreditCard, ChevronRight,
  Crown, Rocket, ShieldCheck, TrendingUp, Users, Award, ArrowLeft,
  Smartphone, Wallet, X, Loader2, Building2
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const HIGHLIGHTS = [
  { icon: ShieldCheck, label: "Verified Seller Badge", desc: "Build trust with buyers instantly" },
  { icon: TrendingUp, label: "Boosted Visibility", desc: "Appear higher in search results" },
  { icon: Users, label: "Larger Audience", desc: "Reach thousands of active buyers" },
  { icon: Award, label: "Premium Support", desc: "Priority help when you need it" },
];

const PAYMENT_METHODS = [
  { id: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
  { id: 'CARD', label: 'Credit Card', icon: CreditCard },
  { id: 'WALLET', label: 'AMO Wallet', icon: Wallet },
];

export default function SellerMembershipScreen() {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const navigation = useNavigation();
  
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [billing, setBilling] = useState('monthly');
  const [upgrading, setUpgrading] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('MOBILE_MONEY');

  const fetchMembershipData = async () => {
    if (!user?.id) return;
    try {
      const data = await sellerService.getMembership(user.id);
      setProfile(data);
      // Hardcoded plans matching web app for visual parity
      const availablePlans = [
        {
          id: "free",
          name: "Starter",
          icon: Zap,
          price: 0,
          period: "Forever free",
          colors: ["#334155", "#1e293b"],
          border: "rgba(255,255,255,0.1)",
          badge: null,
          features: ["10 product listings", "Standard placement", "Basic analytics", "Email support"],
          disabled: ["Product video uploads", "Featured placement", "Priority support"],
        },
        {
          id: "pro",
          name: "Pro Seller",
          icon: Crown,
          price: 15000,
          period: "per month",
          colors: ["#F97316", "#EA580C"],
          border: "rgba(249,115,22,0.4)",
          badge: "Most Popular",
          features: ["100 product listings", "Featured placement", "Video uploads", "Priority support", "Pro badge", "Express delivery"],
          disabled: [],
        },
        {
          id: "elite",
          name: "Elite",
          icon: Rocket,
          price: 45000,
          period: "per month",
          colors: ["#A855F7", "#7C3AED"],
          border: "rgba(168,85,247,0.4)",
          badge: "Best Value",
          features: ["Unlimited listings", "Top placement", "Full analytics", "Dedicated manager", "Elite badge", "API access", "Custom store page"],
          disabled: [],
        },
      ];
      setPlans(availablePlans);
    } catch (error) {
      console.error('Error fetching membership:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMembershipData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMembershipData();
  };

  const handleUpgradePress = (plan) => {
    if (plan.id === profile?.membershipType?.toLowerCase()) return;
    setSelectedPlan(plan);
    if (plan.price > 0) {
      setShowPayment(true);
    } else {
      performUpgrade(plan.id);
    }
  };

  const performUpgrade = async (planId) => {
    setUpgrading(planId);
    setShowPayment(false);
    try {
      await sellerService.upgradeMembership(user.id, planId);
      Alert.alert('Success', `Successfully upgraded to ${plans.find(p => p.id === planId)?.name}!`);
      fetchMembershipData();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update membership');
    } finally {
      setUpgrading(null);
    }
  };

  const currentPlanId = profile?.membershipType?.toLowerCase() || 'free';

  if (loading && !profile) {
    return (
      <View style={[styles.loadingFull, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
            <Menu color={colors.foreground} size={22} />
          </TouchableOpacity>
        </View>
        <CustomText variant="h2">Membership</CustomText>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.hero}>
          <LinearGradient 
            colors={['rgba(249,115,22,0.15)', 'rgba(234,88,12,0.05)']} 
            style={styles.heroBadge}
          >
            <Star color="#F97316" size={12} fill="#F97316" />
            <CustomText style={[styles.heroBadgeText, { color: '#F97316' }]}>MEMBERSHIP PLANS</CustomText>
          </LinearGradient>
          <CustomText style={styles.heroTitle}>Unlock Your Selling {'\n'}<CustomText style={{ color: '#F97316' }}>Potential</CustomText></CustomText>
          <CustomText style={styles.heroSub}>Upgrade your plan to access premium features and grow your business on AMO.</CustomText>
        </View>

        <View style={styles.highlightsGrid}>
          {HIGHLIGHTS.map((item, idx) => (
            <View key={idx} style={[styles.highlightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.highlightIconBox, { backgroundColor: 'rgba(249,115,22,0.1)' }]}>
                <item.icon color="#F97316" size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <CustomText style={styles.highlightLabel}>{item.label}</CustomText>
                <CustomText style={styles.highlightDesc}>{item.desc}</CustomText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.billingToggleContainer}>
          <View style={[styles.billingToggle, { backgroundColor: colors.glass }]}>
            <TouchableOpacity 
              onPress={() => setBilling('monthly')}
              style={[styles.billingBtn, billing === 'monthly' && { backgroundColor: '#F97316' }]}
            >
              <CustomText style={[styles.billingBtnText, { color: billing === 'monthly' ? 'white' : colors.muted }]}>Monthly</CustomText>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setBilling('yearly')}
              style={[styles.billingBtn, billing === 'yearly' && { backgroundColor: '#F97316' }]}
            >
              <CustomText style={[styles.billingBtnText, { color: billing === 'yearly' ? 'white' : colors.muted }]}>Yearly</CustomText>
              <View style={styles.saveBadge}><CustomText style={styles.saveBadgeText}>-20%</CustomText></View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.plansContainer}>
          {plans.map((plan) => {
            const isActive = currentPlanId === plan.id;
            const PlanIcon = plan.icon;
            const price = billing === 'yearly' ? Math.round(plan.price * 0.8) : plan.price;

            return (
              <View 
                key={plan.id} 
                style={[
                  styles.planCard, 
                  { backgroundColor: colors.card, borderColor: isActive ? plan.colors[0] : colors.border },
                  isActive && { borderWidth: 2 }
                ]}
              >
                {plan.badge && (
                  <View style={[styles.planBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                    <CustomText style={[styles.planBadgeText, { color: 'white' }]}>{plan.badge}</CustomText>
                  </View>
                )}
                
                <LinearGradient 
                  colors={plan.colors} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 1 }} 
                  style={styles.planHeader}
                >
                   <View style={styles.planHeaderTop}>
                      <View style={[styles.planIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <PlanIcon color="white" size={22} />
                      </View>
                      <View>
                        <CustomText style={styles.planName}>{plan.name}</CustomText>
                        <CustomText style={styles.planPeriodText}>{plan.period}</CustomText>
                      </View>
                   </View>
                   <View style={styles.planPriceRow}>
                      <CustomText style={styles.planCurrency}>Rwf</CustomText>
                      <CustomText style={styles.planPrice}>{price.toLocaleString()}</CustomText>
                      {plan.price > 0 && <CustomText style={styles.planMo}>/mo</CustomText>}
                   </View>
                </LinearGradient>

                <View style={styles.planBody}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                       <View style={styles.checkIcon}><Check color="#10B981" size={12} /></View>
                       <CustomText style={styles.featureText}>{f}</CustomText>
                    </View>
                  ))}
                  {plan.disabled?.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                       <View style={[styles.checkIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}><Check color={colors.muted} size={12} /></View>
                       <CustomText style={[styles.featureText, { color: colors.muted, textDecorationLine: 'line-through', opacity: 0.6 }]}>{f}</CustomText>
                    </View>
                  ))}

                  <TouchableOpacity 
                    style={[
                      styles.actionBtn, 
                      { backgroundColor: plan.colors[0] },
                      isActive && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
                      upgrading === plan.id && { opacity: 0.7 }
                    ]}
                    onPress={() => handleUpgradePress(plan)}
                    disabled={isActive || upgrading !== null}
                  >
                    {upgrading === plan.id ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <CustomText style={[styles.actionBtnText, { color: isActive ? colors.muted : 'white' }]}>
                        {isActive ? "Current Plan" : (plan.price === 0 ? "Starter" : "Upgrade Now")}
                      </CustomText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={[styles.comparisonCard, { backgroundColor: colors.glass, borderColor: colors.border }]}>
          <Users color={colors.muted} size={20} />
          <View style={{ flex: 1, marginLeft: 16 }}>
             <CustomText style={styles.comparisonTitle}>Full Feature Comparison</CustomText>
             <CustomText style={styles.comparisonSub}>Detailed breakdown of all listing perks</CustomText>
          </View>
          <ChevronRight color={colors.muted} size={20} />
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showPayment} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPayment(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
             <View style={styles.modalHeader}>
                <View>
                  <CustomText variant="h3">Upgrade to {selectedPlan?.name}</CustomText>
                  <CustomText style={{ color: colors.muted, fontSize: 13 }}>Choose payment method</CustomText>
                </View>
                <TouchableOpacity onPress={() => setShowPayment(false)}><X color={colors.muted} size={24} /></TouchableOpacity>
             </View>

             <View style={styles.payMethodsGrid}>
                {PAYMENT_METHODS.map((m) => {
                   const MIcon = m.icon;
                   return (
                    <TouchableOpacity 
                      key={m.id} 
                      style={[styles.payMethodBtn, { borderColor: paymentMethod === m.id ? '#F97316' : colors.border, backgroundColor: paymentMethod === m.id ? 'rgba(249,115,22,0.1)' : colors.glass }]}
                      onPress={() => setPaymentMethod(m.id)}
                    >
                      <MIcon color={paymentMethod === m.id ? '#F97316' : colors.muted} size={18} />
                      <CustomText style={[styles.payMethodLabel, { color: paymentMethod === m.id ? '#F97316' : colors.muted }]}>{m.label}</CustomText>
                    </TouchableOpacity>
                   );
                })}
             </View>

             {paymentMethod === 'MOBILE_MONEY' && (
                <View style={styles.modalInputGroup}>
                   <TextInput placeholder="Mobile Number (+250...)" placeholderTextColor={colors.muted} style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border }]} keyboardType="phone-pad" />
                </View>
             )}

             <TouchableOpacity 
              style={[styles.payBtn, { backgroundColor: '#F97316' }]} 
              onPress={() => performUpgrade(selectedPlan.id)}
             >
                <CustomText style={styles.payBtnText}>Pay & Activate Plan</CustomText>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingFull: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  menuButton: { padding: 8, borderRadius: 12 },
  backBtn: { padding: 8, borderRadius: 12 },
  content: { padding: 16, paddingBottom: 60 },
  
  hero: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  heroBadgeText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  heroTitle: { fontSize: 32, fontWeight: '900', textAlign: 'center', color: 'white', lineHeight: 40 },
  heroSub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 12, maxWidth: '85%', lineHeight: 20 },

  highlightsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  highlightCard: { width: '48%', padding: 16, borderRadius: 24, borderWidth: 1, gap: 12 },
  highlightIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  highlightLabel: { fontSize: 14, fontWeight: 'bold', color: '#F1F5F9' },
  highlightDesc: { fontSize: 11, color: '#64748B', marginTop: 4, lineHeight: 16 },

  billingToggleContainer: { alignItems: 'center', marginBottom: 32 },
  billingToggle: { flexDirection: 'row', padding: 6, borderRadius: 20, gap: 4 },
  billingBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  billingBtnText: { fontSize: 14, fontWeight: 'bold' },
  saveBadge: { backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  saveBadgeText: { color: '#10B981', fontSize: 10, fontWeight: 'bold' },

  plansContainer: { gap: 24, marginBottom: 32 },
  planCard: { borderRadius: 32, borderWidth: 1, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  planBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 18, paddingVertical: 8, borderBottomLeftRadius: 20, zIndex: 10 },
  planBadgeText: { fontSize: 11, fontWeight: '900' },
  planHeader: { padding: 28 },
  planHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  planIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  planName: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  planPeriodText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  planCurrency: { fontSize: 20, color: 'white', fontWeight: 'bold' },
  planPrice: { fontSize: 36, color: 'white', fontWeight: '900' },
  planMo: { fontSize: 16, color: 'rgba(255,255,255,0.7)' },
  
  planBody: { padding: 28, gap: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  checkIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 14, color: '#E2E8F0' },
  actionBtn: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  actionBtnText: { fontSize: 16, fontWeight: 'bold' },

  comparisonCard: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 28, borderWidth: 1 },
  comparisonTitle: { fontSize: 16, fontWeight: 'bold', color: 'white' },
  comparisonSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { padding: 28, borderTopLeftRadius: 40, borderTopRightRadius: 40, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  payMethodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  payMethodBtn: { width: '48%', height: 64, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'row' },
  payMethodLabel: { fontSize: 13, fontWeight: 'bold' },
  modalInputGroup: { marginBottom: 32 },
  modalInput: { height: 60, borderRadius: 18, borderWidth: 1, paddingHorizontal: 20, fontSize: 16 },
  payBtn: { height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  payBtnText: { color: 'white', fontWeight: 'bold', fontSize: 17 },
});


