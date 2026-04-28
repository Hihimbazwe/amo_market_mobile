import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { Menu, User, Mail, Shield, Calendar, Camera, ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

import { useTheme } from '../../context/ThemeContext';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { useTranslation } from 'react-i18next';

const BuyerProfileScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const { colors } = useTheme();
  const { user, login } = useAuth();
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const language = i18n.language;
  const navigation = useNavigation();

  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const initials = (user?.name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const accentColor = '#f97316'; // Web's buyer orange

  const handleSaveProfile = async () => {
    if (!name.trim()) return Alert.alert(t('error'), t('nameEmpty'));
    
    setLoading(true);
    try {
      const response = await authService.updateProfile(user.id, { name });
      login({ ...user, name: response.user?.name || name });
      Alert.alert(t('success'), t('profileUpdated'));
    } catch (e) {
      Alert.alert(t('error'), e.message || t('failedToSave'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.glass }]}>
          <ArrowLeft color={colors.foreground} size={20} />
        </TouchableOpacity>
        <CustomText variant="h2">{t('profile')}</CustomText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introSection}>
          <CustomText style={{ fontSize: 24, fontWeight: '900', color: colors.foreground }}>{t('profile')}</CustomText>
          <CustomText style={{ color: colors.muted, marginTop: 4 }}>{t('updateInfo')}</CustomText>
        </View>

        {/* Avatar Card */}
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarBox, { backgroundColor: accentColor + '15', borderColor: accentColor + '30' }]}>
              {user?.image ? (
                <Image source={{ uri: user.image }} style={styles.avatarImage} />
              ) : (
                <CustomText style={[styles.avatarInitials, { color: accentColor }]}>{initials}</CustomText>
              )}
              <View style={[styles.cameraBtn, { backgroundColor: accentColor }]}>
                <Camera color="#fff" size={12} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <CustomText style={[styles.profileName, { color: colors.foreground }]}>{user?.name || '—'}</CustomText>
              <CustomText style={[styles.profileEmail, { color: colors.muted }]}>{user?.email}</CustomText>
              <View style={[styles.roleBadge, { backgroundColor: accentColor + '15', borderColor: accentColor + '30' }]}>
                <Shield color={accentColor} size={11} />
                <CustomText style={[styles.roleText, { color: accentColor }]}>{t('buyer')}</CustomText>
              </View>
            </View>
          </View>
        </View>

        {/* Account Information */}
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('accountInformation')}</CustomText>
          <View style={styles.formGrid}>
            <CustomInput 
              label={t('fullName')} 
              leftIcon={User}
              value={name} 
              onChangeText={setName} 
              placeholder={t('enterFullName')} 
            />
            <CustomInput 
              label={t('emailAddress')} 
              leftIcon={Mail}
              value={user?.email || ''} 
              editable={false} 
            />
          </View>

          <View style={[styles.actionSection, { borderTopColor: colors.border }]}>
            <CustomButton 
              title={loading ? t('saving') : t('saveChanges')} 
              onPress={handleSaveProfile} 
              disabled={loading}
              style={{ backgroundColor: accentColor }}
            />
          </View>
        </View>

        {/* Account Meta */}
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>{t('accountMeta')}</CustomText>
          <View style={styles.metaRow}>
            <View style={[styles.metaIcon, { backgroundColor: accentColor + '15', borderColor: accentColor + '30' }]}>
              <Calendar color={accentColor} size={15} />
            </View>
            <View>
              <CustomText style={[styles.metaLabel, { color: colors.muted }]}>{t('memberSince')}</CustomText>
              <CustomText style={[styles.metaValue, { color: colors.foreground }]}>
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(language === 'rw' ? 'rw-RW' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'April 20, 2026'}
              </CustomText>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    gap: 16
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
  },
  content: { padding: 20 },
  introSection: { marginBottom: 24 },
  glassCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  avatarWrap: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 16 },
  avatarInitials: { fontSize: 24, fontWeight: '900' },
  cameraBtn: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileName: { fontSize: 20, fontWeight: '900' },
  profileEmail: { fontSize: 13, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  roleText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 20 },
  formGrid: { gap: 16 },
  actionSection: { marginTop: 24, paddingTop: 20, borderTopWidth: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metaIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  metaLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  metaValue: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
});

export default BuyerProfileScreen;
