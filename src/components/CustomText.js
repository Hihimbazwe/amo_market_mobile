import React from 'react';
import { Text as RNText } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const CustomText = ({ children, style, variant = 'body', ...props }) => {
  const { colors } = useTheme();

  const getVariantStyle = () => {
    const baseStyle = { fontFamily: 'System' };
    switch (variant) {
      case 'h1': 
        return { ...baseStyle, fontSize: 24, fontWeight: '800', color: colors.foreground };
      case 'h2': 
        return { ...baseStyle, fontSize: 20, fontWeight: '700', color: colors.foreground };
      case 'h3': 
        return { ...baseStyle, fontSize: 18, fontWeight: '600', color: colors.foreground };
      case 'subtitle': 
        return { ...baseStyle, fontSize: 12, color: colors.muted };
      case 'caption': 
        return { ...baseStyle, fontSize: 11, color: colors.muted };
      default: 
        return { ...baseStyle, fontSize: 14, color: colors.foreground };
    }
  };

  return (
    <RNText style={[getVariantStyle(), style]} {...props}>
      {children}
    </RNText>
  );
};

export default CustomText;
