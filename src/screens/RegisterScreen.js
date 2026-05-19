import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Image, Modal, ActivityIndicator } from 'react-native';
import { ArrowLeft, ShoppingBag, Store, UserCheck, XCircle } from 'lucide-react-native';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop, Path, G } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import { authService } from '../api/authService';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'react-native';

const GoogleIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    <Path fill="none" d="M0 0h48v48H0z" />
  </Svg>
);

const RegisterScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { login } = useAuth();
  const [role, setRole] = useState('BUYER');
  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [showCustomGoogleForm, setShowCustomGoogleForm] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async (gEmail, gName, gImage) => {
    setGoogleLoading(true);
    try {
      const result = await authService.loginWithGoogle(gEmail, gName, gImage);
      await login(result);
      
      setGoogleModalVisible(false);

      // Check if there is an auto-logout redirect to restore
      const savedRedirect = await AsyncStorage.getItem('@auto_logout_redirect');
      if (savedRedirect) {
        try {
          const redirectObj = JSON.parse(savedRedirect);
          await AsyncStorage.removeItem('@auto_logout_redirect');
          
          if (redirectObj && redirectObj.name) {
            console.log('[SESSION_RESTORE] Restoring screen:', redirectObj.name);

            // 1. Root Stacks / Screens outside tabs
            if (['Checkout', 'ProductDetail', 'OrderSuccess', 'Notifications', 'GlobalSearch', 'ChatDetail', 'StatusViewer'].includes(redirectObj.name)) {
              navigation.navigate(redirectObj.name, redirectObj.params);
              return;
            }

            // 2. Base Tabs
            if (['Home', 'Cart', 'Messages', 'Me'].includes(redirectObj.name)) {
              navigation.navigate('MainApp', { screen: redirectObj.name, params: redirectObj.params });
              return;
            }

            // 3. Nested inside Home Stack
            if (['HomeMain', 'SellerStore'].includes(redirectObj.name)) {
              navigation.navigate('MainApp', {
                screen: 'Home',
                params: { screen: redirectObj.name, params: redirectObj.params }
              });
              return;
            }

            // 4. Nested inside Messages Stack
            if (['MessagesMain'].includes(redirectObj.name)) {
              navigation.navigate('MainApp', {
                screen: 'Messages',
                params: { screen: redirectObj.name, params: redirectObj.params }
              });
              return;
            }

            // 5. Drawer screens inside 'Me'
            navigation.navigate('MainApp', {
              screen: 'Me',
              params: {
                screen: redirectObj.name,
                params: redirectObj.params
              }
            });
            return;
          }
        } catch (e) {
          console.error('[SESSION_RESTORE] Failed to parse or restore auto logout redirect', e);
        }
      }

      // Redirect based on role
      const redirectRole = result.user?.role?.toUpperCase() || result.role?.toUpperCase();
      if (['SELLER', 'COURIER', 'AGENT'].includes(redirectRole)) {
        navigation.navigate('MainApp', { screen: 'Me' });
      } else {
        navigation.navigate('MainApp', { screen: 'Home' });
      }

    } catch (error) {
      Alert.alert('Google Sign-In Failed', error.message || 'Something went wrong');
    } finally {
      setGoogleLoading(false);
    }
  };
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [cell, setCell] = useState('');
  const [village, setVillage] = useState('');
  const [phone, setPhone] = useState('');
  const [coverageArea, setCoverageArea] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all basic fields');
      return;
    }

    if (role === 'AGENT' && (!province || !district || !sector || !phone)) {
      Alert.alert('Error', 'Please fill in required location and phone details');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name,
        email,
        password,
        role,
        ...(role === 'AGENT' && { province, district, sector, cell, village, phone, coverageArea })
      };
      
      const result = await authService.register(userData);
      Alert.alert('Success', 'Account created! Please check your email for verification.');
      navigation.navigate('VerifyOTP', { email });
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.glass }]}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ color: colors.foreground }}>Register</CustomText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={{ width: 60, height: 60, resizeMode: 'contain', marginBottom: 8 }} 
            />
            <Svg height="40" width="200">
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#A855F7" stopOpacity="1" />
                  <Stop offset="1" stopColor="#3B82F6" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <SvgText
                fill="url(#grad)"
                fontSize="22"
                fontWeight="900"
                x="100"
                y="30"
                textAnchor="middle"
              >AMO Market</SvgText>
            </Svg>
          </View>
          <CustomText variant="h2" style={{ color: colors.foreground, marginBottom: 12, marginTop: 12 }}>Join AMO</CustomText>
          <CustomText variant="subtitle" style={[styles.subtitle, { color: colors.muted }]}>
            Create an account to start selling and buying premium products.
          </CustomText>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <CustomText style={[styles.roleLabel, { color: colors.muted }]}>I WANT TO</CustomText>
            <View style={styles.roleGrid}>
              {[
                { id: 'BUYER', icon: ShoppingBag, label: 'Buy' },
                { id: 'SELLER', icon: Store, label: 'Sell' },
                // { id: 'AGENT', icon: UserCheck, label: 'Agent' },
              ].map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  onPress={() => setRole(item.id)}
                  style={[
                    styles.roleItem,
                    { backgroundColor: colors.glass, borderColor: colors.border },
                    role === item.id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                  ]}
                >
                  <item.icon size={24} color={role === item.id ? colors.primary : colors.muted} />
                  <CustomText style={[
                     styles.roleItemText,
                     { color: colors.muted },
                     role === item.id && { color: colors.primary }
                  ]}>
                    {item.label}
                  </CustomText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.form}>
            <CustomInput 
              label="Full Name"
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
            />
            <CustomInput 
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <CustomInput 
              label="Password"
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {role === 'AGENT' && (
              <View style={styles.agentFields}>
                <View style={[styles.agentInfoBox, { backgroundColor: colors.primary + '05', borderColor: colors.primary + '20' }]}>
                  <CustomText style={[styles.agentInfoTitle, { color: colors.primary }]}>Agent Location Details</CustomText>
                  <CustomText style={[styles.agentInfoText, { color: colors.muted }]}>Agents handle local deliveries. Please select your exact location.</CustomText>
                </View>
                <CustomInput label="Province" placeholder="Enter Province" value={province} onChangeText={setProvince} />
                <CustomInput label="District" placeholder="Enter District" value={district} onChangeText={setDistrict} />
                <CustomInput label="Sector" placeholder="Enter Sector" value={sector} onChangeText={setSector} />
                <CustomInput label="Cell" placeholder="Enter Cell" value={cell} onChangeText={setCell} />
                <CustomInput label="Village" placeholder="Enter Village" value={village} onChangeText={setVillage} />
                <CustomInput label="Phone Number" placeholder="+250 7XX XXX XXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <CustomInput label="Coverage Area" placeholder="e.g. Kimironko, Remera" value={coverageArea} onChangeText={setCoverageArea} />
              </View>
            )}

            <CustomButton 
              title={`Create ${role.charAt(0) + role.slice(1).toLowerCase()} Account`}
              loading={loading}
              onPress={handleRegister} 
              style={styles.button}
            />

            <CustomText style={[styles.dataAssurance, { color: colors.muted }]}>
              Your personal data is securely encrypted and protected in compliance with Rwanda Data Protection and Privacy Laws
            </CustomText>

            <View style={styles.separator}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <CustomText style={[styles.separatorText, { color: colors.muted }]}>OR</CustomText>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

             <TouchableOpacity 
               style={[styles.googleButton, !isDarkMode && { borderWidth: 1, borderColor: colors.border }]}
               onPress={() => setGoogleModalVisible(true)}
               activeOpacity={0.8}
             >
               <GoogleIcon />
               <CustomText style={styles.googleButtonText}>Join with Google</CustomText>
             </TouchableOpacity>
           </View>

           <TouchableOpacity 
             onPress={() => navigation.navigate('Login')}
             style={styles.link}
           >
             <CustomText style={[styles.linkText, { color: colors.muted }]}>
               Already have an account? <CustomText style={{ color: colors.primary }}>Login</CustomText>
             </CustomText>
           </TouchableOpacity>
         </View>
       </ScrollView>

      {/* Google Account Chooser Bottom Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={googleModalVisible}
        onRequestClose={() => {
          if (!googleLoading) setGoogleModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <GoogleIcon />
              <CustomText variant="h2" style={{ marginTop: 12, textAlign: 'center' }}>Sign in with Google</CustomText>
              <CustomText variant="caption" style={{ color: colors.muted, marginTop: 4, textAlign: 'center' }}>
                to continue to AMO Market
              </CustomText>
            </View>

            {googleLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <CustomText style={{ marginTop: 16 }}>Connecting to Google...</CustomText>
              </View>
            ) : showCustomGoogleForm ? (
              /* Custom Account Form */
              <View style={styles.formContainer}>
                <CustomInput
                  label="Name"
                  placeholder="e.g. John Doe"
                  value={customGoogleName}
                  onChangeText={setCustomGoogleName}
                  colors={colors}
                />
                <View style={{ height: 12 }} />
                <CustomInput
                  label="Google Email"
                  placeholder="e.g. user@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={customGoogleEmail}
                  onChangeText={setCustomGoogleEmail}
                  colors={colors}
                />
                <View style={{ height: 20 }} />
                <CustomButton
                  title="Continue"
                  onPress={() => {
                    if (!customGoogleEmail || !customGoogleName) {
                      Alert.alert('Error', 'Please fill in all fields');
                      return;
                    }
                    handleGoogleSignIn(customGoogleEmail, customGoogleName, null);
                  }}
                />
                <TouchableOpacity
                  style={{ marginTop: 12, alignSelf: 'center' }}
                  onPress={() => setShowCustomGoogleForm(false)}
                >
                  <CustomText style={{ color: colors.primary, fontWeight: '600' }}>Back to accounts</CustomText>
                </TouchableOpacity>
              </View>
            ) : (
              /* Account List */
              <View style={styles.accountsList}>
                {/* Pre-populated Google Account 1 */}
                <TouchableOpacity
                  style={[styles.accountItem, { borderColor: colors.border }]}
                  onPress={() => handleGoogleSignIn('john.doe@gmail.com', 'John Doe', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150')}
                >
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150' }}
                    style={styles.accountAvatar}
                  />
                  <View style={styles.accountDetails}>
                    <CustomText style={{ fontWeight: '600', color: colors.foreground }}>John Doe</CustomText>
                    <CustomText style={{ color: colors.muted, fontSize: 12 }}>john.doe@gmail.com</CustomText>
                  </View>
                </TouchableOpacity>

                {/* Pre-populated Google Account 2 */}
                <TouchableOpacity
                  style={[styles.accountItem, { borderColor: colors.border, marginTop: 12 }]}
                  onPress={() => handleGoogleSignIn('jane.smith@gmail.com', 'Jane Smith', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150')}
                >
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150' }}
                    style={styles.accountAvatar}
                  />
                  <View style={styles.accountDetails}>
                    <CustomText style={{ fontWeight: '600', color: colors.foreground }}>Jane Smith</CustomText>
                    <CustomText style={{ color: colors.muted, fontSize: 12 }}>jane.smith@gmail.com</CustomText>
                  </View>
                </TouchableOpacity>

                {/* Add Custom Account */}
                <TouchableOpacity
                  style={[styles.accountItem, { borderColor: colors.border, marginTop: 12 }]}
                  onPress={() => setShowCustomGoogleForm(true)}
                >
                  <View style={[styles.accountAvatar, { backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }]}>
                    <CustomText style={{ fontSize: 20, fontWeight: '300', color: colors.foreground }}>+</CustomText>
                  </View>
                  <View style={styles.accountDetails}>
                    <CustomText style={{ fontWeight: '600', color: colors.primary }}>Use another account</CustomText>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {!googleLoading && (
              <TouchableOpacity
                style={[styles.cancelBtn, { marginTop: 24 }]}
                onPress={() => setGoogleModalVisible(false)}
              >
                <CustomText style={{ color: '#ef4444', fontWeight: '700' }}>Cancel</CustomText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
  },
  content: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  roleContainer: {
    width: '100%',
    marginBottom: 32,
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 16,
  },
  roleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  roleItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  roleItemText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  form: {
    width: '100%',
    marginBottom: 20,
  },
  agentFields: {
    marginTop: 20,
  },
  agentInfoBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  agentInfoTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  agentInfoText: {
    fontSize: 12,
    lineHeight: 18,
  },

  subtitle: {
    textAlign: 'center',
    marginBottom: 48,
  },
  button: {
    width: '100%',
  },
  link: {
    marginTop: 24,
  },
  linkText: {
    fontSize: 14,
  },
  dataAssurance: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    fontSize: 12,
    fontWeight: '800',
    marginHorizontal: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
  },
  googleButtonText: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  formContainer: {
    paddingVertical: 10,
  },
  accountsList: {
    paddingVertical: 10,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
  },
  accountDetails: {
    flex: 1,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});

export default RegisterScreen;
