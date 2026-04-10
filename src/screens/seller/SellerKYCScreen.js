import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl, TextInput, Modal, Image } from 'react-native';
import {
  Menu, ShieldCheck, ShieldAlert, Clock, Upload, CreditCard, Camera,
  Building2, CheckCircle2, XCircle, AlertCircle, ChevronRight,
  Phone, Smartphone, Zap, Check, X, Mail, Star, Wallet,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { sellerService } from '../../api/sellerService';
import { aiService } from '../../api/aiService';

const STEPS = ["Business Profile"];

const getKycSteps = (profile) => [
  {
    id: 'id',
    title: 'National ID / Passport',
    subtitle: 'Upload front and back of your national ID or a valid passport',
    icon: CreditCard,
    status: profile?.idDocumentUrl ? 'approved' : 'not_started',
  },
  {
    id: 'cit',
    title: 'CIT Tax Declaration',
    subtitle: 'Upload your latest Corporate Income Tax (CIT) declaration',
    icon: ShieldAlert,
    status: profile?.citDeclarationUrl ? 'approved' : 'not_started',
  },
  {
    id: 'business',
    title: 'Business Registration',
    subtitle: 'Upload your RDB certificate or business registration document',
    icon: Building2,
    status: profile?.rdbCertificateUrl ? 'approved' : 'not_started',
  },
];

const PAYMENT_METHODS = [
  { id: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
  { id: 'CARD', label: 'Credit / Debit Card', icon: CreditCard },
  { id: 'WALLET', label: 'AMO Wallet', icon: Wallet },
];

export default function SellerKYCScreen() {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const navigation = useNavigation();
  
  // Onboarding Logic
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [dbPlans, setDbPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('MOBILE_MONEY');
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // KYC Docs State
  const [phone, setPhone] = useState('');
  const [docs, setDocs] = useState({
    id: null,
    cit: null,
    business: null,
  });
  const [uploading, setUploading] = useState(null);
  const [idValidation, setIdValidation] = useState({ status: 'pending', reason: '' }); // pending, validating, valid, invalid

  const fetchProfileAndPlans = async () => {
    if (!user?.id) return;
    try {
      const [kycData, plansData] = await Promise.all([
        sellerService.getKycStatus(user.id),
        sellerService.getMembership(user.id)
      ]);
      setProfile(kycData);
      setDbPlans(plansData);
      if (kycData?.phone) setPhone(kycData.phone);
      if (kycData?.kycSubmitted) {
        // If already submitted, we can still show the profile or redirect
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfileAndPlans();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileAndPlans();
  };

  const pickImage = async (stepId) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64 = result.assets[0].base64;
      setDocs(prev => ({ ...prev, [stepId]: base64 }));
      if (stepId === 'id') {
        handleIDValidation(base64);
      }
    }
  };

  const handleIDValidation = async (base64) => {
    setIdValidation({ status: 'validating', reason: '' });
    try {
      const result = await aiService.validateImage(base64, 'id');
      if (result.valid) {
        setIdValidation({ status: 'valid', reason: result.reason });
      } else {
        setIdValidation({ status: 'invalid', reason: result.reason });
        Alert.alert('ID Validation Failed', result.reason);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setIdValidation({ status: 'invalid', reason: 'Validation system unavailable. Please try again.' });
    }
  };

  const takePhoto = async (stepId) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64 = result.assets[0].base64;
      setDocs(prev => ({ ...prev, [stepId]: base64 }));
      if (stepId === 'id') {
        handleIDValidation(base64);
      }
    }
  };

  const handleUpload = (stepId) => {
    Alert.alert(
      'Upload Document',
      'Choose how to upload your document',
      [
        { text: 'Take Photo', onPress: () => takePhoto(stepId) },
        { text: 'Choose from Gallery', onPress: () => pickImage(stepId) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSubmitKyc = async () => {
    if (!docs.id || !docs.cit || !docs.business || !phone) {
      Alert.alert('Missing Info', 'Please complete all document uploads and enter your phone number.');
      return;
    }

    if (idValidation.status !== 'valid') {
      Alert.alert('ID Not Validated', idValidation.reason || 'Please upload a clear, valid ID document before submitting.');
      return;
    }

    setLoadingSubmit(true);
    try {
      await sellerService.submitKYC(user.id, {
        idDocumentUrl: docs.id,
        citDeclarationUrl: docs.cit,
        rdbCertificateUrl: docs.business,
        phone: phone,
      });
      
      Alert.alert('Success', 'Business Profile submitted successfully!', [
        { text: 'Complete Membership', onPress: () => navigation.navigate('SellerMembership') }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit KYC');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const activatePlan = async (planId) => {
    setLoadingSubmit(true);
    try {
      await sellerService.upgradeMembership(user.id, planId);
      Alert.alert('Success', 'Plan activated! Welcome to your store.');
      navigation.navigate('SellerMembership');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to activate plan');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleLaunchStore = () => {
    if (!selectedPlan) {
      Alert.alert('Select Plan', 'Please select a membership plan to continue.');
      return;
    }
    const plan = dbPlans.find(p => p.id === selectedPlan);
    if (plan?.price > 0) {
      setShowPayment(true);
    } else {
      activatePlan(selectedPlan);
    }
  };

  const handlePayAndLaunch = async () => {
    setShowPayment(false);
    await activatePlan(selectedPlan);
  };

  const currentKycSteps = getKycSteps(profile);

  if (loading && !profile) {
    return (
      <View style={[styles.loadingFull, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // const isGmail = user?.email?.toLowerCase().endsWith("@gmail.com");
  const isEmailVerified = user?.emailVerified; // || isGmail;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">KYC Verification</CustomText>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Step Indicator - Simplified for single phase */}
        <View style={styles.stepIndicatorRows}>
          <View style={styles.stepIndicatorItem}>
            <View style={styles.stepIndicatorRow}>
              <View style={[
                styles.stepNumber,
                { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}>
                <Building2 color="white" size={16} />
              </View>
              <CustomText style={[styles.stepLabel, { color: colors.foreground }]}>Business Profile</CustomText>
            </View>
          </View>
        </View>

        {/* Step 0: Business Profile */}
        {step === 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
             <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15` }]}>
                  <ShieldCheck color={colors.primary} size={24} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <CustomText variant="h3">Identity Verification</CustomText>
                  <CustomText style={{ color: colors.muted, fontSize: 12 }}>Complete profiling to start selling</CustomText>
                </View>
             </View>

             {/* Account Verification Section (Mapped from Web) */}
             <View style={styles.inputGroup}>
                <CustomText style={styles.inputLabel}>ACCOUNT ACCOUNTABILITY</CustomText>
                <View style={[
                  styles.accountStatusCard, 
                  { 
                    backgroundColor: isEmailVerified ? 'rgba(16,185,129,0.08)' : 'rgba(249,115,22,0.05)',
                    borderColor: isEmailVerified ? 'rgba(16,185,129,0.2)' : 'rgba(249,115,22,0.2)'
                  }
                ]}>
                  <View style={styles.accountStatusHeader}>
                    <View style={[
                      styles.statusIconBox, 
                      { backgroundColor: isEmailVerified ? 'rgba(16,185,129,0.15)' : 'rgba(249,115,22,0.15)' }
                    ]}>
                      {isEmailVerified ? <ShieldCheck color="#10B981" size={18} /> : <Mail color="#F97316" size={18} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <CustomText style={styles.accountEmail}>{user?.email}</CustomText>
                      <CustomText style={styles.accountStatusText}>
                        {/* {isGmail ? "Google Verified Accountability" : isEmailVerified ? "Email address verified" : "Action required: Verify email"} */}
                        {isEmailVerified ? "Email address verified" : "Action required: Verify email"}
                      </CustomText>
                    </View>
                    {isEmailVerified && <CheckCircle2 color="#10B981" size={18} />}
                  </View>
                </View>
             </View>

             <View style={styles.inputGroup}>
                <CustomText style={styles.inputLabel}>BUSINESS CONTACT</CustomText>
                <View style={[styles.inputBox, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                  <Phone color={colors.muted} size={18} />
                  <TextInput 
                    placeholder="Phone number (+250...)" placeholderTextColor={colors.muted}
                    value={phone} onChangeText={setPhone} keyboardType="phone-pad"
                    style={[styles.textInput, { color: colors.foreground }]}
                  />
                </View>
             </View>

             <CustomText style={[styles.inputLabel, { marginTop: 8 }]}>VERIFIABLE DOCUMENTS</CustomText>
             <View style={styles.docsGrid}>
                {currentKycSteps.map((s) => (
                   <TouchableOpacity key={s.id} 
                    style={[
                      styles.docUploadBtn, 
                      { 
                        borderColor: docs[s.id] ? (s.id === 'id' && idValidation.status === 'invalid' ? colors.error : '#10B981') : colors.border, 
                        backgroundColor: docs[s.id] ? (s.id === 'id' && idValidation.status === 'invalid' ? `${colors.error}10` : 'rgba(16,185,129,0.05)') : colors.glass 
                      }
                    ]}
                    onPress={() => handleUpload(s.id)}
                   >
                     {s.id === 'id' && idValidation.status === 'validating' ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                     ) : docs[s.id] ? (
                        s.id === 'id' && idValidation.status === 'invalid' ? <XCircle color={colors.error} size={20} /> : <CheckCircle2 color="#10B981" size={20} />
                     ) : (
                        <s.icon color={colors.muted} size={20} />
                     )}
                     <CustomText style={[styles.docUploadLabel, { color: docs[s.id] ? (s.id === 'id' && idValidation.status === 'invalid' ? colors.error : '#10B981') : colors.muted }]}>{s.title}</CustomText>
                     <CustomText style={{ fontSize: 9, color: docs[s.id] ? (s.id === 'id' && idValidation.status === 'invalid' ? colors.error : colors.muted) : colors.muted, opacity: 0.7 }}>
                        {s.id === 'id' && idValidation.status === 'validating' ? "Validating..." : docs[s.id] ? (s.id === 'id' && idValidation.status === 'invalid' ? idValidation.reason : "Selected") : "Tap to upload"}
                     </CustomText>
                   </TouchableOpacity>
                ))}
             </View>

             <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: colors.primary }, loadingSubmit && { opacity: 0.6 }]}
              onPress={handleSubmitKyc} disabled={loadingSubmit}
             >
                {loadingSubmit ? <ActivityIndicator color="white" /> : <ShieldCheck color="white" size={20} />}
                <CustomText style={styles.submitBtnText}>{loadingSubmit ? "Securing details..." : "Submit Business Profile"}</CustomText>
             </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPayment} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
             <View style={styles.modalHeader}>
               <View>
                 <CustomText variant="h3">Complete Payment</CustomText>
                 <CustomText style={{ color: colors.muted, fontSize: 11 }}>Choose your billing method</CustomText>
               </View>
               <TouchableOpacity onPress={() => setShowPayment(false)}><X color={colors.muted} size={24} /></TouchableOpacity>
             </View>

             <View style={styles.payMethodsGrid}>
               {PAYMENT_METHODS.map((m) => (
                 <TouchableOpacity 
                  key={m.id} 
                  style={[styles.payMethodBtn, { borderColor: paymentMethod === m.id ? colors.primary : colors.border, backgroundColor: paymentMethod === m.id ? `${colors.primary}10` : colors.glass }]}
                  onPress={() => setPaymentMethod(m.id)}
                 >
                   <m.icon color={paymentMethod === m.id ? colors.primary : colors.muted} size={18} />
                   <CustomText style={[styles.payMethodLabel, { color: paymentMethod === m.id ? colors.primary : colors.muted }]}>{m.label}</CustomText>
                 </TouchableOpacity>
               ))}
             </View>

             {/* Dynamic input based on method */}
             {paymentMethod === 'MOBILE_MONEY' && (
                <View style={styles.modalInputGroup}>
                   <TextInput placeholder="Phone number (e.g., +250...)" placeholderTextColor={colors.muted} style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border }]} keyboardType="phone-pad" />
                </View>
             )}

             <TouchableOpacity style={[styles.payBtn, { backgroundColor: colors.primary }]} onPress={handlePayAndLaunch}>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  content: { padding: 16, paddingBottom: 100 },
  
  // Step indicator
  stepIndicatorRows: { paddingHorizontal: 4, marginBottom: 32 },
  stepIndicatorItem: { flex: 1, position: 'relative' },
  stepIndicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNumber: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  stepLabel: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  stepTrack: { height: 4, borderRadius: 2, marginVertical: 12, marginLeft: 16, width: 2, position: 'absolute', top: 32, left: -1 }, // Ver-track for mobile vertical indicator
  stepTrack: { width: '100%', height: 4, marginVertical: 14, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)', display: 'none' }, // Let's use simple row display or simplified track

  card: { borderRadius: 24, padding: 24, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1, color: '#94A3B8', marginBottom: 10, marginLeft: 2 },
  inputBox: { height: 56, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  textInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '500' },
  
  docsGrid: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  docUploadBtn: { flex: 1, height: 100, borderRadius: 18, borderDashArray: [4, 4], borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  docUploadLabel: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  
  submitBtn: { height: 60, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // Step 1 UI
  fadeContainer: { flex: 1 },
  stepHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 24 },
  backBtn: { padding: 4 },
  plansList: { gap: 16, marginBottom: 32 },
  planCard: { padding: 20, borderRadius: 24, borderWidth: 1 },
  planContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planName: { fontSize: 18, fontWeight: 'bold' },
  bestBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  planPriceInfo: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  planPrice: { fontSize: 24, fontWeight: '900' },
  planPeriod: { fontSize: 12, color: '#94A3B8' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniFeature: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  miniFeatureText: { fontSize: 10, color: '#94A3B8' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  payMethodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  payMethodBtn: { width: '48%', height: 60, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row' },
  payMethodLabel: { fontSize: 12, fontWeight: 'bold' },
  modalInputGroup: { marginBottom: 24 },
  modalInput: { height: 56, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  payBtn: { height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F97316' },
  payBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // Account Verification Styles
  accountStatusCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  accountStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountEmail: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  accountStatusText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
