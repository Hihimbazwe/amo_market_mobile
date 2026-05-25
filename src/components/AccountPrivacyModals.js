import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { ShoppingBag, MessageCircle, Trash2, ChevronRight } from 'lucide-react-native';
import CustomText from './CustomText';
import CustomInput from './CustomInput';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/authService';

// ─── Option definitions ───────────────────────────────────────────────────────
const OPTIONS = [
  {
    key: 'selling',
    icon: ShoppingBag,
    color: '#F59E0B',
    title: 'Disable Selling',
    desc: 'Hide your listings and block marketplace actions. Chat stays active.',
  },
  {
    key: 'chat',
    icon: MessageCircle,
    color: '#3B82F6',
    title: 'Disable Chat',
    desc: 'Restrict all messaging. Selling features remain fully functional.',
  },
  {
    key: 'delete',
    icon: Trash2,
    color: '#EF4444',
    title: 'Delete Account',
    desc: 'Soft-delete your account. All features are restricted after a 30-day grace period.',
  },
];

const AccountPrivacyModals = ({
  showDeactivateModal,
  setShowDeactivateModal,
  showDeleteModal,
  setShowDeleteModal,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const { user, logout, updateUser, canSell, canChat } = useAuth();

  // Deactivate modal state
  const [selected, setSelected] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);

  const handleConfirmFeature = async () => {
    if (!selected) {
      Alert.alert('Select an option', 'Please choose what you want to disable.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (selected === 'selling') {
        const isCurrDisabled = user?.sellingDisabled;
        const result = await authService.setFeatureFlags(user.id, { sellingDisabled: !isCurrDisabled });
        await updateUser({ sellingDisabled: result.sellingDisabled });
        Alert.alert(
          result.sellingDisabled ? 'Selling Disabled' : 'Selling Enabled',
          result.sellingDisabled
            ? 'Your listings are hidden and marketplace actions are restricted. Chat remains active.'
            : 'Your selling features have been restored.',
        );
      } else if (selected === 'chat') {
        const isCurrDisabled = user?.chatDisabled;
        const result = await authService.setFeatureFlags(user.id, { chatDisabled: !isCurrDisabled });
        await updateUser({ chatDisabled: result.chatDisabled });
        Alert.alert(
          result.chatDisabled ? 'Chat Disabled' : 'Chat Enabled',
          result.chatDisabled
            ? 'Messaging is restricted. Your selling features remain fully functional.'
            : 'Your chat features have been restored.',
        );
      } else if (selected === 'delete') {
        setShowDeactivateModal(false);
        setSelected(null);
        setTimeout(() => setShowDeleteModal(true), 300);
        return;
      }
      setShowDeactivateModal(false);
      setSelected(null);
    } catch (err) {
      Alert.alert(t('error'), err.message || 'Failed to update account features.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestDeletion = async () => {
    setIsLoadingDelete(true);
    try {
      await authService.requestAccountDeletion(user.id);
      setShowOtpStep(true);
    } catch (err) {
      Alert.alert(t('error'), err.message || 'Failed to send OTP.');
    } finally {
      setIsLoadingDelete(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert(t('error'), 'Please enter a valid 6-digit OTP.');
      return;
    }
    setIsLoadingDelete(true);
    try {
      await authService.confirmAccountDeletion(user.id, otp);
      Alert.alert(t('success'), 'Account deletion requested successfully.');
      setShowDeleteModal(false);
      setShowOtpStep(false);
      setTimeout(() => logout(), 1000);
    } catch (err) {
      Alert.alert(t('error'), err.message || 'Failed to delete account.');
    } finally {
      setIsLoadingDelete(false);
    }
  };

  return (
    <>
      {/* ── Feature-based Deactivation Modal ── */}
      <Modal
        visible={showDeactivateModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowDeactivateModal(false); setSelected(null); }}
      >
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {/* Header */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <CustomText style={[styles.sheetTitle, { color: colors.foreground }]}>Manage Account Features</CustomText>
              <CustomText style={[styles.sheetSub, { color: colors.muted }]}>
                Choose which feature to disable, or delete your account.
              </CustomText>
            </View>

            {/* Options */}
            <View style={styles.optionList}>
              {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = selected === opt.key;
                // Show current state for selling/chat
                const isCurrentlyDisabled =
                  opt.key === 'selling' ? user?.sellingDisabled :
                  opt.key === 'chat' ? user?.chatDisabled : false;

                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.optionRow,
                      { borderColor: isActive ? opt.color : colors.border, backgroundColor: isActive ? `${opt.color}10` : colors.card },
                    ]}
                    onPress={() => setSelected(opt.key)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: `${opt.color}18` }]}>
                      <Icon color={opt.color} size={20} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <CustomText style={[styles.optionTitle, { color: opt.key === 'delete' ? opt.color : colors.foreground }]}>
                          {opt.key !== 'delete' && isCurrentlyDisabled ? opt.title.replace('Disable', 'Re-enable') : opt.title}
                        </CustomText>
                        {opt.key !== 'delete' && isCurrentlyDisabled && (
                          <View style={[styles.activeBadge, { backgroundColor: `${opt.color}20`, borderColor: `${opt.color}40` }]}>
                            <CustomText style={[styles.activeBadgeText, { color: opt.color }]}>ACTIVE</CustomText>
                          </View>
                        )}
                      </View>
                      <CustomText style={[styles.optionDesc, { color: colors.muted }]}>{opt.desc}</CustomText>
                    </View>
                    <ChevronRight color={isActive ? opt.color : colors.muted} size={16} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => { setShowDeactivateModal(false); setSelected(null); }}
                style={styles.cancelBtn}
              >
                <CustomText style={[styles.cancelText, { color: colors.muted }]}>Cancel</CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmFeature}
                disabled={!selected || isSubmitting}
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor: selected ? (OPTIONS.find(o => o.key === selected)?.color ?? colors.primary) : colors.border,
                    opacity: (!selected || isSubmitting) ? 0.5 : 1,
                  },
                ]}
              >
                <CustomText style={styles.confirmText}>
                  {isSubmitting ? 'Applying...' : 'Confirm'}
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete Account Modal ── */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowDeleteModal(false); setShowOtpStep(false); setOtp(''); }}
      >
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Trash2 color="#EF4444" size={20} />
                <CustomText style={{ color: '#EF4444', fontSize: 20, fontWeight: 'bold' }}>Delete Account</CustomText>
              </View>

              {!showOtpStep ? (
                <>
                  <CustomText style={{ color: colors.muted, fontSize: 14, marginBottom: 16, lineHeight: 22 }}>
                    Your account will enter a{' '}
                    <CustomText style={{ fontWeight: 'bold', color: colors.muted }}>30-day grace period</CustomText>
                    . If you don't log back in, your data will be permanently removed.
                  </CustomText>
                  <View style={styles.warningBox}>
                    <CustomText style={styles.warningText}>
                      ⚠️ Active orders must be resolved before deletion can proceed.
                    </CustomText>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => { setShowDeleteModal(false); setShowOtpStep(false); setOtp(''); }}
                      style={styles.cancelBtn}
                    >
                      <CustomText style={[styles.cancelText, { color: colors.muted }]}>Cancel</CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleRequestDeletion}
                      disabled={isLoadingDelete}
                      style={[styles.confirmBtn, { backgroundColor: '#EF4444', opacity: isLoadingDelete ? 0.5 : 1 }]}
                    >
                      <CustomText style={styles.confirmText}>{isLoadingDelete ? 'Checking...' : 'Continue'}</CustomText>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <CustomText style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
                    We've sent a 6-digit confirmation code to your email. Enter it below to confirm.
                  </CustomText>
                  <CustomInput
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="numeric"
                    style={{ textAlign: 'center', fontSize: 20, letterSpacing: 4, fontWeight: 'bold' }}
                  />
                  <View style={{ height: 24 }} />
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => { setShowDeleteModal(false); setShowOtpStep(false); setOtp(''); }}
                      style={styles.cancelBtn}
                    >
                      <CustomText style={[styles.cancelText, { color: colors.muted }]}>Cancel</CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleConfirmDeletion}
                      disabled={isLoadingDelete}
                      style={[styles.confirmBtn, { backgroundColor: '#EF4444', opacity: isLoadingDelete ? 0.5 : 1 }]}
                    >
                      <CustomText style={styles.confirmText}>{isLoadingDelete ? 'Confirming...' : 'Confirm Deletion'}</CustomText>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  sheetHeader: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sheetSub: {
    fontSize: 12,
    lineHeight: 18,
  },
  optionList: {
    gap: 10,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  activeBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default AccountPrivacyModals;
