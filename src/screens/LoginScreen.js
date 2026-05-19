import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, Alert, Modal, ActivityIndicator } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop, Path, G } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import { authService } from '../api/authService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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

const LoginScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
      const role = result.user?.role?.toUpperCase() || result.role?.toUpperCase();
      if (['SELLER', 'COURIER', 'AGENT'].includes(role)) {
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.login(email, password);
      await login(result);
      
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
      const role = result.user?.role?.toUpperCase() || result.role?.toUpperCase();
      
      if (['SELLER', 'COURIER', 'AGENT'].includes(role)) {
        navigation.navigate('MainApp', { screen: 'Me' });
      } else {
        navigation.navigate('MainApp', { screen: 'Home' });
      }

    } catch (error) {
      if (error.message === 'EmailVryErr') {
        Alert.alert(
          'Verification Required',
          'Your email is not verified. Redirecting to verification...',
          [{ text: 'OK', onPress: () => navigation.navigate('VerifyOTP', { email }) }]
        );
      } else {
        Alert.alert('Login Failed', error.message || 'Invalid credentials');
      }
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
          onPress={() => navigation.reset({
            index: 0,
            routes: [{ name: 'MainApp', params: { screen: 'Home' } }],
          })} 
          style={[styles.backButton, { backgroundColor: colors.glass }]}
        >
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ color: colors.foreground }}>Login</CustomText>
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
          <CustomText variant="h2" style={{ color: colors.foreground, marginBottom: 12, marginTop: 12 }}>Welcome Back</CustomText>
          <CustomText variant="subtitle" style={[styles.subtitle, { color: colors.muted }]}>
            Sign in to your AMO account to continue shopping.
          </CustomText>

          <View style={styles.form}>
            <CustomInput 
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <CustomInput 
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <TouchableOpacity 
              style={styles.forgotPass}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <CustomText style={styles.forgotPassText}>Forgot password?</CustomText>
            </TouchableOpacity>

            <CustomButton 
              title="Sign In" 
              loading={loading}
              onPress={handleLogin} 
              style={styles.button}
            />

            <CustomText style={[styles.dataAssurance, { color: colors.muted }]}>
              Your personal data is securely encrypted and protected in compliance with Rwanda Data Protection and Privacy Laws
            </CustomText>


           </View>

           <TouchableOpacity 
             onPress={() => navigation.navigate('Register')}
             style={styles.link}
           >
             <CustomText style={[styles.linkText, { color: colors.muted }]}>
               Don't have an account? <CustomText style={{ color: colors.primary }}>Register</CustomText>
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
  form: {
    width: '100%',
    marginBottom: 20,
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPassText: {
    color: '#e67e22',
    fontSize: 12,
    fontWeight: '600',
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

export default LoginScreen;
