import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Menu, User, Mail, Shield, Phone, MapPin, Store, Camera } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { Colors } from '../../theme/colors';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';


const SellerProfileScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user, login } = useAuth();
  const { colors, isDarkMode } = useTheme();

  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    if (!user?.id) return;
    try {
      const data = await sellerService.getProfile(user.id);
      setProfile(data);
      setName(data.user?.name || '');
      setStoreName(data.storeName || '');
      setPhone(data.phone || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Name cannot be empty.');
    
    setSaving(true);
    try {
      const updated = await sellerService.updateProfile(user.id, { 
        name, 
        storeName,
        phone
      });
      // Update local auth context if needed
      if (updated.user) {
        login({ ...user, name: updated.user.name, storeName: updated.storeName });
      }
      Alert.alert('Success', 'Seller profile updated successfully!');
      fetchProfile();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Seller Profile</CustomText>
      </View>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
        }
      >
        {loading && !profile ? (
          <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 50 }} />
        ) : (
          <>
            <View style={styles.avatarSection}>
              <TouchableOpacity style={[styles.avatarPlaceholder, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}30` }]}>
                <Store color={colors.primary} size={48} />
                <View style={[styles.cameraBtn, { borderColor: colors.background }]}>
                  <Camera color={colors.white} size={16} />
                </View>
              </TouchableOpacity>
              <CustomText variant="h2" style={{ marginTop: 16 }}>{name || 'Seller Name'}</CustomText>
              <CustomText style={{ color: colors.muted }}>{user?.email || 'seller@example.com'}</CustomText>
              <View style={styles.roleBadge}>
                 <CustomText style={styles.roleText}>{profile?.membershipType || 'OFFICIAL'} SELLER</CustomText>
              </View>
            </View>

            <View style={styles.formSection}>
              <CustomInput 
                label="Full Name" 
                value={name} 
                onChangeText={setName} 
                placeholder="Enter your full name" 
              />
              <CustomInput 
                label="Store Name" 
                value={storeName} 
                onChangeText={setStoreName} 
                placeholder="e.g. Amo Electronics" 
              />
              <CustomInput 
                label="Phone Number" 
                value={phone} 
                onChangeText={setPhone} 
                placeholder="e.g. +250 78x xxx xxx" 
                keyboardType="phone-pad"
              />
              <CustomInput 
                label="Email Address" 
                value={user?.email || 'seller@example.com'} 
                editable={false} 
              />
              
              <CustomButton 
                title={saving ? "Saving..." : "Save Profile"} 
                style={styles.saveButton} 
                onPress={handleSaveProfile} 
                disabled={saving}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  content: { padding: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(249, 115, 22, 0.2)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(249, 115, 22, 0.3)',
    position: 'relative'
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#F97316',
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.background
  },
  roleBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 12 },
  roleText: { color: '#10B981', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  formSection: { gap: 16 },
  saveButton: { marginTop: 16 }
});

export default SellerProfileScreen;
