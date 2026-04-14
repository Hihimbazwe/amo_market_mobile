import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { wishlistService } from '../api/wishlistService';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchWishlist = useCallback(async () => {
    if (!user?.id) {
      setWishlistItems([]);
      return;
    }
    setLoading(true);
    try {
      const items = await wishlistService.getWishlist(user.id);
      setWishlistItems(items);
    } catch (error) {
      console.error('Fetch wishlist error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const toggleWishlist = async (productId) => {
    if (!user?.id) {
      Alert.alert('Authentication Required', 'Please log in to manage your wishlist.');
      return false;
    }
    
    // Optimistic update
    const isCurrentlyInWishlist = wishlistItems.some(item => item.productId === productId);
    if (isCurrentlyInWishlist) {
      setWishlistItems(prev => prev.filter(item => item.productId !== productId));
    } else {
      // We don't have the full product object here easily, but we'll re-fetch anyway
      // For now just show it as "loading" or wait for API
    }

    try {
      const result = await wishlistService.toggleWishlist(user.id, productId);
      const isNowInWishlist = !isCurrentlyInWishlist;
      
      const { ToastAndroid, Platform } = require('react-native');
      const message = isNowInWishlist ? 'Added to Wishlist' : 'Removed from Wishlist';
      
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        // Fallback or better UI feedback could be added here
        console.log(message);
      }

      await fetchWishlist(); 
      return result;
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update wishlist');
      await fetchWishlist(); // Re-sync if local update fails
      return false;
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!user?.id) return;
    
    // Optimistic update
    setWishlistItems(prev => prev.filter(item => item.productId !== productId));
    
    try {
      await wishlistService.removeFromWishlist(user.id, productId);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to remove from wishlist');
      await fetchWishlist();
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item.productId === productId);
  };

  return (
    <WishlistContext.Provider value={{
      wishlistItems,
      loading,
      toggleWishlist,
      removeFromWishlist,
      isInWishlist,
      refreshWishlist: fetchWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
