import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, StatusBar, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, User, Phone, MapPin, Truck, Save } from 'lucide-react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { courierService } from '../../api/courierService';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export default function CourierProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation(['dashboard', 'common']);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: '', vehicleType: '', licensePlate: '', bio: '' });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await courierService.getProfile(user.id);
      setProfile(data);
      setForm({
        phone: data.phone || '',
        vehicleType: data.vehicleType || '',
        licensePlate: data.licensePlate || '',
        bio: data.bio || '',
      });
    } catch (e) {
      console.error('Profile fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  const handleSave = async () => {
    setSaving(true);
    try {
      await courierService.updateProfile(user.id, form);
      Alert.alert(`✅ ${t('saved')}`, t('profileUpdatedDesc'));
    } catch (e) {
      Alert.alert(t('error'), e.message || t('failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'phone', label: t('phone'), icon: Phone, placeholder: '+250 7XX XXX XXX', keyboardType: 'phone-pad' },
    { key: 'vehicleType', label: t('vehicleType'), icon: Truck, placeholder: t('vehiclePlaceholder') },
    { key: 'licensePlate', label: t('licensePlate'), icon: Truck, placeholder: t('licensePlaceholder') },
    { key: 'bio', label: t('bioNotes'), icon: User, placeholder: t('bioPlaceholder'), multiline: true },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.glass }]}>
          <ChevronLeft color={colors.foreground} size={22} />
        </TouchableOpacity>
        <CustomText style={[styles.title, { color: colors.foreground }]}>{t('profile')}</CustomText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar card */}
        <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.3)' }]}>
            <CustomText style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() || 'C'}</CustomText>
          </View>
          <View style={{ flex: 1 }}>
            <CustomText style={[styles.userName, { color: colors.foreground }]}>{user?.name || t('courier')}</CustomText>
            <CustomText style={{ fontSize: 12, color: colors.muted }}>{user?.email}</CustomText>
            <View style={[styles.roleBadge, { backgroundColor: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.3)' }]}>
              <Truck color="#f97316" size={11} />
              <CustomText style={{ fontSize: 10, fontWeight: '800', color: '#f97316', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('courier')}</CustomText>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Coverage area info */}
            {profile?.coverageArea && (
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.infoRow}>
                  <MapPin color="#f97316" size={16} />
                  <CustomText style={[styles.infoLabel, { color: colors.muted }]}>{t('coverage')}</CustomText>
                </View>
                <CustomText style={[styles.infoValue, { color: colors.foreground }]}>{profile.coverageArea}</CustomText>
              </View>
            )}

            {/* Editable fields */}
            <CustomText style={[styles.sectionTitle, { color: colors.foreground }]}>{t('editDetails')}</CustomText>
            {fields.map(f => {
              const Icon = f.icon;
              return (
                <View key={f.key} style={styles.fieldGroup}>
                  <CustomText style={[styles.fieldLabel, { color: colors.muted }]}>{f.label}</CustomText>
                  <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Icon color={colors.muted} size={16} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.input, { color: colors.foreground }, f.multiline && { height: 80, textAlignVertical: 'top' }]}
                      value={form[f.key]}
                      onChangeText={val => setForm(prev => ({ ...prev, [f.key]: val }))}
                      placeholder={f.placeholder}
                      placeholderTextColor={colors.muted}
                      keyboardType={f.keyboardType || 'default'}
                      multiline={f.multiline}
                    />
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Save color="#fff" size={18} />}
              <CustomText style={styles.saveBtnText}>{saving ? t('saving') : t('saveChanges')}</CustomText>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900' },
  content: { padding: 16 },
  avatarCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 16, gap: 16, marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 26, fontWeight: '900', color: '#f97316' },
  userName: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start', marginTop: 6 },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '900', marginBottom: 14 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  input: { flex: 1, fontSize: 14 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
