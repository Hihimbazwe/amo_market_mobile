import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { 
  X, 
  AlertTriangle, 
  Upload, 
  Package, 
  ShieldAlert, 
  CheckCircle2,
  Trash2,
  ChevronDown
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import CustomText from '../CustomText';
import CustomButton from '../CustomButton';
import { useLanguage } from '../../context/LanguageContext';
import * as ImagePicker from 'expo-image-picker';
import { disputeService } from '../../api/disputeService';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../api/orderService';

const { width } = Dimensions.get('window');
const THUMB_SIZE = Math.floor((width - 48 - 24 - 24) / 3); // 3 items per row with gutters

const getDisputeReasons = (t) => [
  { label: t('notAsDescribed'), value: 'not-as-described' },
  { label: t('arrivedDamaged'), value: 'damaged' },
  { label: t('missingParts'), value: 'missing' },
  { label: t('neverArrived'), value: 'never-arrived' },
  { label: t('counterfeit'), value: 'counterfeit' },
  { label: t('wrongItem'), value: 'wrong-item' },
];

const NewDisputeModal = ({ visible, onClose, orderId, userId, onSuccess }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);

  // Order selection state (used when no orderId pre-passed)
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(orderId || null);
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Sync if orderId prop changes (e.g. opened from orders screen)
  useEffect(() => {
    setSelectedOrderId(orderId || null);
  }, [orderId, visible]);

  // Fetch orders whenever modal opens (needed for product title lookup in both modes)
  useEffect(() => {
    if (visible && (user?.id || userId)) {
      const uid = user?.id || userId;
      setLoadingOrders(true);
      orderService.getOrders(uid)
        .then(data => setOrders(data || []))
        .catch(() => setOrders([]))
        .finally(() => setLoadingOrders(false));
    }
  }, [visible, user?.id, userId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setEvidence(prev => [...prev, { uri: result.assets[0].uri, base64: result.assets[0].base64 }]);
    }
  };

  const removeEvidence = (index) => {
    setEvidence(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    setEvidence([]);
    setShowReasonDropdown(false);
    setShowOrderDropdown(false);
    onClose();
  };

  const handleSubmit = async () => {
    const targetOrderId = selectedOrderId;
    if (!targetOrderId) return Alert.alert(t('missingOrder'), t('selectOrderDispute'));
    if (!reason) return Alert.alert(t('missingReason'), t('selectReasonDispute'));
    if (!description.trim()) return Alert.alert(t('missingDescription'), t('describeIssue'));
    if (evidence.length === 0) return Alert.alert(t('missingEvidence'), t('uploadPhotoEvidence'));

    const uid = user?.id || userId;

    setLoading(true);
    try {
      await disputeService.createDispute(uid, {
        orderId: targetOrderId,
        reason,
        description,
        evidence: evidence.map(e => e.base64),
      });
      
      Alert.alert(t('success'), t('disputeFiledSuccessfully'));
      onSuccess?.();
      handleClose();
    } catch (error) {
      Alert.alert(t('error'), error.message || 'Failed to submit dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
              <View style={styles.headerTitleContainer}>
                <AlertTriangle size={24} color={colors.error} />
                <CustomText variant="h2" style={{ marginLeft: 12 }}>{t('openCase')}</CustomText>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <X color={colors.muted} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Order Info / Order Selector */}
              {orderId ? (
                <View style={[styles.orderInfoCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                  <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15` }]}>
                    <Package color={colors.primary} size={20} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <CustomText style={{ fontSize: 10, fontWeight: 'bold', color: colors.muted, textTransform: 'uppercase' }}>{t('targetOrder')}</CustomText>
                    <CustomText style={{ fontWeight: 'bold' }}>
                      {orders.find(o => o.id === orderId)?.items?.[0]?.product?.title ||
                        orders.find(o => o.id === orderId)?.items?.[0]?.product?.name ||
                        `${t('order')} · ${orderId?.slice(-6).toUpperCase()}`}
                    </CustomText>
                  </View>
                  <View style={[styles.badge, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
                    <CustomText style={{ fontSize: 8, fontWeight: 'black', color: colors.error }}>{t('windowActive')}</CustomText>
                  </View>
                </View>
              ) : (
                <View style={styles.inputSection}>
                  <CustomText style={styles.label}>{t('selectOrder')}</CustomText>
                  <TouchableOpacity
                    style={[styles.dropdown, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                    onPress={() => setShowOrderDropdown(!showOrderDropdown)}
                  >
                    <CustomText style={{ color: selectedOrderId ? colors.foreground : colors.muted }}>
                      {selectedOrderId
                        ? (orders.find(o => o.id === selectedOrderId)?.items?.[0]?.product?.title ||
                           orders.find(o => o.id === selectedOrderId)?.items?.[0]?.product?.name ||
                           `${t('order')} · ${selectedOrderId.slice(-6).toUpperCase()}`)
                        : loadingOrders ? t('loadingOrders') : t('selectAnOrder')}
                    </CustomText>
                    <ChevronDown color={colors.muted} size={18} />
                  </TouchableOpacity>

                  {showOrderDropdown && (
                    <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                      {orders.length === 0 ? (
                        <CustomText style={{ color: colors.muted, padding: 14 }}>{t('noOrdersFound')}</CustomText>
                      ) : orders.map((o) => {
                        const productTitle = o.items?.[0]?.product?.title || o.items?.[0]?.product?.name || `${t('order')} · ${o.id.slice(-6).toUpperCase()}`;
                        return (
                          <TouchableOpacity
                            key={o.id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setSelectedOrderId(o.id);
                              setShowOrderDropdown(false);
                            }}
                          >
                            <CustomText style={{ color: colors.foreground, fontWeight: 'bold' }}>{productTitle}</CustomText>
                            <CustomText style={{ color: colors.muted, fontSize: 12 }}>{t(o.status.toLowerCase()) || o.status} · Rwf {o.total?.toLocaleString()}</CustomText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Reason Dropdown */}
              <View style={styles.inputSection}>
                <CustomText style={styles.label}>{t('reasonForDispute')}</CustomText>
                <TouchableOpacity 
                  style={[styles.dropdown, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                  onPress={() => setShowReasonDropdown(!showReasonDropdown)}
                >
                  <CustomText style={{ color: reason ? colors.foreground : colors.muted }}>
                    {reason ? getDisputeReasons(t).find(r => r.value === reason)?.label : t('selectAReason')}
                  </CustomText>
                  <ChevronDown color={colors.muted} size={18} />
                </TouchableOpacity>
                
                {showReasonDropdown && (
                  <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    {getDisputeReasons(t).map((r) => (
                      <TouchableOpacity 
                        key={r.value} 
                        style={styles.dropdownItem}
                        onPress={() => {
                          setReason(r.value);
                          setShowReasonDropdown(false);
                        }}
                      >
                        <CustomText style={{ color: colors.foreground }}>{r.label}</CustomText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Description */}
              <View style={styles.inputSection}>
                <CustomText style={styles.label}>{t('tellUsMore')}</CustomText>
                <TextInput
                  multiline
                  numberOfLines={5}
                  placeholder={t('explainIssue')}
                  placeholderTextColor={colors.muted}
                  style={[styles.textarea, { backgroundColor: colors.glass, borderColor: colors.glassBorder, color: colors.foreground }]}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* Evidence */}
              <View style={styles.inputSection}>
                <CustomText style={styles.label}>{t('uploadEvidence')}</CustomText>
                <View style={styles.evidenceGrid}>
                  {evidence.map((item, index) => (
                    <View key={index} style={[styles.evidenceItem]}>
                      <Image source={{ uri: item.uri }} style={styles.evidenceImage} resizeMode="cover" />
                      <TouchableOpacity 
                        style={styles.removeBtn} 
                        onPress={() => removeEvidence(index)}
                      >
                        <Trash2 color="#fff" size={14} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  
                  {evidence.length < 5 && (
                    <TouchableOpacity 
                      style={[styles.uploadBtn, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
                      onPress={pickImage}
                    >
                      <Upload color={colors.muted} size={24} />
                      <CustomText style={{ fontSize: 10, color: colors.muted, fontWeight: 'bold', marginTop: 4 }}>{t('add')}</CustomText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={[styles.warningBox, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}20` }]}>
                <ShieldAlert color={colors.error} size={18} />
                <CustomText style={[styles.warningText, { color: colors.error }]}>
                  <CustomText style={{ fontWeight: 'bold' }}>{t('honestyPolicy')}</CustomText> {t('honestyPolicyText')}
                </CustomText>
              </View>

              <CustomButton 
                title={t('submitDisputeRequest')} 
                onPress={handleSubmit} 
                loading={loading}
                disabled={loading}
                style={{ marginTop: 24 }}
              />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  container: { height: '92%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  header: { padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  closeBtn: { padding: 8 },
  content: { paddingHorizontal: 24, paddingTop: 24 },
  orderInfoCard: { padding: 16, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  inputSection: { marginBottom: 24 },
  label: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', letterSpacing: 1, marginBottom: 12 },
  dropdown: { height: 56, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  dropdownList: { marginTop: 8, borderRadius: 16, borderWidth: 1, padding: 8, overflow: 'hidden' },
  dropdownItem: { padding: 14, borderRadius: 10 },
  textarea: { minHeight: 120, borderRadius: 16, borderWidth: 1, padding: 16, textAlignVertical: 'top', fontSize: 14 },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  evidenceItem: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 10 },
  uploadBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBox: { padding: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12 },
  warningText: { flex: 1, fontSize: 11, lineHeight: 16 },
});

export default NewDisputeModal;
