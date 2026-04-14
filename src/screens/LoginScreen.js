import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop, Path, G } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import { authService } from '../api/authService';
import { useAuth } from '../context/AuthContext';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.login(email, password);
      await login(result);
      Alert.alert('Success', 'Logged in successfully!', [
        {
          text: 'OK',
          onPress: () => {
            const state = navigation.getState();
            if (state && state.routes && state.routes.length > 0) {
              const firstRouteName = state.routes[0].name;
              navigation.reset({
                index: 0,
                routes: [{ name: firstRouteName }],
              });
            }
            
            navigation.navigate(result.role === 'SELLER' ? 'Me' : 'Home');
          },
        },
      ]);

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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#e2e8f0" size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Login</CustomText>
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
          <CustomText variant="h2" style={{ marginBottom: 12, marginTop: 12 }}>Welcome Back</CustomText>
          <CustomText variant="subtitle" style={styles.subtitle}>
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

            <View style={styles.separator}>
              <View style={styles.line} />
              <CustomText style={styles.separatorText}>OR</CustomText>
              <View style={styles.line} />
            </View>

            <TouchableOpacity 
              style={styles.googleButton}
              onPress={() => Alert.alert('Google Sign-In', 'Google Sign-In reached! Configuration needed for full experience.')}
              activeOpacity={0.8}
            >
              <GoogleIcon />
              <CustomText style={styles.googleButtonText}>Continue with Google</CustomText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Register')}
            style={styles.link}
          >
            <CustomText style={styles.linkText}>
              Don't have an account? <CustomText style={{ color: '#e67e22' }}>Register</CustomText>
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
    backgroundColor: '#030712',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    color: '#94a3b8',
  },
  placeholderForm: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  placeholderText: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  button: {
    width: '100%',
  },
  link: {
    marginTop: 24,
  },
  linkText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  separatorText: {
    color: '#64748b',
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

export default LoginScreen;
