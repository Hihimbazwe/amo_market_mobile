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
  Loader2
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

const CheckoutScreen = ({ route, navigation }) => {
  const { cartItems, cartTotal, clearCart, removeFromCart } = useCart();
  
  const selectedItemIds = route.params?.selectedItemIds;

  const checkoutItems = useMemo(() => {
    if (!selectedItemIds) return cartItems;
    return cartItems.filter(item => selectedItemIds.includes(item.id));
  }, [cartItems, selectedItemIds]);

  const checkoutTotal = useMemo(() => {
    if (!selectedItemIds) return cartTotal;
    return checkoutItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  }, [checkoutItems, cartTotal, selectedItemIds]);

  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Recipient Details
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [giftMessage, setGiftMessage] = useState('');

  // Delivery Method
  const [pickupType, setPickupType] = useState('DELIVERY');
  const [pickupLocationId, setPickupLocationId] = useState('');
  const [pickupSlot, setPickupSlot] = useState('');
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
    if (!recipientName || !phoneNumber) {
      Alert.alert('Missing Details', 'Please fill in the recipient details.');
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
      
      const orderData = {
        recipientName,
        phoneNumber,
        giftMessage,
        pickupType,
        address: pickupType === 'DELIVERY' ? address : '',
        agentId: selectedAgentId || undefined,
        pickupLocationId: pickupType === 'PICKUP' ? pickupLocationId : undefined,
        pickupSlot: pickupType === 'PICKUP' ? pickupSlot : undefined,
        shippingCost: deliveryFee,
        items: checkoutItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        }))
      };

      const order = await checkoutService.placeOrder(user.id, orderData);
      
      const paymentData = {
        orderId: order.id,
        method: paymentMethod,
        phone: paymentMethod === 'MOBILE_MONEY' ? phoneNumber : undefined,
        cardDetails: paymentMethod === 'CARD' ? { cardNumber, expiryDate, cvv, cardholderName } : undefined
      };

      await checkoutService.processPayment(user.id, paymentData);
      
      // Remove only the items that were checked out
      if (selectedItemIds && selectedItemIds.length < cartItems.length) {
        await Promise.all(checkoutItems.map(item => removeFromCart(item.product.id)));
      } else {
        clearCart();
      }

      navigation.navigate('OrderSuccess', { orderId: order.id });
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
              <CustomText variant="h3" style={{ color: colors.foreground, marginLeft: 12 }}>Delivery Method</CustomText>
            </View>

            <View style={styles.toggleRow}>
              <TouchableOpacity 
                onPress={() => setPickupType('DELIVERY')}
                style={[
                  styles.toggleBtn, 
                  { backgroundColor: colors.glass, borderColor: colors.border },
                  pickupType === 'DELIVERY' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ]}
              >
                <Truck size={20} color={pickupType === 'DELIVERY' ? colors.primary : colors.muted} />
                <CustomText style={[styles.toggleText, { color: pickupType === 'DELIVERY' ? colors.primary : colors.muted }]}>Delivery</CustomText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setPickupType('PICKUP')}
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
              <View style={styles.form}>
                {locLoading && <ActivityIndicator color={colors.primary} size="small" style={{ marginBottom: 12 }} />}
                {renderDropdown('PROVINCE', loc.province, onProvinceChange, provinces)}
                {renderDropdown('DISTRICT', loc.district, onDistrictChange, districts, !loc.province)}
                {renderDropdown('SECTOR', loc.sector, onSectorChange, sectors, !loc.district)}
                {renderDropdown('CELL', loc.cell, onCellChange, cells, !loc.sector)}
                {renderDropdown('VILLAGE', loc.village, onVillageChange, villages, !loc.cell)}
              </View>
            ) : (
              <View style={styles.form}>
                {renderLabel('SELECT PICKUP STORE')}
                {pickupLocations.map(location => (
                  <TouchableOpacity 
                    key={location.id} 
                    onPress={() => setPickupLocationId(location.id)}
                    style={[
                      styles.pickupLocationItem, 
                      { backgroundColor: colors.glass, borderColor: pickupLocationId === location.id ? colors.primary : colors.border }
                    ]}
                  >
                    <View style={styles.pickupHeader}>
                      <MapPin size={16} color={colors.primary} />
                      <CustomText style={[styles.pickupName, { color: colors.foreground }]}>{location.name}</CustomText>
                      {pickupLocationId === location.id && <CheckCircle2 size={16} color={colors.primary} />}
                    </View>
                    <CustomText style={[styles.pickupAddress, { color: colors.muted }]}>{location.address}</CustomText>
                    <CustomText style={[styles.pickupHours, { color: colors.muted }]}>Hours: {location.openTime} - {location.closeTime}</CustomText>
                  </TouchableOpacity>
                ))}
                
                {pickupLocationId && (
                  <View style={{ marginTop: 12 }}>
                    {renderLabel('PICKUP TIME SLOT')}
                     <TouchableOpacity 
                      style={[styles.dropdownTrigger, { backgroundColor: colors.glass, borderColor: colors.border }]}
                      onPress={() => {
                        Alert.alert("Select Time Slot", "", [
                          { text: "Tomorrow 10:00 AM", onPress: () => setPickupSlot("Tomorrow 10:00 AM") },
                          { text: "Tomorrow 2:00 PM", onPress: () => setPickupSlot("Tomorrow 2:00 PM") },
                          { text: "Next Friday 11:00 AM", onPress: () => setPickupSlot("Next Friday 11:00 AM") },
                          { text: 'Cancel', style: 'cancel' }
                        ]);
                      }}
                    >
                      <CustomText style={[styles.dropdownValue, { color: pickupSlot ? colors.foreground : colors.muted }]}>
                        {pickupSlot || "Select time slot"}
                      </CustomText>
                      <ChevronDown size={14} color={colors.muted} />
                    </TouchableOpacity>
                  </View>
                )}
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
              <CustomText variant="h3" style={{ color: colors.foreground, marginLeft: 12 }}>Payment Method</CustomText>
            </View>

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
                <CustomText style={[styles.protectionText, { color: colors.muted }]}>Funds held in escrow until delivery is confirmed.</CustomText>
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
          title={step === 4 ? (loading ? 'Processing...' : 'Place Order') : 'Continue'}
          style={[styles.primaryNavBtn, step === 1 && { flex: 1 }]}
          loading={loading}
          onPress={() => {
            if (step < 4) setStep(step + 1);
            else handlePlaceOrder();
          }}
        >
          {step < 4 && <ChevronRight size={20} color="#FFF" style={{ marginLeft: 4 }} />}
        </CustomButton>
      </View>
      </KeyboardAvoidingView>
      {renderPickerModal()}
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
  dropdownValue: {
    fontSize: 14,
  },
  pickupLocationItem: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
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
  }
});

export default CheckoutScreen;
