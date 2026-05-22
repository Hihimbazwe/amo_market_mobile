import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import CustomText from './CustomText';
import CustomInput from './CustomInput';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/authService';

const AccountPrivacyModals = ({
  showDeactivateModal,
  setShowDeactivateModal,
  showDeleteModal,
  setShowDeleteModal,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const { user, logout, updateUser } = useAuth();
  
  const [isDeactivating, setIsDeactivating] = useState(false);
  
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);

  const handleConfirmDeactivate = async () => {
    setIsDeactivating(true);
    try {
      const result = await authService.deactivateAccount(user.id);
      // Update local user state to reflect the new deactivated status immediately.
      // The seller stays logged in but all marketplace actions are now restricted.
      await updateUser({ accountStatus: result?.accountStatus ?? 'DEACTIVATED' });
      Alert.alert(
        t('accountDeactivated') || 'Account Deactivated',
        t('accountDeactivatedSuccess') ||
          'Your account has been deactivated. You can still browse your dashboard and log out, but marketplace actions are restricted.',
      );
      setShowDeactivateModal(false);
    } catch (err) {
      Alert.alert(t('error'), err.message || t('failedToDeactivate') || 'Failed to deactivate account.');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleRequestDeletion = async () => {
    setIsLoadingDelete(true);
    try {
      await authService.requestAccountDeletion(user.id);
      setShowOtpStep(true);
    } catch (err) {
      Alert.alert(t('error'), err.message || t('failedToSendOTP') || 'Failed to send OTP.');
    } finally {
      setIsLoadingDelete(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert(t('error'), t('invalidOtp') || 'Please enter a valid 6-digit OTP.');
      return;
    }
    setIsLoadingDelete(true);
    try {
      await authService.confirmAccountDeletion(user.id, otp);
      Alert.alert(t('success'), t('accountDeletedSuccess') || 'Account deletion requested successfully.');
      setShowDeleteModal(false);
      setShowOtpStep(false);
      setTimeout(() => logout(), 1000);
    } catch (err) {
      Alert.alert(t('error'), err.message || t('failedToDelete') || 'Failed to delete account.');
    } finally {
      setIsLoadingDelete(false);
    }
  };

  return (
    <>
      {/* Deactivate Account Modal */}
      <Modal visible={showDeactivateModal} transparent animationType="slide" onRequestClose={() => setShowDeactivateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border, padding: 0 }]}>
            <View style={{ padding: 24, borderBottomWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <View style={{ width: 36, height: 36, backgroundColor: 'rgba(245, 158, 11, 0.15)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                  <CustomText style={{ fontSize: 18 }}>🔒</CustomText>
                </View>
                <CustomText style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold' }}>{t('deactivateAccount') || 'Deactivate Account?'}</CustomText>
              </View>
              <CustomText style={{ color: colors.muted, fontSize: 12, marginLeft: 48 }}>This can be undone by logging back in.</CustomText>
            </View>
            <View style={{ padding: 24 }}>
              <CustomText style={{ color: colors.muted, fontSize: 14, marginBottom: 16, lineHeight: 22 }}>
                While deactivated, your profile will be hidden from the platform. You can reactivate at any time by logging back in.
              </CustomText>
              
              <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <CustomText style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>• Your profile will be hidden from other users</CustomText>
                <CustomText style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>• You will be signed out immediately</CustomText>
                <CustomText style={{ color: colors.muted, fontSize: 12 }}>• All your data is preserved and safe</CustomText>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                <TouchableOpacity 
                  onPress={() => setShowDeactivateModal(false)}
                  style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
                >
                  <CustomText style={{ color: colors.muted, fontSize: 14, fontWeight: 'bold' }}>Cancel</CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirmDeactivate}
                  disabled={isDeactivating}
                  style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F59E0B', borderRadius: 12, opacity: isDeactivating ? 0.5 : 1 }}
                >
                  <CustomText style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }}>
                    {isDeactivating ? 'Deactivating...' : 'Yes, Deactivate'}
                  </CustomText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="slide" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border, padding: 24 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Trash2 color="#EF4444" size={20} />
                <CustomText style={{ color: '#EF4444', fontSize: 20, fontWeight: 'bold' }}>Delete Account</CustomText>
              </View>

              <View>
                {!showOtpStep ? (
                  <>
                    <CustomText style={{ color: colors.muted, fontSize: 14, marginBottom: 16, lineHeight: 22 }}>
                      Your account will enter a <CustomText style={{ fontWeight: 'bold', color: colors.muted }}>30-day grace period</CustomText>. If you don't log back in, your data will be permanently removed.
                    </CustomText>
                    
                    <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 24 }}>
                      <CustomText style={{ color: '#EF4444', fontSize: 12, fontWeight: '500' }}>
                        ⚠️ Active orders must be resolved before deletion can proceed.
                      </CustomText>
                    </View>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                      <TouchableOpacity 
                        onPress={() => { setShowDeleteModal(false); setShowOtpStep(false); setOtp(''); }}
                        style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}
                      >
                        <CustomText style={{ color: colors.muted, fontSize: 14, fontWeight: 'bold' }}>Cancel</CustomText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleRequestDeletion}
                        disabled={isLoadingDelete}
                        style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#EF4444', borderRadius: 12, opacity: isLoadingDelete ? 0.5 : 1 }}
                      >
                        <CustomText style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }}>
                          {isLoadingDelete ? 'Checking...' : 'Continue'}
                        </CustomText>
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
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                      <TouchableOpacity 
                        onPress={() => { setShowDeleteModal(false); setShowOtpStep(false); setOtp(''); }}
                        style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}
                      >
                        <CustomText style={{ color: colors.muted, fontSize: 14, fontWeight: 'bold' }}>Cancel</CustomText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleConfirmDeletion}
                        disabled={isLoadingDelete}
                        style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#EF4444', borderRadius: 12, opacity: isLoadingDelete ? 0.5 : 1 }}
                      >
                        <CustomText style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }}>
                          {isLoadingDelete ? 'Confirming...' : 'Confirm Deletion'}
                        </CustomText>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
});

export default AccountPrivacyModals;
