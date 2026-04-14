import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ArrowLeft, Mail } from 'lucide-react-native';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import { authService } from '../api/authService';
import { useTheme } from '../context/ThemeContext';
import Constants from 'expo-constants';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const handleSendReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const manifest = Constants.expoConfig || Constants.manifest;
    const hostUri = manifest?.hostUri;
    // Fallback to the link you provided if hostUri is not available
    const callbackUrl = hostUri 
      ? `exp://${hostUri}/--/reset-password`
      : "exp://1ui--vo-ihyacinthe-8081.exp.direct/--/reset-password";

    setLoading(true);
    try {
      await authService.forgotPassword(email, callbackUrl);
      Alert.alert(
        'Email Sent',
        'please check you email account for your password reset link.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.glass }]}>
            <ArrowLeft color={colors.foreground} size={24} />
          </TouchableOpacity>
          <CustomText variant="h2">Reset Password</CustomText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View style={[styles.iconContainer, { backgroundColor: colors.glass }]}>
                <Mail color={colors.primary} size={40} />
              </View>
              <CustomText variant="h2" style={{ marginBottom: 12, marginTop: 24 }}>Forgot Password?</CustomText>
              <CustomText variant="subtitle" style={[styles.subtitle, { color: colors.muted }]}>
                Enter your email address and we'll send you a link to reset your password.
              </CustomText>
            </View>

            <View style={styles.form}>
              <CustomInput 
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <CustomButton 
                title="Send Reset Link" 
                loading={loading}
                onPress={handleSendReset} 
                style={styles.button}
              />
            </View>
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
  },
  scrollContent: {
    flexGrow: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
    marginTop: 8,
  },
  button: {
    marginTop: 16,
  },
});

export default ForgotPasswordScreen;
