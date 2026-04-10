import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Menu, User, Mail, Shield, Phone, MapPin } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

import { useTheme } from '../../context/ThemeContext';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';

const BuyerProfileScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const { colors } = useTheme();
  const { user, login } = useAuth(); // login here acts as updating the user context

  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const handleSaveProfile = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Name cannot be empty.');
    
    setLoading(true);
    try {
      // Update backend via the newly supported mobile user flow on the existing route
      const response = await authService.updateProfile(user.id, { name });
      
      // Update local storage context so the UI responds immediately everywhere
      login({ ...user, name: response.user?.name || name });
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Profile</CustomText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '50' }]}>
            <User color={colors.primary} size={48} />
          </View>
          <CustomText variant="h2" style={{ marginTop: 16 }}>{user?.name || 'AMO User'}</CustomText>
          <CustomText style={{ color: colors.muted }}>{user?.email || 'user@example.com'}</CustomText>
        </View>

        <View style={styles.formSection}>
          <CustomInput 
            label="Full Name" 
            value={name} 
            onChangeText={setName} 
            placeholder="Enter your full name" 
          />
          <CustomInput 
            label="Email Address" 
            value={user?.email || 'user@example.com'} 
            editable={false} 
            keyboardType="email-address" 
          />
          <CustomInput 
            label="Role" 
            value={user?.role || 'BUYER'} 
            editable={false} 
          />
          
          <CustomButton 
            title={loading ? "Saving..." : "Save Changes"} 
            style={styles.editButton} 
            onPress={handleSaveProfile} 
            disabled={loading}
          />
        </View>
      </ScrollView>
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
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  formSection: {
    gap: 16,
  },
  editButton: {
    marginTop: 16,
  },
});

export default BuyerProfileScreen;
