import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Menu, Settings, Bell, Lock, Shield, HelpCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';

const options = [
  { icon: Bell, label: 'Notifications', value: 'Enabled' },
  { icon: Lock, label: 'Privacy & Security', value: '' },
  { icon: Shield, label: 'Account Protection', value: 'High' },
  { icon: HelpCircle, label: 'Help & Support', value: '' },
];

const BuyerSettingsScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Menu color={Colors.white} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Settings</CustomText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          {options.map((opt, idx) => (
            <TouchableOpacity key={idx} style={styles.optionRow}>
              <View style={styles.optionLeft}>
                <opt.icon color={Colors.muted} size={20} />
                <CustomText style={styles.optionLabel}>{opt.label}</CustomText>
              </View>
              {opt.value ? <CustomText style={styles.optionValue}>{opt.value}</CustomText> : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    padding: 16,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLabel: {
    color: Colors.white,
    fontSize: 16,
  },
  optionValue: {
    color: Colors.muted,
    fontSize: 14,
  },
});

export default BuyerSettingsScreen;
