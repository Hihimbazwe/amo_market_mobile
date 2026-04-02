import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Menu, Settings, Bell, Shield, Eye, Lock, Globe, Moon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useTheme } from '../../context/ThemeContext';

const SettingRow = ({ icon: Icon, title, subtitle, value, onValueChange, type = 'switch', colors }) => (
  <View style={styles.settingRow}>
    <View style={[styles.settingIcon, { backgroundColor: colors.glass }]}>
      <Icon color={colors.muted} size={20} />
    </View>
    <View style={{ flex: 1, marginLeft: 16 }}>
      <CustomText style={[styles.settingTitle, { color: colors.foreground }]}>{title}</CustomText>
      {subtitle && <CustomText style={styles.settingSubtitle}>{subtitle}</CustomText>}
    </View>
    {type === 'switch' ? (
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.white}
      />
    ) : (
      <TouchableOpacity><CustomText style={styles.actionText}>CHANGE</CustomText></TouchableOpacity>
    )}
  </View>
);

const SellerSettingsScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { isDarkMode, colors, toggleTheme } = useTheme();
  const [notifs, setNotifs] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">Settings</CustomText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.section}>
          <CustomText style={styles.sectionLabel}>PREFERENCES</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon={Bell} title="Order Notifications" subtitle="Alerts for new orders & shipments" value={notifs} onValueChange={setNotifs} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow icon={Moon} title="Dark Mode" subtitle="Easier on the eyes" value={isDarkMode} onValueChange={toggleTheme} colors={colors} />
          </View>
        </View>

        <View style={styles.section}>
          <CustomText style={styles.sectionLabel}>SECURITY</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon={Lock} title="Password" subtitle="Secure your account" type="link" colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow icon={Shield} title="Two-Factor Auth" subtitle="Enhance store security" value={marketing} onValueChange={setMarketing} colors={colors} />
          </View>
        </View>

        <View style={styles.section}>
          <CustomText style={styles.sectionLabel}>STORE</CustomText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon={Globe} title="Marketplace Visibility" subtitle="Show products to buyers" value={true} onValueChange={() => {}} colors={colors} />
          </View>
        </View>

        <TouchableOpacity style={styles.deleteBtn}>
          <CustomText style={styles.deleteText}>DEACTIVATE SELLER ACCOUNT</CustomText>
        </TouchableOpacity>

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
  content: { padding: 20 },
  section: { marginBottom: 32 },
  sectionLabel: { color: Colors.muted, fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  settingIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  settingTitle: { color: Colors.white, fontSize: 15, fontWeight: 'bold' },
  settingSubtitle: { color: Colors.muted, fontSize: 11, marginTop: 2 },
  actionText: { color: '#F97316', fontSize: 12, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16 },
  deleteBtn: { alignItems: 'center', padding: 20, marginTop: 20 },
  deleteText: { color: '#EF4444', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 }
});

export default SellerSettingsScreen;
