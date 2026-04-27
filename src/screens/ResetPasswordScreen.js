import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import { authService } from '../api/authService';
import { useTheme } from '../context/ThemeContext';
import { StatusBar } from 'react-native';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { token: initialToken } = route.params || {};
  const [token, setToken] = useState(initialToken || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    if (initialToken) setToken(initialToken);
  }, [initialToken]);

  const handleResetPassword = async () => {
    if (!token) {
      Alert.alert('Error', 'Token is missing. Please check your reset email.');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      Alert.alert(
        'Success',
        'Password updated successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to reset password');
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
          <CustomText variant="h2" style={{ color: colors.foreground }}>New Password</CustomText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View style={[styles.iconContainer, { backgroundColor: colors.glass }]}>
                <Lock color={colors.primary} size={40} />
              </View>
              <CustomText variant="h2" style={{ color: colors.foreground, marginBottom: 12, marginTop: 24 }}>Reset Password</CustomText>
              <CustomText variant="subtitle" style={[styles.subtitle, { color: colors.muted }]}>
                Please enter your new password below to regain access to your account.
              </CustomText>
            </View>

            <View style={styles.form}>
              {!initialToken && (
                <CustomInput 
                  label="Reset Token"
                  placeholder="Enter the token from your email"
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                />
              )}
              
              <CustomInput 
                label="New Password"
                placeholder="At least 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <CustomInput 
                label="Confirm Password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              
              <CustomButton 
                title="Update Password" 
                loading={loading}
                onPress={handleResetPassword} 
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

export default ResetPasswordScreen;
