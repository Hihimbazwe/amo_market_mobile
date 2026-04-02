import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  StatusBar,
  Dimensions,
  Share,
  Alert,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Share2, 
  Heart, 
  MapPin, 
  Star, 
  ShieldCheck, 
  MessageCircle,
  Phone,
  ShoppingCart,
  Truck,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react-native';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

const ProductDetailScreen = ({ route, navigation }) => {
  const { product: routeProduct } = route.params || {};
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { addToCart, loading: cartLoading } = useCart();
  const [addingToCart, setAddingToCart] = useState(false);
  
  const media = routeProduct?.media || [];
  const hasImages = media.length > 0;
  
  const product = {
    id: routeProduct?.id,
    title: routeProduct?.title || routeProduct?.name || 'Product Details',
    price: routeProduct?.price || 0,
    location: routeProduct?.district && routeProduct?.province 
      ? `${routeProduct.district}, ${routeProduct.province}` 
      : routeProduct?.location || 'Unknown Location',
    description: routeProduct?.description || 'No description available.',
    specifications: [
      { label: 'Category', value: routeProduct?.category || 'General' },
      { label: 'Condition', value: 'New' },
      { label: 'Availability', value: routeProduct?.stock > 0 ? 'In Stock' : 'Out of Stock' },
    ],
    seller: {
      name: routeProduct?.seller?.user?.name || 'AMO Seller',
      rating: routeProduct?.seller?.rating || 0,
      reviews: routeProduct?.seller?._count?.reviews || 0,
      isVerified: routeProduct?.seller?.kycVerified || false,
      image: routeProduct?.seller?.user?.image || null,
    }
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    const success = await addToCart(product.id, qty);
    setAddingToCart(false);
    if (success) {
      Alert.alert(
        "Added to Cart",
        `${qty}x ${product.title} has been added to your cart.`,
        [
          { text: "Continue Shopping", style: "cancel" },
          { text: "View Cart", onPress: () => navigation.navigate('Cart') }
        ]
      );
    }
  };

  const onShare = async () => {
    try {
      const shareUrl = media.length > 0 ? media[0].url : '';
      await Share.share({
        message: `Check out this ${product.title} on AMO MARKET! Rwf ${product.price.toLocaleString()}`,
        url: shareUrl,
      });
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  const renderMediaItem = ({ item }) => (
    <Image 
      source={{ uri: item.url }} 
      style={styles.carouselImage} 
      resizeMode="cover"
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel Header */}
        <View style={styles.imageContainer}>
          {hasImages ? (
            <>
              <FlatList
                data={media}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const offset = e.nativeEvent.contentOffset.x;
                  setActiveImageIndex(Math.round(offset / width));
                }}
                renderItem={renderMediaItem}
                keyExtractor={(item) => item.id}
              />
              {media.length > 1 && (
                <View style={styles.pagination}>
                  {media.map((_, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.paginationDot, 
                        activeImageIndex === i && styles.paginationDotActive
                      ]} 
                      />
                  ))}
                </View>
              )}
            </>
          ) : (
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80' }} 
              style={styles.image} 
            />
          )}
          
          <SafeAreaView style={styles.headerOverlay}>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                <ArrowLeft color={Colors.white} size={24} />
              </TouchableOpacity>
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.iconButton} onPress={onShare}>
                  <Share2 color={Colors.white} size={24} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconButton, { marginLeft: 12 }]}>
                  <Heart color={Colors.white} size={24} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <CustomText variant="h1" style={styles.title}>{product.title}</CustomText>
            {product.seller.isVerified && (
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={14} color="#4ade80" />
                <CustomText style={styles.verifiedText}>Verified</CustomText>
              </View>
            )}
          </View>

          <View style={styles.ratingRow}>
            <View style={styles.stars}>
               {[...Array(5)].map((_, i) => <Star key={i} size={14} color="#FBBF24" fill={i < Math.round(product.seller.rating) ? "#FBBF24" : "none"} />)}
            </View>
            <CustomText variant="caption" style={styles.ratingText}>
              {product.seller.rating || 0} ({product.seller.reviews} reviews)
            </CustomText>
          </View>

          <View style={styles.priceContainer}>
            <View style={styles.priceBox}>
              <CustomText variant="h1" style={styles.price}>Rwf {(product.price * qty).toLocaleString()}</CustomText>
              {qty > 1 && <CustomText variant="caption" style={styles.unitPrice}>Total Price</CustomText>}
            </View>
            <View style={styles.unitPriceBox}>
              <CustomText variant="caption">Unit Price: Rwf {product.price.toLocaleString()}</CustomText>
            </View>
          </View>

          {/* Seller Bar */}
          <View style={styles.sellerBar}>
            <View style={styles.sellerAvatar}>
              {product.seller.image ? (
                <Image source={{ uri: product.seller.image }} style={styles.avatarImage} />
              ) : (
                <CustomText style={styles.initials}>{product.seller.name[0]}</CustomText>
              )}
            </View>
            <View style={styles.sellerDetails}>
              <CustomText style={styles.sellerName}>{product.seller.name}</CustomText>
              <View style={styles.locationRow}>
                <MapPin size={12} color={Colors.muted} />
                <CustomText variant="caption" style={styles.locationText}>{product.location}</CustomText>
              </View>
            </View>
            <TouchableOpacity style={styles.viewMapButton}>
               <CustomText style={styles.viewMapText}>Map</CustomText>
            </TouchableOpacity>
          </View>

          {/* Trust Badges */}
          <View style={styles.badgesRow}>
            {[
              { icon: Truck, label: 'Delivery', desc: 'Real-time' },
              { icon: Clock, label: 'Protection', desc: '72h window' },
              { icon: ShieldCheck, label: 'Verified', desc: 'Certified' }
            ].map((badge, idx) => (
              <View key={idx} style={styles.badgeItem}>
                <badge.icon size={20} color={Colors.primary} />
                <CustomText style={styles.badgeLabel}>{badge.label}</CustomText>
                <CustomText style={styles.badgeDesc}>{badge.desc}</CustomText>
              </View>
            ))}
          </View>

          {/* Qty and Add to Cart Row */}
          <View style={styles.actionRow}>
            <View style={styles.qtySelector}>
              <TouchableOpacity onPress={() => setQty(Math.max(1, qty - 1))} style={styles.qtyBtn}>
                <CustomText variant="h3">−</CustomText>
              </TouchableOpacity>
              <View style={styles.qtyValue}>
                <CustomText variant="h3">{qty}</CustomText>
              </View>
              <TouchableOpacity onPress={() => setQty(qty + 1)} style={styles.qtyBtn}>
                <CustomText variant="h3">+</CustomText>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.cartBtn, addingToCart && { opacity: 0.7 }]} 
              onPress={handleAddToCart}
              disabled={addingToCart}
            >
              {addingToCart ? (
                <Loader2 color={Colors.primary} size={24} className="animate-spin" />
              ) : (
                <ShoppingCart color={Colors.primary} size={24} />
              )}
              <CustomText style={styles.cartBtnText}>
                {addingToCart ? "Adding..." : "Add to Cart"}
              </CustomText>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <View style={styles.tabHeader}>
              {['Description', 'Specs', 'Reviews'].map((tab, idx) => (
                <TouchableOpacity 
                  key={tab} 
                  onPress={() => setActiveTab(idx)}
                  style={[styles.tabItem, activeTab === idx && styles.activeTabItem]}
                >
                  <CustomText style={[styles.tabText, activeTab === idx && styles.activeTabText]}>{tab}</CustomText>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.tabBody}>
              {activeTab === 0 && <CustomText style={styles.tabContent}>{product.description}</CustomText>}
              {activeTab === 1 && (
                <View>
                  {product.specifications.map((spec, i) => (
                    <View key={i} style={styles.specRow}>
                      <CustomText style={styles.specLabel}>{spec.label}:</CustomText>
                      <CustomText style={styles.specValue}>{spec.value}</CustomText>
                    </View>
                  ))}
                </View>
              )}
              {activeTab === 2 && <CustomText style={styles.tabContent}>Customer reviews will appear here.</CustomText>}
            </View>
          </View>

          {/* Related Section (Static for now) */}
          <View style={styles.relatedSection}>
            <View style={styles.sectionHeader}>
              <CustomText variant="h2">🔥 You May Also Like</CustomText>
            </View>
            <CustomText variant="caption">Recommended products will appear here soon.</CustomText>
          </View>
          
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Buy Button Bar */}
      <View style={styles.bottomBar}>
         <CustomButton 
          title="Buy Now" 
          style={styles.buyButton}
          onPress={() => Alert.alert("Purchase", "Proceeding to checkout...")} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  imageContainer: {
    height: 380,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 24,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ade80',
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  stars: {
    flexDirection: 'row',
  },
  ratingText: {
    marginLeft: 8,
  },
  priceContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.1)',
  },
  price: {
    color: Colors.primary,
  },
  unitPrice: {
    marginTop: 4,
  },
  unitPriceBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
  },
  sellerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: Colors.primary,
    fontWeight: '800',
  },
  sellerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  sellerName: {
    fontWeight: '700',
    fontSize: 15,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    marginLeft: 4,
  },
  viewMapButton: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewMapText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  carouselImage: {
    width: width,
    height: 380,
  },
  pagination: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: Colors.white,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  badgeItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  badgeDesc: {
    fontSize: 9,
    color: Colors.muted,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  qtyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  qtyValue: {
    paddingHorizontal: 10,
    minWidth: 40,
    alignItems: 'center',
  },
  cartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  cartBtnText: {
    marginLeft: 8,
    fontWeight: '700',
    color: Colors.primary,
  },
  tabsContainer: {
    marginTop: 32,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 12,
  },
  tabItem: {
    paddingRight: 24,
  },
  activeTabItem: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    marginBottom: -14,
  },
  tabHeaderActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.muted,
  },
  activeTabText: {
    color: Colors.primary,
  },
  tabBody: {
    paddingTop: 20,
  },
  tabContent: {
    lineHeight: 22,
    color: Colors.muted,
  },
  specRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  specLabel: {
    fontWeight: '700',
    width: 100,
  },
  specValue: {
    color: Colors.muted,
  },
  relatedSection: {
    marginTop: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  relatedCard: {
    width: 140,
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  relatedImage: {
    width: '100%',
    height: 100,
  },
  relatedInfo: {
    padding: 10,
  },
  relatedTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  relatedPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 36,
    backgroundColor: '#080c14',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  buyButton: {
    width: '100%',
    paddingVertical: 18,
  },
});

export default ProductDetailScreen;
