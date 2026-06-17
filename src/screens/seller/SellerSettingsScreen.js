import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Menu, Bell, Lock, Shield, Moon, User, ChevronRight, XCircle, ShieldCheck, CreditCard, Smartphone, Banknote } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { chatService } from '../../api/chatService';
import { sellerService } from '../../api/sellerService';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../context/NotificationContext';
import AccountPrivacyModals from '../../components/AccountPrivacyModals';
import DeactivationBanner from '../../components/DeactivationBanner';
import AppLockSettings from '../../components/AppLockSettings';

const PAYMENT_METHODS = [
  { id: 'MTN_MOMO', label: 'MTN MoMo', icon: Smartphone },
  { id: 'AIRTEL_MONEY', label: 'Airtel Money', icon: Smartphone },
  { id: 'CARD', label: 'Card', icon: CreditCard },
  { id: 'CASH_ON_DELIVERY', label: 'Cash', icon: Banknote },
];

const SettingRow = ({ icon: Icon, title, subtitle, value, onValueChange, type = 'switch', onPress, colors }) => (
  <View style={styles.settingRow}>
    <View style={[styles.settingIcon, { backgroundColor: colors.glass }]}>
      <Icon color={colors.muted} size={20} />
    </View>
    <View style={{ flex: 1, marginLeft: 16 }}>
      <CustomText style={[styles.settingTitle, { color: colors.foreground }]}>{title}</CustomText>
      {subtitle && <CustomText style={[styles.settingSubtitle, { color: colors.muted }]}>{subtitle}</CustomText>}
    </View>
    {type === 'switch' ? (
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="white"
      />
    ) : (
      <TouchableOpacity onPress={onPress}><CustomText style={[styles.actionText, { color: colors.primary }]}>CHANGE</CustomText></TouchableOpacity>
    )}
  </View>
);

const SellerSettingsScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { isDarkMode, colors, toggleTheme } = useTheme();
  const { user, logout, isSellerDeactivated } = useAuth();
  const { t } = useTranslation(['dashboard', 'common']);
  const navigation = useNavigation();
  const { pushNotificationsEnabled, togglePushNotifications } = useNotifications();
  const [marketing, setMarketing] = useState(false);
  const [hideAvailability, setHideAvailability] = useState(false);
  const [loadingPrivacy, setLoadingPrivacy] = useState(true);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [acceptedPayments, setAcceptedPayments] = useState([]);
  const [savingPayments, setSavingPayments] = useState(false);

  useEffect(() => {
    if (user?.id) {
      chatService.getPrivacySettings(user.id).then(res => {
        setHideAvailability(res.hideAvailability);
        setLoadingPrivacy(false);
      });
      sellerService.getPaymentMethods(user.id)
        .then(res => setAcceptedPayments(res.acceptedPayments?.length ? res.acceptedPayments : []))
        .catch(err => console.log('[SellerSettings] Payment methods error:', err));
    }
  }, [user?.id]);

  const selectedPaymentLabel = PAYMENT_METHODS
    .filter(method => acceptedPayments.includes(method.id))
    .map(method => method.label)
    .join(', ');

  const togglePaymentMethod = (methodId) => {
    setAcceptedPayments(current => {
      if (current.includes(methodId)) {
        return current.length === 1 ? current : current.filter(id => id !== methodId);
      }
      return [...current, methodId];
    });
  };

  const savePaymentMethods = async () => {
    if (!acceptedPayments.length) {
      Alert.alert(t('error'), 'Select at least one payment method.');
      return;
    }
    setSavingPayments(true);
    try {
      const updated = await sellerService.updatePaymentMethods(user.id, acceptedPayments);
      setAcceptedPayments(updated.acceptedPayments || acceptedPayments);
      setShowPaymentsModal(false);
      Alert.alert(t('success'), 'Payment methods updated successfully.');
    } catch (error) {
      Alert.alert(t('error'), error.message || 'Failed to update payment methods.');
    } finally {
      setSavingPayments(false);
    }
  };

  const toggleAvailability = async () => {
    const newValue = !hideAvailability;
    setHideAvailability(newValue);
    const res = await chatService.updatePrivacySettings(user.id, { hideAvailability: newValue });
    if (res.error) {
      Alert.alert(t('error'), `${t('failedToUpdatePrivacy')}: ${res.details || res.error}`);
      setHideAvailability(!newValue);
    }
  };

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('error'), t('passwordsDoNotMatch'));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t('error'), t('passwordLengthError'));
      return;
    }

    setUpdating(true);
    try {
      await authService.changePassword(user.id, currentPassword, newPassword);
      Alert.alert(t('success'), t('passwordChangedSuccess'));
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Auto-logout after password change
      setTimeout(() => {
        logout();
      }, 1000);
    } catch (error) {
      Alert.alert(t('error'), error.message || t('failedToUpdatePassword'));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">{t('settings')}</CustomText>
      </View>
      <DeactivationBanner />
      <ScrollView contentContainerStyle={styles.content}>

        {/* ACCOUNT */}
        <View style={styles.section}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('account')}</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('SellerProfile')} activeOpacity={0.7}>
              <View style={[styles.settingIcon, { backgroundColor: colors.glass }]}>
                <User color={colors.muted} size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <CustomText style={[styles.settingTitle, { color: colors.foreground }]}>{t('myProfile')}</CustomText>
                <CustomText style={[styles.settingSubtitle, { color: colors.muted }]}>{t('editSellerProfile')}</CustomText>
              </View>
              <ChevronRight color={colors.muted} size={18} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('SellerFollowers')} activeOpacity={0.7}>
              <View style={[styles.settingIcon, { backgroundColor: colors.glass }]}>
                <User color={colors.muted} size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <CustomText style={[styles.settingTitle, { color: colors.foreground }]}>{t('myFollowers') || 'My Followers'}</CustomText>
                <CustomText style={[styles.settingSubtitle, { color: colors.muted }]}>{t('viewFollowers') || 'View list of users following your store'}</CustomText>
              </View>
              <ChevronRight color={colors.muted} size={18} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('SellerKYC')} activeOpacity={0.7}>
              <View style={[styles.settingIcon, { backgroundColor: colors.glass }]}>
                <ShieldCheck color={colors.muted} size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <CustomText style={[styles.settingTitle, { color: colors.foreground }]}>{t('kycVerification')}</CustomText>
                <CustomText style={[styles.settingSubtitle, { color: colors.muted }]}>{t('verifyYourIdentity')}</CustomText>
              </View>
              <ChevronRight color={colors.muted} size={18} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('SellerMembership')} activeOpacity={0.7}>
              <View style={[styles.settingIcon, { backgroundColor: colors.glass }]}>
                <CreditCard color={colors.muted} size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <CustomText style={[styles.settingTitle, { color: colors.foreground }]}>{t('membership')}</CustomText>
                <CustomText style={[styles.settingSubtitle, { color: colors.muted }]}>{t('manageSubscription')}</CustomText>
              </View>
              <ChevronRight color={colors.muted} size={18} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.navRow} onPress={() => setShowPaymentsModal(true)} activeOpacity={0.7}>
              <View style={[styles.settingIcon, { backgroundColor: colors.glass }]}>
                <CreditCard color={colors.muted} size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <CustomText style={[styles.settingTitle, { color: colors.foreground }]}>Payment Method</CustomText>
                <CustomText style={[styles.settingSubtitle, { color: colors.muted }]} numberOfLines={1}>
                  {selectedPaymentLabel || 'Choose accepted methods'}
                </CustomText>
              </View>
              <ChevronRight color={colors.muted} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* PREFERENCES */}
        <View style={styles.section}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('preferences')}</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon={Bell} title={t('orderNotifications')} subtitle={t('orderNotificationsDesc')} value={pushNotificationsEnabled} onValueChange={togglePushNotifications} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow icon={Moon} title={t('darkMode')} subtitle={t('darkModeDesc')} value={isDarkMode} onValueChange={toggleTheme} colors={colors} />
          </View>
        </View>

        {/* SECURITY */}
        <View style={styles.section}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('security')}</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon={Lock} title={t('password')} subtitle={t('secureAccount')} type="link" onPress={() => setShowPasswordModal(true)} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <AppLockSettings t={t} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow icon={Shield} title={t('twoFactorAuth')} subtitle={t('enhanceSecurity')} value={marketing} onValueChange={setMarketing} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon={Shield}
              title={t('hideAvailability')}
              subtitle={t('hideAvailabilityDesc')}
              value={hideAvailability}
              onValueChange={toggleAvailability}
              colors={colors}
            />
          </View>
        </View>



        {/* ACCOUNT PRIVACY */}
        <View style={styles.privacyRow}>
          <TouchableOpacity 
            style={[styles.deactivateBtn, isSellerDeactivated && { borderColor: colors.primary }]} 
            onPress={() => setShowDeactivateModal(true)}
          >
             <CustomText style={[styles.deactivateBtnText, isSellerDeactivated && { color: colors.primary }]}>
               {'Disable Selling'}
             </CustomText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
            <CustomText style={styles.deleteText}>{t('deleteAccount') || 'Delete'}</CustomText>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />

      </ScrollView>

      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <CustomText variant="h2">{t('changePassword')}</CustomText>
                <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                  <XCircle color={colors.muted} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                <CustomInput
                  label={t('currentPassword')}
                  placeholder={t('enterCurrentPassword')}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
                <View style={{ height: 16 }} />
                <CustomInput
                  label={t('newPassword')}
                  placeholder={t('enterNewPassword')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <View style={{ height: 16 }} />
                <CustomInput
                  label={t('confirmNewPassword')}
                  placeholder={t('confirmNewPassword')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />

                <View style={{ height: 32 }} />

                <CustomButton
                  title={t('updatePassword')}
                  onPress={handleChangePassword}
                  loading={updating}
                />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <AccountPrivacyModals 
        showDeactivateModal={showDeactivateModal}
        setShowDeactivateModal={setShowDeactivateModal}
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
      />

      <Modal
        visible={showPaymentsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentsModal(false)}
      >
        <View style={[styles.modalOverlay, styles.paymentModalOverlay]}>
          <View style={[styles.paymentModalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <CustomText variant="h2">Payment Method</CustomText>
              <TouchableOpacity onPress={() => setShowPaymentsModal(false)}>
                <XCircle color={colors.muted} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentOptions}>
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const selected = acceptedPayments.includes(method.id);
                return (
                  <View
                    key={method.id}
                    style={[
                      styles.paymentOption,
                      { borderColor: colors.border, backgroundColor: colors.glass }
                    ]}
                  >
                    <Icon color={selected ? colors.foreground : colors.muted} size={20} />
                    <CustomText style={[styles.paymentOptionText, { color: colors.foreground }]}>
                      {method.label}
                    </CustomText>
                    <Switch
                      value={selected}
                      onValueChange={() => togglePaymentMethod(method.id)}
                      trackColor={{ false: colors.border, true: '#10B981' }}
                      thumbColor="white"
                      style={styles.paymentToggle}
                    />
                  </View>
                );
              })}
            </View>

            <CustomButton
              title={savingPayments ? 'Saving...' : 'Save Payment Method'}
              onPress={savePaymentMethods}
              loading={savingPayments}
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  content: { padding: 20 },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  navRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  settingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { fontSize: 15, fontWeight: 'bold' },
  settingSubtitle: { fontSize: 11, marginTop: 2 },
  actionText: { fontSize: 12, fontWeight: 'bold' },
  divider: { height: 1, marginHorizontal: 16 },
  privacyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 24 },
  deactivateBtn: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
  deactivateText: { color: '#F59E0B', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 },
  deleteBtn: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  deleteText: { color: '#EF4444', fontSize: 15, fontWeight: 'bold', letterSpacing: 0.5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: 32,
    padding: 24,
    maxHeight: '90%',
    height: '80%',
    borderWidth: 1,
    marginHorizontal: 20,
  },
  paymentModalOverlay: {
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  paymentModalContent: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '78%',
    borderWidth: 1,
    transform: [{ translateY: -24 }],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalBody: {
    marginBottom: 24,
  },
  paymentOptions: {
    gap: 12,
  },
  paymentOption: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  paymentToggle: {
    transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }, { translateY: 6 }],
  },
});

export default SellerSettingsScreen;
