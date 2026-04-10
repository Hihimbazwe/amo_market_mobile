import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Menu, Settings, Bell, Lock, Shield, HelpCircle, Moon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useTheme } from '../../context/ThemeContext';

const options = [
  { icon: Bell, label: 'Notifications', value: 'Enabled' },
  { icon: Lock, label: 'Privacy & Security', value: '' },
  { icon: Shield, label: 'Account Protection', value: 'High' },
  { icon: HelpCircle, label: 'Help & Support', value: '' },
];

const BuyerSettingsScreen = () => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const { colors, isDarkMode, toggleTheme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Settings</CustomText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          {options.map((opt, idx) => (
            <TouchableOpacity key={idx} style={[styles.optionRow, { borderBottomColor: colors.glassBorder }]}>
              <View style={styles.optionLeft}>
                <opt.icon color={colors.muted} size={20} />
                <CustomText style={[styles.optionLabel, { color: colors.foreground }]}>{opt.label}</CustomText>
              </View>
              {opt.value ? <CustomText style={[styles.optionValue, { color: colors.muted }]}>{opt.value}</CustomText> : null}
            </TouchableOpacity>
          ))}
          
          <View style={[styles.optionRow, { borderBottomColor: 'transparent' }]}>
            <View style={styles.optionLeft}>
              <Moon color={colors.muted} size={20} />
              <CustomText style={[styles.optionLabel, { color: colors.foreground }]}>Dark Mode</CustomText>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  menuButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
  },
  content: {
    padding: 16,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLabel: {
    fontSize: 16,
  },
  optionValue: {
    fontSize: 14,
  },
});

export default BuyerSettingsScreen;
