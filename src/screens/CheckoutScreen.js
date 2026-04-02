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
  Dimensions
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
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

const CheckoutScreen = ({ navigation }) => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [recipientName, setRecipientName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [giftMessage, setGiftMessage] = useState('');
  const [pickupType, setPickupType] = useState('DELIVERY'); // 'DELIVERY' or 'PICKUP'
  const [paymentMethod, setPaymentMethod] = useState('MOBILE_MONEY');

  // Location State
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [cells, setCells] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loc, setLoc] = useState({ province: '', district: '', sector: '', cell: '', village: '' });
  const [locLoading, setLocLoading] = useState(false);

  // Agents & Pickup State
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [pickupLocations, setPickupLocations] = useState([]);
  const [pickupLocationId, setPickupLocationId] = useState(null);
  const [pickupSlot, setPickupSlot] = useState('');

  // Card Payment State
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  // Initial Fetches
  useEffect(() => {
    locationService.fetchProvinces().then(setProvinces);
    checkoutService.fetchPickupLocations().then(setPickupLocations);
  }, []);

  // Location Change Handlers
  const onProvinceChange = async (p) => {
    setLoc({ province: p, district: '', sector: '', cell: '', village: '' });
    setDistricts([]); setSectors([]); setCells([]); setVillages([]); setAgents([]);
    if (!p) return;
    setLocLoading(true);
    setDistricts(await locationService.fetchDistricts(p));
    setLocLoading(false);
  };

  const onDistrictChange = async (d) => {
    setLoc(l => ({ ...l, district: d, sector: '', cell: '', village: '' }));
    setSectors([]); setCells([]); setVillages([]); setAgents([]);
    if (!d) return;
    setLocLoading(true);
    setSectors(await locationService.fetchSectors(loc.province, d));
    setLocLoading(false);
  };

  const onSectorChange = async (s) => {
    setLoc(l => ({ ...l, sector: s, cell: '', village: '' }));
    setCells([]); setVillages([]); setAgents([]);
    if (!s) return;
    setLocLoading(true);
    setCells(await locationService.fetchCells(loc.province, loc.district, s));
    setLocLoading(false);
  };

  const onCellChange = async (c) => {
    setLoc(l => ({ ...l, cell: c, village: '' }));
    setVillages([]); setAgents([]);
    if (!c) return;
    setLocLoading(true);
    setVillages(await locationService.fetchVillages(loc.province, loc.district, loc.sector, c));
    setLocLoading(false);
  };

  const onVillageChange = async (v) => {
    setLoc(l => ({ ...l, village: v }));
    if (!v) return;
    const agentsList = await checkoutService.fetchAgents(v, loc.cell, loc.sector, loc.district, loc.province);
    setAgents(agentsList);
  };

  const addressString = [loc.village, loc.cell, loc.sector, loc.district, loc.province].filter(Boolean).join(', ');

  // Fees
  const deliveryFee = pickupType === 'DELIVERY' ? 1000 : 0;
  const protectionFee = 500;
  const totalAmount = cartTotal + deliveryFee + protectionFee;

  const handlePlaceOrder = async () => {
    if (!recipientName || !phoneNumber) {
      Alert.alert('Incomplete Details', 'Please enter recipient name and phone number.');
      return;
    }
    if (pickupType === 'DELIVERY' && (!loc.province || !loc.district || !loc.sector)) {
      Alert.alert('Incomplete Address', 'Please select your delivery location.');
      return;
    }
    if (pickupType === 'PICKUP' && (!pickupLocationId || !pickupSlot)) {
      Alert.alert('Incomplete Details', 'Please select a pickup location and time slot.');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        recipientName,
        phoneNumber,
        giftMessage,
        pickupType,
        address: pickupType === 'DELIVERY' ? addressString : '',
        agentId: pickupType === 'DELIVERY' ? (selectedAgentId || undefined) : undefined,
        pickupLocationId: pickupType === 'PICKUP' ? pickupLocationId : undefined,
        pickupSlot: pickupType === 'PICKUP' ? pickupSlot : undefined,
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price
        }))
      };

      const order = await checkoutService.placeOrder(user.id, orderData);
      
      // Process Payment
      await checkoutService.processPayment(user.id, { 
        orderId: order.id, 
        method: paymentMethod 
      });

      Alert.alert(
        'Order Successful',
        'Your order has been placed and payment is processed. You can track it in your orders.',
        [{ text: 'View My Orders', onPress: () => {
          clearCart();
          navigation.navigate('Me'); // Navigate to Buyer Orders eventually
        }}]
      );
    } catch (error) {
      Alert.alert('Checkout Error', error.message);
    } finally {
      setLoading(true);
      setTimeout(() => setLoading(false), 500); // Small artificial delay for UX
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
    <CustomText style={styles.inputLabel}>{text}</CustomText>
  );

  const renderInput = (icon, placeholder, value, onChange, type = 'default') => (
    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

  const renderDropdown = (label, value, onValueChange, options, disabled) => (
    <View style={[styles.dropdownGroup, disabled && { opacity: 0.5 }]}>
      {renderLabel(label)}
      <View style={[styles.dropdownWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Simple mock of a picker since standard Picker is often problematic in Expo/mobile without a dedicated lib */}
        <TouchableOpacity 
          style={styles.dropdownTrigger}
          onPress={() => {
            if (disabled) return;
            Alert.alert(`Select ${label}`, '', options.map(o => ({
              text: o,
              onPress: () => onValueChange(o)
            })).concat([{ text: 'Cancel', style: 'cancel' }]));
          }}
        >
          <CustomText style={[styles.dropdownValue, !value && { color: colors.muted }]}>
            {value || `Select ${label}`}
          </CustomText>
          <ChevronDown size={14} color={colors.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ color: colors.foreground }}>Checkout</CustomText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              <View style={[styles.textAreaWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                  pickupType === 'DELIVERY' ? { backgroundColor: colors.primary + '20', borderColor: colors.primary } : { borderColor: colors.border }
                ]}
              >
                <Truck size={20} color={pickupType === 'DELIVERY' ? colors.primary : colors.muted} />
                <CustomText style={[styles.toggleText, pickupType === 'DELIVERY' ? { color: colors.primary } : { color: colors.muted }]}>Delivery</CustomText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setPickupType('PICKUP')}
                style={[
                  styles.toggleBtn, 
                  pickupType === 'PICKUP' ? { backgroundColor: colors.primary + '20', borderColor: colors.primary } : { borderColor: colors.border }
                ]}
              >
                <Building2 size={20} color={pickupType === 'PICKUP' ? colors.primary : colors.muted} />
                <CustomText style={[styles.toggleText, pickupType === 'PICKUP' ? { color: colors.primary } : { color: colors.muted }]}>Pickup</CustomText>
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
                      { backgroundColor: colors.card, borderColor: pickupLocationId === location.id ? colors.primary : colors.border }
                    ]}
                  >
                    <View style={styles.pickupHeader}>
                      <MapPin size={16} color={colors.primary} />
                      <CustomText style={[styles.pickupName, { color: colors.foreground }]}>{location.name}</CustomText>
                      {pickupLocationId === location.id && <CheckCircle2 size={16} color={colors.primary} />}
                    </View>
                    <CustomText style={styles.pickupAddress}>{location.address}</CustomText>
                    <CustomText style={styles.pickupHours}>Hours: {location.openTime} - {location.closeTime}</CustomText>
                  </TouchableOpacity>
                ))}
                
                {pickupLocationId && (
                  <View style={{ marginTop: 12 }}>
                    {renderLabel('PICKUP TIME SLOT')}
                     <TouchableOpacity 
                      style={[styles.dropdownTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => {
                        Alert.alert("Select Time Slot", "", [
                          { text: "Tomorrow 10:00 AM", onPress: () => setPickupSlot("Tomorrow 10:00 AM") },
                          { text: "Tomorrow 2:00 PM", onPress: () => setPickupSlot("Tomorrow 2:00 PM") },
                          { text: "Next Friday 11:00 AM", onPress: () => setPickupSlot("Next Friday 11:00 AM") },
                          { text: 'Cancel', style: 'cancel' }
                        ]);
                      }}
                    >
                      <CustomText style={[styles.dropdownValue, !pickupSlot && { color: colors.muted }]}>
                        {pickupSlot || "Select time slot"}
                      </CustomText>
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
                      { backgroundColor: colors.card, borderColor: paymentMethod === method.id ? colors.primary : colors.border }
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
                <CustomText style={styles.paymentInfoText}>You will receive a USSD prompt on your phone to authorize the transaction.</CustomText>
                {renderLabel('MOBILE NUMBER')}
                {renderInput(<Smartphone size={18} color={colors.muted} />, '+250 7XX XXX XXX', phoneNumber, setPhoneNumber, 'phone-pad')}
              </View>
            )}

            {paymentMethod === 'BANK_TRANSFER' && (
              <View style={[styles.paymentForm, { backgroundColor: colors.glass }]}>
                <View style={styles.bankInfoRow}>
                  <CustomText style={styles.bankLabel}>Bank:</CustomText>
                  <CustomText style={[styles.bankValue, { color: colors.foreground }]}>Bank of Kigali</CustomText>
                </View>
                <View style={styles.bankInfoRow}>
                  <CustomText style={styles.bankLabel}>Account:</CustomText>
                  <CustomText style={[styles.bankValue, { color: colors.foreground }]}>00040-0123456-78</CustomText>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <CustomText style={styles.paymentInfoText}>Please upload proof of payment after the transfer.</CustomText>
              </View>
            )}

            {paymentMethod === 'CARD' && (
              <View style={[styles.paymentForm, { backgroundColor: colors.glass }]}>
                <CustomText style={styles.paymentInfoText}>Your card details are encrypted and never stored.</CustomText>
                
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
                    <CustomText style={styles.walletLabel}>AMO Wallet Balance</CustomText>
                    <CustomText style={[styles.walletAmount, { color: colors.primary }]}>Rwf 0</CustomText>
                  </View>
                  <Wallet size={32} color={colors.primary} opacity={0.3} />
                </View>
                <CustomText style={styles.paymentInfoText}>Your wallet balance will be deducted upon order confirmation.</CustomText>
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

            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CustomText variant="h3" style={styles.summaryTitle}>Order Summary</CustomText>
              
              <View style={styles.itemsReview}>
                {cartItems.map(item => {
                  const imageUrl = item.product.media?.[0]?.url || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=200&q=80';
                  return (
                    <View key={item.id} style={styles.reviewItem}>
                      <Image source={{ uri: imageUrl }} style={styles.reviewProductImage} />
                      <View style={styles.reviewItemInfo}>
                        <CustomText style={[styles.reviewItemText, { color: colors.foreground }]} numberOfLines={1}>
                          {item.product.title}
                        </CustomText>
                        <CustomText style={styles.reviewItemQty}>Qty: {item.quantity}</CustomText>
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
                <CustomText style={styles.summaryLabel}>Subtotal</CustomText>
                <CustomText style={[styles.summaryValue, { color: colors.foreground }]}>Rwf {cartTotal.toLocaleString()}</CustomText>
              </View>
              <View style={styles.summaryRow}>
                <CustomText style={styles.summaryLabel}>Delivery</CustomText>
                <CustomText style={[styles.summaryValue, { color: colors.foreground }]}>
                  {deliveryFee > 0 ? `Rwf ${deliveryFee.toLocaleString()}` : 'Free'}
                </CustomText>
              </View>
              <View style={styles.summaryRow}>
                <CustomText style={styles.summaryLabel}>Protection Fee</CustomText>
                <CustomText style={[styles.summaryValue, { color: '#4ade80' }]}>Rwf {protectionFee.toLocaleString()}</CustomText>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.totalRow}>
                <CustomText variant="h2" style={{ color: colors.foreground }}>Total</CustomText>
                <CustomText variant="h1" style={{ color: colors.primary }}>Rwf {totalAmount.toLocaleString()}</CustomText>
              </View>

              <View style={[styles.protectionBadge, { backgroundColor: colors.primary + '10' }]}>
                <ShieldCheck size={18} color="#4ade80" />
                <CustomText style={styles.protectionText}>Funds held in escrow until delivery is confirmed.</CustomText>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {step > 1 && (
          <TouchableOpacity 
            style={[styles.navBtn, styles.prevBtn, { borderStyle: 'solid', borderWidth: 1, borderColor: colors.border }]}
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
  }
});

export default CheckoutScreen;
