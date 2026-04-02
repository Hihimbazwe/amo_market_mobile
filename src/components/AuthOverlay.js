import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Colors } from '../theme/colors';
import CustomText from './CustomText';
import CustomButton from './CustomButton';
import { LogIn } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const AuthOverlay = () => {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return null;

  return (
    <View style={styles.container}>
      <View style={styles.glass}>
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <CustomText style={styles.title}>Sign in and enjoy more</CustomText>
            <CustomText style={styles.subtitle}>Unlock exclusive deals and features</CustomText>
          </View>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => navigation.navigate('Login')}
          >
            <LogIn size={18} color={Colors.white} />
            <CustomText style={styles.signInText}>Sign In</CustomText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: width,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 1000,
  },
  glass: {
    backgroundColor: 'rgba(3, 7, 18, 0.8)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    overflow: 'hidden',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.muted,
    fontSize: 10,
    marginTop: 2,
  },
  signInButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  signInText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default AuthOverlay;
