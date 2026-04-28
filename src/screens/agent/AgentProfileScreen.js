import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { ShieldCheck, Star, User, Mail, Phone, Calendar, Upload, X, CheckCircle2, AlertCircle, FileText, ChevronRight, Shield, MapPin, ScanLine, Loader2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { AgentDrawerContext } from '../../context/AgentDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { agentService } from '../../api/agentService';
import { Menu } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import PresenceDot from '../../components/PresenceDot';

const AgentProfileScreen = () => {
    const { toggleDrawer } = React.useContext(AgentDrawerContext);
    const { colors } = useTheme();
    const { user } = useAuth();
    const { t } = useTranslation(['dashboard', 'common']);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedDocs, setSelectedDocs] = useState([]); // [{uri, url, name}]
    const [success, setSuccess] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await agentService.getProfile();
            setProfile(data || null);
            if (data?.verificationDocs) {
                try {
                    const existing = JSON.parse(data.verificationDocs);
                    if (Array.isArray(existing) && existing.length > 0) {
                        setSuccess(true);
                    }
                } catch (e) { /* ignore parse error */ }
            }
        } catch (error) {
            console.error('Load Profile Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const pickDocument = async () => {
        if (selectedDocs.length >= 3) {
            Alert.alert(t('limitReached'), t('uploadLimitDesc'));
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            const newDoc = {
                uri: result.assets[0].uri,
                name: result.assets[0].fileName || `doc_${Date.now()}.jpg`,
                url: null
            };
            setSelectedDocs(prev => [...prev, newDoc]);
        }
    };

    const removeDoc = (index) => {
        setSelectedDocs(prev => prev.filter((_, i) => i !== index));
    };

    const handleVerify = async () => {
        if (selectedDocs.length === 0) return;

        setSubmitting(true);
        setUploading(true);
        try {
            const urls = [];
            for (let i = 0; i < selectedDocs.length; i++) {
                const doc = selectedDocs[i];
                if (doc.url) {
                    urls.push(doc.url);
                    continue;
                }
                const uploadRes = await agentService.uploadFile(doc.uri);
                urls.push(uploadRes.url);
                
                // Update local state to show it's uploaded
                const updated = [...selectedDocs];
                updated[i].url = uploadRes.url;
                setSelectedDocs(updated);
            }
            setUploading(false);

            await agentService.updateProfile({
                city: profile?.city || '',
                country: profile?.country || '',
                coverageArea: profile?.coverageArea || '[]',
                verificationDocs: urls
            });

            setSuccess(true);
            Alert.alert(t('success'), t('docsSubmittedSuccess'));
            load();
        } catch (error) {
            console.error('Verification Error:', error);
            Alert.alert(t('error'), error.message || t('failedSubmitVerification'));
        } finally {
            setSubmitting(false);
            setUploading(false);
        }
    };

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const initials = (user?.name || "A").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const styles = createStyles(colors);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView style={{ flex: 0 }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
                    <Menu color={colors.foreground} size={24} />
                </TouchableOpacity>
                <View>
                    <CustomText variant="h1" style={{ fontSize: 24 }}>{t('profile')}</CustomText>
                    <CustomText style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{t('accountDetailsVerification')}</CustomText>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <>
                        <View style={[styles.card, styles.avatarCard, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                            <View>
                                <View style={[styles.avatarContainer, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
                                    {user?.image ? (
                                        <Image source={{ uri: user.image }} style={styles.avatarLarge} />
                                    ) : (
                                        <CustomText style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>{initials}</CustomText>
                                    )}
                                </View>
                                <View style={styles.presenceContainer}>
                                    <PresenceDot size={14} borderSize={3} borderColor={colors.background} />
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <CustomText variant="h2" style={{ fontSize: 20 }}>{user?.name || '—'}</CustomText>
                                <View style={[styles.roleBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
                                    <Shield size={11} color={colors.primary} />
                                    <CustomText style={{ color: colors.primary, fontSize: 10, fontWeight: '800', marginLeft: 6, letterSpacing: 0.5 }}>{t('agentStaff')}</CustomText>
                                </View>
                            </View>
                        </View>

                        {/* Account info section */}
                        <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                            <CustomText style={styles.sectionLabel}>{t('accountInformation')}</CustomText>
                            
                            <View style={styles.accountRow}>
                                <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
                                    <User size={16} color={colors.primary} />
                                </View>
                                <View style={{ marginLeft: 16 }}>
                                    <CustomText style={styles.infoLabel}>{t('fullNameLabel')}</CustomText>
                                    <CustomText style={styles.infoValue}>{user?.name || '—'}</CustomText>
                                </View>
                            </View>

                            <View style={styles.accountRow}>
                                <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
                                    <Mail size={16} color={colors.primary} />
                                </View>
                                <View style={{ marginLeft: 16 }}>
                                    <CustomText style={styles.infoLabel}>{t('emailAddressLabel')}</CustomText>
                                    <CustomText style={styles.infoValue}>{user?.email || '—'}</CustomText>
                                </View>
                            </View>

                            <View style={styles.accountRow}>
                                <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
                                    <ScanLine size={16} color={colors.primary} />
                                </View>
                                <View style={{ marginLeft: 16 }}>
                                    <CustomText style={styles.infoLabel}>{t('roleLabel')}</CustomText>
                                    <CustomText style={styles.infoValue}>Agent</CustomText>
                                </View>
                            </View>
                        </View>

                        {/* Assigned location */}
                        <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                            <CustomText style={styles.sectionLabel}>{t('assignedPickupLocation')}</CustomText>
                            {profile?.pickupLocation ? (
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                    <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30`, marginTop: 2 }]}>
                                        <MapPin size={16} color={colors.primary} />
                                    </View>
                                    <View style={{ marginLeft: 16, flex: 1 }}>
                                        <CustomText style={{ fontWeight: '800', fontSize: 16, color: colors.foreground }}>{profile.pickupLocation.name}</CustomText>
                                        <CustomText style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{profile.pickupLocation.address}</CustomText>
                                        <CustomText style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
                                            {t('hours')}: <CustomText style={{ color: colors.foreground, fontWeight: '600' }}>{profile.pickupLocation.openTime} – {profile.pickupLocation.closeTime}</CustomText>
                                        </CustomText>
                                    </View>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MapPin size={16} color={colors.primary} style={{ opacity: 0.5 }} />
                                    <CustomText style={{ color: colors.muted, fontSize: 13, marginLeft: 12 }}>{t('noPickupLocation')}</CustomText>
                                </View>
                            )}
                        </View>

                        {/* Verification Section */}
                        <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.border, marginBottom: 40 }]}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
                                    <ShieldCheck size={20} color={colors.primary} />
                                </View>
                                <View style={{ marginLeft: 16 }}>
                                    <CustomText variant="h3" style={{ fontSize: 18 }}>{t('agentVerification')}</CustomText>
                                    <CustomText style={{ color: colors.muted, fontSize: 11 }}>{t('submitDocsVerification')}</CustomText>
                                </View>
                            </View>

                            {success ? (
                                <View style={[styles.statusBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }]}>
                                    <CheckCircle2 size={28} color={colors.primary} />
                                    <View style={{ marginLeft: 16, flex: 1 }}>
                                        <CustomText style={{ fontWeight: '800', color: colors.foreground }}>{t('docsSubmitted')}</CustomText>
                                        <CustomText style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{t('reviewProcessTime')}</CustomText>
                                    </View>
                                </View>
                            ) : (
                                <>
                                    <View style={[styles.benefitBox, { backgroundColor: `${colors.primary}05`, borderColor: `${colors.primary}10` }]}>
                                        <CustomText style={styles.benefitTitle}>
                                            <Star size={11} color={colors.primary} /> {t('whyGetVerified')}
                                        </CustomText>
                                        <View style={styles.benefitGrid}>
                                            {[t("trustBadge"), t("priorityAssignments"), t("higherVolume"), t("buyerSellerRatings")].map((b, i) => (
                                                <View key={i} style={styles.benefitItem}>
                                                    <CheckCircle2 size={12} color={colors.primary} />
                                                    <CustomText style={styles.benefitText}>{b}</CustomText>
                                                </View>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={{ marginTop: 24 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <CustomText style={styles.sectionLabelSmall}>{t('uploadDocs')}</CustomText>
                                            <CustomText style={{ fontSize: 10, color: colors.muted }}>{t('upTo3Files')}</CustomText>
                                        </View>

                                        <View style={styles.selectedDocsList}>
                                            {selectedDocs.map((doc, i) => (
                                                <View key={i} style={[styles.uploadItem, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border }]}>
                                                    <View style={[styles.docThumb, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }]}>
                                                        <Image source={{ uri: doc.uri }} style={styles.fullImg} />
                                                    </View>
                                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                                        <CustomText numberOfLines={1} style={{ fontSize: 13, fontWeight: '600' }}>{doc.name}</CustomText>
                                                        <CustomText style={{ fontSize: 10, color: colors.muted }}>{doc.url ? t('ready') : t('pendingUpload')}</CustomText>
                                                    </View>
                                                    {doc.url ? (
                                                        <CheckCircle2 size={16} color="#4ADE80" />
                                                    ) : uploading ? (
                                                        <ActivityIndicator size="small" color={colors.primary} />
                                                    ) : (
                                                        <TouchableOpacity onPress={() => removeDoc(i)}>
                                                            <X size={18} color={colors.muted} />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            ))}
                                        </View>

                                        {selectedDocs.length < 3 && (
                                            <TouchableOpacity 
                                                onPress={pickDocument}
                                                style={[styles.uploadButtonDashed, { borderColor: colors.border }]}
                                            >
                                                <Upload size={24} color={colors.muted} />
                                                <CustomText style={{ color: colors.muted, marginTop: 8, fontWeight: '800', fontSize: 13 }}>{t('clickToUpload')}</CustomText>
                                                <CustomText style={{ color: colors.muted, fontSize: 10, marginTop: 4, opacity: 0.6 }}>{t('uploadFormats')}</CustomText>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity 
                                            style={[styles.primaryAction, { backgroundColor: colors.primary, opacity: (submitting || selectedDocs.length === 0) ? 0.5 : 1 }]}
                                            disabled={submitting || selectedDocs.length === 0}
                                            onPress={handleVerify}
                                        >
                                            {submitting ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <>
                                                    <ShieldCheck size={18} color="#FFF" />
                                                    <CustomText style={{ color: '#FFF', fontWeight: '800', marginLeft: 8 }}>{t('submitVerification')}</CustomText>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, paddingTop: 12 },
    menuButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 20 },
    content: { padding: 24 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 400 },
    card: { padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
    avatarCard: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    avatarContainer: { width: 72, height: 72, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    presenceContainer: { position: 'absolute', bottom: -2, right: -2 },
    avatarLarge: { width: 72, height: 72 },
    roleBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, marginTop: 8 },
    sectionLabel: { color: colors.foreground, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 24, opacity: 0.8 },
    sectionLabelSmall: { color: colors.foreground, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    accountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconBox: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    infoLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    infoValue: { color: colors.foreground, fontSize: 14, fontWeight: '600', marginTop: 2 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 18, borderWidth: 1 },
    benefitBox: { padding: 20, borderRadius: 18, borderWidth: 1 },
    benefitTitle: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
    benefitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    benefitItem: { flexDirection: 'row', alignItems: 'center', width: '47%', gap: 8 },
    benefitText: { color: colors.muted, fontSize: 11 },
    selectedDocsList: { gap: 10, marginBottom: 16 },
    uploadItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, borderWidth: 1 },
    docThumb: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
    fullImg: { width: '100%', height: '100%' },
    uploadButtonDashed: { height: 140, borderStyle: 'dashed', borderWidth: 2, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    primaryAction: { height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 }
});

export default AgentProfileScreen;
