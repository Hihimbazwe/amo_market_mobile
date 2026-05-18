import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import {
  User,
  Phone,
  Gift,
  Truck,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Building,
  Wallet,
  MapPin,
  CheckCircle2,
  Loader2,
  Store,
  Clock,
  X,
  Package,
  ArrowRight,
  Home,
  ShoppingBag
} from 'lucide-react-native';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { locationService } from '../api/locationService';
import { checkoutService } from '../api/checkoutService';
import {Text, } from 'react-native';
const { width } = Dimensions.get('window');

const validateRwandaPhoneNumber = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/[^+\d]/g, '');
  const rwandaRegex = /^(?:\+250|250|0)?(7[23789]\d{7})$/;
  return rwandaRegex.test(cleaned);
};

const CheckoutScreen = ({ route, navigation }) => {
  const { cartItems, cartTotal, clearCart, removeFromCart } = useCart();
  
  const selectedItemIds = route.params?.selectedItemIds;
  const buyNowProduct = route.params?.buyNowProduct;
  const buyNowQty = route.params?.qty || 1;

  const checkoutItems = useMemo(() => {
    if (buyNowProduct) {
      return [{
        id: 'buynow',
        product: buyNowProduct,
        quantity: buyNowQty
      }];
    }
    if (!selectedItemIds) return cartItems;
    return cartItems.filter(item => selectedItemIds.includes(item.id));
  }, [cartItems, selectedItemIds, buyNowProduct, buyNowQty]);

  const checkoutTotal = useMemo(() => {
    if (buyNowProduct) {
      return buyNowProduct.price * buyNowQty;
    }
    if (!selectedItemIds) return cartTotal;
    return checkoutItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  }, [checkoutItems, cartTotal, selectedItemIds, buyNowProduct, buyNowQty]);

  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);

  // Recipient Details
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [giftMessage, setGiftMessage] = useState('');

  // Delivery Method
  const [pickupType, setPickupType] = useState('PICKUP');
  const [pickupLocationId, setPickupLocationId] = useState('');
  const [sellerPickupSlots, setSellerPickupSlots] = useState({}); // { [sellerId]: slot_string }
  const [pickupLocations, setPickupLocations] = useState([]);
  const [landmark, setLandmark] = useState('');

  // Location details
  const [loc, setLoc] = useState({ province: '', district: '', sector: '', cell: '', village: '' });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [cells, setCells] = useState([]);
  const [villages, setVillages] = useState([]);
  const [locLoading, setLocLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  // Picker Modal State
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerData, setPickerData] = useState([]);
  const [pickerTitle, setPickerTitle] = useState('');
  const [onSelectCallback, setOnSelectCallback] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState('MOBILE_MONEY');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  
  // Custom Date/Time Picker State
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [activeSellerId, setActiveSellerId] = useState(null); // For which seller are we choosing a time?
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('10:00 AM');

  // Fees
  const deliveryFee = useMemo(() => (pickupType === 'PICKUP' ? 0 : 1000), [pickupType]);
  const protectionFee = 500;
  const totalAmount = checkoutTotal + deliveryFee + protectionFee;

  useEffect(() => {
    const init = async () => {
      setLocLoading(true);
      const [p, pl] = await Promise.all([
        locationService.fetchProvinces(),
        checkoutService.fetchPickupLocations()
      ]);
      setProvinces(p);
      setPickupLocations(pl);
      setLocLoading(false);
    };
    init();
  }, []);

  const onProvinceChange = async (p) => {
    setLoc({ province: p, district: '', sector: '', cell: '', village: '' });
    setDistricts([]); setSectors([]); setCells([]); setVillages([]);
    if (!p) return;
    setLocLoading(true);
    setDistricts(await locationService.fetchDistricts(p));
    setLocLoading(false);
  };

  const onDistrictChange = async (d) => {
    setLoc(l => ({ ...l, district: d, sector: '', cell: '', village: '' }));
    setSectors([]); setCells([]); setVillages([]);
    if (!d) return;
    setLocLoading(true);
    setSectors(await locationService.fetchSectors(loc.province, d));
    setLocLoading(false);
  };

  const onSectorChange = async (s) => {
    setLoc(l => ({ ...l, sector: s, cell: '', village: '' }));
    setCells([]); setVillages([]);
    if (!s) return;
    setLocLoading(true);
    setCells(await locationService.fetchCells(loc.province, loc.district, s));
    setLocLoading(false);
  };

  const onCellChange = async (c) => {
    setLoc(l => ({ ...l, cell: c, village: '' }));
    setVillages([]);
    if (!c) return;
    setLocLoading(true);
    setVillages(await locationService.fetchVillages(loc.province, loc.district, loc.sector, c));
    setLocLoading(false);
  };

  const onVillageChange = async (v) => {
    setLoc(l => ({ ...l, village: v }));
    if (!v) return;
    const data = await checkoutService.fetchAgents(v, loc.cell, loc.sector, loc.district, loc.province);
    setAgents(data);
  };

  const handlePlaceOrder = async () => {
    if (!recipientName.trim() || !phoneNumber.trim()) {
      Alert.alert('Missing Details', 'Please fill in the recipient details.');
      setStep(1);
      return;
    }

    if (!validateRwandaPhoneNumber(phoneNumber)) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid Rwanda phone number (e.g., +250 78X XXX XXX or 078X XXX XXX).'
      );
      setStep(1);
      return;
    }

    if (pickupType === 'DELIVERY' && (!loc.province || !loc.district || !loc.sector)) {
      Alert.alert('Missing Location', 'Please complete your delivery address.');
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      const address = [loc.village, loc.cell, loc.sector, loc.district, loc.province].filter(Boolean).join(', ');
      
      // Construct sellerPickups array if it's a pickup order
      const sellerPickups = [];
      if (pickupType === 'PICKUP') {
        const sellerGroups = {};
        checkoutItems.forEach(item => {
          const seller = item.product?.seller;
          const sellerId = seller?.id || 'unknown';
          if (!sellerGroups[sellerId]) {
            sellerGroups[sellerId] = {
              sellerId,
              locationId: 'default', // Added to satisfy backend schema
              address: seller?.locationAddress || 
                       (item.product?.district && item.product?.province 
                         ? `${item.product.district}, ${item.product.province}`
                         : 'Location not set'),
              slot: sellerPickupSlots[sellerId] || ''
            };
          }
        });
        Object.values(sellerGroups).forEach(group => sellerPickups.push(group));
      }

      const orderData = {
        recipientName,
        phoneNumber,
        giftMessage,
        pickupType,
        address: pickupType === 'DELIVERY' ? address : '',
        agentId: selectedAgentId || undefined,
        pickupLocationId: (pickupType === 'PICKUP' && pickupLocationId) ? pickupLocationId : undefined,
        pickupSlot: pickupType === 'PICKUP' ? Object.values(sellerPickupSlots)[0] : undefined, // Fallback for single slot
        sellerPickups: pickupType === 'PICKUP' ? sellerPickups : undefined,
        shippingCost: deliveryFee,
        items: checkoutItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        }))
      };

      const order = await checkoutService.placeOrder(user.id, orderData);
      
      if (pickupType !== 'PICKUP') {
        const paymentData = {
          orderId: order.id,
          method: paymentMethod,
          phone: paymentMethod === 'MOBILE_MONEY' ? phoneNumber : undefined,
          cardDetails: paymentMethod === 'CARD' ? { cardNumber, expiryDate, cvv, cardholderName } : undefined
        };

        await checkoutService.processPayment(user.id, paymentData);
      }
      
      // Remove only the items that were checked out
      if (buyNowProduct) {
        // Don't clear cart for buy now
      } else if (selectedItemIds && selectedItemIds.length < cartItems.length) {
        await Promise.all(checkoutItems.map(item => removeFromCart(item.product.id)));
      } else {
        clearCart();
      }

      setLastOrderId(order.id);
      setSuccessModalVisible(true);
    } catch (error) {
      Alert.alert('Order Failed', error.message || 'Something went wrong while placing your order.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((s) => (
        <React.Fragment key={s}>
          <View style={[
            styles.stepCircle,
            step >= s ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }
          ]}>
            <CustomText style={[styles.stepNumber, step >= s ? { color: '#FFF' } : { color: colors.muted }]}>
              {step > s ? '✓' : s}
            </CustomText>
          </View>
          {s < 4 && <View style={[styles.stepLine, step > s ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]} />}
        </React.Fragment>
      ))}
    </View>
  );

  const renderLabel = (text) => (
    <CustomText style={[styles.inputLabel, { color: colors.muted }]}>{text}</CustomText>
  );

  const renderInput = (icon, placeholder, value, onChange, type = 'default') => (
    <View style={[styles.inputWrapper, { backgroundColor: colors.glass, borderColor: colors.border }]}>
      {icon}
      <TextInput
        style={[styles.input, { color: colors.foreground }]}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChange}
        keyboardType={type}
      />
    </View>
  );

  const openPicker = (label, options, onSelect) => {
    if (!options || options.length === 0) {
      if (locLoading) return; // Wait for loading
      Alert.alert('No Data', `No ${label.toLowerCase()}s found for the selected location.`);
      return;
    }
    setPickerTitle(`Select ${label}`);
    setPickerData(options);
    setOnSelectCallback(() => onSelect);
    setSearchQuery('');
    setPickerVisible(true);
  };

  const renderDropdown = (label, value, onValueChange, options, disabled) => (
    <View style={[styles.dropdownGroup, disabled && { opacity: 0.5 }]}>
      {renderLabel(label)}
      <View style={[styles.dropdownWrapper, { backgroundColor: colors.glass, borderColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.dropdownTrigger, { borderColor: colors.border }]}
          disabled={disabled || locLoading}
          onPress={() => openPicker(label, options, onValueChange)}
        >
          <CustomText style={[styles.dropdownValue, { color: value ? colors.foreground : colors.muted }]}>
            {value || (locLoading && !disabled ? 'Loading...' : `Select ${label}`)}
          </CustomText>
          {locLoading && !disabled ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <ChevronDown size={14} color={colors.muted} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPickerModal = () => {
    const filteredData = pickerData.filter(item => 
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <Modal
        visible={pickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <CustomText variant="h3" style={{ color: colors.foreground }}>{pickerTitle}</CustomText>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.closeBtn}>
                <CustomText style={{ color: colors.primary, fontWeight: 'bold' }}>Done</CustomText>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.searchWrapper, { backgroundColor: colors.glass, borderColor: colors.border }]}>
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search..."
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredData}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    onSelectCallback(item);
                    setPickerVisible(false);
                  }}
                >
                  <CustomText style={{ color: colors.foreground, fontSize: 16 }}>{item}</CustomText>
                  {loc[pickerTitle.replace('Select ', '').toLowerCase()] === item && (
                    <CheckCircle2 size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyPicker}>
                  <CustomText style={{ color: colors.muted }}>No results found</CustomText>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.glass }]}>
          <ChevronLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ color: colors.foreground }}>Checkout</CustomText>
        <View style={{ width: 44 }} />
      </View>

      {/* Order Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.successModalOverlay}>
          <View style={[styles.successModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.successModalBody}>
              <View style={[styles.successIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <CheckCircle2 size={64} color={colors.primary} />
              </View>

              <CustomText variant="h1" style={[styles.successTitle, { color: colors.foreground }]}>
                Order Placed!
              </CustomText>
              
              <CustomText style={[styles.successSubtitle, { color: colors.muted }]}>
                Your order has been placed successfully and is now being processed.
              </CustomText>

              {lastOrderId && (
                <View style={[styles.orderCard, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                  <View style={styles.orderCardIcon}>
                    <Package size={20} color={colors.primary} />
                  </View>
                  <View style={styles.orderCardContent}>
                    <CustomText style={[styles.orderLabel, { color: colors.muted }]}>Order ID</CustomText>
                    <CustomText style={[styles.orderIdText, { color: colors.foreground }]}>
                      #{lastOrderId.slice(-8).toUpperCase()}
                    </CustomText>
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.successFooter, { borderTopColor: colors.border }]}>
              <CustomButton
                title="Track Order"
                style={styles.modalTrackBtn}
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.navigate('MainApp', { 
                    screen: 'Me',
                    params: {
                      screen: 'OrderTracking', 
                      params: { orderId: lastOrderId } 
                    }
                  });
                }}
              >
                <ArrowRight size={20} color="#FFF" style={{ marginLeft: 8 }} />
              </CustomButton>

              <CustomButton
                title="Back to Marketplace"
                variant="outline"
                style={[styles.modalHomeBtn, { borderColor: colors.border }]}
                textStyle={{ color: colors.foreground }}
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.navigate('Market');
                }}
              >
                <ShoppingBag size={20} color={colors.foreground} style={{ marginRight: 8 }} />
              </CustomButton>
            </View>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {renderStepIndicator()}

        {step === 1 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepCounter, { backgroundColor: colors.primary }]}>
                <CustomText style={styles.stepCounterText}>1</CustomText>
              </View>
              <CustomText variant="h3" style={{ color: colors.foreground, marginLeft: 12 }}>Recipient Details</CustomText>
            </View>
            
            <View style={styles.form}>
              {renderLabel('FULL NAME')}
              {renderInput(<User size={18} color={colors.muted} />, 'John Doe', recipientName, setRecipientName)}
              
              {renderLabel('PHONE NUMBER')}
              {renderInput(<Phone size={18} color={colors.muted} />, '+250 7XX XXX XXX', phoneNumber, setPhoneNumber, 'phone-pad')}
              
              {renderLabel('GIFT MESSAGE (OPTIONAL)')}
              <View style={[styles.textAreaWrapper, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.textArea, { color: colors.foreground }]}
                  placeholder="Enter a personal message..."
                  placeholderTextColor={colors.muted}
                  value={giftMessage}
                  onChangeText={setGiftMessage}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepCounter, { backgroundColor: colors.primary }]}>
                <CustomText style={styles.stepCounterText}>2</CustomText>
              </View>
              <CustomText variant="h3" style={{ color: colors.foreground, marginLeft: 12 }}>Pickup Locations</CustomText>
            </View>

            <View style={styles.toggleRow}>
              {/* <TouchableOpacity 
                onPress={() => {
                  setPickupType('DELIVERY');
                  setPaymentMethod('MOBILE_MONEY');
                }}
                style={[
                  styles.toggleBtn, 
                  { backgroundColor: colors.glass, borderColor: colors.border },
                  pickupType === 'DELIVERY' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ]}
              >
                <Truck size={20} color={pickupType === 'DELIVERY' ? colors.primary : colors.muted} />
                <CustomText style={[styles.toggleText, { color: pickupType === 'DELIVERY' ? colors.primary : colors.muted }]}>Delivery</CustomText>
              </TouchableOpacity> */}
              
              <TouchableOpacity 
                onPress={() => {
                  setPickupType('PICKUP');
                  setPaymentMethod('CASH_ON_DELIVERY');
                }}
                style={[
                  styles.toggleBtn, 
                  { backgroundColor: colors.glass, borderColor: colors.border },
                  pickupType === 'PICKUP' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ]}
              >
                <Building2 size={20} color={pickupType === 'PICKUP' ? colors.primary : colors.muted} />
                <CustomText style={[styles.toggleText, { color: pickupType === 'PICKUP' ? colors.primary : colors.muted }]}>Pickup</CustomText>
              </TouchableOpacity>
            </View>

            {pickupType === 'DELIVERY' ? (
              /* <View style={styles.form}>
                {locLoading && <ActivityIndicator color={colors.primary} size="small" style={{ marginBottom: 12 }} />}
                {renderDropdown('PROVINCE', loc.province, onProvinceChange, provinces)}
                {renderDropdown('DISTRICT', loc.district, onDistrictChange, districts, !loc.province)}
                {renderDropdown('SECTOR', loc.sector, onSectorChange, sectors, !loc.district)}
                {renderDropdown('CELL', loc.cell, onCellChange, cells, !loc.sector)}
                {renderDropdown('VILLAGE', loc.village, onVillageChange, villages, !loc.cell)}
              </View> */
              null
            ) : (
              <View style={styles.form}>
                {renderLabel('SELLER PICKUP LOCATIONS')}
                {(() => {
                  const sellerGroups = {};
                  checkoutItems.forEach(item => {
                    const seller = item.product?.seller;
                    const sellerId = seller?.id || 'unknown';
                    if (!sellerGroups[sellerId]) {
                      sellerGroups[sellerId] = {
                        name: seller?.user?.name || 'Store',
                        location: seller?.locationAddress || 
                                  (item.product?.district && item.product?.province 
                                    ? `${item.product.district}, ${item.product.province}`
                                    : 'Location not set'),
                        items: []
                      };
                    }
                    sellerGroups[sellerId].items.push(item);
                  });

                  return Object.entries(sellerGroups).map(([id, group]) => (
                    <View 
                      key={id} 
                      style={[
                        styles.sellerPickupCard, 
                        { backgroundColor: colors.glass, borderColor: colors.border, marginBottom: 16 }
                      ]}
                    >
                      <View style={styles.pickupHeader}>
                        <View style={[styles.storeIconBox, { backgroundColor: colors.primary + '15' }]}>
                          <Store size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <CustomText style={[styles.pickupName, { color: colors.foreground }]}>{group.name}</CustomText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <MapPin size={12} color={colors.muted} />
                            <CustomText style={[styles.pickupAddress, { color: colors.muted }]}>{group.location}</CustomText>
                          </View>
                        </View>
                      </View>
                      
                      <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />
                      
                      <View style={styles.pickupItemsList}>
                        {group.items.map((gi, idx) => (
                          <CustomText key={idx} style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
                            • {gi.product.title} (x{gi.quantity})
                          </CustomText>
                        ))}
                      </View>

                      <View style={{ marginTop: 12 }}>
                        <CustomText style={{ fontSize: 10, color: colors.muted, fontWeight: 'bold', marginBottom: 8 }}>PICKUP TIME</CustomText>
                        <TouchableOpacity 
                          style={[styles.dropdownTrigger, { backgroundColor: colors.background, borderColor: colors.border, height: 44 }]}
                          onPress={() => {
                            setActiveSellerId(id);
                            setTimePickerVisible(true);
                          }}
                        >
                          <Clock size={14} color={colors.muted} style={{ marginRight: 8 }} />
                          <CustomText style={[styles.dropdownValue, { color: sellerPickupSlots[id] ? colors.foreground : colors.muted, fontSize: 13 }]}>
                            {sellerPickupSlots[id] || "Choose time"}
                          </CustomText>
                          <ChevronDown size={14} color={colors.muted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ));
                })()}

              </View>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.section}>
             <View style={styles.sectionHeader}>
              <View style={[styles.stepCounter, { backgroundColor: colors.primary }]}>
                <CustomText style={styles.stepCounterText}>3</CustomText>
              </View>
              <CustomText variant="h3" style={{ color: colors.foreground, marginLeft: 12 }}>
                {pickupType === 'PICKUP' ? 'Pay at Store' : 'Payment Method'}
              </CustomText>
            </View>

            {pickupType === 'PICKUP' ? (
              <View style={[styles.paymentForm, { backgroundColor: colors.glass, padding: 20, borderRadius: 16 }]}>
                <View style={[styles.walletBalance, { backgroundColor: colors.primary + '10', marginBottom: 16 }]}>
                  <Building2 size={32} color={colors.primary} />
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <CustomText variant="h3" style={{ color: colors.foreground }}>Pay directly at store</CustomText>
                    <CustomText style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                      No payment is required now. You will pay the seller when you collect your order.
                    </CustomText>
                  </View>
                </View>

                <View style={{ gap: 12 }}>
                  {[
                    'Show your pickup code at the store',
                    'Pay the seller directly (cash or mobile money)',
                    'Funds go straight to the seller — no escrow hold'
                  ].map((text, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <CheckCircle2 size={16} color="#4ade80" />
                      <CustomText style={{ color: colors.muted, fontSize: 13, marginLeft: 10 }}>{text}</CustomText>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <>
                <View style={styles.paymentMethods}>
                  {[
                    { id: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
                    { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building },
                    { id: 'CARD', label: 'Card Payment', icon: CreditCard },
                    { id: 'WALLET', label: 'AMO Wallet', icon: Wallet },
                  ].map(method => (
                     <TouchableOpacity 
                        key={method.id} 
                        onPress={() => setPaymentMethod(method.id)}
                        style={[
                          styles.paymentMethodItem, 
                          { backgroundColor: colors.glass, borderColor: paymentMethod === method.id ? colors.primary : colors.border }
                        ]}
                      >
                        <method.icon size={24} color={paymentMethod === method.id ? colors.primary : colors.muted} />
                        <CustomText style={[styles.paymentMethodLabel, { color: paymentMethod === method.id ? colors.primary : colors.foreground }]}>
                          {method.label}
                        </CustomText>
                        {paymentMethod === method.id && <CheckCircle2 size={18} color={colors.primary} />}
                      </TouchableOpacity>
                  ))}
                </View>

                {paymentMethod === 'MOBILE_MONEY' && (
                  <View style={[styles.paymentForm, { backgroundColor: colors.glass }]}>
                    <CustomText style={[styles.paymentInfoText, { color: colors.muted }]}>You will receive a USSD prompt on your phone to authorize the transaction.</CustomText>
                    {renderLabel('MOBILE NUMBER')}
                    {renderInput(<Smartphone size={18} color={colors.muted} />, '+250 7XX XXX XXX', phoneNumber, setPhoneNumber, 'phone-pad')}
                  </View>
                )}

                {paymentMethod === 'BANK_TRANSFER' && (
                  <View style={[styles.paymentForm, { backgroundColor: colors.glass }]}>
                    <View style={styles.bankInfoRow}>
                      <CustomText style={[styles.bankLabel, { color: colors.muted }]}>Bank:</CustomText>
                      <CustomText style={[styles.bankValue, { color: colors.foreground }]}>Bank of Kigali</CustomText>
                    </View>
                    <View style={styles.bankInfoRow}>
                      <CustomText style={[styles.bankLabel, { color: colors.muted }]}>Account:</CustomText>
                      <CustomText style={[styles.bankValue, { color: colors.foreground }]}>00040-0123456-78</CustomText>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <CustomText style={[styles.paymentInfoText, { color: colors.muted }]}>Please upload proof of payment after the transfer.</CustomText>
                  </View>
                )}

                {paymentMethod === 'CARD' && (
                  <View style={[styles.paymentForm, { backgroundColor: colors.glass }]}>
                    <CustomText style={[styles.paymentInfoText, { color: colors.muted }]}>Your card details are encrypted and never stored.</CustomText>
                    
                    {renderLabel('CARD NUMBER')}
                    {renderInput(<CreditCard size={18} color={colors.muted} />, '1234 5678 9012 3456', cardNumber, setCardNumber, 'numeric')}
                    
                    <View style={styles.formRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        {renderLabel('EXPIRY DATE')}
                        {renderInput(null, 'MM / YY', expiryDate, setExpiryDate)}
                      </View>
                      <View style={{ flex: 1 }}>
                        {renderLabel('CVV')}
                        {renderInput(null, '•••', cvv, setCvv, 'numeric')}
                      </View>
                    </View>
                    
                    {renderLabel('CARDHOLDER NAME')}
                    {renderInput(<User size={18} color={colors.muted} />, 'Name on card', cardholderName, setCardholderName)}
                  </View>
                )}

                {paymentMethod === 'WALLET' && (
                  <View style={[styles.paymentForm, { backgroundColor: colors.glass }]}>
                    <View style={[styles.walletBalance, { backgroundColor: colors.primary + '10' }]}>
                      <View>
                        <CustomText style={[styles.walletLabel, { color: colors.foreground }]}>AMO Wallet Balance</CustomText>
                        <CustomText style={[styles.walletAmount, { color: colors.primary }]}>Rwf 0</CustomText>
                      </View>
                      <Wallet size={32} color={colors.primary} opacity={0.3} />
                    </View>
                    <CustomText style={[styles.paymentInfoText, { color: colors.muted }]}>Your wallet balance will be deducted upon order confirmation.</CustomText>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {step === 4 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepCounter, { backgroundColor: colors.primary }]}>
                <CustomText style={styles.stepCounterText}>4</CustomText>
              </View>
              <CustomText variant="h3" style={{ color: colors.foreground, marginLeft: 12 }}>Review & Confirm</CustomText>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: colors.glass, borderColor: colors.border }]}>
              <CustomText variant="h3" style={[styles.summaryTitle, { color: colors.muted }]}>Order Summary</CustomText>
              
              <View style={styles.itemsReview}>
                {checkoutItems.map(item => {
                  const imageUrl = item.product.media?.[0]?.url || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=200&q=80';
                  return (
                    <View key={item.id} style={styles.reviewItem}>
                      <Image source={{ uri: imageUrl }} style={styles.reviewProductImage} />
                      <View style={styles.reviewItemInfo}>
                        <CustomText style={[styles.reviewItemText, { color: colors.foreground }]} numberOfLines={1}>
                          {item.product.title}
                        </CustomText>
                        <CustomText style={[styles.reviewItemQty, { color: colors.muted }]}>Qty: {item.quantity}</CustomText>
                        <CustomText style={[styles.reviewPrice, { color: colors.primary }]}>
                          Rwf {(item.product.price * item.quantity).toLocaleString()}
                        </CustomText>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryRow}>
                <CustomText style={[styles.summaryLabel, { color: colors.muted }]}>Subtotal</CustomText>
                <CustomText style={[styles.summaryValue, { color: colors.foreground }]}>Rwf {checkoutTotal.toLocaleString()}</CustomText>
              </View>
              <View style={styles.summaryRow}>
                <CustomText style={[styles.summaryLabel, { color: colors.muted }]}>Delivery</CustomText>
                <CustomText style={[styles.summaryValue, { color: colors.foreground }]}>
                  {deliveryFee > 0 ? `Rwf ${deliveryFee.toLocaleString()}` : 'Free'}
                </CustomText>
              </View>
              <View style={styles.summaryRow}>
                <CustomText style={[styles.summaryLabel, { color: colors.muted }]}>Protection Fee</CustomText>
                <CustomText style={[styles.summaryValue, { color: '#4ade80' }]}>Rwf {protectionFee.toLocaleString()}</CustomText>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.totalRow}>
                <CustomText variant="h2" style={{ color: colors.foreground }}>Total</CustomText>
                <CustomText variant="h1" style={{ color: colors.primary }}>Rwf {totalAmount.toLocaleString()}</CustomText>
              </View>

              <View style={[styles.protectionBadge, { backgroundColor: colors.primary + '10' }]}>
                <ShieldCheck size={18} color="#4ade80" />
                <CustomText style={[styles.protectionText, { color: colors.muted }]}>
                  {pickupType === 'PICKUP' 
                    ? 'Pay directly at store. Funds go straight to the seller.'
                    : 'Funds held in escrow until delivery is confirmed.'
                  }
                </CustomText>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={[styles.footer, { backgroundColor: colors.glass, borderTopColor: colors.border }]}>
        {step > 1 && (
          <TouchableOpacity 
            style={[styles.navBtn, styles.prevBtn, { borderStyle: 'solid', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.glass }]}
            onPress={() => setStep(step - 1)}
          >
            <ChevronLeft size={20} color={colors.foreground} />
            <CustomText style={{ color: colors.foreground, marginLeft: 4 }}>Back</CustomText>
          </TouchableOpacity>
        )}
        
        <CustomButton
          title={step === 4 ? (loading ? 'Processing...' : (pickupType === 'PICKUP' ? 'Confirm Order — Pay at Store' : 'Place Order')) : 'Continue'}
          style={[styles.primaryNavBtn, step === 1 && { flex: 1 }]}
          loading={loading}
          onPress={() => {
            if (step === 1) {
              if (!recipientName.trim()) {
                Alert.alert('Invalid Input', 'Please enter the recipient name.');
                return;
              }
              if (!phoneNumber.trim()) {
                Alert.alert('Invalid Input', 'Please enter the phone number.');
                return;
              }
              if (!validateRwandaPhoneNumber(phoneNumber)) {
                Alert.alert(
                  'Invalid Phone Number',
                  'Please enter a valid Rwanda phone number (e.g., +250 78X XXX XXX or 078X XXX XXX).'
                );
                return;
              }
              setStep(2);
            } else if (step === 3) {
              if (paymentMethod === 'MOBILE_MONEY' && pickupType !== 'PICKUP') {
                if (!phoneNumber.trim()) {
                  Alert.alert('Invalid Input', 'Please enter the mobile number for payment.');
                  return;
                }
                if (!validateRwandaPhoneNumber(phoneNumber)) {
                  Alert.alert(
                    'Invalid Phone Number',
                    'Please enter a valid Rwanda phone number for payment (e.g., +250 78X XXX XXX or 078X XXX XXX).'
                  );
                  return;
                }
              }
              setStep(4);
            } else if (step < 4) {
              setStep(step + 1);
            } else {
              handlePlaceOrder();
            }
          }}
        >
          {step < 4 && <ChevronRight size={20} color="#FFF" style={{ marginLeft: 4 }} />}
        </CustomButton>
      </View>
      </KeyboardAvoidingView>
      {renderPickerModal()}
      
      {/* Custom Pickup Time Picker Modal */}
      <Modal
        visible={timePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.timePickerContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: 24, paddingHorizontal: 24 }]}>
              <CustomText variant="h3" style={{ color: colors.foreground }}>Schedule Pickup</CustomText>
              <TouchableOpacity onPress={() => setTimePickerVisible(false)}>
                <X size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>SELECT DATE</CustomText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateList}>
                {Array.from({ length: 2 }).map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() + i);
                  const isSelected = selectedDate.toDateString() === date.toDateString();
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setSelectedDate(date)}
                      style={[
                        styles.datePill,
                        { borderColor: colors.border, backgroundColor: colors.glass },
                        isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                    >
                      <CustomText style={[styles.dateDay, { color: isSelected ? '#FFF' : colors.muted }]}>
                        {i === 0 ? 'Today' : 'Tomorrow'}
                      </CustomText>
                      <CustomText style={[styles.dateNum, { color: isSelected ? '#FFF' : colors.foreground }]}>
                        {date.getDate()}
                      </CustomText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <CustomText style={[styles.sectionLabel, { color: colors.muted, marginTop: 24 }]}>SELECT TIME</CustomText>
              <View style={styles.timeGrid}>
                {[
                  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
                  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
                  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
                  '05:00 PM', '05:30 PM', '06:00 PM'
                ].filter((time) => {
                  const today = new Date();
                  if (selectedDate.toDateString() !== today.toDateString()) return true;
                  const [timeStr, period] = time.split(' ');
                  let [hour, minute] = timeStr.split(':').map(n => parseInt(n, 10));
                  if (period === 'PM' && hour !== 12) hour += 12;
                  if (period === 'AM' && hour === 12) hour = 0;
                  
                  const slotTime = new Date(today);
                  slotTime.setHours(hour, minute, 0, 0);
                  
                  // Must be at least 1 hour from now for "Pro" preparation time
                  return slotTime.getTime() > (today.getTime() + 60 * 60 * 1000);
                }).map((time) => {
                  const isSelected = selectedTime === time;
                  return (
                    <TouchableOpacity
                      key={time}
                      onPress={() => setSelectedTime(time)}
                      style={[
                        styles.timePill,
                        { borderColor: colors.border, backgroundColor: colors.glass },
                        isSelected && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                      ]}
                    >
                      <CustomText style={[styles.timeText, { color: isSelected ? colors.primary : colors.foreground }]}>
                        {time}
                      </CustomText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {[
                '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
                '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
                '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
                '05:00 PM', '05:30 PM', '06:00 PM'
              ].filter((time) => {
                  const today = new Date();
                  if (selectedDate.toDateString() !== today.toDateString()) return true;
                  const [timeStr, period] = time.split(' ');
                  let [hour, minute] = timeStr.split(':').map(n => parseInt(n, 10));
                  if (period === 'PM' && hour !== 12) hour += 12;
                  if (period === 'AM' && hour === 12) hour = 0;
                  
                  const slotTime = new Date(today);
                  slotTime.setHours(hour, minute, 0, 0);
                  return slotTime.getTime() > (today.getTime() + 60 * 60 * 1000);
              }).length === 0 && (
                <CustomText style={{ color: '#ef4444', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                  No more pickup slots available for today. Please select tomorrow.
                </CustomText>
              )}

              <CustomButton
                title="Confirm Schedule"
                style={{ marginTop: 32 }}
                onPress={() => {
                  const dateStr = selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  const slot = `${dateStr} at ${selectedTime}`;
                  if (activeSellerId) {
                    setSellerPickupSlots(prev => ({ ...prev, [activeSellerId]: slot }));
                  }
                  setTimePickerVisible(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepCounter: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCounterText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  form: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    marginBottom: 8,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 52,
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 12,
    fontSize: 14,
  },
  textAreaWrapper: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    minHeight: 100,
  },
  textArea: {
    fontSize: 14,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  toggleText: {
    fontWeight: 'bold',
  },
  dropdownGroup: {
    marginBottom: 20,
  },
  dropdownWrapper: {
    borderWidth: 1,
    borderRadius: 14,
    height: 52,
  },
  dropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
  },
  sellerPickupCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  storeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pickupName: {
    flex: 1,
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 14,
  },
  pickupAddress: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 24,
  },
  pickupHours: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 24,
    marginTop: 4,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  paymentMethodItem: {
    width: (width - 50) / 2,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  paymentMethodLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  paymentForm: {
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  paymentInfoText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 18,
  },
  bankInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bankLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  bankValue: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  summaryTitle: {
    marginBottom: 20,
    color: '#94A3B8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemsReview: {
    marginBottom: 16,
  },
  reviewItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  reviewProductImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  reviewItemInfo: {
    flex: 1,
  },
  reviewItemText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  reviewItemQty: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  reviewPrice: {
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 2,
  },
  formRow: {
    flexDirection: 'row',
  },
  walletBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  walletLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  walletAmount: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  summaryValue: {
    fontWeight: '600',
    fontSize: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  protectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  protectionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    color: '#4ade80',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 14,
    height: 52,
  },
  prevBtn: {
    minWidth: 100,
  },
  primaryNavBtn: {
    flex: 2,
    height: 52,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  closeBtn: {
    padding: 8,
  },
  searchWrapper: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 16,
  },
  pickerItem: {
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  emptyPicker: {
    padding: 40,
    alignItems: 'center',
  },
  timePickerContent: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    paddingBottom: 40,
    position: 'absolute',
    bottom: 0,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  dateList: {
    flexDirection: 'row',
  },
  datePill: {
    width: 64,
    height: 74,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: '31%',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  successModalBody: {
    padding: 32,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '900',
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
  },
  orderCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(230, 126, 34, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  orderCardContent: {
    flex: 1,
  },
  orderLabel: {
    fontSize: 10,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '900',
  },
  successFooter: {
    padding: 24,
    paddingTop: 0,
    gap: 12,
  },
  modalTrackBtn: {
    width: '100%',
  },
  modalHomeBtn: {
    width: '100%',
  },
});

export default CheckoutScreen;
