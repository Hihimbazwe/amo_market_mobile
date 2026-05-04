import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  Image, 
  ActivityIndicator, 
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { 
  Menu, 
  Search, 
  Package as PackageIcon, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Pencil,
  Save,
  ArrowRight
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';
import NotificationIcon from '../../components/NotificationIcon';
import { useTranslation } from 'react-i18next';

const StatCard = ({ label, value, icon: Icon, color, backgroundColor }) => (
  <View style={[styles.statCard, { backgroundColor }]}>
    <View style={styles.statHeader}>
      <Icon size={16} color={color} />
      <CustomText style={[styles.statValue, { color }]}>{value}</CustomText>
    </View>
    <CustomText variant="caption" style={styles.statLabel}>{label}</CustomText>
  </View>
);

const StockBadge = ({ stock, t }) => {
  if (stock <= 0) return (
    <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
      <CustomText style={[styles.badgeText, { color: '#EF4444' }]}>{t('outOfStock')}</CustomText>
    </View>
  );
  if (stock <= 5) return (
    <View style={[styles.badge, { backgroundColor: 'rgba(249, 115, 22, 0.1)', borderColor: 'rgba(249, 115, 22, 0.2)' }]}>
      <CustomText style={[styles.badgeText, { color: '#F97316' }]}>{t('lowStock')}</CustomText>
    </View>
  );
  return (
    <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
      <CustomText style={[styles.badgeText, { color: '#10B981' }]}>{t('inStock')}</CustomText>
    </View>
  );
};

const SellerInventoryScreen = () => {
  const { toggleDrawer } = useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  
  const [editingItem, setEditingItem] = useState(null);
  const [editStock, setEditStock] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchInventory = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await sellerService.getInventory(user.id);
      setItems(data);
    } catch (error) {
      Alert.alert(t('error'), t('failedToFetchProducts'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [user]);

  const filteredItems = useMemo(() => {
    let list = items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterMode === 'instock') list = list.filter(i => (i.variants?.length > 0 ? i.variants.reduce((s, v) => s + (v.stock || 0), 0) : i.stock) > 5);
    if (filterMode === 'low')     list = list.filter(i => {
      const s = i.variants?.length > 0 ? i.variants.reduce((s, v) => s + (v.stock || 0), 0) : i.stock;
      return s > 0 && s <= 5;
    });
    if (filterMode === 'out')     list = list.filter(i => (i.variants?.length > 0 ? i.variants.reduce((s, v) => s + (v.stock || 0), 0) : i.stock) <= 0);

    return list;
  }, [items, searchQuery, filterMode]);

  const stats = useMemo(() => {
    const total = items.length;
    const outOfStock = items.filter(i => (i.variants?.length > 0 ? i.variants.every(v => !v.stock) : (i.stock || 0) <= 0)).length;
    const lowStock = items.filter(i => {
      const s = i.variants?.length > 0 ? i.variants.reduce((s, v) => s + (v.stock || 0), 0) : i.stock;
      return s > 0 && s <= 5;
    }).length;
    return {
      total,
      inStock: total - outOfStock - lowStock,
      lowStock,
      outOfStock
    };
  }, [items]);

  const handleUpdateStock = async () => {
    if (!editingItem) return;
    const newStock = parseInt(editStock);
    if (isNaN(newStock) || newStock < 0) {
      Alert.alert(t('error'), t('invalidAmount'));
      return;
    }

    setIsUpdating(true);
    try {
      const payload = editingItem.variantId 
        ? { id: editingItem.productId, variantId: editingItem.variantId, variantStock: newStock }
        : { id: editingItem.productId, stock: newStock };
      
      await sellerService.updateInventoryStock(user.id, payload);
      
      setItems(prev => prev.map(p => {
        if (p.id !== editingItem.productId) return p;
        if (editingItem.variantId) {
          return { ...p, variants: p.variants.map(v => v.id === editingItem.variantId ? { ...v, stock: newStock } : v) };
        }
        return { ...p, stock: newStock };
      }));
      
      setEditingItem(null);
      Alert.alert(t('success'), t('stockUpdatedSuccess'));
    } catch (error) {
      Alert.alert(t('error'), t('failedToUpdateStock'));
    } finally {
      setIsUpdating(false);
    }
  };

  const renderItem = ({ item }) => {
    const hasVariants = item.variants && item.variants.length > 0;
    const totalStock = hasVariants ? item.variants.reduce((s, v) => s + (v.stock || 0), 0) : item.stock;
    const imageUrl = item.media?.[0]?.url;

    return (
      <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.itemHeader}>
          <View style={styles.imageBox}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} />
            ) : (
              <PackageIcon color={colors.muted} size={20} />
            )}
          </View>
          <View style={styles.itemInfo}>
            <CustomText style={styles.itemTitle} numberOfLines={1}>{item.title}</CustomText>
            <CustomText variant="caption" style={{ color: colors.muted }}>{item.category}</CustomText>
          </View>
          <StockBadge stock={totalStock} t={t} />
        </View>

        {!hasVariants ? (
          <View style={styles.stockRow}>
            <View style={styles.stockInfo}>
              <CustomText variant="caption" style={{ color: colors.muted }}>{t('stock')}:</CustomText>
              <CustomText style={styles.stockValue}>{item.stock}</CustomText>
            </View>
            <TouchableOpacity 
              style={[styles.editBtn, { backgroundColor: colors.glass }]}
              onPress={() => {
                setEditingItem({ productId: item.id, title: item.title, currentStock: item.stock });
                setEditStock(String(item.stock));
              }}
            >
              <Pencil size={14} color={colors.primary} />
              <CustomText style={[styles.editBtnText, { color: colors.primary }]}>{t('edit')}</CustomText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.variantsContainer}>
            {item.variants.map(v => (
              <View key={v.id} style={styles.variantRow}>
                <View style={styles.variantNameCol}>
                  <ArrowRight size={10} color={colors.primary} style={{ marginRight: 6 }} />
                  <CustomText variant="caption" style={styles.variantText} numberOfLines={1}>
                    {v.name}: {v.value}
                  </CustomText>
                </View>
                <View style={styles.variantStockCol}>
                  <CustomText variant="caption" style={[styles.variantStockText, { 
                    color: v.stock <= 0 ? '#EF4444' : v.stock <= 5 ? '#F97316' : colors.foreground 
                  }]}>
                    {v.stock} {t('qty')}
                  </CustomText>
                  <TouchableOpacity 
                    onPress={() => {
                      setEditingItem({ productId: item.id, variantId: v.id, title: `${item.title} (${v.value})`, currentStock: v.stock });
                      setEditStock(String(v.stock));
                    }}
                    style={styles.variantEditBtn}
                  >
                    <Pencil size={10} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.salesSummary}>
          <View style={styles.saleItem}>
            <CustomText variant="caption" style={{ color: colors.muted }}>{t('sold30d')}</CustomText>
            <CustomText style={styles.saleValue}>{item.soldLast30}</CustomText>
          </View>
          <View style={styles.saleItem}>
            <CustomText variant="caption" style={{ color: colors.muted }}>{t('totalSold')}</CustomText>
            <CustomText style={styles.saleValue}>{item.totalSold}</CustomText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.iconBtn, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>{t('inventory')}</CustomText>
        <NotificationIcon style={{ marginRight: 12 }} />
        <TouchableOpacity onPress={fetchInventory} style={[styles.iconBtn, { backgroundColor: colors.glass }]}>
          <RefreshCw color={colors.foreground} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <StatCard label={t('totalItems')} value={stats.total} icon={PackageIcon} color="#3B82F6" backgroundColor="rgba(59, 130, 246, 0.1)" />
            <StatCard label={t('inStock')} value={stats.inStock} icon={CheckCircle2} color="#10B981" backgroundColor="rgba(16, 185, 129, 0.1)" />
          </View>
          <View style={styles.statsRow}>
            <StatCard label={t('lowStock')} value={stats.lowStock} icon={AlertTriangle} color="#F97316" backgroundColor="rgba(249, 115, 22, 0.1)" />
            <StatCard label={t('outOfStock')} value={stats.outOfStock} icon={X} color="#EF4444" backgroundColor="rgba(239, 68, 68, 0.1)" />
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.glass }]}>
          <Search size={18} color={colors.muted} />
          <TextInput 
            placeholder={t('searchInventory')}
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsScrollContent}
          style={styles.pillsRow}
        >
          {[
            { key: 'all',     label: t('allStatus') },
            { key: 'instock', label: t('inStock') },
            { key: 'low',     label: t('lowStock') },
            { key: 'out',     label: t('outOfStock') },
          ].map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterPill, filterMode === opt.key && { backgroundColor: colors.primary }]}
              onPress={() => setFilterMode(opt.key)}
            >
              <CustomText style={[styles.pillText, { color: filterMode === opt.key ? '#fff' : colors.muted }]}>
                {opt.label}
              </CustomText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <CustomText style={{ marginTop: 12, color: colors.muted }}>{t('loading')}...</CustomText>
          </View>
        ) : (
          <FlatList 
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <PackageIcon size={48} color={colors.glassBorder} />
                <CustomText style={styles.emptyText}>{t('noItemsMatchFilters')}</CustomText>
                <CustomText variant="caption" style={{ textAlign: 'center' }}>{t('adjustSearchFilters')}</CustomText>
              </View>
            }
          />
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Stock Modal */}
      <Modal
        visible={!!editingItem}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <CustomText variant="h3">{t('updateStock')}</CustomText>
              <TouchableOpacity onPress={() => setEditingItem(null)}>
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <CustomText style={styles.modalItemTitle}>{editingItem?.title}</CustomText>
              <CustomText variant="caption" style={{ marginBottom: 16 }}>
                {t('availableBalance')}: {editingItem?.currentStock}
              </CustomText>
              
              <View style={[styles.stockInputBox, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                <TextInput 
                  style={[styles.stockInput, { color: colors.foreground }]}
                  keyboardType="numeric"
                  value={editStock}
                  onChangeText={setEditStock}
                  autoFocus
                />
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setEditingItem(null)}
              >
                <CustomText style={{ fontWeight: '700' }}>{t('cancel')}</CustomText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleUpdateStock}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Save size={18} color="white" />
                    <CustomText style={{ color: 'white', fontWeight: '700', marginLeft: 8 }}>{t('save')}</CustomText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20,
    borderBottomWidth: 1,
    gap: 12
  },
  iconBtn: { padding: 8, borderRadius: 12 },
  scrollContent: { padding: 16 },
  
  // Stats
  statsSection: {
    marginBottom: 20,
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    justifyContent: 'space-between',
    minHeight: 80,
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.8 },

  // Search & Pills (matches ChatListScreen design)
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  pillsRow: { marginVertical: 4 },
  pillsScrollContent: {
    paddingHorizontal: 0,
    gap: 10,
    paddingVertical: 8,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillText: { fontSize: 14, fontWeight: '700' },

  // Modal - Edit Stock
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalBody: { marginBottom: 24 },
  modalItemTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  stockInputBox: { borderRadius: 16, borderWidth: 1, height: 56, justifyContent: 'center', paddingHorizontal: 16 },
  stockInput: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  modalFooter: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.05)' },
  saveBtn: { },

  // List
  loaderBox: { paddingVertical: 40, alignItems: 'center' },
  emptyBox: { paddingVertical: 60, alignItems: 'center', opacity: 0.5 },
  emptyText: { marginTop: 12, fontWeight: '700' },

  itemCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  itemHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 14,
    gap: 12,
  },
  imageBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  image: { width: '100%', height: '100%' },
  itemInfo: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, flexShrink: 0 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },

  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    marginBottom: 12
  },
  stockInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stockValue: { fontSize: 16, fontWeight: '900' },
  editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },

  variantsContainer: {
    marginBottom: 12,
    gap: 4
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10
  },
  variantNameCol: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  variantText: { fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  variantStockCol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  variantStockText: { fontWeight: '800' },
  variantEditBtn: { padding: 4 },

  salesSummary: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
    gap: 24,
    flexWrap: 'wrap',
  },
  saleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saleValue: { fontSize: 14, fontWeight: '800' },
});

export default SellerInventoryScreen;
