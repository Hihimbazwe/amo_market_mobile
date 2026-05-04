import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  ShieldCheck, 
  Package, 
  User, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Menu
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { AgentDrawerContext } from '../../context/AgentDrawerContext';
import CustomText from '../../components/CustomText';
import { agentService } from '../../api/agentService';
import { useTranslation } from 'react-i18next';

export default function AgentVerifyCodeScreen({ navigation }) {
  const { toggleDrawer } = React.useContext(AgentDrawerContext);
  const { colors } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  const handleVerify = async (isConfirmed = false) => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert(t('error'), t('deliveryCodeRequired'));
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const res = await agentService.verifyCode({
        deliveryCode: code,
        confirmed: isConfirmed
      });
      setVerificationResult(res);
      
      if (res.verified) {
        // Success!
        Alert.alert(t('success'), res.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const reset = () => {
    setCode('');
    setVerificationResult(null);
    setError(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText style={[styles.title, { color: colors.foreground }]}>{t('verifyCode')}</CustomText>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {!verificationResult ? (
            <View style={styles.inputSection}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
                <ShieldCheck color={colors.primary} size={40} />
              </View>
              
              <CustomText variant="h2" style={styles.sectionTitle}>{t('enterDeliveryCode') || 'Enter Delivery Code'}</CustomText>
              <CustomText style={[styles.sectionSubtitle, { color: colors.muted }]}>
                {t('askBuyerForCode') || "Ask the buyer for the 6-digit verification code to complete the delivery."}
              </CustomText>

              <View style={[styles.inputWrapper, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="0 0 0 0 0 0"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                  letterSpacing={8}
                />
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <AlertCircle color="#EF4444" size={16} />
                  <CustomText style={styles.errorText}>{error}</CustomText>
                </View>
              )}

              <TouchableOpacity
                style={[styles.verifyBtn, { backgroundColor: colors.primary }, (!/^\d{6}$/.test(code) || verifying) && { opacity: 0.5 }]}
                onPress={() => handleVerify(false)}
                disabled={!/^\d{6}$/.test(code) || verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <ShieldCheck color="#fff" size={20} />
                    <CustomText style={styles.verifyBtnText}>{t('verify') || 'Verify'}</CustomText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.resultSection}>
              {verificationResult.verified ? (
                <View style={styles.successBox}>
                  <View style={[styles.statusIcon, { backgroundColor: '#10B98115' }]}>
                    <CheckCircle2 color="#10B981" size={48} />
                  </View>
                  <CustomText variant="h2" style={{ textAlign: 'center', marginBottom: 8 }}>{t('deliveryVerified') || 'Delivery Verified!'}</CustomText>
                  <CustomText style={{ color: colors.muted, textAlign: 'center', marginBottom: 24 }}>
                    {verificationResult.message}
                  </CustomText>
                  
                  <TouchableOpacity
                    style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                    onPress={() => navigation.goBack()}
                  >
                    <CustomText style={styles.doneBtnText}>{t('done') || 'Done'}</CustomText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.confirmationBox}>
                  <CustomText variant="h3" style={{ marginBottom: 16 }}>{t('confirmIdentity') || 'Confirm Identity'}</CustomText>
                  
                  <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.infoRow}>
                      <User color={colors.primary} size={16} />
                      <View>
                        <CustomText style={styles.infoLabel}>{t('buyer')}</CustomText>
                        <CustomText style={styles.infoValue}>{verificationResult.buyerInfo.recipientName}</CustomText>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Phone color={colors.primary} size={16} />
                      <View>
                        <CustomText style={styles.infoLabel}>{t('phoneNumber')}</CustomText>
                        <CustomText style={styles.infoValue}>{verificationResult.buyerInfo.phone}</CustomText>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <MapPin color={colors.primary} size={16} />
                      <View>
                        <CustomText style={styles.infoLabel}>{t('address')}</CustomText>
                        <CustomText style={styles.infoValue}>{verificationResult.buyerInfo.address}</CustomText>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.orderHeader}>
                      <Package color={colors.primary} size={16} />
                      <CustomText style={styles.orderRef}>Order #{verificationResult.orderInfo.orderRef}</CustomText>
                    </View>
                    {verificationResult.orderInfo.items.map((item, idx) => (
                      <CustomText key={idx} style={styles.itemText}>
                        • {item.qty}x {item.title}
                      </CustomText>
                    ))}
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.confirmBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => handleVerify(true)}
                      disabled={verifying}
                    >
                      {verifying ? <ActivityIndicator color="#fff" /> : <CustomText style={styles.confirmBtnText}>{t('confirmHandover') || 'Confirm Handover'}</CustomText>}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.cancelBtn, { borderColor: colors.border }]}
                      onPress={reset}
                    >
                      <CustomText style={{ color: colors.muted }}>{t('cancel')}</CustomText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1 },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  title: { fontSize: 18, fontWeight: '900' },
  scrollContent: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  inputSection: { alignItems: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  sectionTitle: { textAlign: 'center', marginBottom: 12 },
  sectionSubtitle: { textAlign: 'center', marginBottom: 32, fontSize: 14, lineHeight: 20 },
  inputWrapper: { width: '100%', height: 64, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  input: { fontSize: 24, fontWeight: '900', textAlign: 'center', width: '100%' },
  verifyBtn: { width: '100%', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  verifyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  resultSection: { flex: 1 },
  successBox: { alignItems: 'center', paddingVertical: 40 },
  statusIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  doneBtn: { width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  confirmationBox: { flex: 1 },
  infoCard: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 16, gap: 16 },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoLabel: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  orderCard: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 24 },
  orderHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  orderRef: { fontSize: 13, fontWeight: 'bold' },
  itemText: { fontSize: 13, color: '#94A3B8', marginBottom: 4 },
  actionButtons: { gap: 12 },
  confirmBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }
});
