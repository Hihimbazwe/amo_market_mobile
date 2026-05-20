import React, { useState, useEffect } from 'react';
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
  FlatList,
  ActivityIndicator,
  Platform
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
  Loader2,
  Flame,
  CreditCard,
  Store,
  ShoppingBag,
  Play,
  UserPlus,
  UserCheck
} from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import CustomText from '../components/CustomText';
import CustomInput from '../components/CustomInput';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { sellerService } from '../api/sellerService';
import { productService } from '../api/productService';
import { orderService } from '../api/orderService';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const VideoComponent = ({ url }) => {
  const player = useVideoPlayer(url, (player) => {
    player.loop = true;
    player.play();
    player.muted = true;
  });

  return (
    <VideoView
      player={player}
      style={{ width: width, height: 400 }}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
};

const ProductDetailScreen = ({ route, navigation }) => {
  const { product: routeProduct } = route.params || {};
  const { colors, isDarkMode } = useTheme();
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, loading: wishlistLoading } = useWishlist();
  const [addingToCart, setAddingToCart] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState(true);

  // Review form states
  const [eligibleOrderId, setEligibleOrderId] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const isFavorite = routeProduct?.id ? isInWishlist(routeProduct.id) : false;
  const media = routeProduct?.media || [];
  const hasImages = media.length > 0;

  const product = {
    id: routeProduct?.id,
    title: routeProduct?.title || routeProduct?.name || 'Product Details',
    price: routeProduct?.price || 0,
    isHotDeal: routeProduct?.isHotDeal || false,
    isDiscount: routeProduct?.isDiscount || false,
    discountPercent: routeProduct?.discountPercent || 0,
    location: routeProduct?.district && routeProduct?.province
      ? `${routeProduct.district}, ${routeProduct.province}`
      : routeProduct?.location || 'Unknown Location',
    description: routeProduct?.description || 'No description available.',
    specifications: [
      { label: 'Category', value: routeProduct?.category || 'General' },
      { label: 'Brand', value: routeProduct?.brand || 'Generic' },
      { label: 'Condition', value: routeProduct?.condition || 'New' },
      { label: 'Stock', value: routeProduct?.stock > 0 ? `${routeProduct.stock} units available` : 'Out of Stock' },
      ...(routeProduct?.weight ? [{ label: 'Weight', value: `${routeProduct.weight} kg` }] : []),
      ...(routeProduct?.deliveryOptions ? [{ label: 'Delivery', value: routeProduct.deliveryOptions }] : []),
      ...(routeProduct?.attributes?.length ? routeProduct.attributes.map(attr => ({ label: attr.name, value: attr.value })) : []),
    ],
    seller: {
      id: routeProduct?.sellerId || routeProduct?.seller?.id,
      userId: routeProduct?.seller?.userId || routeProduct?.sellerId,
      name: routeProduct?.seller?.user?.name || 'AMO Seller',
      rating: routeProduct?.seller?.rating || 4.8,
      reviewsCount: routeProduct?.seller?._count?.reviews || 12,
      isVerified: routeProduct?.seller?.kycVerified || false,
      image: routeProduct?.seller?.user?.image || null,
      response: routeProduct?.seller?.responseTime || '2h',
      sales: routeProduct?.seller?.salesCount || '1.2k+',
    }
  };

  useEffect(() => {
    const loadSocialData = async () => {
      if (!product.id) return;
      setLoadingSocial(true);
      try {
        const [revs, comms] = await Promise.all([
          productService.getReviews(product.id),
          productService.getComments(product.id)
        ]);
        setReviews(revs || []);
        setComments(comms || []);
      } catch (err) {
        console.log('[DEBUG] Error loading social data:', err);
      } finally {
        setLoadingSocial(false);
      }
    };
    loadSocialData();

    // Check review eligibility
    if (user?.id && product.id) {
      orderService.getOrders(user.id)
        .then(orders => {
          const eligible = orders.find(o =>
            o.status === 'COMPLETED' &&
            o.items?.some(i => i.productId === product.id)
          );
          if (eligible) setEligibleOrderId(eligible.id);
        })
        .catch(err => console.log('[DEBUG] Error checking review eligibility:', err));
    }
  }, [product.id, user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id && product.seller.id) {
        sellerService.getFollowStatus(user.id, product.seller.id)
          .then(data => setIsFollowing(data.isFollowing))
          .catch(err => console.log('[DEBUG] Follow status error:', err));
      }
    }, [user?.id, product.seller.id])
  );

  const handleFollow = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to follow sellers.");
      navigation.navigate('Login');
      return;
    }
    setFollowLoading(true);
    try {
      const action = isFollowing ? 'unfollow' : 'follow';
      await sellerService.toggleFollow(user.id, product.seller.id, action);
      setIsFollowing(!isFollowing);
    } catch (error) {
      Alert.alert("Error", "Failed to update follow status.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to leave a comment.");
      navigation.navigate('Login');
      return;
    }
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      await productService.postComment(user.id, product.id, commentText.trim());
      setCommentText('');
      const comms = await productService.getComments(product.id);
      setComments(comms || []);
    } catch (error) {
      Alert.alert("Error", "Failed to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePostReview = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to leave a review.");
      navigation.navigate('Login');
      return;
    }
    if (!userRating) {
      Alert.alert("Rating Required", "Please select a star rating before posting your review.");
      return;
    }
    if (!eligibleOrderId) return;

    setSubmittingReview(true);
    try {
      await productService.submitReview(product.id, user.id, {
        orderId: eligibleOrderId,
        rating: userRating,
        comment: reviewComment
      });
      setUserRating(0);
      setReviewComment('');
      setEligibleOrderId(null);

      const revs = await productService.getReviews(product.id);
      setReviews(revs || []);
      Alert.alert("Success", "Your review has been posted!");
    } catch (error) {
      console.log('[DEBUG] Error posting review:', error);
      Alert.alert("Error", "Failed to post review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCart = async () => {
    if (routeProduct?.variants && routeProduct.variants.length > 0) {
      const variantNames = [...new Set(routeProduct.variants.map(v => v.name))];
      const missing = variantNames.filter(name => !selectedVariants[name]);
      if (missing.length > 0) {
        Alert.alert("Selection Required", `Please select: ${missing.join(", ")}`);
        return;
      }
    }

    setAddingToCart(true);
    const success = await addToCart(product.id, qty, selectedVariants);
    setAddingToCart(false);
    if (success) {
      Alert.alert("Added to Cart", `${qty}x ${product.title} has been added to your cart.`);
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

  const handleChatWithSeller = () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to chat with sellers.");
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('ChatDetail', {
      conversation: {
        id: `new-${product.seller.userId || product.seller.id}`,
        otherUser: {
          id: product.seller.userId || product.seller.id,
          name: product.seller.name,
          image: product.seller.image
        }
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {hasImages ? (
            <View style={{ flex: 1 }}>
              {/* Main Preview */}
              <View style={styles.mainPreview}>
                {media[activeImageIndex].type?.toLowerCase() === 'video' || media[activeImageIndex].url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                  <VideoComponent url={media[activeImageIndex].url} />
                ) : (
                  <Image source={{ uri: media[activeImageIndex].url }} style={styles.carouselImage} resizeMode="cover" />
                )}
              </View>

              <View style={styles.badgeOverlay}>
                {product.isHotDeal && (
                  <View style={styles.hotBadge}>
                    <Flame size={12} color="#ffffff" />
                    <CustomText style={styles.hotBadgeText}>HOT SALE</CustomText>
                  </View>
                )}
                <View style={[styles.hotBadge, { backgroundColor: '#3b82f6', marginLeft: 8 }]}>
                  <CustomText style={styles.hotBadgeText}>BESTSELLER</CustomText>
                </View>
              </View>

              {/* Thumbnails moved to dark content section below */}
            </View>
          ) : (
            <View style={[styles.image, { backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' }]}>
              <ShoppingBag size={80} color={colors.muted} opacity={0.2} />
            </View>
          )}

          <SafeAreaView style={styles.headerOverlay}>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                <ArrowLeft color="#ffffff" size={24} />
              </TouchableOpacity>
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.iconButton} onPress={onShare}>
                  <Share2 color="#ffffff" size={24} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, { marginLeft: 12 }]}
                  onPress={() => product.id && toggleWishlist(product.id)}
                  disabled={wishlistLoading}
                >
                  <Heart color={isFavorite ? '#e67e22' : '#ffffff'} size={24} fill={isFavorite ? '#e67e22' : 'transparent'} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={[styles.content, { backgroundColor: colors.background }]}>

          {/* Thumbnail strip — lives in the dark panel, just above title */}
          {media.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailScroll}
              style={styles.thumbnailContainer}
            >
              {media.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.thumbnailItem,
                    activeImageIndex === i && { borderColor: colors.primary, borderWidth: 2.5 }
                  ]}
                  onPress={() => setActiveImageIndex(i)}
                >
                  {item.type?.toLowerCase() === 'video' || item.url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                    <View style={[styles.thumbnailImage, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
                      <Play size={16} color="#fff" fill="#fff" />
                    </View>
                  ) : (
                    <Image source={{ uri: item.url }} style={styles.thumbnailImage} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.titleSection}>
            <View style={{ flex: 1 }}>
              <CustomText variant="h1" style={styles.title}>{product.title}</CustomText>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                {product.seller.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck size={14} color="#4ade80" />
                    <CustomText style={styles.verifiedText}>Verified Seller</CustomText>
                  </View>
                )}
                {routeProduct?.isAuthentic && (
                  <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(96, 165, 250, 0.1)' }]}>
                    <ShieldCheck size={14} color="#60a5fa" />
                    <CustomText style={[styles.verifiedText, { color: '#60a5fa' }]}>Authentic Product</CustomText>
                  </View>
                )}
                {routeProduct?.allowTryOnDelivery && (
                  <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <ShieldCheck size={14} color="#3b82f6" />
                    <CustomText style={[styles.verifiedText, { color: '#3b82f6' }]}>Try-on Available</CustomText>
                  </View>
                )}
              </View>
            </View>
          </View>

          {(() => {
            const reviewCount = reviews.length > 0 ? reviews.length : (routeProduct?._count?.reviews || 0);
            const avgRating = reviews.length > 0
              ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
              : (routeProduct?.avgRating > 0 ? routeProduct.avgRating : 4.8);
            return (
              <View style={styles.ratingRow}>
                <View style={styles.stars}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} color="#FBBF24" fill={i < Math.round(avgRating) ? "#FBBF24" : "none"} />)}
                </View>
                <CustomText variant="caption" style={styles.ratingText}>
                  {avgRating.toFixed(1)} ⭐ ({reviewCount} verified reviews)
                </CustomText>
              </View>
            );
          })()}

          <View style={[styles.priceContainer, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              {(() => {
                const basePrice = product.price;
                const variantsPrice = Object.entries(selectedVariants).reduce((acc, [name, val]) => {
                  const variant = routeProduct?.variants?.find(v => v.name === name && v.value === val);
                  return acc + (variant?.price || 0);
                }, 0);
                const currentPrice = basePrice + variantsPrice;
                const finalPrice = currentPrice * qty;

                return (
                  <>
                    <CustomText variant="h1" style={{ color: colors.primary }}>Rwf {finalPrice.toLocaleString()}</CustomText>
                    {product.isDiscount && (
                      <CustomText style={[styles.originalPrice, { textDecorationLine: 'line-through' }]}>
                        Rwf {(basePrice * 1.2 * qty).toLocaleString()}
                      </CustomText>
                    )}
                  </>
                );
              })()}
            </View>
            <View style={styles.hotSaleRow}>
              <Flame size={12} color="#e67e22" />
              <CustomText variant="caption" style={{ color: '#e67e22', fontWeight: 'bold', marginLeft: 4 }}>
                HOT SALE · ENDS IN 2 DAYS
              </CustomText>
            </View>
          </View>

          <View style={[styles.sellerBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sellerAvatar, { backgroundColor: colors.primary + '20' }]}>
              {product.seller.image ? (
                <Image source={{ uri: product.seller.image }} style={styles.avatarImage} />
              ) : (
                <CustomText style={{ color: colors.primary, fontWeight: 'bold' }}>{product.seller.name[0]}</CustomText>
              )}
            </View>
            <View style={styles.sellerDetails}>
              <CustomText style={styles.sellerName}>{product.seller.name}</CustomText>
              <View style={styles.locationRow}>
                <MapPin size={12} color={colors.muted} />
                <CustomText variant="caption" style={styles.locationText}>{product.location}</CustomText>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.visitShopBtn, { borderColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6 }]}
                  onPress={() => navigation.navigate('SellerStore', { sellerId: product.seller.id, sellerName: product.seller.name })}
                >
                  <Store size={14} color={colors.primary} />
                  <CustomText style={[styles.visitShopText, { color: colors.primary, fontSize: 12 }]}>VISIT</CustomText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.visitShopBtn,
                    {
                      backgroundColor: isFollowing ? colors.primary + '15' : colors.primary,
                      borderColor: colors.primary,
                      paddingHorizontal: 12,
                      paddingVertical: 6
                    }
                  ]}
                  onPress={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? colors.primary : "#fff"} />
                  ) : (
                    <>
                      {isFollowing ? (
                        <UserCheck size={16} color={colors.primary} />
                      ) : (
                        <UserPlus size={16} color="#fff" />
                      )}
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            {[
              { label: 'Rating', value: product.seller.rating },
              { label: 'Sales', value: product.seller.sales },
              { label: 'Response', value: product.seller.response }
            ].map((stat, i) => (
              <View key={i} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <CustomText variant="h3" style={{ color: colors.primary }}>{stat.value}</CustomText>
                <CustomText style={styles.statLabel}>{stat.label}</CustomText>
              </View>
            ))}
          </View>

          {/* 
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }} style={{ marginTop: 20 }}>
            {[
              { icon: Truck, label: 'Free Delivery', desc: 'Available for Kigali orders' },
              { icon: ShieldCheck, label: '72h Return', desc: 'No questions asked' },
              { icon: Heart, label: 'Best Price', desc: 'Guaranteed in Rwanda' },
              { icon: Clock, label: 'Secure Pay', desc: '100% Buyer Protection' }
            ].map((badge, idx) => (
              <View key={idx} style={[styles.badgeItem, { backgroundColor: colors.card, borderColor: colors.border, width: width * 0.3 }]}>
                <badge.icon size={20} color={colors.primary} />
                <CustomText style={[styles.badgeLabel, { textAlign: 'center' }]} numberOfLines={1}>{badge.label}</CustomText>
                <CustomText style={[styles.badgeDesc, { textAlign: 'center' }]} numberOfLines={2}>{badge.desc}</CustomText>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.paymentSection, { backgroundColor: 'rgba(74, 222, 128, 0.05)', borderColor: 'rgba(74, 222, 128, 0.2)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <CreditCard size={16} color="#4ade80" />
              <CustomText style={{ color: '#4ade80', fontWeight: 'bold', marginLeft: 8 }}>WE ACCEPT</CustomText>
            </View>
            <View style={styles.paymentMethods}>
              {['MoMo', 'Airtel', 'Visa', 'Cash'].map(m => (
                <View key={m} style={styles.paymentMethod}>
                  <CustomText style={styles.paymentMethodText}>{m}</CustomText>
                </View>
              ))}
            </View>
            <CustomText variant="caption" style={{ marginTop: 8, color: colors.muted }}>
              ✓ protection for all orders
            </CustomText>
          </View>
          */}

          {routeProduct?.variants && routeProduct.variants.length > 0 && (
            <View style={styles.variantsSection}>
              {Object.entries(
                routeProduct.variants.reduce((acc, v) => {
                  if (!acc[v.name]) acc[v.name] = [];
                  acc[v.name].push(v);
                  return acc;
                }, {})
              ).map(([varName, vars]) => (
                <View key={varName} style={styles.variantGroup}>
                  <CustomText style={styles.variantLabel}>Select {varName}</CustomText>
                  <View style={styles.variantOptions}>
                    {vars.map((v) => (
                      <TouchableOpacity
                        key={v.value}
                        onPress={() => setSelectedVariants({ ...selectedVariants, [varName]: v.value })}
                        style={[
                          styles.variantOption,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          selectedVariants[varName] === v.value && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                          v.stock === 0 && { opacity: 0.3 }
                        ]}
                        disabled={v.stock === 0}
                      >
                        <CustomText style={[
                          styles.variantOptionText,
                          selectedVariants[varName] === v.value && { color: colors.primary }
                        ]}>
                          {v.value}
                        </CustomText>
                        {v.price > 0 && <CustomText style={styles.variantPrice}>+Rwf {v.price.toLocaleString()}</CustomText>}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionRow}>
            <View style={[styles.qtySelector, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
              style={[styles.cartBtn, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
              onPress={handleAddToCart}
              disabled={addingToCart}
            >
              {addingToCart ? <Loader2 color={colors.primary} size={24} /> : <ShoppingCart color={colors.primary} size={24} />}
              <CustomText style={[styles.cartBtnText, { color: colors.primary }]}>
                {addingToCart ? "Adding..." : "Add to Cart"}
              </CustomText>
            </TouchableOpacity>
          </View>

          <View style={[styles.tabsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.tabHeader}>
              {['Description', 'Specs', 'Reviews'].map((tab, idx) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(idx)}
                  style={[styles.tabItem, activeTab === idx && [styles.activeTabItem, { borderBottomColor: colors.primary }]]}
                >
                  <CustomText style={[styles.tabText, activeTab === idx && { color: colors.primary, fontWeight: 'bold' }]}>{tab}</CustomText>
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
              {activeTab === 2 && (
                <View>
                  {eligibleOrderId && (
                    <View style={[styles.reviewForm, { backgroundColor: colors.primary + '05', borderColor: colors.primary + '20' }]}>
                      <CustomText variant="h3" style={{ marginBottom: 12 }}>Leave a Review</CustomText>
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <TouchableOpacity key={s} onPress={() => setUserRating(s)}>
                            <Star
                              size={28}
                              color={s <= userRating ? "#FBBF24" : colors.muted}
                              fill={s <= userRating ? "#FBBF24" : "none"}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                      <CustomInput
                        placeholder="What did you like or dislike? Your feedback helps others."
                        value={reviewComment}
                        onChangeText={setReviewComment}
                        multiline
                        numberOfLines={3}
                        containerStyle={{ marginBottom: 16 }}
                      />
                      <TouchableOpacity
                        style={[styles.submitReviewBtn, { backgroundColor: colors.primary, opacity: submittingReview ? 0.7 : 1 }]}
                        onPress={handlePostReview}
                        disabled={submittingReview}
                      >
                        {submittingReview ? <ActivityIndicator size="small" color="white" /> : (
                          <>
                            <Star size={16} color="white" />
                            <CustomText style={{ color: 'white', fontWeight: 'bold', marginLeft: 8 }}>Post Review</CustomText>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {loadingSocial ? <ActivityIndicator color={colors.primary} /> : reviews.length > 0 ? (
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                        <CustomText style={{ fontSize: 40, fontWeight: '900', color: colors.text || '#fff' }}>
                          {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                        </CustomText>
                        <View>
                          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={16} color="#FBBF24" fill={i < Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) ? "#FBBF24" : "none"} />
                            ))}
                          </View>
                          <CustomText variant="caption">{reviews.length} verified review{reviews.length !== 1 ? 's' : ''}</CustomText>
                        </View>
                      </View>
                      {reviews.map((r, i) => (
                        <View key={i} style={styles.reviewItem}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <View style={styles.stars}>
                              {[...Array(5)].map((_, si) => <Star key={si} size={10} color="#FBBF24" fill={si < r.rating ? "#FBBF24" : "none"} />)}
                            </View>
                            <CustomText variant="caption" style={{ marginLeft: 8 }}>{new Date(r.createdAt).toLocaleDateString()}</CustomText>
                            <View style={styles.verifiedPurchaseBadge}>
                              <CustomText style={styles.verifiedPurchaseText}>Verified Purchase</CustomText>
                            </View>
                          </View>
                          {r.comment ? <CustomText style={{ fontSize: 13, color: colors.muted }}>{r.comment}</CustomText> : null}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', py: 20 }}>
                      <Star size={32} color={colors.muted} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <CustomText style={[styles.tabContent, { textAlign: 'center' }]}>
                        No reviews yet. {eligibleOrderId ? "Be the first to review!" : "Complete a purchase of this product to leave a review."}
                      </CustomText>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.buyNowBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (!user) {
              Alert.alert("Login Required", "Please login to place an order.");
              navigation.navigate('Login');
              return;
            }
            navigation.navigate('Checkout', {
              productId: product.id,
              qty,
              buyNowProduct: {
                id: product.id,
                title: product.title,
                price: product.price,
                media: routeProduct?.media || []
              }
            });
          }}
        >
          <CustomText style={styles.buyNowText}>BUY NOW</CustomText>
          <ChevronRight color="#fff" size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chatBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
          onPress={handleChatWithSeller}
        >
          <MessageCircle color={colors.primary} size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    height: 400,
    width: '100%',
  },
  mainPreview: {
    flex: 1,
  },
  carouselImage: {
    width: width,
    height: 400,
  },
  thumbnailContainer: {
    marginBottom: 20,
    marginTop: 4,
  },
  thumbnailScroll: {
    paddingHorizontal: 0,
    gap: 10,
  },
  thumbnailItem: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  thumbnailImage: {
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
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
    fontSize: 24,
    lineHeight: 30,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
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
    marginTop: 12,
  },
  stars: {
    flexDirection: 'row',
  },
  ratingText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  priceContainer: {
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  originalPrice: {
    fontSize: 14,
    color: '#94a3b8',
    marginLeft: 8,
  },
  hotSaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  sellerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
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
  visitShopBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visitShopText: {
    fontSize: 9,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 8,
  },
  badgeItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  badgeDesc: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 1,
  },
  paymentSection: {
    marginTop: 20,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethod: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderRadius: 8,
  },
  paymentMethodText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4ade80',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  qtyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  qtyValue: {
    minWidth: 40,
    alignItems: 'center',
  },
  cartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
  },
  cartBtnText: {
    marginLeft: 8,
    fontWeight: '700',
  },
  variantsSection: {
    marginTop: 24,
    gap: 16,
  },
  variantGroup: {
    gap: 8,
  },
  variantLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  variantOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  variantPrice: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  tabsContainer: {
    marginTop: 32,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  tabHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tabItem: {
    paddingBottom: 12,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {},
  tabText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  tabBody: {
    paddingTop: 16,
  },
  tabContent: {
    fontSize: 14,
    lineHeight: 22,
    color: '#94a3b8',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  specLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  specValue: {
    fontWeight: '600',
    fontSize: 13,
  },
  reviewItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  postCommentBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentItem: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
  },
  buyNowBtn: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buyNowText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  chatBtn: {
    width: 50,
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselItem: {
    width: width,
    height: 400,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
  },
  hotBadge: {
    backgroundColor: '#e67e22',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hotBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  pagination: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
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
    backgroundColor: '#fff',
  },
  reviewForm: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  submitReviewBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedPurchaseBadge: {
    marginLeft: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedPurchaseText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4ade80',
    textTransform: 'uppercase',
  },
});

export default ProductDetailScreen;
