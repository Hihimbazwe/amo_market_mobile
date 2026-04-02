import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import CustomText from '../components/CustomText';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { Colors } from '../theme/colors';
import { authService } from '../api/authService';
import { useAuth } from '../context/AuthContext';

const VerifyOTPScreen = ({ navigation, route }) => {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      // In a real app, we call the verify endpoint
      // const result = await authService.verifyOTP(email, otp);
      
      // For now, mirroring backend logic with fetch
      const result = await authService.verifyOTP(email, otp);
      
      Alert.alert('Success', 'Email verified successfully!');
      // After verification, we could auto-login or go to login screen
      // The user said "navigate to an otp verification screen instead of going to the login screen"
      // Usually, after OTP success, you log in.
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Verification Failed', error.message || 'Invalid code');
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
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.iconContainer}>
            <CheckCircle color={Colors.primary} size={64} />
          </View>

          <View style={styles.textContainer}>
            <CustomText variant="h1" style={styles.title}>Verify Email</CustomText>
            <CustomText style={styles.subtitle}>
              We sent a 6-digit code to {'\n'}
              <CustomText style={{ color: Colors.primary, fontWeight: '700' }}>{email}</CustomText>
            </CustomText>
          </View>

          <View style={styles.form}>
            <CustomInput 
              label="Verification Code"
              placeholder="123456"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />

            <CustomButton 
              title="Verify Code"
              loading={loading}
              onPress={handleVerify}
              style={styles.button}
            />

            <TouchableOpacity style={styles.resendLink}>
              <CustomText style={styles.resendText}>
                Didn't receive code? <CustomText style={{ color: Colors.primary }}>Resend</CustomText>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    marginTop: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.muted,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  button: {
    marginTop: 16,
  },
  resendLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  resendText: {
    color: Colors.muted,
    fontSize: 14,
  },
});

export default VerifyOTPScreen;
