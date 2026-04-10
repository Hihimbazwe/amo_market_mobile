import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu, Construction, ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';

const SellerPlaceholderScreen = ({ route, navigation }) => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { colors } = useTheme();
  const title = route.params?.title || 'Section';
  const Icon = route.params?.icon || Construction;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">{title}</CustomText>
      </View>
      
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}10` }]}>
          <Icon color={colors.primary} size={64} />
        </View>
        <CustomText variant="h2" style={styles.title}>{title}</CustomText>
        <CustomText style={[styles.description, { color: colors.muted }]}>
          This section is currently under optimized development for mobile. 
          Please check the web dashboard for full functionality in the meantime.
        </CustomText>
        
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: colors.glass, borderColor: colors.border }]}
          onPress={() => navigation.navigate('SellerOverview')}
        >
          <CustomText style={[styles.backBtnText, { color: colors.foreground }]}>Back to Dashboard</CustomText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderBottomWidth: 1,
  },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  iconContainer: {
    width: 120, height: 120, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24
  },
  title: { textAlign: 'center', marginBottom: 12 },
  description: { textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  backBtn: {
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1,
  },
  backBtnText: { fontWeight: 'bold' }
});

export default SellerPlaceholderScreen;
