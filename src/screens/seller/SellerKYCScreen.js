import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import {
  Menu, ShieldCheck, ShieldAlert, Clock, Upload, CreditCard, Camera,
  Building2, CheckCircle2, XCircle, AlertCircle, ChevronRight,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';

// Status derived from backend profile
// 'unverified' | 'pending' | 'verified' | 'rejected'

const getSteps = (profile) => [
  {
    id: 'id',
    title: 'National ID / Passport',
    subtitle: 'Upload front and back of your national ID or a valid passport',
    icon: CreditCard,
    status: profile?.idDocumentUrl ? 'approved' : 'not_started',
  },
  {
    id: 'selfie',
    title: 'Selfie Verification',
    subtitle: 'Take a clear selfie holding your ID document next to your face',
    icon: Camera,
    status: profile?.kycDocumentUrl ? 'approved' : 'not_started',
  },
  {
    id: 'business',
    title: 'Business Registration',
    subtitle: 'Upload your RDB certificate or business registration document',
    icon: Building2,
    status: profile?.rdbCertificateUrl ? 'approved' : 'not_started',
  },
];

const STATUS_CONFIG = {
  verified: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: ShieldCheck, text: 'Verified', sub: 'Your seller account is fully verified.' },
  pending:  { color: '#F97316', bg: 'rgba(249,115,22,0.1)', icon: Clock,        text: 'Under Review', sub: 'Your documents are being reviewed. This takes 1–2 business days.' },
  rejected: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  icon: ShieldAlert,  text: 'Action Required', sub: 'Some documents were rejected. Please re-upload the flagged items below.' },
  unverified:{ color: '#6B7280', bg: 'rgba(107,114,128,0.1)', icon: ShieldAlert, text: 'Not Verified', sub: 'Complete identity verification to start selling on AMO Market.' },
};

const STEP_STATUS_CONFIG = {
  approved:    { color: '#10B981', icon: CheckCircle2, label: 'Approved' },
  pending:     { color: '#F97316', icon: Clock,        label: 'In Review' },
  rejected:    { color: '#EF4444', icon: XCircle,      label: 'Rejected' },
  not_started: { color: '#6B7280', icon: AlertCircle,  label: 'Not Uploaded' },
};

export default function SellerKYCScreen() {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(null);

  // Draft documents for submission
  const [docs, setDocs] = useState({
    id: null,
    selfie: null,
    business: null,
  });

  const fetchProfile = async () => {
    if (!user?.id) return;
    try {
      const data = await sellerService.getKYCStatus(user.id);
      setProfile(data);
    } catch (error) {
      console.error('Error fetching KYC:', error);
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

  const pickImage = async (stepId) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setDocs(prev => ({ ...prev, [stepId]: result.assets[0].base64 }));
      Alert.alert('Selected', 'Document selected. Please complete all steps and tap submit.');
    }
  };

  const handleUpload = (stepId) => {
    Alert.alert(
      'Upload Document',
      'Choose how to upload your document',
      [
        { text: 'Take Photo', onPress: () => pickImage(stepId) },
        { text: 'Choose from Gallery', onPress: () => pickImage(stepId) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSubmitAll = async () => {
    if (!docs.id || !docs.selfie) {
      Alert.alert('Missing Documents', 'Please upload at least your ID and a selfie.');
      return;
    }

    setUploading('all');
    try {
      await sellerService.submitKYC(user.id, {
        idDocument: docs.id,
        selfie: docs.selfie,
        rdbCertificate: docs.business,
      });
      Alert.alert('Success', 'KYC documents submitted for review.');
      setDocs({ id: null, selfie: null, business: null });
      fetchProfile();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit KYC');
    } finally {
      setUploading(null);
    }
  };

  const getKycStatus = () => {
    if (!profile) return 'unverified';
    if (profile.kycVerified) return 'verified';
    if (profile.kycSubmitted) return 'pending';
    return 'unverified';
  };

  const kycStatus = getKycStatus();
  const cfg = STATUS_CONFIG[kycStatus];
  const StatusIcon = cfg.icon;
  const steps = getSteps(profile);

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
            {/* Status Banner */}
            <View style={[styles.statusBanner, { backgroundColor: cfg.bg, borderColor: `${cfg.color}30` }]}>
              <View style={[styles.statusIconBox, { backgroundColor: `${cfg.color}20` }]}>
                <StatusIcon color={cfg.color} size={28} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <CustomText style={[styles.statusTitle, { color: cfg.color }]}>{cfg.text}</CustomText>
                <CustomText style={styles.statusSub}>{cfg.sub}</CustomText>
              </View>
            </View>

            {/* Why KYC */}
            <View style={[styles.infoCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }]}>
              <ShieldCheck color={colors.primary} size={18} />
              <CustomText style={styles.infoText}>
                KYC (Know Your Customer) is required to protect buyers and maintain trust on the platform. Verified sellers get a badge and higher visibility.
              </CustomText>
            </View>

            {/* Steps */}
            <CustomText style={styles.sectionLabel}>VERIFICATION STEPS</CustomText>
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const currentStatus = docs[step.id] ? 'pending' : step.status;
              const stCfg = STEP_STATUS_CONFIG[currentStatus];
              const StatusStepIcon = stCfg.icon;
              const isUploading = uploading === step.id;

              return (
                <View key={step.id} style={styles.stepCard}>
                  {/* Step number connector */}
                  <View style={styles.stepLeft}>
                    <View style={[styles.stepNumber, { borderColor: stCfg.color }]}>
                      <CustomText style={[styles.stepNumberText, { color: stCfg.color }]}>{index + 1}</CustomText>
                    </View>
                    {index < steps.length - 1 && <View style={[styles.stepLine, { backgroundColor: colors.border }]} />}
                  </View>

                  <View style={{ flex: 1, paddingBottom: 24 }}>
                    <View style={styles.stepHeader}>
                      <View style={[styles.stepIconBox, { backgroundColor: colors.glass }]}>
                        <StepIcon color={stCfg.color} size={20} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <CustomText style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</CustomText>
                        <View style={styles.stepStatusRow}>
                          <StatusStepIcon color={stCfg.color} size={12} />
                          <CustomText style={[styles.stepStatusLabel, { color: stCfg.color }]}>{stCfg.label}</CustomText>
                        </View>
                      </View>
                    </View>

                    <CustomText style={styles.stepSubtitle}>{step.subtitle}</CustomText>

                    {(step.status === 'not_started' || step.status === 'rejected') && (
                      <TouchableOpacity
                        style={[styles.uploadBtn, isUploading && styles.uploadBtnLoading]}
                        onPress={() => handleUpload(step.id)}
                        disabled={isUploading}
                      >
                        <Upload color={Colors.white} size={16} />
                        <CustomText style={styles.uploadBtnText}>
                          {docs[step.id] ? 'Replace' : 'Upload'}
                        </CustomText>
                      </TouchableOpacity>
                    )}

                    {step.status === 'approved' && (
                      <View style={styles.approvedRow}>
                        <CheckCircle2 color="#10B981" size={16} />
                        <CustomText style={styles.approvedText}>Document accepted</CustomText>
                      </View>
                    )}

                    {step.status === 'pending' && (
                      <View style={styles.pendingRow}>
                        <Clock color="#F97316" size={16} />
                        <CustomText style={styles.pendingText}>Submitted — awaiting review</CustomText>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {kycStatus === 'unverified' && (
               <TouchableOpacity
                style={[styles.submitAllBtn, uploading === 'all' && styles.uploadBtnLoading]}
                onPress={handleSubmitAll}
                disabled={uploading === 'all'}
              >
                <ShieldCheck color={Colors.white} size={20} />
                <CustomText style={styles.submitAllBtnText}>
                  {uploading === 'all' ? 'Submitting...' : 'Submit Documents'}
                </CustomText>
              </TouchableOpacity>
            )}

            {/* Support */}
            <TouchableOpacity style={[styles.supportCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AlertCircle color={colors.muted} size={20} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <CustomText style={[styles.supportTitle, { color: colors.foreground }]}>Need Help?</CustomText>
                <CustomText style={styles.supportSub}>Contact our KYC support team</CustomText>
              </View>
              <ChevronRight color={colors.muted} size={18} />
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
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, marginBottom: 16,
    borderWidth: 1,
  },
  statusIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  statusSub: { color: Colors.muted, fontSize: 12, lineHeight: 18 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.15)',
  },
  infoText: { flex: 1, color: Colors.muted, fontSize: 12, lineHeight: 18 },
  sectionLabel: { color: Colors.muted, fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 16 },
  stepCard: { flexDirection: 'row', gap: 16 },
  stepLeft: { alignItems: 'center', paddingTop: 4 },
  stepNumber: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { fontSize: 13, fontWeight: '900' },
  stepLine: { flex: 1, width: 2, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 6 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepIconBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: { color: Colors.white, fontSize: 15, fontWeight: 'bold' },
  stepStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  stepStatusLabel: { fontSize: 11, fontWeight: 'bold' },
  stepSubtitle: { color: Colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F97316', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start',
  },
  uploadBtnLoading: { opacity: 0.6 },
  uploadBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 13 },
  submitAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#F97316', padding: 16, borderRadius: 16, marginBottom: 24,
  },
  submitAllBtnText: { color: Colors.white, fontWeight: '900', fontSize: 15 },
  approvedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  approvedText: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingText: { color: '#F97316', fontSize: 13, fontWeight: '600' },
  supportCard: {
    flexDirection: 'row', alignItems: 'center', padding: 18, marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  supportTitle: { color: Colors.white, fontSize: 15, fontWeight: 'bold' },
  supportSub: { color: Colors.muted, fontSize: 12, marginTop: 2 },
});
