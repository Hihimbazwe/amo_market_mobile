import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Modal, TextInput, Alert, RefreshControl, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Menu, RefreshCcw, X, Edit, Package, ChevronRight, Camera, Trash2, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { replacementService } from '../../api/replacementService';
import { orderService } from '../../api/orderService';
import { useRoute } from '@react-navigation/native';
import NotificationIcon from '../../components/NotificationIcon';
import { useLanguage } from '../../context/LanguageContext';

const BuyerReplacementsScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const route = useRoute();

  const [replacements, setReplacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const REASONS = [
    t('damagedItem'),
    t('wrongItemReceived'),
    t('defectiveProduct'),
    t('missingParts'),
    t('other')
  ];

  const fetchReplacements = async () => {
    if (!user?.id) return;
    try {
      const data = await replacementService.getReplacements(user.id);
      setReplacements(data);
    } catch (error) {
      console.error('Fetch replacements error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReplacements();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReplacements();
  };

  const handleOpenModal = async (initialOrderId = null) => {
    if (!user) {
      Alert.alert(t('loginRequired'), t('pleaseLoginReplacement'));
      return;
    }
    setModalVisible(true);
    if (initialOrderId) setSelectedOrderId(initialOrderId);
    try {
      const data = await orderService.getOrders(user.id);
      // Usually, only DELIVERED or COMPLETED orders can be replaced.
      const eligibleOrders = data.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED');
      setOrders(eligibleOrders);
    } catch (error) {
      console.error('Fetch orders to replace error:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('warning'), 'Please grant media library permissions to upload evidence.');
        return;
      }

      console.log('Opening image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
        base64: true,
      });

      console.log('Picker result:', result.canceled ? 'canceled' : 'success');
      if (!result.canceled) {
        const newImages = result.assets.map(asset => `data:image/jpeg;base64,${asset.base64}`);
        setEvidence([...evidence, ...newImages]);
      }
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert(t('error'), 'Failed to open image library: ' + error.message);
    }
  };

  const removeImage = (index) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (route.params?.initiateReplacementForOrderId) {
      handleOpenModal(route.params.initiateReplacementForOrderId);
    }
  }, [route.params?.initiateReplacementForOrderId]);

  const handleSubmitRequest = async () => {
    if (!selectedOrderId) {
      Alert.alert(t('selectionRequired'), t('selectOrderToReplace'));
      return;
    }
    if (!reason.trim()) {
      Alert.alert(t('reasonRequired'), t('provideReasonReplacement'));
      return;
    }

    setSubmitting(true);
    try {
      await replacementService.requestReplacement(user.id, selectedOrderId, reason, description, evidence);
      Alert.alert(t('success'), t('replacementSubmitted'));
      setModalVisible(false);
      setSelectedOrderId(null);
      setReason('');
      setDescription('');
      setEvidence([]);
      fetchReplacements();
    } catch (error) {
      Alert.alert(t('error'), error.message || 'Failed to submit replacement request.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderReplacementItem = ({ item }) => {
    const title = item.order?.items?.[0]?.product?.title || 'Order Item';
    const dateStr = new Date(item.createdAt).toLocaleDateString();

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        <View style={styles.cardHeader}>
           <View>
             <CustomText style={[styles.idText, { color: colors.foreground }]}>#{item.id.slice(-6).toUpperCase()}</CustomText>
             <CustomText style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Order #{item.orderId.slice(-6).toUpperCase()}</CustomText>
           </View>
           <View style={[styles.statusBadge, { backgroundColor: item.status === 'PENDING' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
              <CustomText style={[styles.statusText, { color: item.status === 'PENDING' ? '#F97316' : '#10B981' }]}>
                {t(item.status.toLowerCase()) || item.status}
              </CustomText>
           </View>
        </View>

        <View style={styles.cardBody}>
          <CustomText style={[styles.reasonLabel, { color: colors.muted }]}>{t('reason')}:</CustomText>
          <CustomText style={[styles.reasonText, { color: colors.foreground }]}>{item.reason}</CustomText>
          {item.description ? (
            <View style={{ marginTop: 8 }}>
              <CustomText style={[styles.reasonLabel, { color: colors.muted }]}>{t('description')}:</CustomText>
              <CustomText style={[styles.reasonText, { color: colors.foreground }]}>{item.description}</CustomText>
            </View>
          ) : null}
          {item.evidence && item.evidence.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <CustomText style={[styles.reasonLabel, { color: colors.muted, marginBottom: 8 }]}>{t('evidencePhotos')}:</CustomText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {item.evidence.map((img, idx) => (
                  <Image key={idx} source={{ uri: img }} style={styles.evidenceThumbnail} />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.glassBorder }]}>
           <CustomText style={{ color: colors.muted, fontSize: 12 }}>{dateStr}</CustomText>
        </View>
      </View>
    );
  };

  const renderOrderOption = ({ item }) => {
     const title = item.items?.[0]?.product?.title || `Order #${item.id.slice(-6).toUpperCase()}`;
     const isSelected = selectedOrderId === item.id;

     return (
       <TouchableOpacity 
         style={[
           styles.orderSelectCard, 
           { backgroundColor: colors.glass, borderColor: isSelected ? colors.primary : colors.glassBorder }
         ]}
         onPress={() => setSelectedOrderId(item.id)}
       >
         <View style={{ flex: 1 }}>
           <CustomText style={[styles.orderSelectId, { color: colors.foreground }]}>#{item.id.slice(-6).toUpperCase()}</CustomText>
           <CustomText style={[styles.orderSelectTitle, { color: colors.muted }]} numberOfLines={1}>{title}</CustomText>
         </View>
         <View style={[styles.radio, { borderColor: isSelected ? colors.primary : colors.muted }]}>
           {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
         </View>
       </TouchableOpacity>
     );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>{t('replacements')}</CustomText>
        <NotificationIcon />
      </View>
      
      <View style={styles.topSection}>
        <CustomText variant="subtitle" style={{ color: colors.muted }}>{t('manageRequests')}</CustomText>
        <CustomButton title={t('requestNew')} onPress={handleOpenModal} style={{ paddingHorizontal: 16 }} />
      </View>

      {loading && replacements.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={replacements}
          keyExtractor={item => item.id}
          renderItem={renderReplacementItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <RefreshCcw color={colors.muted} size={48} />
              <CustomText variant="subtitle" style={{ marginTop: 16, textAlign: 'center' }}>
                {t('noReplacements')}
              </CustomText>
            </View>
          }
        />
      )}

      {/* NEW REQUEST MODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBg}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.glassBorder }]}>
            <View style={styles.modalHeader}>
              <CustomText variant="h3">{t('requestReplacement')}</CustomText>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.closeModalBtn, { backgroundColor: colors.glass }]}>
                <X color={colors.foreground} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
              <CustomText style={[styles.inputLabel, { color: colors.foreground }]}>{t('selectEligibleOrder')}</CustomText>
              
              {orders.length === 0 ? (
                 <CustomText style={{ color: colors.muted, fontStyle: 'italic', marginBottom: 16 }}>
                   {t('noEligibleOrders')}
                 </CustomText>
              ) : (
                 <FlatList
                   data={orders}
                   keyExtractor={item => item.id}
                   renderItem={renderOrderOption}
                   scrollEnabled={false}
                   style={{ marginBottom: 16 }}
                 />
              )}

              <CustomText style={[styles.inputLabel, { color: colors.foreground }]}>{t('selectReason')}</CustomText>
              <View style={styles.reasonsContainer}>
                {REASONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.reasonChip,
                      { backgroundColor: colors.glass, borderColor: reason === r ? colors.primary : colors.glassBorder }
                    ]}
                    onPress={() => setReason(r)}
                  >
                    <CustomText style={{ color: reason === r ? colors.primary : colors.foreground, fontSize: 12 }}>{r}</CustomText>
                  </TouchableOpacity>
                ))}
              </View>

              <CustomText style={[styles.inputLabel, { color: colors.foreground }]}>{t('additionalInformation')}</CustomText>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.glass, color: colors.foreground, borderColor: colors.glassBorder, minHeight: 100 }]}
                placeholder={t('explainIssue')}
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />

              <CustomText style={[styles.inputLabel, { color: colors.foreground }]}>{t('evidencePhotos')}</CustomText>
              <View style={styles.evidenceContainer}>
                <TouchableOpacity style={[styles.addImageBtn, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]} onPress={pickImage}>
                  <Camera color={colors.primary} size={24} />
                  <CustomText style={{ color: colors.primary, fontSize: 12, marginTop: 4 }}>{t('addPhoto')}</CustomText>
                </TouchableOpacity>
                {evidence.map((img, idx) => (
                  <View key={idx} style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: img }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(idx)}>
                      <X color="white" size={12} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <CustomButton 
                title={t('submitRequest')} 
                onPress={handleSubmitRequest} 
                loading={submitting} 
                style={{ marginTop: 16 }} 
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderBottomWidth: 1,
  },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  topSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 },
  listContent: { padding: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 20 },
  
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  idText: { fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  cardBody: { paddingVertical: 12 },
  reasonLabel: { fontSize: 12, marginBottom: 4 },
  reasonText: { fontSize: 14, lineHeight: 20 },
  cardFooter: { borderTopWidth: 1, paddingTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },

  // Modal styling
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
    borderTopWidth: 1, maxHeight: '85%'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  closeModalBtn: { padding: 8, borderRadius: 12 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  textInput: {
    borderWidth: 1, borderRadius: 12, padding: 16,
    fontSize: 15, textAlignVertical: 'top', minHeight: 100, marginBottom: 8
  },
  
  // order selector
  orderSelectCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8
  },
  orderSelectId: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  orderSelectTitle: { fontSize: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  // New styles
  reasonsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  reasonChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  evidenceContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  addImageBtn: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  imagePreviewWrapper: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(239, 68, 68, 0.8)', borderRadius: 10, padding: 2 },
  evidenceThumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 8, backgroundColor: 'rgba(0,0,0,0.1)' }
});

export default BuyerReplacementsScreen;
