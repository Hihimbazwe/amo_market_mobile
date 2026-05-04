import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import CustomText from '../CustomText';
import { useTheme } from '../../context/ThemeContext';
import { AlertTriangle } from 'lucide-react-native';

const AutoLogoutWarningModal = ({ visible, onDismiss, onLogout }) => {
  const { colors } = useTheme();
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    let timer;
    if (visible) {
      setTimeLeft(60);
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible, onLogout]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <AlertTriangle color="#ef4444" size={24} />
          </View>
          
          <CustomText variant="h3" style={styles.title}>
            Inactivity Warning
          </CustomText>
          
          <CustomText style={[styles.message, { color: colors.muted }]}>
            You have been inactive for a while. You will be automatically logged out in:
          </CustomText>
          
          <CustomText variant="h1" style={[styles.timer, { color: '#ef4444' }]}>
            {timeLeft}s
          </CustomText>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.stayButton, { backgroundColor: colors.primary }]} 
              onPress={onDismiss}
            >
              <CustomText style={styles.stayButtonText} weight="bold">
                Stay Logged In
              </CustomText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.logoutButton, { borderColor: colors.border }]} 
              onPress={onLogout}
            >
              <CustomText style={[styles.logoutButtonText, { color: colors.foreground }]} weight="medium">
                Log Out Now
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 18,
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    fontSize: 14,
  },
  timer: {
    fontSize: 36,
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  button: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stayButton: {
    // Primary background
  },
  stayButtonText: {
    color: '#ffffff',
    fontSize: 15,
  },
  logoutButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  logoutButtonText: {
    fontSize: 15,
  },
});

export default AutoLogoutWarningModal;
