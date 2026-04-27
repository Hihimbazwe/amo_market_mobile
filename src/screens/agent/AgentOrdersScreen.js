import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { Truck, Package, MapPin, Search } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { AgentDrawerContext } from '../../context/AgentDrawerContext';
import { agentService } from '../../api/agentService';
import { Menu } from 'lucide-react-native';

const AgentOrdersScreen = () => {
    const { toggleDrawer } = React.useContext(AgentDrawerContext);
    const { colors } = useTheme();
    const navigation = useNavigation();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await agentService.getOrders();
            setOrders(data || []);
        } catch (error) {
            console.error('Load Orders Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const renderOrderItem = ({ item }) => (
        <TouchableOpacity style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.glass }]}>
                <Truck color={colors.primary} size={20} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <CustomText style={{ fontWeight: 'bold', color: colors.foreground }}>{item.items?.[0]?.product?.title || 'Order'}</CustomText>
                <CustomText style={{ color: colors.muted, fontSize: 11 }}>{item.recipientName}</CustomText>
                <CustomText style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>{new Date(item.createdAt).toLocaleDateString()}</CustomText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <CustomText style={{ fontWeight: 'bold', color: colors.foreground }}>Rwf {item.totalAmount.toLocaleString()}</CustomText>
                <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}15` }]}>
                    <CustomText style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold' }}>{item.status}</CustomText>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
                    <Menu color={colors.foreground} size={24} />
                </TouchableOpacity>
                <CustomText variant="h2">My Deliveries</CustomText>
            </View>
            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList 
                    data={orders}
                    renderItem={renderOrderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Package size={48} color={colors.muted} />
                            <CustomText style={{ color: colors.muted, marginTop: 12 }}>No deliveries yet</CustomText>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
    menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
    list: { padding: 16 },
    orderCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
    empty: { padding: 60, alignItems: 'center', justifyContent: 'center' }
});

export default AgentOrdersScreen;
