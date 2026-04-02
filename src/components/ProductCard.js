import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import CustomText from './CustomText';
import { Colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, MapPin } from 'lucide-react-native';

const ProductCard = ({ product, onPress }) => {
  const imageUrl = product.media && product.media.length > 0 
    ? product.media[0].url 
    : 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80';

  const location = product.district && product.province 
    ? `${product.district}, ${product.province}`
    : product.location || 'Unknown Location';

  return (
    <TouchableOpacity 
      style={styles.card} 
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
              colors={[Colors.secondary, '#fb923c']}
              style={styles.badgeGradient}
            >
              <CustomText style={styles.badgeText}>HOT</CustomText>
            </LinearGradient>
          </View>
        )}
      </View>
      
      <View style={styles.info}>
        <CustomText variant="subtitle" numberOfLines={2} style={styles.title}>
          {product.title || product.name}
        </CustomText>
        
        <View style={styles.priceRow}>
          <CustomText style={styles.price}>
             Rwf {(product.price || 0).toLocaleString()}
          </CustomText>
        </View>
 
        <View style={styles.locationRow}>
          <MapPin size={12} color={Colors.muted} />
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
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    width: '48%', // 2 columns with margin
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
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
    color: Colors.white,
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
    color: Colors.primary,
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
