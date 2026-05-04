import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshCw } from 'react-native';
import { Truck, Package, MapPin, Clock, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CustomText from '../../components/CustomText';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import { useTheme } from '../../context/ThemeContext';
import { AgentDrawerContext } from '../../context/AgentDrawerContext';
import { agentService } from '../../api/agentService';
import { Menu } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const DeliveryRequestsScreen = () => {
    const { toggleDrawer } = React.useContext(AgentDrawerContext);
    const { colors, isDarkMode } = useTheme();
    const navigation = useNavigation();
    const { t } = useTranslation(['dashboard', 'common']);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);
    const [expanded, setExpanded] = useState(null);
    const [note, setNote] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await agentService.getDeliveryRequests();
            setOrders(data || []);
        } catch (error) {
            console.error('Load Requests Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const handleAction = async (orderId, action) => {
        setActionId(orderId);
        try {
            await agentService.handleDeliveryAction(orderId, action, note);
            Alert.alert(t('success'), action === 'accept' ? t('deliveryAccepted') : t('deliveryRejected'));
            setNote('');
            setExpanded(null);
            load();
        } catch (error) {
            Alert.alert(t('error'), error.message || t('failedToProcessAction'));
        } finally {
            setActionId(null);
        }
    };

    const isActionable = (o) => o.status === "AWAITING_PICKUP" || o.status === "LABEL_GENERATED" || o.status === "PICKED_UP" || o.status === "IN_TRANSIT";
    const pending = orders.filter(o => ["AWAITING_PICKUP", "LABEL_GENERATED"].includes(o.status));
    const active = orders.filter(o => ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(o.status));

    const renderOrderCard = (order, type) => {
        const isExp = expanded === order.id;
        return (
            <View key={order.id} style={[styles.card, { backgroundColor: colors.card, borderColor: type === 'pending' ? '#EAB30830' : colors.border, borderWidth: 1 }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <CustomText style={{ fontSize: 10, fontWeight: 'bold', color: colors.muted }}>#{order.id.slice(-8).toUpperCase()}</CustomText>
                            {type === 'pending' && <View style={styles.newBadge}><CustomText style={styles.newBadgeText}>{t('new')}</CustomText></View>}
                        </View>
                        <CustomText style={{ fontWeight: 'bold', color: colors.foreground }} numberOfLines={1}>
                            {order.items?.[0]?.product?.title || t('order')}
                        </CustomText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                            <View style={styles.infoItem}><MapPin size={10} color={colors.muted} /><CustomText style={styles.infoText}>{order.address}</CustomText></View>
                            <View style={styles.infoItem}><Clock size={10} color={colors.muted} /><CustomText style={styles.infoText}>Rwf {(order.totalAmount || order.total || 0).toLocaleString()}</CustomText></View>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => setExpanded(isExp ? null : order.id)}>
                        {isExp ? <ChevronUp size={20} color={colors.muted} /> : <ChevronDown size={20} color={colors.muted} />}
                    </TouchableOpacity>
                </View>

                {isExp && (
                    <View style={styles.expandedContent}>
                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
                        {order.items?.map((item, i) => (
                            <View key={i} style={styles.itemRow}>
                                <Package size={12} color={colors.primary} />
                                <CustomText style={{ flex: 1, fontSize: 12, color: colors.foreground }} numberOfLines={1}>{item.product.title}</CustomText>
                                <CustomText style={{ fontSize: 12, color: colors.muted }}>Rwf {item.product.price.toLocaleString()}</CustomText>
                            </View>
                        ))}
                        {type === 'pending' && (
                            <View style={{ marginTop: 16 }}>
                                <CustomInput 
                                    placeholder={t('addNoteOptional')}
                                    value={note}
                                    onChangeText={setNote}
                                />
                                <View style={styles.actionRow}>
                                    <TouchableOpacity 
                                        onPress={() => handleAction(order.id, 'accept')}
                                        disabled={actionId === order.id}
                                        style={[styles.btn, { backgroundColor: '#10B981' }]}
                                    >
                                        <CheckCircle2 color="white" size={16} />
                                        <CustomText style={styles.btnText}>{t('accept')}</CustomText>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => handleAction(order.id, 'reject')}
                                        disabled={actionId === order.id}
                                        style={[styles.btn, { backgroundColor: 'transparent', borderColor: '#EF4444', borderWidth: 1 }]}
                                    >
                                        <XCircle color="#EF4444" size={16} />
                                        <CustomText style={[styles.btnText, { color: '#EF4444' }]}>{t('reject')}</CustomText>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
                    <Menu color={colors.foreground} size={24} />
                </TouchableOpacity>
                <CustomText variant="h2">{t('deliveryRequests')}</CustomText>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {loading && orders.length === 0 ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {pending.length > 0 && (
                            <View style={styles.section}>
                                <CustomText style={styles.sectionTitle}>{t('newRequestsCount', { count: pending.length })}</CustomText>
                                {pending.map(o => renderOrderCard(o, 'pending'))}
                            </View>
                        )}

                        {active.length > 0 && (
                            <View style={styles.section}>
                                <CustomText style={[styles.sectionTitle, { color: '#3B82F6' }]}>{t('activeDeliveriesCount', { count: active.length })}</CustomText>
                                {active.map(o => renderOrderCard(o, 'active'))}
                            </View>
                        )}

                        {orders.length === 0 && (
                            <View style={styles.empty}>
                                <Truck size={48} color={colors.muted} strokeWidth={1} />
                                <CustomText style={{ color: colors.muted, marginTop: 12 }}>{t('noDeliveryRequests')}</CustomText>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
    menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
    backBtn: { marginRight: 16 },
    content: { padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#EAB308', letterSpacing: 1.2, marginBottom: 16 },
    card: { borderRadius: 16, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    newBadge: { backgroundColor: '#EAB30820', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    newBadgeText: { color: '#EAB308', fontSize: 8, fontWeight: 'bold' },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoText: { fontSize: 11, color: '#94a3b8' },
    expandedContent: {},
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    btn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    empty: { padding: 60, alignItems: 'center', justifyContent: 'center' }
});

export default DeliveryRequestsScreen;
