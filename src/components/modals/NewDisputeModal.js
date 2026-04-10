import React, { useState } from 'react';
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
  Dimensions
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
import * as ImagePicker from 'expo-image-picker';
import { disputeService } from '../../api/disputeService';

const { width } = Dimensions.get('window');

const DISPUTE_REASONS = [
  { label: 'Item received is not as described', value: 'not-as-described' },
  { label: 'Item arrived damaged/broken', value: 'damaged' },
  { label: 'Parts or items are missing', value: 'missing' },
  { label: 'Order never arrived', value: 'never-arrived' },
  { label: 'Item is counterfeit/fake', value: 'counterfeit' },
  { label: 'Received the wrong item entirely', value: 'wrong-item' },
];

const NewDisputeModal = ({ visible, onClose, orderId, userId, onSuccess }) => {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
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

  const handleSubmit = async () => {
    if (!reason) return Alert.alert('Missing Reason', 'Please select a reason for the dispute.');
    if (!description.trim()) return Alert.alert('Missing Description', 'Please describe the issue.');
    if (evidence.length === 0) return Alert.alert('Missing Evidence', 'Please upload at least one photo as evidence.');

    setLoading(true);
    try {
      await disputeService.createDispute(userId, {
        orderId,
        reason,
        description,
        evidence: evidence.map(e => e.base64)
      });
      
      Alert.alert('Success', 'Dispute filed successfully! Our team will review the case.');
      onSuccess?.();
      onClose();
      // Reset state
      setReason('');
      setDescription('');
      setEvidence([]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
            <View style={styles.headerTitleContainer}>
              <AlertTriangle size={24} color={colors.error} />
              <CustomText variant="h2" style={{ marginLeft: 12 }}>Open Case</CustomText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={colors.muted} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Order Info */}
            <View style={[styles.orderInfoCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15` }]}>
                <Package color={colors.primary} size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <CustomText style={{ fontSize: 10, fontWeight: 'bold', color: colors.muted, textTransform: 'uppercase' }}>Target Order</CustomText>
                <CustomText style={{ fontWeight: 'bold' }}>#{orderId?.slice(-8).toUpperCase()}</CustomText>
              </View>
              <View style={[styles.badge, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
                <CustomText style={{ fontSize: 8, fontWeight: 'black', color: colors.error }}>72H WINDOW ACTIVE</CustomText>
              </View>
            </View>

            {/* Reason Dropdown */}
            <View style={styles.inputSection}>
              <CustomText style={styles.label}>REASON FOR DISPUTE *</CustomText>
              <TouchableOpacity 
                style={[styles.dropdown, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                onPress={() => setShowReasonDropdown(!showReasonDropdown)}
              >
                <CustomText style={{ color: reason ? colors.foreground : colors.muted }}>
                  {reason ? DISPUTE_REASONS.find(r => r.value === reason)?.label : 'Select a reason'}
                </CustomText>
                <ChevronDown color={colors.muted} size={18} />
              </TouchableOpacity>
              
              {showReasonDropdown && (
                <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                  {DISPUTE_REASONS.map((r) => (
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
              <CustomText style={styles.label}>TELL US MORE *</CustomText>
              <TextInput
                multiline
                numberOfLines={5}
                placeholder="Describe the issue in detail. The more info you provide, the faster we can resolve it."
                placeholderTextColor={colors.muted}
                style={[styles.textarea, { backgroundColor: colors.glass, borderColor: colors.glassBorder, color: colors.foreground }]}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Evidence */}
            <View style={styles.inputSection}>
              <CustomText style={styles.label}>UPLOAD EVIDENCE (PHOTOS) *</CustomText>
              <View style={styles.evidenceGrid}>
                {evidence.map((item, index) => (
                  <View key={index} style={styles.evidenceItem}>
                    <Image source={{ uri: item.uri }} style={styles.evidenceImage} />
                    <TouchableOpacity 
                      style={styles.removeBtn} 
                      onPress={() => removeEvidence(index)}
                    >
                      <Trash2 color="#fff" size={14} />
                    </TouchableOpacity>
                  </View>
                ))}
                
                <TouchableOpacity 
                  style={[styles.uploadBtn, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
                  onPress={pickImage}
                >
                  <Upload color={colors.muted} size={24} />
                  <CustomText style={{ fontSize: 10, color: colors.muted, fontWeight: 'bold', marginTop: 4 }}>ADD</CustomText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.warningBox, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}20` }]}>
              <ShieldAlert color={colors.error} size={18} />
              <CustomText style={[styles.warningText, { color: colors.error }]}>
                <CustomText style={{ fontWeight: 'bold' }}>Honesty Policy:</CustomText> Filing false disputes is a violation of our Terms of Service and may result in permanent account suspension.
              </CustomText>
            </View>

            <CustomButton 
              title="Submit Dispute Request" 
              onPress={handleSubmit} 
              loading={loading}
              disabled={loading}
              style={{ marginTop: 24, marginBottom: 40 }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  container: { height: '90%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  header: { padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  closeBtn: { padding: 8 },
  content: { padding: 24 },
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
  evidenceItem: { width: (width - 48 - 24) / 3, aspectSquare: 1, borderRadius: 16, overflow: 'hidden' },
  evidenceImage: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 10 },
  uploadBtn: { width: (width - 48 - 24) / 3, aspectSquare: 1, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  warningBox: { padding: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12 },
  warningText: { flex: 1, fontSize: 11, lineHeight: 16 },
});

export default NewDisputeModal;
