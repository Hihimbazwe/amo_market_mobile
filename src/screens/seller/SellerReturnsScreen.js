import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, Image, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Menu, RefreshCcw, CheckCircle2, XCircle, Clock, ChevronRight, CheckCircle, Package, Play, Truck, QrCode, ShieldCheck, X, Keyboard } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { sellerService } from '../../api/sellerService';
import NotificationIcon from '../../components/NotificationIcon';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const SellerReturnsScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const [returns, setReturns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [debugInfo, setDebugInfo] = React.useState(null);

  // Inline verification & rejection states
  const [activeVerifyOrderId, setActiveVerifyOrderId] = React.useState(null);
  const [verifyCode, setVerifyCode] = React.useState('');
  const [verifying, setVerifying] = React.useState(false);

  const [activeRejectOrderId, setActiveRejectOrderId] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [rejecting, setRejecting] = React.useState(false);

  const [showVerifyModal, setShowVerifyModalInternal] = React.useState(false);
  const [verifyMethod, setVerifyMethod] = React.useState(null); // 'SCAN', 'MANUAL', or null
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = React.useState(false);

  const setShowVerifyModal = (val) => {
    setShowVerifyModalInternal(val);
    if (!val) {
      setVerifyMethod(null);
      setScanned(false);
    }
  };

  const handleOpenReturnScanner = async () => {
    if (!permission) {
      const status = await requestPermission();
      if (!status.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to scan QR codes.');
        return;
      }
    } else if (!permission.granted) {
      const status = await requestPermission();
      if (!status.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to scan QR codes.');
        return;
      }
    }
    setVerifyMethod('SCAN');
    setScanned(false);
  };

  const handleReturnBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    let extractedCode = data;
    
    // 1. Try to extract the Code from line-based layout like `ReturnCode: RT12CD`
    const codeMatch = data.match(/(?:Code|ReturnCode)\s*:\s*([a-zA-Z0-9]+)/i);
    if (codeMatch) {
      extractedCode = codeMatch[1];
    } else {
      // 2. Try JSON parsing
      try {
        const parsed = JSON.parse(data);
        if (parsed && parsed.code) {
          extractedCode = parsed.code;
        } else if (parsed && parsed.pickupCode) {
          extractedCode = parsed.pickupCode;
        } else if (parsed && parsed.returnCode) {
          extractedCode = parsed.returnCode;
        }
      } catch (e) {}
    }
    
    const cleaned = extractedCode?.replace(/\s/g, '').toUpperCase();
    
    // 3. Extract and validate Order ID suffix if present
    const orderIdMatch = data.match(/Order\s*:\s*#?([a-zA-Z0-9]+)/i);
    if (orderIdMatch) {
      const scannedOrderIdSuffix = orderIdMatch[1].toUpperCase();
      const expectedOrderIdSuffix = activeVerifyOrderId?.slice(-8).toUpperCase();
      if (expectedOrderIdSuffix && scannedOrderIdSuffix !== expectedOrderIdSuffix) {
        Alert.alert(
          'Order Mismatch',
          `Scanned QR code is for order #${scannedOrderIdSuffix}, but you are verifying order #${expectedOrderIdSuffix}.`
        );
        setScanned(false);
        return;
      }
    }
    
    if (cleaned) {
      setVerifyCode(cleaned);
      setVerifyMethod(null);
      // Auto-verify directly!
      const autoVerify = async () => {
        setVerifying(true);
        try {
          await sellerService.verifyReturnCode(user.id, activeVerifyOrderId, cleaned);
          setShowVerifyModal(false);
          Alert.alert(t('success') || 'Success', 'Return verified successfully! Item marked as received.');
          setVerifyCode('');
          setActiveVerifyOrderId(null);
          fetchReturns();
        } catch (err) {
          Alert.alert(t('error') || 'Error', err.message || 'Failed to verify return code.');
        } finally {
          setVerifying(false);
          setScanned(false);
        }
      };
      
      autoVerify();
    } else {
      Alert.alert('Invalid QR Code', 'Could not detect a valid verification code in the scanned QR code.');
      setScanned(false);
    }
  };

  const handleVerifyReturn = async (orderId) => {
    if (!verifyCode.trim()) {
      Alert.alert(t('error') || 'Error', 'Please enter a verification code.');
      return;
    }
    setVerifying(true);
    try {
      await sellerService.verifyReturnCode(user.id, orderId, verifyCode.trim().toUpperCase());
      Alert.alert(t('success') || 'Success', 'Return verified successfully! Item marked as received.');
      setVerifyCode('');
      setActiveVerifyOrderId(null);
      setShowVerifyModal(false);
      fetchReturns();
    } catch (error) {
      Alert.alert(t('error') || 'Error', error.message || 'Failed to verify return code.');
    } finally {
      setVerifying(false);
    }
  };

  const handleRejectReturn = async (orderId) => {
    setRejecting(true);
    try {
      await sellerService.rejectReturn(user.id, orderId, rejectReason.trim());
      Alert.alert(t('success') || 'Success', 'Return rejected. Order is now marked as Disputed.');
      setRejectReason('');
      setActiveRejectOrderId(null);
      fetchReturns();
    } catch (error) {
      Alert.alert(t('error') || 'Error', error.message || 'Failed to reject return.');
    } finally {
      setRejecting(false);
    }
  };

  const fetchReturns = async () => {
    if (!user?.id) {
      console.log('[SellerReturns] No user.id, skipping fetch');
      setDebugInfo({ userId: 'MISSING', error: 'No user.id available', count: 0 });
      setLoading(false);
      return;
    }
    console.log('[SellerReturns] Fetching for user.id:', user.id);
    try {
      const data = await sellerService.getOrders(user.id);
      const isArr = Array.isArray(data);
      console.log('[SellerReturns] Got:', isArr ? data.length + ' orders' : JSON.stringify(data).slice(0, 100));
      if (isArr) {
        const returnStatuses = ["RETURN_REQUESTED", "RETURN_IN_TRANSIT", "RETURNED_TO_SELLER", "RETURN_COMPLETED", "REFUNDED", "DISPUTED"];
        const filtered = data.filter(o => returnStatuses.includes(o.status));
        setReturns(filtered);
        setDebugInfo({ userId: user.id, count: filtered.length, raw: JSON.stringify(filtered).slice(0, 80) });
      } else {
        setReturns([]);
        setDebugInfo({ userId: user.id, count: 0, error: 'API did not return an array' });
      }
    } catch (error) {
      console.error('[SellerReturns] Error:', error);
      setDebugInfo({ userId: user.id, error: error.message, count: 0 });
      Alert.alert('Fetch Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchReturns();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReturns();
  };

  const renderReturnItem = ({ item }) => {
    // Each item is an Order object now
    const title = item.items?.map(i => `${i.quantity}x ${i.product?.title || 'Product'}`).join(', ') || 'Order Item';
    const dateStr = new Date(item.createdAt).toLocaleDateString();

    const getStatusColor = (status) => {
      switch (status) {
        case 'RETURN_REQUESTED':
        case 'RETURN_IN_TRANSIT':
          return { bg: 'rgba(249, 115, 22, 0.1)', color: '#F97316' };
        case 'RETURNED_TO_SELLER':
        case 'RETURN_COMPLETED':
        case 'REFUNDED':
          return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981' };
        case 'DISPUTED':
          return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' };
        default:
          return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' };
      }
    };
    const sc = getStatusColor(item.status);

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <CustomText style={[styles.idText, { color: colors.muted }]}>#{item.id.slice(-8).toUpperCase()}</CustomText>
            <CustomText style={[styles.titleText, { color: colors.foreground }]} numberOfLines={2}>{title}</CustomText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <CustomText style={[styles.statusText, { color: sc.color }]}>
              {item.status.replace(/_/g, ' ')}
            </CustomText>
          </View>
        </View>
        
        <View style={[styles.cardBody, { backgroundColor: colors.glass }]}>
          <View style={styles.infoRow}>
            <CustomText style={[styles.label, { color: colors.muted }]}>Recipient:</CustomText>
            <CustomText style={[styles.value, { color: colors.foreground }]}>{item.recipientName || item.buyer?.name}</CustomText>
          </View>
          {item.phoneNumber ? (
            <View style={styles.infoRow}>
              <CustomText style={[styles.label, { color: colors.muted }]}>Phone:</CustomText>
              <CustomText style={[styles.value, { color: colors.foreground }]}>{item.phoneNumber}</CustomText>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <CustomText style={[styles.label, { color: colors.muted }]}>Return Reason:</CustomText>
            <CustomText style={[styles.value, { color: '#F97316', fontWeight: '600', fontStyle: 'italic' }]}>
              "{item.returnReason || 'No reason provided'}"
            </CustomText>
          </View>
          <View style={styles.infoRow}>
            <CustomText style={[styles.label, { color: colors.muted }]}>Amount:</CustomText>
            <CustomText style={[styles.value, { color: colors.primary }]}>
              Rwf {(item.sellerTotal || item.totalAmount || 0).toLocaleString()}
            </CustomText>
          </View>
          <View style={styles.infoRow}>
            <CustomText style={[styles.label, { color: colors.muted }]}>Requested on:</CustomText>
            <CustomText style={[styles.value, { color: colors.foreground }]}>{dateStr}</CustomText>
          </View>
        </View>

        {activeRejectOrderId === item.id ? (
          <View style={{ marginTop: 12, padding: 12, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.15)' }}>
            <CustomText style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>
              Reason for Rejection (Optional)
            </CustomText>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextInput
                style={{ flex: 1, height: 44, backgroundColor: colors.glass, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, color: colors.foreground, fontSize: 13 }}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="e.g. Item is used/damaged"
                placeholderTextColor={colors.muted}
              />
              <TouchableOpacity
                style={{ height: 44, backgroundColor: '#EF4444', borderRadius: 10, justifyContent: 'center', paddingHorizontal: 16 }}
                onPress={() => handleRejectReturn(item.id)}
                disabled={rejecting}
              >
                {rejecting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <CustomText style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>Reject</CustomText>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={{ height: 44, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 12 }}
                onPress={() => { setActiveRejectOrderId(null); setRejectReason(''); }}
              >
                <CustomText style={{ color: colors.muted, fontSize: 13 }}>Cancel</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Render Actions */
          ["RETURN_REQUESTED", "RETURN_IN_TRANSIT"].includes(item.status) ? (
            <View style={[styles.actions, { marginTop: 12 }]}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => {
                  setActiveVerifyOrderId(item.id);
                  setActiveRejectOrderId(null);
                  setVerifyCode('');
                  setVerifyMethod(null);
                  setShowVerifyModal(true);
                }}
              >
                <CheckCircle2 color="white" size={14} />
                <CustomText style={styles.actionBtnText}>Verify Code</CustomText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => {
                  setActiveRejectOrderId(item.id);
                  setActiveVerifyOrderId(null);
                }}
              >
                <XCircle color="#EF4444" size={14} />
                <CustomText style={[styles.actionBtnText, { color: '#EF4444' }]}>Reject Return</CustomText>
              </TouchableOpacity>
            </View>
          ) : item.status === 'DISPUTED' ? (
            <View style={{ marginTop: 12, padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 10, alignItems: 'center' }}>
              <CustomText style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold' }}>
                Disputed — Under Admin Investigation
              </CustomText>
            </View>
          ) : (
            <View style={{ marginTop: 12, padding: 10, backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CheckCircle2 color="#10B981" size={14} />
              <CustomText style={{ color: '#10B981', fontSize: 12, fontWeight: 'bold' }}>
                Return Completed & Received
              </CustomText>
            </View>
          )
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>Return Requests</CustomText>
        <NotificationIcon />
      </View>
      
      {loading && returns.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={returns}
          renderItem={renderReturnItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <View style={{ marginBottom: 20 }}>
              <View style={[styles.headerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <RefreshCcw color={colors.primary} size={24} />
                <CustomText style={styles.headerDesc}>Manage buyer return requests and process refunds quickly.</CustomText>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package color={colors.isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} size={64} />
              <CustomText style={styles.emptyText}>No return requests yet</CustomText>
            </View>
          }
        />
      )}
      {/* Verify Return Code Modal */}
      <Modal visible={showVerifyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', maxHeight: '90%' }}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border, height: undefined }]}>
              <View style={styles.modalHeader}>
                <View>
                  <CustomText variant="h2">Verify Return Code</CustomText>
                  {activeVerifyOrderId && (
                    <CustomText style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                      Return #{activeVerifyOrderId.slice(-8).toUpperCase()}
                    </CustomText>
                  )}
                </View>
                <TouchableOpacity onPress={() => setShowVerifyModal(false)} style={styles.closeBtn}>
                  <X color={colors.muted} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Scan QR Code Section */}
                {verifyMethod === 'SCAN' ? (
                  <View style={{ width: '100%', height: 260, overflow: 'hidden', borderRadius: 16 }}>
                    <CameraView
                      style={StyleSheet.absoluteFillObject}
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={scanned ? undefined : handleReturnBarcodeScanned}
                    >
                      <View style={styles.scannerOverlay}>
                        <View style={styles.scannerUnfocused} />
                        <View style={{ flexDirection: 'row' }}>
                          <View style={styles.scannerUnfocused} />
                          <View style={[styles.scannerFocus, { borderColor: '#3B82F6', width: 160, height: 160 }]}>
                            {/* Laser pointer line */}
                            <View style={[styles.laser, { backgroundColor: '#3B82F6' }]} />
                            
                            {/* Reticle Corner Brackets */}
                            <View style={[styles.corner, styles.topLeft, { borderColor: '#3B82F6' }]} />
                            <View style={[styles.corner, styles.topRight, { borderColor: '#3B82F6' }]} />
                            <View style={[styles.corner, styles.bottomLeft, { borderColor: '#3B82F6' }]} />
                            <View style={[styles.corner, styles.bottomRight, { borderColor: '#3B82F6' }]} />
                          </View>
                          <View style={styles.scannerUnfocused} />
                        </View>
                        <View style={styles.scannerUnfocused}>
                          <CustomText style={[styles.scanText, { fontSize: 11, marginBottom: 6 }]}>Position the QR code inside the frame</CustomText>
                          <TouchableOpacity 
                            style={[styles.scannerCancelBtn, { backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingVertical: 4, paddingHorizontal: 12 }]}
                            onPress={() => setVerifyMethod(null)}
                          >
                            <CustomText style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>Cancel Scan</CustomText>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </CameraView>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={handleOpenReturnScanner}
                  >
                    <View style={[styles.optionIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <QrCode color="#3B82F6" size={24} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CustomText style={{ fontWeight: 'bold', fontSize: 15, color: colors.foreground }}>Scan QR Code</CustomText>
                      <CustomText style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                        Open camera to scan customer's return QR code.
                      </CustomText>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Or Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                  <CustomText style={{ marginHorizontal: 12, fontSize: 11, color: colors.muted, fontWeight: 'bold' }}>OR</CustomText>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                </View>

                {/* 2. Manual Entry Section */}
                <View style={[styles.pickupCodeSection, { paddingVertical: 0 }]}>
                  <CustomText variant="h2" style={[styles.pickupSectionTitle, { fontSize: 16, marginBottom: 4 }]}>Enter Return Code</CustomText>
                  <CustomText style={[styles.pickupSectionSubtitle, { color: colors.muted, fontSize: 11, marginBottom: 12, textAlign: 'center' }]}>
                    Ask the buyer for the 6-character return code shown in their app to verify the return request.
                  </CustomText>

                  <View style={[styles.pickupInputWrapper, { backgroundColor: colors.glass, borderColor: colors.border, height: 56, marginBottom: 0 }]}>
                    <TextInput
                      style={[styles.pickupInput, { color: colors.foreground, fontSize: 20 }]}
                      placeholder="R T 1 2 3 4"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="characters"
                      maxLength={8}
                      value={verifyCode}
                      onChangeText={v => setVerifyCode(v.toUpperCase())}
                      letterSpacing={8}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowVerifyModal(false)}>
                  <CustomText style={{ fontWeight: 'bold', color: colors.muted }}>{t('close') || 'Close'}</CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitAssignBtn,
                    { backgroundColor: '#3B82F6' },
                    (verifying || !verifyCode.trim()) && { opacity: 0.5 }
                  ]}
                  onPress={() => handleVerifyReturn(activeVerifyOrderId)}
                  disabled={verifying || !verifyCode.trim()}
                >
                  {verifying ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <ShieldCheck size={18} color="white" />
                      <CustomText style={{ fontWeight: 'bold', color: 'white' }}>
                        Verify Return
                      </CustomText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
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
  listContent: { padding: 16, paddingBottom: 100 },
  headerBox: { 
    flexDirection: 'row', alignItems: 'center', gap: 16, 
    padding: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, marginBottom: 24
  },
  headerDesc: { flex: 1, fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 16
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  idText: { fontSize: 11, fontWeight: 'bold' },
  titleText: { fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  cardBody: { gap: 8, marginBottom: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12 },
  infoRow: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 12 },
  value: { fontSize: 12, fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  evidenceThumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  verifyCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  verifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifyDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  verifyInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  verifyInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  verifySubmitBtn: {
    width: 80,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifySubmitBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
  },
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 20
  },
  modalContent: { width: '100%', maxHeight: '85%', borderRadius: 24, borderWidth: 1, padding: 24, justifyContent: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  closeBtn: { padding: 4 },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  submitAssignBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  optionsSection: {
    alignItems: 'center',
    width: '100%',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
  },
  optionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scannerUnfocused: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFocus: {
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  laser: {
    width: '90%',
    height: 2.5,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 4,
  },
  topLeft: {
    top: -4,
    left: -4,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: -4,
    right: -4,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: -4,
    left: -4,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: -4,
    right: -4,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scanText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  scannerCancelBtn: {
    borderRadius: 12,
  },
  pickupCodeSection: { alignItems: 'center', paddingVertical: 20 },
  pickupIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  pickupSectionTitle: { textAlign: 'center', marginBottom: 12 },
  pickupSectionSubtitle: { textAlign: 'center', marginBottom: 32, fontSize: 14, lineHeight: 20 },
  pickupInputWrapper: { width: '100%', height: 64, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  pickupInput: { fontSize: 24, fontWeight: '900', textAlign: 'center', width: '100%' },
});

export default SellerReturnsScreen;
