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
  ScrollView,
  RefreshControl
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
  ArrowRight,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  MoreVertical,
  Flame,
  Tag,
  Globe
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';
import { productService } from '../../api/productService';
import { useTheme } from '../../context/ThemeContext';
import NotificationIcon from '../../components/NotificationIcon';
import AddProductModal from '../../components/AddProductModal';
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

const SellerInventoryScreen = ({ navigation }) => {
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
  
  const [isModalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // New states for actions
  const [actionMenuProduct, setActionMenuProduct] = useState(null);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [discountInput, setDiscountInput] = useState('');

  const fetchInventory = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await sellerService.getInventory(user.id);
      // Deduplicate by ID
      const uniqueItems = data.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      setItems(uniqueItems);
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

  const handleEditProductClick = async (product) => {
    try {
      setLoading(true);
      const fullProduct = await productService.getProductById(product.id, user.id);
      setEditingProduct(fullProduct);
      setModalVisible(true);
    } catch (error) {
      console.error('Error fetching product for edit:', error);
      // Fallback to the partial data from the list if fetch fails
      setEditingProduct(product);
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setModalVisible(false);
  };

  const handleAddProduct = async (productData, mediaFiles) => {
    if (!user || !user.id) return;
    setIsSubmitting(true);
    try {
      if (editingProduct) {
        const mediaUrls = [];
        for (const media of mediaFiles) {
          if (media.isExisting) {
            mediaUrls.push({ url: media.uri, type: media.type });
          } else {
            const url = await productService.uploadToCloudinary(media);
            mediaUrls.push({ url, type: media.type });
          }
        }
        const finalData = { ...productData, media: mediaUrls };
        await productService.updateProduct(user.id, editingProduct.id, finalData);
        Alert.alert(t('success'), t('productUpdatedSuccess'));
      } else {
        const mediaUrls = [];
        for (const media of mediaFiles) {
          const url = await productService.uploadToCloudinary(media);
          mediaUrls.push({ url, type: media.type });
        }
        const finalProductData = { ...productData, media: mediaUrls };
        await productService.createProduct(user.id, finalProductData);
        Alert.alert(t('success'), productData.published ? t('productPublishedSuccess') : t('productDraftSuccess'));
      }
      handleCloseModal();
      fetchInventory();
    } catch (error) {
      Alert.alert(t('error'), error.message || t('failedToSaveProduct'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = (productId) => {
    Alert.alert(
      t('deleteProduct'),
      t('deleteProductConfirm'),
      [
        { text: t('cancel'), style: "cancel" },
        { text: t('delete'), style: "destructive", onPress: async () => {
            try {
              await productService.deleteProduct(user.id, productId);
              fetchInventory();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const handleTogglePublish = async (productId, currentStatus) => {
    // Optimistic UI update for perfectly smooth publish/unpublish
    setItems(prev => prev.map(p => p.id === productId ? { ...p, published: !currentStatus } : p));
    try {
      await productService.updateProduct(user.id, productId, { published: !currentStatus });
    } catch (err) {
      // Revert on error
      setItems(prev => prev.map(p => p.id === productId ? { ...p, published: currentStatus } : p));
      Alert.alert(t('error'), err.message || t('failedToUpdateVisibility'));
    }
  };

  const handleToggleHotDeal = async (product) => {
    try {
      await productService.updateProduct(user.id, product.id, { isHotDeal: !product.isHotDeal });
      Alert.alert(t('success'), product.isHotDeal ? t('hotDealRemoved') : t('hotDealAdded'));
      fetchInventory();
    } catch (err) {
      Alert.alert(t('error'), err.message || t('failedToUpdateProduct'));
    }
  };

  const handleApplyDiscount = async () => {
    if (!actionMenuProduct) return;
    const pct = parseInt(discountInput, 10);
    if (isNaN(pct) || pct < 1 || pct > 90) {
      Alert.alert(t('error'), t('invalidDiscountPercent'));
      return;
    }
    setDiscountModalVisible(false);
    try {
      await productService.updateProduct(user.id, actionMenuProduct.id, { isDiscount: true, discountPercent: pct });
      Alert.alert(t('success'), t('discountApplied'));
      fetchInventory();
    } catch (err) {
      Alert.alert(t('error'), err.message || t('failedToApplyDiscount'));
    }
  };

  const handleRemoveDiscount = async (product) => {
    try {
      await productService.updateProduct(user.id, product.id, { isDiscount: false, discountPercent: null });
      Alert.alert(t('success'), t('discountRemoved'));
      fetchInventory();
    } catch (err) {
      Alert.alert(t('error'), err.message || t('failedToRemoveDiscount'));
    }
  };

  const formatPrice = (price) => {
    return 'Rwf ' + (price || 0).toLocaleString();
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <CustomText style={{ color: colors.primary, fontWeight: 'bold' }}>{formatPrice(item.price)}</CustomText>
              {item.isHotDeal && (
                <View style={styles.hotDealBadge}>
                  <Flame size={10} color="#EF4444" />
                  <CustomText style={styles.hotDealText}>HOT</CustomText>
                </View>
              )}
              {item.isDiscount && item.discountPercent && (
                <View style={styles.discountBadge}>
                  <CustomText style={styles.discountText}>-{item.discountPercent}%</CustomText>
                </View>
              )}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={[styles.pubBadge, { backgroundColor: item.published ? 'rgba(16, 185, 129, 0.1)' : colors.glass }]}>
              <CustomText style={[styles.pubText, { color: item.published ? '#10B981' : colors.muted }]}>
                {item.published ? t('live') : t('draft')}
              </CustomText>
            </View>
            <StockBadge stock={totalStock} t={t} />
          </View>
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

        <View style={[styles.salesSummary, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <View style={styles.saleItem}>
              <CustomText variant="caption" style={{ color: colors.muted }}>{t('sold30d')}</CustomText>
              <CustomText style={styles.saleValue}>{item.soldLast30}</CustomText>
            </View>
            <View style={styles.saleItem}>
              <CustomText variant="caption" style={{ color: colors.muted }}>{t('totalSold')}</CustomText>
              <CustomText style={styles.saleValue}>{item.totalSold}</CustomText>
            </View>
          </View>
          <TouchableOpacity style={{ padding: 4 }} onPress={() => setActionMenuProduct(item)}>
            <MoreVertical size={20} color={colors.foreground} />
          </TouchableOpacity>
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
        <NotificationIcon style={{ marginRight: 8 }} />
        <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Plus color="white" size={16} />
          <CustomText style={styles.addBtnText}>Add Product</CustomText>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={fetchInventory} 
            tintColor={colors.primary} 
            colors={[colors.primary]} 
          />
        }
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
        
      {/* Action Menu Modal */}
      <Modal
        visible={!!actionMenuProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMenuProduct(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActionMenuProduct(null)}
        >
          <View style={[styles.actionMenuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.actionMenuHeader}>
              <CustomText variant="h3" numberOfLines={1} style={{ flex: 1 }}>{actionMenuProduct?.title}</CustomText>
            </View>
            
            <TouchableOpacity style={styles.actionMenuItem} onPress={() => {
              const p = actionMenuProduct;
              setActionMenuProduct(null);
              navigation.navigate('SellerProductDetail', { 
                productId: p.id, 
                product: p 
              });
            }}>
              <Globe size={18} color={colors.foreground} />
              <CustomText style={{ marginLeft: 12 }}>{t('view Details')}</CustomText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionMenuItem} onPress={() => {
              const p = actionMenuProduct;
              setActionMenuProduct(null);
              handleEditProductClick(p);
            }}>
              <Pencil size={18} color={colors.primary} />
              <CustomText style={{ marginLeft: 12, color: colors.primary }}>{t('edit Product')}</CustomText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionMenuItem} onPress={() => {
              const p = actionMenuProduct;
              setActionMenuProduct(null);
              handleTogglePublish(p.id, p.published);
            }}>
              {actionMenuProduct?.published ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.foreground} />}
              <CustomText style={{ marginLeft: 12 }}>{actionMenuProduct?.published ? t('unpublish') : t('publish')}</CustomText>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.actionMenuItem} onPress={() => {
              const p = actionMenuProduct;
              setActionMenuProduct(null);
              handleToggleHotDeal(p);
            }}>
              <Flame size={18} color={actionMenuProduct?.isHotDeal ? '#EF4444' : colors.muted} />
              <CustomText style={{ marginLeft: 12, color: actionMenuProduct?.isHotDeal ? '#EF4444' : colors.foreground }}>
                {actionMenuProduct?.isHotDeal ? t('remove HotDeal') : t('mark As HotDeal')}
              </CustomText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionMenuItem} onPress={() => {
              if (actionMenuProduct?.isDiscount) {
                const p = actionMenuProduct;
                setActionMenuProduct(null);
                handleRemoveDiscount(p);
              } else {
                setDiscountInput('10');
                setDiscountModalVisible(true);
              }
            }}>
              {actionMenuProduct?.isDiscount ? <X size={18} color="#A855F7" /> : <Tag size={18} color={colors.muted} />}
              <CustomText style={{ marginLeft: 12, color: actionMenuProduct?.isDiscount ? '#A855F7' : colors.foreground }}>
                {actionMenuProduct?.isDiscount ? t('removeDiscount') : t('add Discount')}
              </CustomText>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.actionMenuItem} onPress={() => {
              const p = actionMenuProduct;
              setActionMenuProduct(null);
              handleDeleteProduct(p.id);
            }}>
              <Trash2 size={18} color="#EF4444" />
              <CustomText style={{ marginLeft: 12, color: '#EF4444' }}>{t('deleteProduct')}</CustomText>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>

      {/* Discount Modal */}
      <Modal
        visible={discountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setDiscountModalVisible(false); setActionMenuProduct(null); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <CustomText variant="h3">{t('addDiscount')}</CustomText>
              <TouchableOpacity onPress={() => { setDiscountModalVisible(false); setActionMenuProduct(null); }}>
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <CustomText style={styles.modalItemTitle}>{actionMenuProduct?.title}</CustomText>
              <CustomText variant="caption" style={{ marginBottom: 16 }}>
                {t('enterDiscountPercent')} (1-90)
              </CustomText>
              <View style={[styles.stockInputBox, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                <TextInput 
                  style={[styles.stockInput, { color: colors.foreground }]}
                  keyboardType="numeric"
                  value={discountInput}
                  onChangeText={setDiscountInput}
                  autoFocus
                />
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setDiscountModalVisible(false); setActionMenuProduct(null); }}>
                <CustomText style={{ fontWeight: '700' }}>{t('cancel')}</CustomText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleApplyDiscount}>
                <Save size={18} color="white" />
                <CustomText style={{ color: 'white', fontWeight: '700', marginLeft: 8 }}>{t('apply')}</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

        <AddProductModal 
          visible={isModalVisible} 
          onClose={handleCloseModal}
          onSubmit={handleAddProduct}
          isSubmitting={isSubmitting}
          initialData={editingProduct}
        />
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
  addBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12,
    gap: 4
  },
  addBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
  },
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

  pubBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignItems: 'center' },
  pubText: { fontSize: 8, fontWeight: 'bold', letterSpacing: 0.5 },

  hotDealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4
  },
  hotDealText: { fontSize: 8, fontWeight: '900', color: '#EF4444' },
  discountBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  discountText: { fontSize: 9, fontWeight: '900', color: '#A855F7' },
  
  actionMenuContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  actionMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  divider: { height: 1, opacity: 0.5, marginVertical: 4 },
});

export default SellerInventoryScreen;
