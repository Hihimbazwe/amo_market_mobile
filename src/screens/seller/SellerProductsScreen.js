import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Menu, Search, Package, Plus, Pencil, Trash2, Eye, EyeOff, Tag, Flame, RefreshCw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../api/productService';
import { useTheme } from '../../context/ThemeContext';
import NotificationIcon from '../../components/NotificationIcon';
import AddProductModal from '../../components/AddProductModal';
import { useTranslation } from 'react-i18next';
const SellerProductsScreen = () => {
  const { toggleDrawer } = useContext(SellerDrawerContext);
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditClick = (product) => {
    setEditProduct(product);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setEditProduct(null);
    setModalVisible(false);
  };

  const fetchProducts = async () => {
    if (!user || !user.id) return;
    setLoading(true);
    try {
      const data = await productService.getMyProducts(user.id);
      setProducts(data);
    } catch (error) {
      Alert.alert(t('error'), t('failedToFetchProducts'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const handleAddProduct = async (productData, mediaFiles) => {
    if (!user || !user.id) return;
    setIsSubmitting(true);
    try {
      if (editProduct) {
        // Edit mode: updating product text fields only
        await productService.updateProduct(user.id, editProduct.id, productData);
        Alert.alert(t('success'), t('productUpdatedSuccess'));
      } else {
        // Create mode: Needs full image upload
        // 1. Upload media to Cloudinary First
        const mediaUrls = [];
        for (const media of mediaFiles) {
          const url = await productService.uploadToCloudinary(media);
          mediaUrls.push(url);
        }
        
        // 2. Submit Product to the Database
        const finalProductData = {
          ...productData,
          mediaUrls
        };
        await productService.createProduct(user.id, finalProductData);
        Alert.alert(t('success'), productData.published ? t('productPublishedSuccess') : t('productDraftSuccess'));
      }
      
      // 3. Cleanup and Refresh
      handleCloseModal();
      fetchProducts();
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
              fetchProducts();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const handleTogglePublish = async (productId, currentStatus) => {
    try {
      await productService.updateProduct(user.id, productId, { published: !currentStatus });
      fetchProducts();
    } catch (err) {
      Alert.alert(t('error'), err.message || t('failedToUpdateVisibility'));
    }
  };

  const formatPrice = (price) => {
    return 'Rwf ' + price.toLocaleString();
  };

  const renderProductItem = ({ item }) => {
    // Determine the cover image
    const coverImage = (item.mediaUrls && item.mediaUrls.length > 0) 
      ? item.mediaUrls[0] 
      : (item.images && item.images.length > 0) 
        ? item.images[0] 
        : (item.media && item.media.length > 0)
          ? item.media[0].url
          : null;

    const categoryLabel = typeof item.category === 'string' 
      ? item.category 
      : item.category?.name || 'Category';

    return (
      <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.productRow}>
          <View style={styles.productImageContainer}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, { backgroundColor: colors.glass, alignItems: 'center', justifyContent: 'center' }]}>
                <Package color={colors.muted} size={24} />
              </View>
            )}
            {item.isHotDeal && (
              <View style={styles.hotBadge}>
                <Flame color="white" size={10} fill="white" />
              </View>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <CustomText style={[styles.productTitle, { color: colors.foreground }]} numberOfLines={1}>
              {item.title}
            </CustomText>
            <CustomText style={[styles.productCategory, { color: colors.muted }]}>
              {categoryLabel}
            </CustomText>
            <CustomText style={[styles.productPrice, { color: colors.primary }]}>
              {formatPrice(item.price)}
            </CustomText>
          </View>

          <View style={styles.stockStatus}>
            <View style={[styles.pubBadge, { 
              backgroundColor: item.published ? 'rgba(16, 185, 129, 0.1)' : colors.glass 
            }]}>
              <CustomText style={[styles.pubText, { color: item.published ? '#10B981' : colors.muted }]}>
                {item.published ? t('live') : t('draft')}
              </CustomText>
            </View>
            <CustomText style={[styles.stockValue, { 
              color: item.stock <= 0 ? '#EF4444' : item.stock <= 5 ? '#F97316' : colors.foreground 
            }]}>
              {item.stock} {t('qty')}
            </CustomText>
          </View>
        </View>
        
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.glass }]} 
            onPress={() => handleEditClick(item)}
          >
            <Pencil color={colors.primary} size={16} />
            <CustomText style={[styles.actionText, { color: colors.primary }]}>{t('edit')}</CustomText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.glass }]} 
            onPress={() => handleTogglePublish(item.id, item.published)}
          >
            {item.published ? <EyeOff color={colors.muted} size={16} /> : <Eye color={colors.primary} size={16} />}
            <CustomText style={[styles.actionText, { color: item.published ? colors.muted : colors.primary }]}>
              {item.published ? t('hide') : t('show')}
            </CustomText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]} 
            onPress={() => handleDeleteProduct(item.id)}
          >
            <Trash2 color="#EF4444" size={16} />
            <CustomText style={[styles.actionText, { color: '#EF4444' }]}>{t('delete')}</CustomText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ flex: 1 }}>{t('myProducts')}</CustomText>
        <NotificationIcon style={{ marginRight: 12 }} />
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Plus color="white" size={20} />
          <CustomText style={[styles.addButtonText, { color: 'white' }]}>{t('add')}</CustomText>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={[styles.searchContainer, { backgroundColor: colors.glass, borderColor: colors.border }]}>
          <Search color={colors.muted} size={20} />
          <TextInput
            placeholder={t('searchProducts')}
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package color={colors.isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} size={64} />
              <CustomText style={styles.emptyText}>{t('noProductsFound')}</CustomText>
            </View>
          }
        />
      )}

      <AddProductModal 
        visible={isModalVisible} 
        onClose={handleCloseModal}
        onSubmit={handleAddProduct}
        isSubmitting={isSubmitting}
        initialData={editProduct}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderBottomWidth: 1,
  },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  addButton: { 
    marginLeft: 'auto', 
    paddingHorizontal: 24, 
    paddingVertical: 10, 
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 100,
    justifyContent: 'center'
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  searchSection: { padding: 16 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, paddingHorizontal: 16,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: 44, fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 100 },
  productCard: {
    borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: 'hidden'
  },
  productRow: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  productImageContainer: {
    width: 60, height: 60, borderRadius: 12, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)', position: 'relative'
  },
  productImage: {
    width: '100%', height: '100%', resizeMode: 'cover'
  },
  hotBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: '#EF4444', padding: 2, borderRadius: 4
  },
  productInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  productTitle: { fontSize: 14, fontWeight: 'bold' },
  productCategory: { fontSize: 11, marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: '900', marginTop: 2 },
  stockStatus: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 60 },
  stockValue: { fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  pubBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pubText: { fontSize: 8, fontWeight: 'bold', letterSpacing: 0.5 },
  actions: {
    flexDirection: 'row', borderTopWidth: 1, padding: 8, gap: 8
  },
  actionBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    gap: 6, paddingVertical: 8, borderRadius: 8 
  },
  actionText: { fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', height: 300 },
  emptyText: { marginTop: 16, fontSize: 14, fontWeight: '600' }
});

export default SellerProductsScreen;
