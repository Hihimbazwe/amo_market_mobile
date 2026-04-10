import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import { ShoppingBag, Store, UserCheck } from 'lucide-react-native';
import { authService } from '../api/authService';

const RegisterScreen = ({ navigation }) => {
  const [role, setRole] = useState('BUYER');
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
        ...(role === 'AGENT' && { province, district, sector, cell, village, phone, coverageArea })
      };
      
      const result = await authService.register(userData);
      Alert.alert('Success', 'Account created! Please check your email for verification.');
      navigation.navigate('VerifyOTP', { email });
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Something went wrong');
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
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Register</CustomText>
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
          <CustomText variant="h2" style={{ marginBottom: 12, marginTop: 12 }}>Join AMO</CustomText>
          <CustomText variant="subtitle" style={styles.subtitle}>
            Create an account to start selling and buying premium products.
          </CustomText>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <CustomText style={styles.roleLabel}>I WANT TO</CustomText>
            <View style={styles.roleGrid}>
              {[
                { id: 'BUYER', icon: ShoppingBag, label: 'Buy' },
                { id: 'SELLER', icon: Store, label: 'Sell' },
                { id: 'AGENT', icon: UserCheck, label: 'Agent' },
              ].map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  onPress={() => setRole(item.id)}
                  style={[
                    styles.roleItem,
                    role === item.id && styles.activeRoleItem
                  ]}
                >
                  <item.icon size={24} color={role === item.id ? '#e67e22' : '#94a3b8'} />
                  <CustomText style={[
                    styles.roleItemText,
                    role === item.id && styles.activeRoleItemText
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
                <View style={styles.agentInfoBox}>
                  <CustomText style={styles.agentInfoTitle}>Agent Location Details</CustomText>
                  <CustomText style={styles.agentInfoText}>Agents handle local deliveries. Please select your exact location.</CustomText>
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
          </View>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
            style={styles.link}
          >
            <CustomText style={styles.linkText}>
              Already have an account? <CustomText style={{ color: '#e67e22' }}>Login</CustomText>
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
  roleContainer: {
    width: '100%',
    marginBottom: 32,
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 16,
  },
  roleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  roleItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  activeRoleItem: {
    borderColor: '#e67e22',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  roleItemText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  activeRoleItemText: {
    color: '#e67e22',
  },
  form: {
    width: '100%',
    marginBottom: 20,
  },
  agentFields: {
    marginTop: 20,
  },
  agentInfoBox: {
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.1)',
    marginBottom: 20,
  },
  agentInfoTitle: {
    color: '#e67e22',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  agentInfoText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
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
});

export default RegisterScreen;
