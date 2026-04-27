import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MapPin, Info } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { AgentDrawerContext } from '../../context/AgentDrawerContext';
import { agentService } from '../../api/agentService';
import { Menu } from 'lucide-react-native';

const AgentCoverageScreen = () => {
    const { toggleDrawer } = React.useContext(AgentDrawerContext);
    const { colors } = useTheme();
    const [coverage, setCoverage] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await agentService.getCoverage();
            setCoverage(data || []);
        } catch (error) {
            console.error('Load Coverage Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
                    <Menu color={colors.foreground} size={24} />
                </TouchableOpacity>
                <CustomText variant="h2">Service Coverage</CustomText>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.infoBanner, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                    <Info size={20} color={colors.primary} />
                    <CustomText style={{ flex: 1, color: colors.foreground, fontSize: 13, marginLeft: 12 }}>
                        Manage the areas where you provide delivery services.
                    </CustomText>
                </View>

                {loading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <View style={styles.empty}>
                        <MapPin size={48} color={colors.muted} />
                        <CustomText style={{ color: colors.muted, marginTop: 12, textAlign: 'center' }}>
                            Coverage management is currently available on the web dashboard.
                        </CustomText>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
    menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
    content: { padding: 16 },
    infoBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
    empty: { padding: 60, alignItems: 'center', justifyContent: 'center' }
});

export default AgentCoverageScreen;
