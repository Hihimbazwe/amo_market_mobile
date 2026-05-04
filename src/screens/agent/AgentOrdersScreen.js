import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { Truck, Package, MapPin, Search } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { AgentDrawerContext } from '../../context/AgentDrawerContext';
import { agentService } from '../../api/agentService';
import { Menu, MoreVertical, ShieldCheck, Clock, X, Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';

const AgentOrdersScreen = () => {
    const { toggleDrawer } = React.useContext(AgentDrawerContext);
    const { colors } = useTheme();
    const navigation = useNavigation();
    const { t, i18n } = useTranslation(['dashboard', 'common']);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [updating, setUpdating] = useState(false);

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

    const handleUpdateStatus = async (orderId, action) => {
        setUpdating(true);
        try {
            await agentService.updateOrderStatus(orderId, action);
            setActionModalVisible(false);
            load();
        } catch (error) {
            Alert.alert(t('error'), error.message);
        } finally {
            setUpdating(false);
        }
    };

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const renderOrderItem = ({ item }) => {
        const statusColor = item.status === 'OUT_FOR_DELIVERY' ? '#F97316' : 
                          item.status === 'DELIVERED' ? '#10B981' :
                          ['PICKED_UP', 'IN_TRANSIT'].includes(item.status) ? '#3B82F6' : '#94a3b8';
        
        return (
            <TouchableOpacity 
                style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                    setSelectedOrder(item);
                    setActionModalVisible(true);
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.refBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Package size={12} color={colors.primary} />
                        <CustomText style={[styles.ref, { color: colors.primary }]}>#{item.id.slice(-8).toUpperCase()}</CustomText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}35` }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <CustomText style={[styles.badgeText, { color: statusColor }]}>{t(item.status?.toLowerCase())}</CustomText>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <CustomText variant="h3" style={[styles.name, { color: colors.foreground }]}>{item.items?.[0]?.product?.title || t('order')}</CustomText>
                    
                    <View style={styles.locationContainer}>
                        <View style={[styles.locationIconBox, { backgroundColor: colors.primary + '10' }]}>
                            <MapPin color={colors.primary} size={16} />
                        </View>
                        <View style={styles.locationInfo}>
                            <CustomText style={[styles.locationLabel, { color: colors.muted }]}>{t('recipient')}</CustomText>
                            <CustomText style={[styles.addressText, { color: colors.foreground }]} numberOfLines={1}>
                                {item.recipientName}
                            </CustomText>
                        </View>
                    </View>

                    <View style={styles.priceRow}>
                        <CustomText style={{ color: colors.muted, fontSize: 12 }}>{t('totalAmount')}</CustomText>
                        <CustomText style={{ fontWeight: '900', color: colors.foreground, fontSize: 16 }}>
                            Rwf {(item.totalAmount || item.total || 0).toLocaleString()}
                        </CustomText>
                    </View>
                </View>

                {/* Direct Action Button */}
                <View style={styles.actionContainer}>
                    {['PICKED_UP', 'IN_TRANSIT'].includes(item.status) && (
                        <TouchableOpacity 
                            style={[styles.cardActionBtn, { borderColor: '#F97316', borderWidth: 1 }]}
                            onPress={() => handleUpdateStatus(item.id, 'out_for_delivery')}
                        >
                            <Truck size={14} color="#F97316" />
                            <CustomText style={[styles.cardActionBtnText, { color: '#F97316' }]}>{t('markAsOutForDelivery')}</CustomText>
                        </TouchableOpacity>
                    )}
                    {item.status === 'OUT_FOR_DELIVERY' && (
                        <TouchableOpacity 
                            style={[styles.cardActionBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => navigation.navigate('AgentVerifyCode')}
                        >
                            <ShieldCheck size={14} color="#fff" />
                            <CustomText style={[styles.cardActionBtnText, { color: '#fff' }]}>{t('verifyOrder')}</CustomText>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
                    <Menu color={colors.foreground} size={24} />
                </TouchableOpacity>
                <CustomText variant="h2">{t('myOrders')}</CustomText>
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
                            <CustomText style={{ color: colors.muted, marginTop: 12 }}>{t('noOrdersFound')}</CustomText>
                        </View>
                    }
                />
            )}

            <Modal
                visible={actionModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setActionModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setActionModalVisible(false)}
                >
                    <View style={[styles.actionMenu, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={styles.menuHeader}>
                            <CustomText variant="h3">{t('orderActions') || 'Order Actions'}</CustomText>
                            <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                                <X size={20} color={colors.muted} />
                            </TouchableOpacity>
                        </View>

                        {selectedOrder && (
                            <View style={styles.menuItems}>
                                {['PICKED_UP', 'IN_TRANSIT'].includes(selectedOrder.status) && (
                                    <TouchableOpacity 
                                        style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                                        onPress={() => handleUpdateStatus(selectedOrder.id, 'out_for_delivery')}
                                        disabled={updating}
                                    >
                                        <Truck size={18} color="#F97316" />
                                        <CustomText style={styles.menuItemText}>{t('markAsOutForDelivery') || 'Out for Delivery'}</CustomText>
                                    </TouchableOpacity>
                                )}

                                {selectedOrder.status === 'OUT_FOR_DELIVERY' && (
                                    <TouchableOpacity 
                                        style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                                        onPress={() => {
                                            setActionModalVisible(false);
                                            navigation.navigate('AgentVerifyCode');
                                        }}
                                    >
                                        <ShieldCheck size={18} color="#10B981" />
                                        <CustomText style={styles.menuItemText}>{t('verifyOrder') || 'Verify Order'}</CustomText>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity 
                                    style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        setActionModalVisible(false);
                                        Alert.alert(t('info'), 'Reschedule feature coming soon in sync with web.');
                                    }}
                                >
                                    <Clock size={18} color="#3B82F6" />
                                    <CustomText style={styles.menuItemText}>{t('reschedule') || 'Reschedule Delivery'}</CustomText>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setActionModalVisible(false);
                                        // Navigate to details if exists
                                    }}
                                >
                                    <Info size={18} color={colors.muted} />
                                    <CustomText style={styles.menuItemText}>{t('viewDetails') || 'View Details'}</CustomText>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
    menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
    list: { padding: 16 },
    orderCard: { borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 16, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    refBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    ref: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    cardBody: { gap: 4 },
    name: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
    locationContainer: { flexDirection: 'row', paddingVertical: 8, gap: 12, alignItems: 'center' },
    locationIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    locationInfo: { flex: 1 },
    locationLabel: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 1 },
    addressText: { fontSize: 13, fontWeight: '500' },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
    actionContainer: { marginTop: 16 },
    cardActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12 },
    cardActionBtnText: { fontWeight: 'bold', fontSize: 13 },
    empty: { padding: 60, alignItems: 'center', justifyContent: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    actionMenu: { width: '100%', borderRadius: 24, padding: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    menuItems: { gap: 4 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 },
    menuItemText: { fontSize: 15, fontWeight: '600' }
});

export default AgentOrdersScreen;
