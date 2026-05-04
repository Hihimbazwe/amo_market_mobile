import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import CustomText from './CustomText';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, MapPin, Heart } from 'lucide-react-native';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';

const ProductCard = ({ product, onPress }) => {
  const { colors } = useTheme();
  const { isInWishlist, toggleWishlist, loading: wishlistLoading } = useWishlist();
  const isFavorite = isInWishlist(product.id);

  const handleToggleWishlist = (e) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const imageUrl = product.media && product.media.length > 0 
    ? product.media[0].url 
    : 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80';

  const location = product.district && product.province 
    ? `${product.district}, ${product.province}`
    : product.location || 'Unknown Location';

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.image}
          resizeMode="cover"
        />
        {product.isHotDeal && (
          <View style={styles.badge}>
            <LinearGradient
              colors={[colors.secondary, '#fb923c']}
              style={styles.badgeGradient}
            >
              <CustomText style={styles.badgeText}>HOT</CustomText>
            </LinearGradient>
          </View>
        )}
        {product.isAuthentic && (
          <View style={[styles.badge, { left: product.isHotDeal ? 45 : 8, backgroundColor: 'rgba(230, 126, 34, 0.9)' }]}>
            <View style={[styles.badgeGradient, { paddingHorizontal: 6 }]}>
              <CustomText style={[styles.badgeText, { fontSize: 8 }]}>AUTHENTIC</CustomText>
            </View>
          </View>
        )}
        <TouchableOpacity 
          style={styles.wishlistButton} 
          onPress={handleToggleWishlist}
          disabled={wishlistLoading}
          activeOpacity={0.7}
        >
          <Heart 
            size={20} 
            color={isFavorite ? colors.primary : colors.white} 
            fill={isFavorite ? colors.primary : 'transparent'} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.info}>
        <CustomText variant="subtitle" numberOfLines={2} style={styles.title}>
          {product.title || product.name}
        </CustomText>
        
        <View style={styles.priceRow}>
          <CustomText style={[styles.price, { color: colors.primary }]}>
             Rwf {(product.price || 0).toLocaleString()}
          </CustomText>
        </View>
 
        <View style={styles.locationRow}>
          <MapPin size={12} color={colors.muted} />
          <CustomText variant="caption" style={styles.location}>
            {location}
          </CustomText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '48%', // 2 columns with margin
    marginBottom: 16,
    borderWidth: 1,
  },
  imageContainer: {
    height: 150,
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  info: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    height: 40,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    marginLeft: 4,
    fontSize: 11,
  },
});

export default ProductCard;
