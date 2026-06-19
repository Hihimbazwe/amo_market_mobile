import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator } from 'react-native';
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
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { GOOGLE_WEB_CLIENT_ID } from '@env';

WebBrowser.maybeCompleteAuthSession();

const GoogleIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    <Path fill="none" d="M0 0h48v48H0z" />
  </Svg>
);

const RegisterScreen = ({ navigation, route }) => {
  const { colors, isDarkMode } = useTheme();
  const { login } = useAuth();
  const [role, setRole] = useState('BUYER');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [useNativeGoogle, setUseNativeGoogle] = useState(false);

  // expo-auth-session Google OAuth (works in standard Expo Go)
  // All three reuse the same Web Client ID — correct for Expo Go proxy testing
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  // Handle OAuth response from expo-auth-session
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleExpoGoogleToken(authentication.accessToken);
      } else {
        setGoogleLoading(false);
      }
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      Alert.alert('Google Sign-In Failed', response.error?.message || 'Authentication failed');
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleExpoGoogleToken = async (accessToken) => {
    setGoogleLoading(true);
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoResponse.json();
      if (!userInfo.email) throw new Error('Could not retrieve Google account email');
      await handleGoogleAuthSuccess(userInfo.email, userInfo.name, userInfo.picture);
    } catch (error) {
      Alert.alert('Google Sign-In Failed', error.message || 'Something went wrong');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Initialize Native Google Sign-In configuration
  useEffect(() => {
    try {
      if (Constants.appOwnership === 'expo') {
        setUseNativeGoogle(false);
        console.log('[DEBUG] Expo Go detected — using expo-auth-session for Google Sign-In');
        return;
      }
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
      });
      setUseNativeGoogle(true);
      console.log('[DEBUG] Native Google Sign-In available (dev client)');
    } catch (e) {
      setUseNativeGoogle(false);
      console.log('[DEBUG] Expo Go detected — using expo-auth-session for Google Sign-In');
    }
  }, []);

  const handleGoogleAuthSuccess = async (gEmail, gName, gImage) => {
    setGoogleLoading(true);
    try {
      const result = await authService.loginWithGoogle(gEmail, gName, gImage);
      await login(result);

      const savedRedirect = await AsyncStorage.getItem('@auto_logout_redirect');
      if (savedRedirect) {
        try {
          const redirectObj = JSON.parse(savedRedirect);
          await AsyncStorage.removeItem('@auto_logout_redirect');

          if (redirectObj && redirectObj.name) {
            console.log('[SESSION_RESTORE] Restoring screen:', redirectObj.name);

            if (['Checkout', 'ProductDetail', 'OrderSuccess', 'Notifications', 'GlobalSearch', 'ChatDetail', 'StatusViewer'].includes(redirectObj.name)) {
              navigation.navigate(redirectObj.name, redirectObj.params);
              return;
            }
            if (['Home', 'Cart', 'Messages', 'Me'].includes(redirectObj.name)) {
              navigation.navigate('MainApp', { screen: redirectObj.name, params: redirectObj.params });
              return;
            }
            if (['HomeMain', 'SellerStore'].includes(redirectObj.name)) {
              navigation.navigate('MainApp', { screen: 'Home', params: { screen: redirectObj.name, params: redirectObj.params } });
              return;
            }
            if (['MessagesMain'].includes(redirectObj.name)) {
              navigation.navigate('MainApp', { screen: 'Messages', params: { screen: redirectObj.name, params: redirectObj.params } });
              return;
            }
            navigation.navigate('MainApp', { screen: 'Me', params: { screen: redirectObj.name, params: redirectObj.params } });
            return;
          }
        } catch (e) {
          console.error('[SESSION_RESTORE] Failed to parse or restore auto logout redirect', e);
        }
      }

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

  const handleGoogleSignInPress = async () => {
    if (!useNativeGoogle) {
      // Expo Go fallback: use expo-auth-session (real Google OAuth via browser)
      setGoogleLoading(true);
      try {
        await promptAsync();
      } catch (e) {
        Alert.alert('Google Sign-In Failed', e.message || 'Something went wrong');
        setGoogleLoading(false);
      }
      // loading state cleared inside handleExpoGoogleToken or response useEffect
      return;
    }

    // Native Google Sign-In (dev client / production APK)
    setGoogleLoading(true);
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      const gEmail = userInfo.data?.user?.email;
      const gName = userInfo.data?.user?.name;
      const gImage = userInfo.data?.user?.photo;

      if (!gEmail) throw new Error('Google Sign-in did not return an email address');

      await handleGoogleAuthSuccess(gEmail, gName, gImage);
    } catch (error) {
      let statusCodes;
      try {
        const signinPkg = require('@react-native-google-signin/google-signin');
        statusCodes = signinPkg.statusCodes;
      } catch (err) { }

      let msg = error.message || 'Something went wrong';
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        msg = 'Sign-in was cancelled';
      } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
        msg = 'Sign-in is already in progress';
      } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        msg = 'Play services not available or outdated';
      }
      Alert.alert('Google Sign-In Failed', msg);
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
        ...(route.params?.inviteToken && { inviteToken: route.params.inviteToken }),
        ...(role === 'AGENT' && { province, district, sector, cell, village, phone, coverageArea }),
      };

      const result = await authService.register(userData);
      if (result.inviteConversation) {
        await AsyncStorage.setItem('@auto_logout_redirect', JSON.stringify({
          name: 'ChatDetail',
          params: {
            conversation: {
              id: result.inviteConversation.id,
              participantId: result.inviteConversation.participantId,
              participantName: result.inviteConversation.participantName || 'AMO User',
              participantColor: '#e67e22',
              participantInitials: (result.inviteConversation.participantName || 'U').charAt(0).toUpperCase(),
              participantImage: result.inviteConversation.participantImage || null,
              lastMessage: 'Started a conversation',
              time: new Date(),
              unreadCount: 0,
              isOnline: false,
              isPinned: false,
              isArchived: false,
              hasDeleted: false,
              isHidden: false,
              isLocked: false,
              isBlockedByMe: false,
            },
          },
        }));
      }
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: colors.glass }]}
          >
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

            <CustomText variant="h2" style={{ color: colors.foreground, marginBottom: 8, marginTop: 8 }}>Join AMO</CustomText>
            <CustomText variant="subtitle" style={[styles.subtitle, { color: colors.muted, marginBottom: 16 }]}>
              Create an account to start selling and buying premium products.
            </CustomText>

            <TouchableOpacity
              style={[styles.googleButton, !isDarkMode && { borderWidth: 1, borderColor: colors.border }, { width: '100%', marginBottom: 16 }]}
              onPress={handleGoogleSignInPress}
              activeOpacity={0.8}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#1e293b" />
              ) : (
                <>
                  <GoogleIcon />
                  <CustomText style={styles.googleButtonText}>Join with Google</CustomText>
                </>
              )}
            </TouchableOpacity>

            <View style={[styles.separator, { marginVertical: 12, width: '100%' }]}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <CustomText style={[styles.separatorText, { color: colors.muted }]}>OR</CustomText>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            {/* Role Selection */}
            <View style={styles.roleContainer}>
              <CustomText style={[styles.roleLabel, { color: colors.muted }]}>I WANT TO</CustomText>
              <View style={styles.roleGrid}>
                {[
                  { id: 'BUYER', icon: ShoppingBag, label: 'Buy' },
                  { id: 'SELLER', icon: Store, label: 'Sell' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setRole(item.id)}
                    style={[
                      styles.roleItem,
                      { backgroundColor: colors.glass, borderColor: colors.border },
                      role === item.id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                    ]}
                  >
                    <item.icon size={24} color={role === item.id ? colors.primary : colors.muted} />
                    <CustomText style={[
                      styles.roleItemText,
                      { color: colors.muted },
                      role === item.id && { color: colors.primary },
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  backButton: {
    marginRight: 16,
    padding: 6,
    borderRadius: 12,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  roleContainer: {
    width: '100%',
    marginBottom: 20,
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 10,
  },
  roleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  roleItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  roleItemText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  form: {
    width: '100%',
    marginBottom: 10,
  },
  agentFields: {
    marginTop: 10,
  },
  agentInfoBox: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
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
    marginBottom: 20,
  },
  button: {
    width: '100%',
  },
  link: {
    marginTop: 12,
  },
  linkText: {
    fontSize: 14,
  },
  dataAssurance: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
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
});

export default RegisterScreen;