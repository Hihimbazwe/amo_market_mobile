import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Menu, RefreshCcw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';
import { Colors } from '../../theme/colors';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';

const mockReplacements = [];

const BuyerReplacementsScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Menu color={Colors.white} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Replacements</CustomText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <CustomText variant="subtitle">Replacement Requests</CustomText>
          <CustomButton title="Request New" style={{ height: 40, paddingHorizontal: 16 }} />
        </View>

        {mockReplacements.length === 0 ? (
          <View style={styles.emptyState}>
            <RefreshCcw color={Colors.muted} size={48} />
            <CustomText variant="subtitle" style={{ marginTop: 16, textAlign: 'center' }}>
              You don't have any pending replacement requests.
            </CustomText>
          </View>
        ) : null}
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
  content: { padding: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 20 },
});

export default BuyerReplacementsScreen;
