import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ChevronLeft, CheckSquare, Square } from 'lucide-react-native';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Colors as StaticColors } from '../theme/colors';
import {Text} from 'react-native';
const CartScreen = ({ navigation }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { cartItems, cartTotal, loading, updateQuantity, removeFromCart, clearCart } = useCart();
  const { colors, isDarkMode } = useTheme();

  const [selectedItemIds, setSelectedItemIds] = useState([]);

  // Initialize selected items with all cart items when loaded
  React.useEffect(() => {
    if (cartItems.length > 0 && selectedItemIds.length === 0) {
      setSelectedItemIds(cartItems.map(item => item.id));
    }
  }, [cartItems]);

  const toggleSelection = (itemId) => {
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(selectedItemIds.filter(id => id !== itemId));
    } else {
      setSelectedItemIds([...selectedItemIds, itemId]);
    }
  };

  const selectedCartTotal = React.useMemo(() => {
    return cartItems
      .filter(item => selectedItemIds.includes(item.id))
      .reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }, [cartItems, selectedItemIds]);

  const handleCheckout = () => {
    if (selectedItemIds.length === 0) {
      Alert.alert(t('noItemsSelected'), t('selectItemToCheckout'));
      return;
    }
    navigation.navigate('Checkout', { selectedItemIds });
  };

  const handleRemoveItem = (productId) => {
    Alert.alert(
      t('removeCartItem'),
      t('removeCartItemConfirm'),
      [
        { text: t('cancel'), style: "cancel" },
        { text: t('delete'), style: "destructive", onPress: () => removeFromCart(productId) }
      ]
    );
  };

  const handleUpdateQty = (productId, currentQty, delta) => {
    const newQty = currentQty + delta;
    if (newQty < 1) {
      handleRemoveItem(productId);
    } else {
      updateQuantity(productId, newQty);
    }
  };

  const renderCartItem = ({ item }) => {
    const product = item.product;
    const imageUrl = product.media?.[0]?.url || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=200&q=80';

    return (
      <View style={[styles.cartItem, { backgroundColor: colors.glass, borderColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => toggleSelection(item.id)}
        >
          {selectedItemIds.includes(item.id) ? (
            <CheckSquare size={24} color={colors.primary} />
          ) : (
            <Square size={24} color={colors.muted} />
          )}
        </TouchableOpacity>
        
        <Image source={{ uri: imageUrl }} style={styles.productImage} />
        
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <CustomText style={[styles.productTitle, { color: colors.foreground }]} numberOfLines={1}>
              {product.title}
            </CustomText>
            <TouchableOpacity onPress={() => handleRemoveItem(product.id)} style={styles.removeBtn}>
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
          
          <CustomText style={[styles.categoryText, { color: colors.muted }]}>{product.category ? t(product.category.toLowerCase()) : ''}</CustomText>
          
          <View style={styles.itemFooter}>
            <CustomText style={[styles.priceText, { color: colors.primary }]}>
              Rwf {product.price.toLocaleString()}
            </CustomText>
            
            <View style={[styles.qtyControl, { backgroundColor: colors.glass, borderColor: colors.border, borderWidth: 1 }]}>
              <TouchableOpacity 
                style={styles.qtyBtn} 
                onPress={() => handleUpdateQty(product.id, item.quantity, -1)}
              >
                <Minus size={14} color={colors.foreground} />
              </TouchableOpacity>
              <CustomText style={[styles.qtyText, { color: colors.foreground }]}>{item.quantity}</CustomText>
              <TouchableOpacity 
                style={styles.qtyBtn} 
                onPress={() => handleUpdateQty(product.id, item.quantity, 1)}
              >
                <Plus size={14} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading && cartItems.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <CustomText style={{ marginTop: 12, color: colors.muted }}>{t('loading')}...</CustomText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.glass }]}>
            <ChevronLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <CustomText variant="h2" style={[styles.headerTitle, { color: colors.foreground }]}>{t('myCart')}</CustomText>
        </View>
        {cartItems.length > 0 && (
          <TouchableOpacity onPress={() => {
            Alert.alert(t('clearCart'), t('clearCartConfirm'), [
              { text: t('cancel'), style: "cancel" },
              { text: t('clearAll'), style: "destructive", onPress: clearCart }
            ]);
          }}>
            <CustomText style={styles.clearText}>{t('clearAll')}</CustomText>
          </TouchableOpacity>
        )}
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.iconWrapper}>
            <View style={[styles.iconGlow, { backgroundColor: colors.primary + '1A' }]} />
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '33' }]}>
              <ShoppingBag size={48} color={colors.primary} strokeWidth={1.5} />
            </View>
          </View>

          <View style={styles.textContainer}>
            <CustomText variant="h2" style={[styles.title, { color: colors.foreground }]}>{t('cartEmpty')}</CustomText>
            <CustomText style={[styles.subtitle, { color: colors.muted }]}>
              {t('cartEmptySubtitle')}
            </CustomText>
          </View>

          <CustomButton 
            title={t('startShopping')}
            style={styles.button}
            onPress={() => navigation.navigate('Home')}
          >
            <ArrowRight size={18} color="#FFF" style={{ marginLeft: 8 }} />
          </CustomButton>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          
          {/* Summary Section */}
          <View style={[styles.summaryBox, { backgroundColor: colors.glass, borderTopColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <CustomText style={[styles.summaryLabel, { color: colors.muted }]}>{t('subtotal')} ({selectedItemIds.length} items)</CustomText>
              <CustomText style={[styles.summaryValue, { color: colors.foreground }]}>Rwf {selectedCartTotal.toLocaleString()}</CustomText>
            </View>
            <View style={styles.summaryRow}>
              <CustomText style={[styles.summaryLabel, { color: colors.muted }]}>{t('delivery')}</CustomText>
              <CustomText style={[styles.freeText, { color: colors.muted }]}>{t('calculatedAtCheckout')}</CustomText>
            </View>
            
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <View style={styles.totalRow}>
              <CustomText variant="h3" style={{ color: colors.foreground }}>{t('total')}</CustomText>
              <CustomText variant="h2" style={{ color: colors.primary }}>Rwf {selectedCartTotal.toLocaleString()}</CustomText>
            </View>
            
            <CustomButton 
              title={t('proceedToCheckout')}
              style={styles.checkoutBtn}
              onPress={handleCheckout}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontWeight: '800',
    marginLeft: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
  },
  clearText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  iconGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '800',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
  },
  button: {
    width: '100%',
    paddingHorizontal: 32,
  },
  listContent: {
    padding: 24,
    paddingBottom: 40,
  },
  cartItem: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 12,
    padding: 4,
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  removeBtn: {
    padding: 4,
  },
  categoryText: {
    fontSize: 12,
    marginTop: -4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  summaryBox: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  freeText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkoutBtn: {
    width: '100%',
  },
});

export default CartScreen;
