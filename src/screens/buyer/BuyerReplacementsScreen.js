import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Modal, TextInput, Alert, RefreshControl, Image, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Menu, RefreshCcw, X, Edit, Package, ChevronRight, Camera, Trash2, Plus, Banknote, RotateCcw, ArrowLeftRight, Wrench, Clock, CheckCircle2, XCircle, Truck, AlertCircle } from 'lucide-react-native';
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

const { width } = Dimensions.get('window');

const TYPE_META = {
  REFUND:      { label: "Refund",      icon: Banknote,   color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" },
  REPLACEMENT: { label: "Replacement", icon: RotateCcw,  color: "#F97316", bg: "rgba(249, 115, 22, 0.1)" },
  EXCHANGE:    { label: "Exchange",    icon: ArrowLeftRight, color: "#A855F7", bg: "rgba(168, 85, 247, 0.1)" },
  REPAIR:      { label: "Repair",      icon: Wrench,     color: "#10B981", bg: "rgba(16, 185, 129, 0.1)" },
};

const STATUS_META = {
  PENDING:              { label: "Pending",    color: "#EAB308", bg: "rgba(234, 179, 8, 0.1)",   icon: Clock },
  APPROVED:             { label: "Approved",   color: "#10B981", bg: "rgba(16, 185, 129, 0.1)",  icon: CheckCircle2 },
  REJECTED:             { label: "Rejected",   color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)",   icon: XCircle },
  AGENT_ASSIGNED:       { label: "Agent Assigned", color: "#F97316", bg: "rgba(249, 115, 22, 0.1)", icon: Truck },
  PICKUP_DONE:          { label: "Picked Up",  color: "#F97316", bg: "rgba(249, 115, 22, 0.1)", icon: Package },
  IN_TRANSIT_TO_SELLER: { label: "In Transit", color: "#F97316", bg: "rgba(249, 115, 22, 0.1)", icon: Truck },
  RECEIVED_BY_SELLER:   { label: "At Seller",  color: "#F97316", bg: "rgba(249, 115, 22, 0.1)", icon: CheckCircle2 },
  PROCESSING:           { label: "Processing", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)", icon: RefreshCcw },
  SHIPPED_REPLACEMENT:  { label: "Shipped",    color: "#F97316", bg: "rgba(249, 115, 22, 0.1)", icon: Truck },
  DELIVERED:            { label: "Delivered",  color: "#10B981", bg: "rgba(16, 185, 129, 0.1)", icon: CheckCircle2 },
  COMPLETED:            { label: "Completed",  color: "#10B981", bg: "rgba(16, 185, 129, 0.1)", icon: CheckCircle2 },
  REFUND_PROCESSING:    { label: "Refund Proc.", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)", icon: RefreshCcw },
  REFUNDED:             { label: "Refunded",   color: "#10B981", bg: "rgba(16, 185, 129, 0.1)", icon: CheckCircle2 },
};

const BuyerReplacementsScreen = () => {
  const { toggleDrawer } = useContext(DrawerContext);
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const route = useRoute();

  const [replacements, setReplacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState("ALL");

  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [requestType, setRequestType] = useState("REPLACEMENT");
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchReplacements = async () => {
    if (!user?.id) return;
    try {
      const data = await replacementService.getReplacements(user.id);
      setReplacements(Array.isArray(data) ? data : []);
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
      Alert.alert(t('loginRequired') || "Login Required", t('pleaseLoginReplacement') || "Please login to request after-sales service.");
      return;
    }
    setModalVisible(true);
    if (initialOrderId) setSelectedOrderId(initialOrderId);
    try {
      const data = await orderService.getOrders(user.id);
      const eligibleOrders = data.filter(o => (o.status === 'DELIVERED' || o.status === 'COMPLETED'));
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

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => `data:image/jpeg;base64,${asset.base64}`);
        setEvidence([...evidence, ...newImages]);
      }
    } catch (error) {
      console.error('Pick image error:', error);
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
      Alert.alert(t('selectionRequired') || "Selection Required", t('selectOrderToReplace') || "Please select an order.");
      return;
    }
    if (!reason.trim()) {
      Alert.alert(t('reasonRequired') || "Reason Required", t('provideReasonReplacement') || "Please provide a reason.");
      return;
    }

    setSubmitting(true);
    try {
      await replacementService.requestReplacement(user.id, selectedOrderId, requestType, reason, description, evidence);
      Alert.alert(t('success'), t('replacementSubmitted') || "Your request has been submitted successfully.");
      setModalVisible(false);
      setSelectedOrderId(null);
      setRequestType("REPLACEMENT");
      setReason('');
      setDescription('');
      setEvidence([]);
      fetchReplacements();
    } catch (error) {
      Alert.alert(t('error'), error.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReplacements = filterType === "ALL" ? replacements : replacements.filter(r => r.type === filterType);

  const renderReplacementItem = ({ item }) => {
    const tm = TYPE_META[item.type] || TYPE_META.REPLACEMENT;
    const sm = STATUS_META[item.status] || STATUS_META.PENDING;
    const TypeIcon = tm.icon;
    const StatusIcon = sm.icon;
    const dateStr = new Date(item.createdAt).toLocaleDateString();

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.typeIconContainer, { backgroundColor: tm.bg }]}>
              <TypeIcon size={16} color={tm.color} />
            </View>
            <View style={{ marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CustomText style={[styles.productTitle, { color: colors.foreground }]}>{item.order?.items?.[0]?.product?.title || "Product"}</CustomText>
                <View style={[styles.typeBadge, { backgroundColor: tm.bg, borderColor: tm.color + '33' }]}>
                  <CustomText style={{ color: tm.color, fontSize: 9, fontWeight: '900' }}>{tm.label.toUpperCase()}</CustomText>
                </View>
              </View>
              <CustomText style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                Order #{item.orderId.slice(-8).toUpperCase()} · {dateStr}
              </CustomText>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sm.bg, borderColor: sm.color + '33' }]}>
            <StatusIcon size={10} color={sm.color} />
            <CustomText style={[styles.statusText, { color: sm.color }]}>{sm.label}</CustomText>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            <CustomText style={[styles.infoLabel, { color: colors.muted }]}>Reason: </CustomText>
            <CustomText style={[styles.infoValue, { color: colors.foreground }]}>{item.reason}</CustomText>
          </View>
          
          {item.description ? (
            <CustomText style={[styles.descriptionText, { color: colors.muted }]} numberOfLines={2}>
              {item.description}
            </CustomText>
          ) : null}

          {item.evidence && item.evidence.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {item.evidence.map((img, idx) => (
                <Image key={idx} source={{ uri: img }} style={styles.evidenceThumbnail} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.glassBorder }]}>
          <TouchableOpacity style={styles.viewOrderBtn}>
            <CustomText style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View Order</CustomText>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const types = ["ALL", "REFUND", "REPLACEMENT", "EXCHANGE", "REPAIR"];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>After-Sales</CustomText>
        <NotificationIcon />
      </View>
      
      <View style={styles.topSection}>
        <View>
          <CustomText style={{ color: colors.foreground, fontSize: 20, fontWeight: '900' }}>Requests</CustomText>
          <CustomText style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Track refunds & replacements</CustomText>
        </View>
        <TouchableOpacity 
          style={[styles.newRequestBtn, { backgroundColor: colors.primary }]}
          onPress={handleOpenModal}
        >
          <Plus size={18} color="#fff" />
          <CustomText style={{ color: '#fff', fontWeight: 'bold', marginLeft: 6 }}>New</CustomText>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {types.map(t => {
            const active = filterType === t;
            const meta = TYPE_META[t];
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setFilterType(t)}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: active ? (meta ? meta.bg : colors.primary) : colors.glass,
                    borderColor: active ? (meta ? meta.color : colors.primary) : colors.glassBorder
                  }
                ]}
              >
                {meta && <meta.icon size={12} color={active ? meta.color : colors.muted} style={{ marginRight: 6 }} />}
                <CustomText style={{ 
                  color: active ? (meta ? meta.color : '#fff') : colors.muted, 
                  fontSize: 12, 
                  fontWeight: 'bold' 
                }}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </CustomText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && replacements.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredReplacements}
          keyExtractor={item => item.id}
          renderItem={renderReplacementItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.glass }]}>
                <Package color={colors.muted} size={40} />
              </View>
              <CustomText style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>No requests found</CustomText>
              <CustomText style={{ color: colors.muted, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                Had an issue with an order?{'\n'}File a new after-sales request.
              </CustomText>
              <TouchableOpacity 
                style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleOpenModal}
              >
                <Plus size={18} color="#fff" />
                <CustomText style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>Create New Request</CustomText>
              </TouchableOpacity>
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
              <View>
                <CustomText style={{ fontSize: 20, fontWeight: '900', color: colors.foreground }}>New Request</CustomText>
                <CustomText style={{ fontSize: 12, color: colors.muted }}>Select an order to begin</CustomText>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.closeModalBtn, { backgroundColor: colors.glass }]}>
                <X color={colors.foreground} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
              <CustomText style={[styles.inputLabel, { color: colors.foreground }]}>1. Select Order</CustomText>
              {orders.length === 0 ? (
                 <View style={[styles.emptyOrdersBox, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                   <AlertCircle color={colors.muted} size={20} />
                   <CustomText style={{ color: colors.muted, fontSize: 13, marginLeft: 10 }}>No eligible orders found.</CustomText>
                 </View>
              ) : (
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                   {orders.map(order => (
                     <TouchableOpacity 
                        key={order.id}
                        onPress={() => setSelectedOrderId(order.id)}
                        style={[
                          styles.orderCard, 
                          { 
                            backgroundColor: colors.glass, 
                            borderColor: selectedOrderId === order.id ? colors.primary : colors.glassBorder 
                          }
                        ]}
                     >
                       <CustomText style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 13 }}>#{order.id.slice(-8).toUpperCase()}</CustomText>
                       <CustomText style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{new Date(order.createdAt).toLocaleDateString()}</CustomText>
                       <View style={[styles.radio, { borderColor: selectedOrderId === order.id ? colors.primary : colors.muted }]}>
                         {selectedOrderId === order.id && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                       </View>
                     </TouchableOpacity>
                   ))}
                 </ScrollView>
              )}

              <CustomText style={[styles.inputLabel, { color: colors.foreground }]}>2. Request Type</CustomText>
              <View style={styles.typeSelector}>
                {Object.keys(TYPE_META).map(type => {
                  const active = requestType === type;
                  const meta = TYPE_META[type];
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setRequestType(type)}
                      style={[
                        styles.typeOption,
                        { 
                          backgroundColor: active ? meta.bg : colors.glass,
                          borderColor: active ? meta.color : colors.glassBorder
                        }
                      ]}
                    >
                      <meta.icon size={20} color={active ? meta.color : colors.muted} />
                      <CustomText style={{ 
                        color: active ? meta.color : colors.muted, 
                        fontSize: 10, 
                        fontWeight: 'bold',
                        marginTop: 6
                      }}>{meta.label}</CustomText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <CustomText style={[styles.inputLabel, { color: colors.foreground }]}>3. Issue Details</CustomText>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.glass, color: colors.foreground, borderColor: colors.glassBorder }]}
                placeholder="Briefly state the reason..."
                placeholderTextColor={colors.muted}
                value={reason}
                onChangeText={setReason}
              />
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.glass, color: colors.foreground, borderColor: colors.glassBorder, minHeight: 100, marginTop: 12 }]}
                placeholder="Provide more details about the issue..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />

              <CustomText style={[styles.inputLabel, { color: colors.foreground, marginTop: 20 }]}>4. Evidence Photos</CustomText>
              <View style={styles.evidenceContainer}>
                <TouchableOpacity style={[styles.addImageBtn, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]} onPress={pickImage}>
                  <Camera color={colors.primary} size={24} />
                  <CustomText style={{ color: colors.primary, fontSize: 10, marginTop: 4 }}>Add Photo</CustomText>
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

              <TouchableOpacity 
                style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
                onPress={handleSubmitRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <CustomText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Submit Request</CustomText>
                )}
              </TouchableOpacity>
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
  topSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 15 },
  newRequestBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  
  filterContainer: { marginBottom: 15 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, marginRight: 8 },

  listContent: { padding: 20, paddingBottom: 100 },
  card: { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  typeIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  productTitle: { fontSize: 14, fontWeight: 'bold', maxWidth: width * 0.4 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginLeft: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  
  cardBody: { marginBottom: 15 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 12, fontWeight: 'bold' },
  descriptionText: { fontSize: 12, marginTop: 8, lineHeight: 18 },
  evidenceThumbnail: { width: 60, height: 60, borderRadius: 10, marginRight: 10 },
  
  cardFooter: { borderTopWidth: 1, paddingTop: 12 },
  viewOrderBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emptyActionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, marginTop: 24 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  closeModalBtn: { padding: 10, borderRadius: 14 },
  inputLabel: { fontSize: 14, fontWeight: '900', marginBottom: 12, marginTop: 10 },
  
  emptyOrdersBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', marginBottom: 20 },
  orderCard: { width: 120, padding: 12, borderRadius: 16, borderWidth: 1, marginRight: 10 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 10, alignSelf: 'flex-end' },
  radioInner: { width: 8, height: 8, borderRadius: 4 },
  
  typeSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  typeOption: { width: '22%', aspectRatio: 1, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  
  textInput: { borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 14 },
  evidenceContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  addImageBtn: { width: 70, height: 70, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  imagePreviewWrapper: { width: 70, height: 70, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  imagePreview: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(239, 68, 68, 0.8)', borderRadius: 10, padding: 2 },
  
  submitBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }
});

export default BuyerReplacementsScreen;

