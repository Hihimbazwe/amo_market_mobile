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
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ChevronLeft } from 'lucide-react-native';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { Colors as StaticColors } from '../theme/colors';

const CartScreen = ({ navigation }) => {
  const { cartItems, cartTotal, loading, updateQuantity, removeFromCart, clearCart } = useCart();
  const { colors, isDark } = useTheme();

  const handleRemoveItem = (productId) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeFromCart(productId) }
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
      <View style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
          
          <CustomText style={styles.categoryText}>{product.category}</CustomText>
          
          <View style={styles.itemFooter}>
            <CustomText style={[styles.priceText, { color: colors.primary }]}>
              Rwf {product.price.toLocaleString()}
            </CustomText>
            
            <View style={[styles.qtyControl, { backgroundColor: colors.glass }]}>
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
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <CustomText variant="h2" style={[styles.headerTitle, { color: colors.foreground }]}>My Cart</CustomText>
        {cartItems.length > 0 && (
          <TouchableOpacity onPress={() => {
            Alert.alert("Clear Cart", "Are you sure you want to remove all items?", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear All", style: "destructive", onPress: clearCart }
            ]);
          }}>
            <CustomText style={styles.clearText}>Clear All</CustomText>
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
            <CustomText variant="h2" style={[styles.title, { color: colors.foreground }]}>Your cart is empty</CustomText>
            <CustomText style={styles.subtitle}>
              Looks like you haven't added anything to your cart yet. 
              Browse our marketplace to find amazing products!
            </CustomText>
          </View>

          <CustomButton 
            title="Start Shopping"
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
          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <CustomText style={styles.summaryLabel}>Subtotal</CustomText>
              <CustomText style={[styles.summaryValue, { color: colors.foreground }]}>Rwf {cartTotal.toLocaleString()}</CustomText>
            </View>
            <View style={styles.summaryRow}>
              <CustomText style={styles.summaryLabel}>Delivery</CustomText>
              <CustomText style={styles.freeText}>Calculated at checkout</CustomText>
            </View>
            
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <View style={styles.totalRow}>
              <CustomText variant="h3" style={{ color: colors.foreground }}>Total</CustomText>
              <CustomText variant="h2" style={{ color: colors.primary }}>Rwf {cartTotal.toLocaleString()}</CustomText>
            </View>
            
            <CustomButton 
              title="Proceed to Checkout"
              style={styles.checkoutBtn}
              onPress={() => navigation.navigate('Checkout')}
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontWeight: '800',
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
    color: '#94A3B8',
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
    color: '#94A3B8',
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
    color: '#94A3B8',
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  freeText: {
    color: '#94A3B8',
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
