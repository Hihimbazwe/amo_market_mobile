import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartService } from '../api/cartService';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!user?.id) {
      setCartItems([]);
      return;
    }
    setLoading(true);
    try {
      const items = await cartService.getCart(user.id);
      setCartItems(items);
    } catch (error) {
      console.error('Fetch cart error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1, selectedVariants = {}) => {
    if (!user?.id) {
      Alert.alert('Authentication Required', 'Please log in to add items to your cart.');
      return;
    }
    setLoading(true);
    try {
      await cartService.addToCart(user.id, productId, quantity, selectedVariants);
      await fetchCart();
      return true;
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add item to cart');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (!user?.id) return;
    try {
      await cartService.updateCartItem(user.id, productId, quantity);
      setCartItems(prev => prev.map(item => 
        item.productId === productId ? { ...item, quantity } : item
      ));
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update quantity');
      await fetchCart(); // Re-sync if local update fails
    }
  };

  const removeFromCart = async (productId) => {
    if (!user?.id) return;
    try {
      await cartService.removeFromCart(user.id, productId);
      setCartItems(prev => prev.filter(item => item.productId !== productId));
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to remove item');
      await fetchCart();
    }
  };

  const clearCart = async () => {
    if (!user?.id) return;
    try {
      await cartService.clearCart(user.id);
      setCartItems([]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to clear cart');
      await fetchCart();
    }
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      loading,
      cartCount,
      cartTotal,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      refreshCart: fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
