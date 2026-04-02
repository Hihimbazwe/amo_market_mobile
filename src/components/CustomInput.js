import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import CustomText from './CustomText';
import { Eye, EyeOff } from 'lucide-react-native';

const CustomInput = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  secureTextEntry, 
  keyboardType,
  error,
  containerStyle,
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <CustomText style={[styles.label, { color: colors.muted }]}>{label}</CustomText>}
      <View style={[
        styles.inputContainer,
        { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
        isFocused && { borderColor: colors.primary, backgroundColor: colors.isDarkMode ? 'rgba(249, 115, 22, 0.05)' : 'rgba(249, 115, 22, 0.02)' },
        error && { borderColor: colors.error }
      ]}>
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.isDarkMode ? "rgba(148,163,184,0.5)" : "rgba(100,116,139,0.5)"}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            {showPassword ? (
              <EyeOff size={18} color={colors.muted} />
            ) : (
              <Eye size={18} color={colors.muted} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <CustomText style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>{error}</CustomText>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 54,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
});

export default CustomInput;
