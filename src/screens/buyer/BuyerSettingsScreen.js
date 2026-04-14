import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { Menu, Settings, Bell, Lock, Shield, HelpCircle, Moon, XCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { Modal, TextInput, Alert, ActivityIndicator } from 'react-native';

const BuyerSettingsScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [updating, setUpdating] = React.useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setUpdating(true);
    try {
      await authService.changePassword(user.id, currentPassword, newPassword);
      Alert.alert('Success', 'Password updated successfully. Please log in again.');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto-logout after password change
      setTimeout(() => {
        logout();
      }, 1000);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setUpdating(false);
    }
  };

  const options = [
    { icon: Bell, label: 'Notifications', value: 'Enabled', onPress: () => {} },
    { icon: Lock, label: 'Privacy & Security', value: '', onPress: () => setShowPasswordModal(true) },
    { icon: Shield, label: 'Account Protection', value: 'High', onPress: () => {} },
    { icon: HelpCircle, label: 'Help & Support', value: '', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Settings</CustomText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          {options.map((opt, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.optionRow, { borderBottomColor: colors.glassBorder }]}
              onPress={opt.onPress}
            >
              <View style={styles.optionLeft}>
                <opt.icon color={colors.muted} size={20} />
                <CustomText style={[styles.optionLabel, { color: colors.foreground }]}>{opt.label}</CustomText>
              </View>
              {opt.value ? <CustomText style={[styles.optionValue, { color: colors.muted }]}>{opt.value}</CustomText> : null}
            </TouchableOpacity>
          ))}
          
          <View style={[styles.optionRow, { borderBottomColor: 'transparent' }]}>
            <View style={styles.optionLeft}>
              <Moon color={colors.muted} size={20} />
              <CustomText style={[styles.optionLabel, { color: colors.foreground }]}>Dark Mode</CustomText>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.glassBorder }]}>
              <View style={styles.modalHeader}>
                <CustomText variant="h2">Change Password</CustomText>
                <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                  <XCircle color={colors.muted} size={24} />
                </TouchableOpacity>
              </View>
  
              <ScrollView 
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                <CustomInput
                  label="Current Password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
                <View style={{ height: 16 }} />
                <CustomInput
                  label="New Password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <View style={{ height: 16 }} />
                <CustomInput
                  label="Confirm New Password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
                
                <View style={{ height: 32 }} />
                
                <CustomButton
                  title="Update Password"
                  onPress={handleChangePassword}
                  loading={updating}
                />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
    borderBottomWidth: 1,
  },
  menuButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
  },
  content: {
    padding: 16,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLabel: {
    fontSize: 16,
  },
  optionValue: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalBody: {
    marginBottom: 24,
  },
});

export default BuyerSettingsScreen;
