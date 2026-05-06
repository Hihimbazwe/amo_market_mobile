import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import CustomText from './CustomText';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, MapPin, Heart } from 'lucide-react-native';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';

const ProductCard = ({ product, onPress, hideBadge = false, style }) => {
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
    : product.location || 'Kigali, Rwanda';

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }, style]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.image}
          resizeMode="cover"
        />
        
        {/* Badges Stack */}
        <View style={styles.badgeContainer}>
          {product.isHotDeal && (
            <LinearGradient
              colors={['#ef4444', '#f59e0b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumBadge}
            >
              <CustomText style={styles.badgeText}>HOT</CustomText>
            </LinearGradient>
          )}

        </View>

        <TouchableOpacity 
          style={[styles.wishlistButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]} 
          onPress={handleToggleWishlist}
          disabled={wishlistLoading}
          activeOpacity={0.7}
        >
          <Heart 
            size={18} 
            color={isFavorite ? '#ef4444' : colors.white} 
            fill={isFavorite ? '#ef4444' : 'transparent'} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.info}>
        <CustomText numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
          {product.title || product.name}
        </CustomText>
        
        <View style={styles.priceRow}>
          <CustomText style={[styles.price, { color: colors.primary }]}>
             Rwf {(product.price || 0).toLocaleString()}
          </CustomText>
        </View>
 
        <View style={styles.locationRow}>
          <MapPin size={10} color={colors.muted} />
          <CustomText numberOfLines={1} style={[styles.location, { color: colors.muted }]}>
            {location}
          </CustomText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '48.5%',
    marginBottom: 16,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  imageContainer: {
    height: 160,
    width: '100%',
    backgroundColor: '#1e293b',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    gap: 4,
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  info: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.8,
  },
  location: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '500',
    flex: 1,
  },
});

export default ProductCard;
