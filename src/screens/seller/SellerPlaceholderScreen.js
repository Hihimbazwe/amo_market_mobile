import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu, Construction, ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';

const SellerPlaceholderScreen = ({ route, navigation }) => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const title = route.params?.title || 'Section';
  const Icon = route.params?.icon || Construction;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Menu color={Colors.white} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">{title}</CustomText>
      </View>
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon color="#F97316" size={64} />
        </View>
        <CustomText variant="h2" style={styles.title}>{title}</CustomText>
        <CustomText style={styles.description}>
          This section is currently under optimized development for mobile. 
          Please check the web dashboard for full functionality in the meantime.
        </CustomText>
        
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.navigate('SellerOverview')}
        >
          <CustomText style={styles.backBtnText}>Back to Dashboard</CustomText>
        </TouchableOpacity>
      </View>
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  iconContainer: {
    width: 120, height: 120, borderRadius: 30, backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24
  },
  title: { textAlign: 'center', marginBottom: 12 },
  description: { color: Colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  backBtnText: { color: Colors.white, fontWeight: 'bold' }
});

export default SellerPlaceholderScreen;
