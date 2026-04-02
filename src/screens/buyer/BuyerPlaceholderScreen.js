import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';

const BuyerPlaceholderScreen = ({ navigation, title }) => {
  const { toggleDrawer } = React.useContext(DrawerContext);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Menu color={Colors.white} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">{title}</CustomText>
      </View>
      <View style={styles.content}>
        <CustomText variant="h2">{title} Screen</CustomText>
        <CustomText variant="subtitle" style={{ marginTop: 8 }}>Coming Soon</CustomText>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BuyerPlaceholderScreen;
