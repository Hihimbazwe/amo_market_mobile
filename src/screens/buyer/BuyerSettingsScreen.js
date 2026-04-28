import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Menu, Bell, Lock, Shield, HelpCircle, Moon, User, ChevronRight, XCircle, Languages } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { chatService } from '../../api/chatService';
import { useTranslation } from 'react-i18next';

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
      <TouchableOpacity onPress={onPress}><CustomText style={[styles.actionText, { color: colors.primary }]}>{value || 'CHANGE'}</CustomText></TouchableOpacity>
    )}
  </View>
);

const BuyerSettingsScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const { isDarkMode, colors, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const changeLanguage = (lng) => i18n.changeLanguage(lng);
  const language = i18n.language;
  const navigation = useNavigation();
  const [notifs, setNotifs] = useState(true);
  const [hideAvailability, setHideAvailability] = useState(false);
  const [loadingPrivacy, setLoadingPrivacy] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

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
      Alert.alert(t('success'), t('passwordUpdatedSuccess'));
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => logout(), 1000);
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
      <ScrollView contentContainerStyle={styles.content}>

        {/* ACCOUNT */}
        <View style={styles.section}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('ACCOUNT') || 'ACCOUNT'}</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
              <View style={[styles.settingIcon, { backgroundColor: colors.glass }]}>
                <User color={colors.muted} size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <CustomText style={[styles.settingTitle, { color: colors.foreground }]}>{t('myProfile') || 'My Profile'}</CustomText>
                <CustomText style={[styles.settingSubtitle, { color: colors.muted }]}>{t('manageProfile') || 'View and edit your profile'}</CustomText>
              </View>
              <ChevronRight color={colors.muted} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* PREFERENCES */}
        <View style={styles.section}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('PREFERENCES')}</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon={Bell} title={t('pushNotifications')} subtitle={t('notifsDesc')} value={notifs} onValueChange={setNotifs} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow icon={Moon} title={t('darkMode')} subtitle={t('darkModeDesc')} value={isDarkMode} onValueChange={toggleTheme} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.navRow} onPress={() => setShowLanguageModal(true)} activeOpacity={0.7}>
              <View style={[styles.settingIcon, { backgroundColor: colors.glass }]}>
                <Languages color={colors.muted} size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <CustomText style={[styles.settingTitle, { color: colors.foreground }]}>{t('language')}</CustomText>
                <CustomText style={[styles.settingSubtitle, { color: colors.muted }]}>{language === 'en' ? 'English' : 'Ikinyarwanda'}</CustomText>
              </View>
              <ChevronRight color={colors.muted} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* SECURITY */}
        <View style={styles.section}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('securityPrivacy')}</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon={Lock} title={t('password')} subtitle={t('secureAccount')} value={t('change')} type="link" onPress={() => setShowPasswordModal(true)} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {loadingPrivacy ? (
              <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator size="small" color={colors.primary} /></View>
            ) : (
              <SettingRow 
                icon={Shield} 
                title={t('hideAvailability')} 
                subtitle={t('hideAvailabilityDesc')} 
                value={hideAvailability} 
                onValueChange={toggleAvailability} 
                colors={colors} 
              />
            )}
          </View>
        </View>

        {/* SUPPORT */}
        <View style={styles.section}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('support')}</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.navRow} onPress={() => {}} activeOpacity={0.7}>
              <View style={[styles.settingIcon, { backgroundColor: colors.glass }]}>
                <HelpCircle color={colors.muted} size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <CustomText style={[styles.settingTitle, { color: colors.foreground }]}>{t('helpCenter')}</CustomText>
                <CustomText style={[styles.settingSubtitle, { color: colors.muted }]}>{t('faqsSupport')}</CustomText>
              </View>
              <ChevronRight color={colors.muted} size={18} />
            </TouchableOpacity>
          </View>
        </View>

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

      {/* LANGUAGE MODAL */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={[styles.langModalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.langModalHeader}>
              <CustomText variant="h3">{t('selectLanguage')}</CustomText>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <XCircle color={colors.muted} size={20} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.langOption, language === 'en' && { backgroundColor: colors.glass }]}
              onPress={() => {
                changeLanguage('en');
                setShowLanguageModal(false);
                Alert.alert(t('success'), t('languageChanged'));
              }}
            >
              <CustomText style={[styles.langText, language === 'en' && { color: colors.primary, fontWeight: 'bold' }]}>English</CustomText>
              {language === 'en' && <ChevronRight color={colors.primary} size={18} />}
            </TouchableOpacity>
            
            <View style={[styles.divider, { backgroundColor: colors.border, marginHorizontal: 0 }]} />
            
            <TouchableOpacity 
              style={[styles.langOption, language === 'rw' && { backgroundColor: colors.glass }]}
              onPress={() => {
                changeLanguage('rw');
                setShowLanguageModal(false);
                Alert.alert(t('success'), t('languageChanged'));
              }}
            >
              <CustomText style={[styles.langText, language === 'rw' && { color: colors.primary, fontWeight: 'bold' }]}>Ikinyarwanda</CustomText>
              {language === 'rw' && <ChevronRight color={colors.primary} size={18} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  langModalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  langModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  langText: {
    fontSize: 16,
  },
});

export default BuyerSettingsScreen;
