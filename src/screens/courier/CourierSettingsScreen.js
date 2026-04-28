import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Bell, Lock, Shield, Moon, User, ChevronRight, XCircle, Settings, Navigation } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { useCourierDrawer } from '../../context/CourierDrawerContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { chatService } from '../../api/chatService';
import { useTranslation } from 'react-i18next';

const SettingRow = ({ icon: Icon, title, subtitle, value, onValueChange, type = 'switch', onPress, colors, t }) => (
  <View style={styles.settingRow}>
    <View style={[styles.settingIcon, { backgroundColor: colors.glass }]}>
      <Icon color="#f97316" size={20} />
    </View>
    <View style={{ flex: 1, marginLeft: 16 }}>
      <CustomText style={[styles.settingTitle, { color: colors.foreground }]}>{title}</CustomText>
      {subtitle && <CustomText style={[styles.settingSubtitle, { color: colors.muted }]}>{subtitle}</CustomText>}
    </View>
    {type === 'switch' ? (
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: 'rgba(249,115,22,0.4)' }}
        thumbColor={value ? '#f97316' : '#fff'}
      />
    ) : (
      <TouchableOpacity onPress={onPress}><CustomText style={[styles.actionText, { color: '#f97316' }]}>{t('change')}</CustomText></TouchableOpacity>
    )}
  </View>
);

export default function CourierSettingsScreen() {
  const { toggleDrawer } = useCourierDrawer();
  const { isDarkMode, colors, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const { t } = useTranslation(['dashboard', 'common']);
  const [notifs, setNotifs] = useState(true);
  const [hideAvailability, setHideAvailability] = useState(false);
  const [loadingPrivacy, setLoadingPrivacy] = useState(true);

  useEffect(() => {
    if (user?.id) {
      chatService.getPrivacySettings(user.id).then(res => {
        setHideAvailability(res.hideAvailability);
        setLoadingPrivacy(false);
      });
    }
  }, [user?.id]);

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
      Alert.alert(t('error'), t('passwordTooShort'));
      return;
    }

    setUpdating(true);
    try {
      await authService.changePassword(user.id, currentPassword, newPassword);
      Alert.alert(t('success'), t('passwordUpdatedLogout'));
      setShowPasswordModal(false);
      logout();
      navigation.navigate('Home');
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
          <Settings color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">{t('courierSettings')}</CustomText>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ACCOUNT */}
        <View style={styles.section}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('ACCOUNT')}</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('CourierProfile')} activeOpacity={0.7}>
              <View style={[styles.settingIcon, { backgroundColor: colors.glass }]}>
                <User color="#f97316" size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <CustomText style={[styles.settingTitle, { color: colors.foreground }]}>{t('profile')}</CustomText>
                <CustomText style={[styles.settingSubtitle, { color: colors.muted }]}>{t('editDeliveryProfile')}</CustomText>
              </View>
              <ChevronRight color={colors.muted} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* PREFERENCES */}
        <View style={styles.section}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('PREFERENCES')}</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon={Bell} title={t('deliveryAlerts')} subtitle={t('deliveryAlertsDesc')} value={notifs} onValueChange={setNotifs} colors={colors} t={t} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow icon={Moon} title={t('darkMode')} subtitle={t('easierOnEyes')} value={isDarkMode} onValueChange={toggleTheme} colors={colors} t={t} />
          </View>
        </View>

        {/* SECURITY & PRIVACY */}
        <View style={styles.section}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('SECURITY & PRIVACY')}</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon={Lock} title={t('password')} subtitle={t('updateSecurity')} type="link" onPress={() => setShowPasswordModal(true)} colors={colors} t={t} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow 
              icon={Shield} 
              title={t('hideAvailability')} 
              subtitle={t('hideAvailabilityDesc')} 
              value={hideAvailability} 
              onValueChange={toggleAvailability} 
              colors={colors} 
              t={t}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow icon={Navigation} title={t('liveTracking')} subtitle={t('allowLiveLocationSharing')} value={true} onValueChange={() => {}} colors={colors} t={t} />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={() => {
            Alert.alert(t('logoutConfirmTitle'), t('logoutConfirmDesc'), [
              { text: t('cancel'), style: 'cancel' },
              { text: t('logoutConfirmTitle'), style: 'destructive', onPress: () => { logout(); navigation.navigate('Home'); } },
            ]);
          }}
        >
          <CustomText style={styles.logoutText}>{t('signOut')}</CustomText>
        </TouchableOpacity>

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
                  placeholder={t('confirmNewPasswordPlaceholder')}
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
    </SafeAreaView>
  );
}

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
  logoutBtn: { alignItems: 'center', padding: 20, marginTop: 10 },
  logoutText: { color: '#EF4444', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
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
});
