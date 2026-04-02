import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import { Colors } from '../theme/colors';
import { authService } from '../api/authService';
import { useAuth } from '../context/AuthContext';

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
            // Walk up to the Tab navigator (parent of HomeStack / MarketplaceStack)
            const tabNav = navigation.getParent();
            if (tabNav) {
              tabNav.navigate('Me');
            } else {
              navigation.navigate('Me');
            }
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
          <ArrowLeft color={Colors.white} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Login</CustomText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={{ width: 80, height: 80, resizeMode: 'contain', marginBottom: 8 }} 
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
            
            <TouchableOpacity style={styles.forgotPass}>
              <CustomText style={styles.forgotPassText}>Forgot password?</CustomText>
            </TouchableOpacity>

            <CustomButton 
              title="Sign In" 
              loading={loading}
              onPress={handleLogin} 
              style={styles.button}
            />
          </View>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Register')}
            style={styles.link}
          >
            <CustomText style={styles.linkText}>
              Don't have an account? <CustomText style={{ color: Colors.primary }}>Register</CustomText>
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
    backgroundColor: Colors.background,
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
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  subtitle: {
    textAlign: 'center',
    marginBottom: 48,
    color: Colors.muted,
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
    color: Colors.muted,
    fontStyle: 'italic',
  },
  button: {
    width: '100%',
  },
  link: {
    marginTop: 24,
  },
  linkText: {
    color: Colors.muted,
    fontSize: 14,
  },
});

export default LoginScreen;
