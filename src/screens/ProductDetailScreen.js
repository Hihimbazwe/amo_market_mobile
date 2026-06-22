import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
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
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  X,
  CheckCircle2,
  Check,
  ThumbsUp,
  MessageSquare,
  User,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import CustomText from '../components/CustomText';
import CustomInput from '../components/CustomInput';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { sellerService } from '../api/sellerService';
import { productService } from '../api/productService';
import { orderService } from '../api/orderService';
import { useFocusEffect } from '@react-navigation/native';
import { reviewService } from '../api/reviewService';
import { getPublicDisplayName } from '../utils/displayName';

const { width } = Dimensions.get('window');

const PAYMENT_METHODS = [
  { id: 'MOBILE_MONEY', aliases: ['MOBILE_MONEY', 'MTN_MOMO'], label: 'MoMo' },
  { id: 'AIRTEL_MONEY', aliases: ['AIRTEL_MONEY'], label: 'Airtel' },
  { id: 'CARD', aliases: ['CARD'], label: 'Card' },
  { id: 'CASH_ON_DELIVERY', aliases: ['CASH_ON_DELIVERY', 'CASH'], label: 'Cash' },
];

const normalizeAcceptedPayments = (methods) => {
  if (!Array.isArray(methods)) return [];
  return [...new Set(methods.map(method => method === 'MOBILE_MONEY' ? 'MTN_MOMO' : method))];
};

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
  const { product: initialRouteProduct } = route.params || {};
  const { colors, isDarkMode } = useTheme();
  const [routeProduct, setRouteProduct] = useState(initialRouteProduct);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, loading: wishlistLoading } = useWishlist();
  const [addingToCart, setAddingToCart] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState(true);
  const [helpfulVoted, setHelpfulVoted] = useState({});
  const [helpfulCounts, setHelpfulCounts] = useState({});

  // Related products states
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);

  // Review form states
  const [eligibleOrderId, setEligibleOrderId] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Seller reply states
  const [sellerReplyTarget, setSellerReplyTarget] = useState(null); // { id, existingReply }
  const [sellerReplyText, setSellerReplyText] = useState('');
  const [sellerReplyLoading, setSellerReplyLoading] = useState(false);

  // Edit review states
  const [editReviewTarget, setEditReviewTarget] = useState(null); // { id, rating, comment }
  const [editReviewRating, setEditReviewRating] = useState(0);
  const [editReviewComment, setEditReviewComment] = useState('');
  const [editReviewLoading, setEditReviewLoading] = useState(false);

  // Scam report modal states
  const [scamModalVisible, setScamModalVisible] = useState(false);
  const [scamReason, setScamReason] = useState('OTHER');
  const [scamComment, setScamComment] = useState('');
  const [scamAnonymous, setScamAnonymous] = useState(false);
  const [submittingScam, setSubmittingScam] = useState(false);
  const [scamReported, setScamReported] = useState(false);

  const isFavorite = routeProduct?.id ? isInWishlist(routeProduct.id) : false;
  const media = routeProduct?.media || [];
  const hasImages = media.length > 0;
  const [sellerPaymentMethods, setSellerPaymentMethods] = useState([]);
  const ownerAcceptedPayments = normalizeAcceptedPayments(
    sellerPaymentMethods.length > 0 ? sellerPaymentMethods : routeProduct?.seller?.acceptedPayments
  );

  useEffect(() => {
    let active = true;
    const loadLatestProduct = async () => {
      if (!initialRouteProduct?.id) return;
      try {
        const latest = await productService.getProductById(initialRouteProduct.id, user?.id);
        if (active && latest) setRouteProduct(latest);
      } catch (err) {
        console.log('[ProductDetail] Latest product load error:', err);
      }
    };
    loadLatestProduct();
    return () => { active = false; };
  }, [initialRouteProduct?.id, user?.id]);

  useEffect(() => {
    const loadSellerPaymentMethods = async () => {
      if (!product?.seller || !product?.seller?.id) return;
      try {
        const sellerData = await sellerService.getPublicProfile(product.seller.id);
        if (sellerData?.acceptedPayments) {
          setSellerPaymentMethods(sellerData.acceptedPayments);
        }
      } catch (err) {
        console.log('[ProductDetail] Failed to load seller payment methods:', err);
      }
    };
    loadSellerPaymentMethods();
  }, [routeProduct?.seller?.id || routeProduct?.sellerId]);

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
      { label: 'Origin', value: routeProduct?.isAuthentic ? "Verified Authentic" : "Standard Quality" },
      { label: 'Location', value: routeProduct?.district && routeProduct?.province ? `${routeProduct.district}, ${routeProduct.province}` : (routeProduct?.location || 'Unknown Location') },
      { label: 'Brand', value: routeProduct?.brand || 'Generic' },
      { label: 'Condition', value: routeProduct?.condition || 'New' },
      { label: 'Stock', value: routeProduct?.stock > 0 ? `${routeProduct.stock} units available` : 'Out of Stock' },
      ...(routeProduct?.weight ? [{ label: 'Weight', value: `${routeProduct.weight} kg` }] : []),
      ...((routeProduct?.length || routeProduct?.width || routeProduct?.height) ? [{ label: 'Dimensions', value: `${routeProduct?.length || 0}x${routeProduct?.width || 0}x${routeProduct?.height || 0} cm` }] : []),
      ...(routeProduct?.deliveryOptions ? [{ label: 'Delivery', value: routeProduct.deliveryOptions }] : []),
      ...(routeProduct?.attributes?.length ? routeProduct.attributes.map(attr => ({ label: attr.name, value: attr.value })) : []),
    ],
    seller: {
      id: routeProduct?.sellerId || routeProduct?.seller?.id,
      userId: routeProduct?.seller?.userId || routeProduct?.sellerId,
      name: routeProduct?.seller?.locationName || routeProduct?.seller?.storeName || routeProduct?.seller?.user?.name || 'AMO Seller',
      rating: routeProduct?.seller?.rating || 0,
      reviewsCount: routeProduct?.seller?._count?.reviews || 0,
      isVerified: routeProduct?.seller?.kycVerified || false,
      image: routeProduct?.seller?.user?.image || null,
      response: routeProduct?.seller?.responseTime || null,
      sales: routeProduct?.seller?.salesCount || null,
      acceptedPayments: ownerAcceptedPayments,
    }
  };
  const acceptedPaymentLabels = PAYMENT_METHODS
    .filter(method => method.aliases.some(alias => product.seller.acceptedPayments.includes(alias)))
    .map(method => method.label);

  useEffect(() => {
    const loadSocialData = async () => {
      if (!product.id) return;
      setLoadingSocial(true);
      try {
        const [revs, comms] = await Promise.all([
          reviewService.getProductReviews(product.id, user?.id),
          productService.getComments(product.id)
        ]);
        setReviews(revs || []);
        setComments(comms || []);

        // Initialize helpful counts
        if (revs && Array.isArray(revs)) {
          const counts = {};
          const voted = {};
          revs.forEach((r) => {
            counts[r.id] = r.helpfulVotes || r._count?.ReviewHelpfulVote || 0;
            if (r.helpfulVoted) voted[r.id] = true;
          });
          setHelpfulCounts((prev) => ({ ...counts, ...prev }));
          setHelpfulVoted((prev) => ({ ...voted, ...prev }));
        }
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

  useEffect(() => {
    let active = true;
    const fetchRelated = async () => {
      const category = routeProduct?.category;
      if (!category) {
        if (active) setRelatedLoading(false);
        return;
      }
      try {
        const data = await productService.getProducts({ category, limit: 10 });
        if (active) {
          const prods = data.products || data;
          const filtered = (Array.isArray(prods) ? prods : []).filter(p => p.id !== product.id);
          setRelatedProducts(filtered);
        }
      } catch (err) {
        console.log('[DEBUG] Error fetching related products:', err);
      } finally {
        if (active) setRelatedLoading(false);
      }
    };
    fetchRelated();
    return () => { active = false; };
  }, [routeProduct?.category, product.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id && product?.seller?.id) {
        sellerService.getFollowStatus(user.id, product.seller.id)
          .then(data => {
            setIsFollowing(data.isFollowing);
            if (data.followerCount !== undefined) {
              setFollowerCount(data.followerCount);
            }
          })
          .catch(err => console.log('[DEBUG] Follow status error:', err));
      }
    }, [user?.id, product?.seller?.id])
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
      const data = await sellerService.toggleFollow(user.id, product.seller.id, action);
      setIsFollowing(!isFollowing);
      if (data.followerCount !== undefined) {
        setFollowerCount(data.followerCount);
      }
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

  const SCAM_REASONS = [
    { value: 'FAKE_PRODUCT', label: 'Fake / Counterfeit Product' },
    { value: 'NEVER_DELIVERED', label: 'Never Delivered' },
    { value: 'WRONG_ITEM', label: 'Wrong Item Sent' },
    { value: 'SELLER_DISAPPEARED', label: 'Seller Disappeared' },
    { value: 'PRICE_FRAUD', label: 'Price Fraud' },
    { value: 'OTHER', label: 'Other' },
  ];

  const handleOpenScamReport = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to report a seller.');
      navigation.navigate('Login');
      return;
    }
    setScamReason('OTHER');
    setScamComment('');
    setScamAnonymous(false);
    setScamReported(false);
    setScamModalVisible(true);
  };

  const handleSubmitScamReport = async () => {
    if (scamComment.trim().length < 10) {
      Alert.alert('More Detail Needed', 'Please describe the issue in at least 10 characters.');
      return;
    }
    setSubmittingScam(true);
    try {
      await productService.reportSeller(user.id, product.id, {
        reason: scamReason,
        comment: scamComment.trim(),
        isAnonymous: scamAnonymous,
      });
      setScamReported(true);
    } catch (err) {
      const msg = err?.message || 'Failed to submit report.';
      Alert.alert('Report Failed', msg);
    } finally {
      setSubmittingScam(false);
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
      setShowReviewForm(false);

      const revs = await reviewService.getProductReviews(product.id, user?.id);
      setReviews(revs || []);
      Alert.alert("Success", "Your review has been posted!");
    } catch (error) {
      console.log('[DEBUG] Error posting review:', error);
      Alert.alert("Error", "Failed to post review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSellerReply = async () => {
    if (!sellerReplyText.trim()) {
      Alert.alert('Reply Required', 'Please type your reply before submitting.');
      return;
    }
    setSellerReplyLoading(true);
    try {
      await reviewService.replyToReview(user.id, sellerReplyTarget.id, sellerReplyText.trim());
      const revs = await reviewService.getProductReviews(product.id, user?.id);
      setReviews(revs || []);
      setSellerReplyTarget(null);
      setSellerReplyText('');
      Alert.alert('Reply Posted', 'Your reply has been posted successfully.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to post reply.');
    } finally {
      setSellerReplyLoading(false);
    }
  };

  const handleEditReview = async () => {
    if (!editReviewRating) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }
    setEditReviewLoading(true);
    try {
      await reviewService.editReview(user.id, editReviewTarget.id, {
        rating: editReviewRating,
        comment: editReviewComment,
      });
      const revs = await reviewService.getProductReviews(product.id, user?.id);
      setReviews(revs || []);
      setEditReviewTarget(null);
      Alert.alert('Updated', 'Your review has been updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update review.');
    } finally {
      setEditReviewLoading(false);
    }
  };

  const handleDeleteReview = (reviewId) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await reviewService.deleteReview(user.id, reviewId);
              const revs = await reviewService.getProductReviews(product.id, user?.id);
              setReviews(revs || []);
              Alert.alert('Deleted', 'Your review has been removed.');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete review.');
            }
          },
        },
      ]
    );
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
    const sellerId = product.seller.userId || product.seller.id;
    navigation.navigate('Messages', {
      screen: 'ChatDetail',
      params: {
        conversation: {
          id: `new-${sellerId}`,
          participantId: sellerId,
          participantName: product.seller.name,
          participantImage: product.seller.image || null,
          participantColor: '#e67e22',
          participantInitials: (product.seller.name || 'S').charAt(0).toUpperCase(),
          otherUser: {
            id: sellerId,
            name: product.seller.name,
            image: product.seller.image,
          },
          // Product context — rendered as a pinned reference card in the chat
          productContext: {
            id: product.id,
            title: product.title,
            price: product.price,
            image: media[0]?.url ||
              routeProduct?.image ||
              routeProduct?.imageUrl ||
              (routeProduct?.images && routeProduct.images.length > 0 ? routeProduct.images[0] : null) ||
              'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
            sellerName: product.seller.name,
            routeProduct: routeProduct,
          },
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
              : (routeProduct?.avgRating > 0 ? routeProduct.avgRating : 0);
            if (avgRating === 0 && reviewCount === 0) return null;
            return (
              <View style={styles.ratingRow}>
                <View style={styles.stars}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} color="#FBBF24" fill={i < Math.round(avgRating) ? "#FBBF24" : "none"} />)}
                </View>
                <CustomText variant="caption" style={styles.ratingText}>
                  {avgRating.toFixed(1)} ⭐ ({reviewCount} verified review{reviewCount !== 1 ? 's' : ''})
                </CustomText>
              </View>
            );
          })()}

          {/* Stock Status Badge */}
          <View style={{ marginBottom: 12 }}>
            {routeProduct?.stock === 0 ? (
              <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} color="#EF4444" />
                <CustomText style={{ color: '#EF4444', fontWeight: '600', fontSize: 12 }}>Out of Stock</CustomText>
              </View>
            ) : routeProduct?.stock && routeProduct.stock <= 5 ? (
              <View style={{ backgroundColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.2)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} color="#F97316" />
                <CustomText style={{ color: '#F97316', fontWeight: '600', fontSize: 12 }}>Only {routeProduct.stock} left in stock</CustomText>
              </View>
            ) : null}
          </View>

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
                <CustomText style={{ color: colors.primary, fontWeight: 'bold' }}>{(product.seller.name || 'S')[0]}</CustomText>
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

                {/* Report button moved to Reviews section */}
              </View>
            </View>
          </View>

          {(() => {
            const sellerRating = routeProduct?.seller?.rating || 0;
            const sellerSales = product.seller.sales ?? 0;
            const sellerResponse = product.seller.response;
            const stats = [
              sellerRating > 0 ? { label: 'Rating', value: sellerRating.toFixed(1) + ' ★', icon: Star } : null,
              { label: 'Sales', value: sellerSales, icon: ShoppingBag },
              sellerResponse ? { label: 'Response', value: sellerResponse, icon: Clock } : null,
            ].filter(Boolean);
            if (stats.length === 0) return null;
            return (
              <View style={styles.statsGrid}>
                {stats.map((stat, i) => {
                  const IconComponent = stat.icon;
                  return (
                    <View key={i} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <IconComponent size={16} color={colors.primary} style={{ marginBottom: 6 }} />
                      <CustomText variant="h3" style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>{stat.value}</CustomText>
                      <CustomText style={[styles.statLabel, { fontSize: 11 }]}>{stat.label}</CustomText>
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {acceptedPaymentLabels.length > 0 && (
            <View style={[styles.paymentSection, { backgroundColor: colors.primary + '06', borderColor: colors.primary + '20' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <CreditCard size={16} color={colors.primary} />
                <CustomText style={{ color: colors.primary, fontWeight: 'bold', marginLeft: 8, fontSize: 12 }}>PAYMENT METHODS</CustomText>
              </View>
              <View style={styles.paymentMethods}>
                {acceptedPaymentLabels.map(m => (
                  <View key={m} style={[styles.paymentMethod, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                    <CustomText style={[styles.paymentMethodText, { color: colors.foreground, fontSize: 11, fontWeight: '600' }]}>{m}</CustomText>
                  </View>
                ))}
              </View>
              <CustomText variant="caption" style={{ marginTop: 10, color: colors.muted, fontSize: 10 }}>
                ✓ 100% Buyer Protection on all orders
              </CustomText>
            </View>
          )}

          {/* Delivery Information Section
          <View style={[{ 
            backgroundColor: colors.card, 
            borderColor: colors.border, 
            borderWidth: 1,
            borderRadius: 14, 
            padding: 16,
            marginVertical: 12
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Truck size={16} color={colors.primary} />
              <CustomText style={{ color: colors.foreground, fontWeight: 'bold', marginLeft: 8, fontSize: 13 }}>DELIVERY</CustomText>
            </View>
            <CustomText style={{ color: colors.foreground, fontSize: 12, marginBottom: 6, fontWeight: '600' }}>🚚 Get it in 1–2 days (Kigali)</CustomText>
            <CustomText style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>✔ Free delivery for orders over RWF 25,000</CustomText>
            <View style={{ backgroundColor: colors.primary + '10', borderColor: colors.primary + '30', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
              <CustomText style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>💳 No hidden fees - Price you see is price you pay</CustomText>
            </View>
          </View> */}

          {/* Trust Badges Section */}
          <View style={{ marginVertical: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {/* Best Price Badge */}
              <View style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Heart size={16} color={colors.primary} style={{ marginBottom: 6 }} />
                <CustomText style={{ fontSize: 9, fontWeight: '700', color: colors.muted, textAlign: 'center', marginBottom: 4, textTransform: 'uppercase' }}>Best Price</CustomText>
                <CustomText style={{ fontSize: 10, fontWeight: '600', color: colors.foreground, textAlign: 'center' }}>Guaranteed in Rwanda</CustomText>
              </View>
              {/* Secure Pay Badge */}
              <View style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <ShieldCheck size={16} color={'#4ade80'} style={{ marginBottom: 6 }} />
                <CustomText style={{ fontSize: 9, fontWeight: '700', color: colors.muted, textAlign: 'center', marginBottom: 4, textTransform: 'uppercase' }}>Secure Pay</CustomText>
                <CustomText style={{ fontSize: 10, fontWeight: '600', color: colors.foreground, textAlign: 'center' }}>100% Buyer Protection</CustomText>
              </View>
            </View>
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
              ).map(([varName, vars]) => {
                const isColor = varName.toLowerCase().includes('color');
                return (
                  <View key={varName} style={styles.variantGroup}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <CustomText style={[styles.variantLabel, { marginBottom: 0 }]}>Select {varName}</CustomText>
                      {selectedVariants[varName] && (
                        <View style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <CustomText style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
                            {selectedVariants[varName]}
                          </CustomText>
                        </View>
                      )}
                    </View>
                    <View style={[styles.variantOptions, { gap: 10 }]}>
                      {vars.map((v) => {
                        const isSelected = selectedVariants[varName] === v.value;
                        const isOutOfStock = v.stock === 0;

                        return (
                          <TouchableOpacity
                            key={v.value}
                            onPress={() => setSelectedVariants({ ...selectedVariants, [varName]: v.value })}
                            style={[
                              isColor ? {
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                borderWidth: 2,
                                padding: 2,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderColor: isSelected ? colors.primary : colors.border,
                                backgroundColor: isSelected ? colors.primary + '10' : colors.card,
                              } : [
                                styles.variantOption,
                                { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 0 },
                                isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                              ],
                              isOutOfStock && { opacity: 0.3 }
                            ]}
                            disabled={isOutOfStock}
                          >
                            {isColor ? (
                              <View style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: 20,
                                backgroundColor: v.value.toLowerCase(),
                                borderWidth: v.value.toLowerCase() === 'white' ? 1 : 0,
                                borderColor: 'rgba(0,0,0,0.1)'
                              }} />
                            ) : (
                              <View style={{ alignItems: 'center' }}>
                                <CustomText style={[
                                  styles.variantOptionText,
                                  isSelected && { color: colors.primary }
                                ]}>
                                  {v.value}
                                </CustomText>
                                {v.price > 0 && <CustomText style={[styles.variantPrice, { marginTop: 2 }]}>+Rwf {v.price.toLocaleString()}</CustomText>}
                              </View>
                            )}

                            {isColor && isSelected && (
                              <View style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                width: 14,
                                height: 14,
                                borderRadius: 7,
                                backgroundColor: colors.primary,
                                borderWidth: 2,
                                borderColor: colors.background,
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Check size={8} color="#fff" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
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
            <TouchableOpacity
              style={[styles.messageBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleChatWithSeller}
            >
              <MessageCircle color={colors.primary} size={20} />
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
                  {/* ── Reviews Section Header: Post Review + Report buttons ── */}
                  <View style={{ marginBottom: 16 }}>
                    <CustomText style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 12 }}>Customer Reviews</CustomText>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {eligibleOrderId && (
                        <TouchableOpacity
                          style={[{
                            flexDirection: 'row', alignItems: 'center', gap: 5,
                            paddingHorizontal: 12, paddingVertical: 7,
                            borderRadius: 10, borderWidth: 1,
                            backgroundColor: showReviewForm ? colors.primary + '18' : colors.primary,
                            borderColor: showReviewForm ? colors.primary + '60' : colors.primary,
                          }]}
                          onPress={() => {
                            if (!user) {
                              Alert.alert('Login Required', 'Please login to leave a review.');
                              navigation.navigate('Login');
                              return;
                            }
                            setShowReviewForm(v => !v);
                          }}
                        >
                          <Star size={13} color={showReviewForm ? colors.primary : '#fff'} fill={showReviewForm ? colors.primary : '#fff'} />
                          <CustomText style={{ fontSize: 12, fontWeight: '700', color: showReviewForm ? colors.primary : '#fff' }}>
                            {showReviewForm ? 'Cancel' : 'Post Review'}
                          </CustomText>
                        </TouchableOpacity>
                      )}
                      {eligibleOrderId && (
                        <TouchableOpacity
                          style={[{
                            flexDirection: 'row', alignItems: 'center', gap: 5,
                            paddingHorizontal: 10, paddingVertical: 7,
                            borderRadius: 10, borderWidth: 1,
                            backgroundColor: 'rgba(239,68,68,0.06)',
                            borderColor: '#ef444440',
                          }]}
                          onPress={handleOpenScamReport}
                        >
                          <ShieldAlert size={13} color="#ef4444" />
                          <CustomText style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>Report</CustomText>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* ── Inline Review Form (toggled) ── */}
                  {eligibleOrderId && showReviewForm && (
                    <View style={[styles.reviewForm, { backgroundColor: colors.primary + '05', borderColor: colors.primary + '20', marginBottom: 20 }]}>
                      <CustomText variant="h3" style={{ marginBottom: 12 }}>Leave a Review</CustomText>
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <TouchableOpacity key={s} onPress={() => setUserRating(s)}>
                            <Star
                              size={28}
                              color={s <= userRating ? '#FBBF24' : colors.muted}
                              fill={s <= userRating ? '#FBBF24' : 'none'}
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

                  {/* ── Review list ── */}
                  {loadingSocial ? <ActivityIndicator color={colors.primary} /> : reviews.length > 0 ? (
                    <View>
                      {/* View All button */}
                      {reviews.length > 4 && (
                        <TouchableOpacity
                          onPress={() => navigation.navigate('Reviews', { productId: product.id, productName: product.title })}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 20,
                            backgroundColor: colors.primary + '10',
                            borderRadius: 12,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: colors.primary + '30',
                          }}
                        >
                          <CustomText style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                            View All {reviews.length} Reviews
                          </CustomText>
                        </TouchableOpacity>
                      )}

                      {reviews.slice(0, 4).map((r, i) => {
                        const isVoted = helpfulVoted[r.id];
                        const count = helpfulCounts[r.id] !== undefined ? helpfulCounts[r.id] : (r.helpfulVotes || 0);
                        const buyerName = getPublicDisplayName({ username: r.buyer?.username, name: r.buyer?.name });
                        // Seller can reply if the logged-in user's seller profile matches this product's seller
                        const isSeller = user?.id && user?.role === 'SELLER' &&
                          (routeProduct?.seller?.userId === user.id || routeProduct?.sellerId === user.id);

                        return (
                          <View key={i} style={[styles.reviewItem, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                                {r.buyer?.image ? (
                                  <Image source={{ uri: r.buyer.image }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                                ) : (
                                  <User color={colors.primary} size={14} />
                                )}
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <CustomText style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>
                                    {buyerName}
                                  </CustomText>
                                  <ShieldCheck color="#10B981" size={12} />
                                </View>
                                <CustomText style={{ color: colors.muted, fontSize: 10, marginTop: 1 }}>
                                  {new Date(r.createdAt).toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </CustomText>
                              </View>
                              <View style={{ flexDirection: 'row', gap: 2 }}>
                                {[...Array(5)].map((_, si) => <Star key={si} size={11} color={si < r.rating ? (r.rating >= 4 ? '#10B981' : r.rating === 3 ? '#F59E0B' : '#EF4444') : colors.muted} fill={si < r.rating ? (r.rating >= 4 ? '#10B981' : r.rating === 3 ? '#F59E0B' : '#EF4444') : 'none'} />)}
                              </View>
                            </View>

                            {r.comment ? (
                              <CustomText style={{ fontSize: 13, color: colors.foreground, lineHeight: 20, marginBottom: 10 }}>
                                {r.comment}
                              </CustomText>
                            ) : null}

                            {/* Seller reply thread */}
                            {r.reply && (
                              <View style={{ backgroundColor: colors.primary + '08', borderColor: colors.primary + '25', borderLeftWidth: 3, borderLeftColor: colors.primary, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                  <MessageSquare color={colors.primary} size={12} />
                                  <CustomText style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Seller Reply</CustomText>
                                </View>
                                <CustomText style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
                                  {r.reply}
                                </CustomText>
                              </View>
                            )}

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                              {/* Helpful vote button (buyers) */}
                              <TouchableOpacity
                                style={{
                                  flexDirection: 'row', alignItems: 'center', gap: 6,
                                  paddingHorizontal: 12, paddingVertical: 6,
                                  borderRadius: 10, borderWidth: 1,
                                  backgroundColor: isVoted ? colors.primary + '18' : colors.glass,
                                  borderColor: isVoted ? colors.primary + '40' : colors.border,
                                }}
                                onPress={async () => {
                                  if (!user?.id) {
                                    Alert.alert('Login Required', 'You must be logged in to vote.');
                                    return;
                                  }
                                  if (r.buyerId === user.id) {
                                    Alert.alert('Not Allowed', 'You cannot vote on your own review.');
                                    return;
                                  }
                                  // Optimistic toggle
                                  const newVoted = !isVoted;
                                  const newCount = newVoted ? count + 1 : Math.max(0, count - 1);
                                  setHelpfulVoted((prev) => ({ ...prev, [r.id]: newVoted }));
                                  setHelpfulCounts((prev) => ({ ...prev, [r.id]: newCount }));
                                  try {
                                    const res = await reviewService.markHelpful(user.id, r.id);
                                    // Sync with server response
                                    setHelpfulVoted((prev) => ({ ...prev, [r.id]: res.voted }));
                                    setHelpfulCounts((prev) => ({ ...prev, [r.id]: res.voted ? count + 1 : Math.max(0, count - 1) }));
                                  } catch (err) {
                                    // Rollback on error
                                    setHelpfulVoted((prev) => ({ ...prev, [r.id]: isVoted }));
                                    setHelpfulCounts((prev) => ({ ...prev, [r.id]: count }));
                                    Alert.alert('Error', err.message || 'Failed to vote');
                                  }
                                }}
                              >
                                <ThumbsUp size={12} color={isVoted ? colors.primary : colors.muted} fill={isVoted ? colors.primary : 'transparent'} />
                                <CustomText style={{ fontSize: 11, fontWeight: '600', color: isVoted ? colors.primary : colors.muted }}>
                                  {count > 0 ? `${count} Helpful` : 'Helpful'}
                                </CustomText>
                              </TouchableOpacity>

                              {/* Right-side action buttons */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {/* Edit / Delete — own review */}
                                {user?.id && r.buyerId === user.id && (
                                  <>
                                    <TouchableOpacity
                                      style={{
                                        padding: 6, borderRadius: 8, borderWidth: 1,
                                        backgroundColor: colors.glass,
                                        borderColor: colors.border,
                                      }}
                                      onPress={() => {
                                        setEditReviewTarget({ id: r.id });
                                        setEditReviewRating(r.rating);
                                        setEditReviewComment(r.comment || '');
                                      }}
                                    >
                                      <Pencil size={12} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={{
                                        padding: 6, borderRadius: 8, borderWidth: 1,
                                        backgroundColor: '#EF444415',
                                        borderColor: '#EF444430',
                                      }}
                                      onPress={() => handleDeleteReview(r.id)}
                                    >
                                      <Trash2 size={12} color="#EF4444" />
                                    </TouchableOpacity>
                                  </>
                                )}

                                {/* Seller reply button */}
                                {isSeller && (
                                  <TouchableOpacity
                                    style={{
                                      flexDirection: 'row', alignItems: 'center', gap: 5,
                                      paddingHorizontal: 10, paddingVertical: 6,
                                      borderRadius: 10, borderWidth: 1,
                                      backgroundColor: colors.primary + '10',
                                      borderColor: colors.primary + '30',
                                    }}
                                    onPress={() => {
                                      setSellerReplyTarget({ id: r.id, existingReply: r.reply || '' });
                                      setSellerReplyText(r.reply || '');
                                    }}
                                  >
                                    <MessageSquare size={12} color={colors.primary} />
                                    <CustomText style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                                      {r.reply ? 'Edit Reply' : 'Reply'}
                                    </CustomText>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <Star size={32} color={colors.muted} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <CustomText style={[styles.tabContent, { textAlign: 'center' }]}>
                        No reviews yet. {eligibleOrderId ? 'Be the first to review!' : 'Complete a purchase of this product to leave a review.'}
                      </CustomText>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* ─── Related Products Section ─── */}
          <View style={{ marginTop: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <CustomText style={{ fontSize: 18, fontWeight: '800' }}>You might also like</CustomText>
            </View>
            {relatedLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : relatedProducts.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {relatedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onPress={() => navigation.push('ProductDetail', { product: p })}
                    style={{ width: 160, marginBottom: 0 }}
                  />
                ))}
              </ScrollView>
            ) : (
              <CustomText style={{ color: colors.muted, fontStyle: 'italic', marginVertical: 10 }}>
                No related products found.
              </CustomText>
            )}
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* ─── Seller Reply Modal ─── */}
      <Modal
        visible={!!sellerReplyTarget}
        transparent
        animationType="fade"
        onRequestClose={() => { setSellerReplyTarget(null); setSellerReplyText(''); }}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modalSheet, { backgroundColor: colors.card, borderRadius: 24, paddingBottom: 24 }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <MessageSquare size={18} color={colors.primary} />
                  <CustomText style={[styles.modalTitle, { color: colors.foreground }]}>
                    {sellerReplyTarget?.existingReply ? 'Edit Reply' : 'Reply to Review'}
                  </CustomText>
                </View>
                <TouchableOpacity onPress={() => { setSellerReplyTarget(null); setSellerReplyText(''); }} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <CustomText style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
                Your reply is public and visible to all customers.
              </CustomText>
              <TextInput
                style={[{
                  borderRadius: 14, borderWidth: 1, padding: 14,
                  fontSize: 14, minHeight: 120, lineHeight: 20,
                  textAlignVertical: 'top',
                  backgroundColor: colors.glass,
                  color: colors.foreground,
                  borderColor: colors.border,
                  marginBottom: 16,
                }]}
                placeholder="Write your professional reply..."
                placeholderTextColor={colors.muted}
                value={sellerReplyText}
                onChangeText={setSellerReplyText}
                multiline
                textAlignVertical="top"
                scrollEnabled
              />
              <TouchableOpacity
                style={[{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  paddingVertical: 14, borderRadius: 14,
                  backgroundColor: colors.primary, opacity: sellerReplyLoading ? 0.7 : 1,
                }]}
                onPress={handleSellerReply}
                disabled={sellerReplyLoading || !sellerReplyText.trim()}
              >
                {sellerReplyLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MessageSquare size={16} color="white" />
                    <CustomText style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                      {sellerReplyTarget?.existingReply ? 'Update Reply' : 'Post Reply'}
                    </CustomText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Edit Review Modal ─── */}
      <Modal
        visible={editReviewTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditReviewTarget(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modalSheet, { backgroundColor: colors.card, borderRadius: 24, paddingBottom: 24 }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <Pencil size={18} color={colors.primary} />
                  <CustomText style={[styles.modalTitle, { color: colors.foreground }]}>
                    Edit Review
                  </CustomText>
                </View>
                <TouchableOpacity onPress={() => setEditReviewTarget(null)} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>

              {/* Star Rating Selection */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 12 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setEditReviewRating(s)}>
                    <Star
                      size={32}
                      color={s <= editReviewRating ? '#FBBF24' : colors.muted}
                      fill={s <= editReviewRating ? '#FBBF24' : 'none'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Comment Input */}
              <TextInput
                style={[{
                  borderRadius: 14, borderWidth: 1, padding: 14,
                  fontSize: 14, minHeight: 120, lineHeight: 20,
                  textAlignVertical: 'top',
                  backgroundColor: colors.glass,
                  color: colors.foreground,
                  borderColor: colors.border,
                  marginBottom: 16,
                }]}
                placeholder="What did you like or dislike?"
                placeholderTextColor={colors.muted}
                value={editReviewComment}
                onChangeText={setEditReviewComment}
                multiline
                textAlignVertical="top"
                scrollEnabled
              />

              <TouchableOpacity
                style={[{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  paddingVertical: 14, borderRadius: 14,
                  backgroundColor: colors.primary, opacity: editReviewLoading ? 0.7 : 1,
                }]}
                onPress={handleEditReview}
                disabled={editReviewLoading}
              >
                {editReviewLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Star size={16} color="white" />
                    <CustomText style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                      Update Review
                    </CustomText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>


      {/* ─── Scam Report Modal ─── */}
      <Modal
        visible={scamModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setScamModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <ShieldAlert size={20} color="#ef4444" />
                <CustomText style={styles.modalTitle}>Report Seller as Scam</CustomText>
              </View>
              <TouchableOpacity onPress={() => setScamModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {scamReported ? (
              /* ─── Success state ─── */
              <View style={styles.successContainer}>
                <CheckCircle2 size={56} color="#4ade80" />
                <CustomText style={styles.successTitle}>Report Submitted</CustomText>
                <CustomText style={[styles.successSubtitle, { color: colors.muted }]}>
                  Thank you. Our safety team will review this report and take action promptly.
                </CustomText>
                <TouchableOpacity
                  style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setScamModalVisible(false)}
                >
                  <CustomText style={styles.doneBtnText}>Done</CustomText>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Warning */}
                <View style={[styles.warningBanner, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: '#ef444430' }]}>
                  <AlertTriangle size={14} color="#ef4444" />
                  <CustomText style={[styles.warningText, { color: '#ef4444' }]}>
                    False reports are taken seriously and may result in account restrictions.
                  </CustomText>
                </View>

                {/* Reason picker */}
                <CustomText style={[styles.fieldLabel, { color: colors.muted }]}>SELECT REASON</CustomText>
                <View style={styles.reasonGrid}>
                  {SCAM_REASONS.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[
                        styles.reasonPill,
                        {
                          borderColor: scamReason === r.value ? '#ef4444' : colors.border,
                          backgroundColor: scamReason === r.value ? 'rgba(239,68,68,0.12)' : colors.background
                        }
                      ]}
                      onPress={() => setScamReason(r.value)}
                    >
                      <CustomText style={[
                        styles.reasonPillText,
                        { color: scamReason === r.value ? '#ef4444' : colors.muted }
                      ]}>
                        {r.label}
                      </CustomText>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Description */}
                <CustomText style={[styles.fieldLabel, { color: colors.muted }]}>DESCRIPTION *</CustomText>
                <View style={{ height: 120, width: '100%', marginBottom: 20 }}>
                  <TextInput
                    style={[
                      styles.scamTextInput,
                      {
                        color: colors.text || colors.foreground,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        flex: 1,
                        marginBottom: 0
                      }
                    ]}
                    placeholder="Describe the issue in detail (min 10 characters)…"
                    placeholderTextColor={colors.muted}
                    value={scamComment}
                    onChangeText={setScamComment}
                    multiline
                    scrollEnabled={true}
                    nestedScrollEnabled={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Anonymous toggle */}
                <View style={styles.anonymousRow}>
                  <View style={{ flex: 1 }}>
                    <CustomText style={{ fontWeight: '600', fontSize: 13 }}>Report Anonymously</CustomText>
                    <CustomText style={[{ fontSize: 11, marginTop: 2 }, { color: colors.muted }]}>
                      Your identity will not be shared with the seller
                    </CustomText>
                  </View>
                  <Switch
                    value={scamAnonymous}
                    onValueChange={setScamAnonymous}
                    trackColor={{ false: colors.border, true: '#ef444480' }}
                    thumbColor={scamAnonymous ? '#ef4444' : colors.muted}
                  />
                </View>

                {/* Submit */}
                <TouchableOpacity
                  style={[
                    styles.submitScamBtn,
                    { backgroundColor: '#ef4444', opacity: submittingScam ? 0.7 : 1 }
                  ]}
                  onPress={handleSubmitScamReport}
                  disabled={submittingScam}
                >
                  {submittingScam ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <ShieldAlert size={16} color="#fff" />
                      <CustomText style={styles.submitScamBtnText}>Submit Report</CustomText>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
  messageBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
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

  // ── Report Scam Button ──
  reportScamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 4,
  },
  reportScamBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },

  // ── Scam Report Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ef4444',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 10,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  reasonPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  reasonPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scamTextInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 13,
    minHeight: 100,
    marginBottom: 20,
  },
  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  submitScamBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  submitScamBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4ade80',
    marginTop: 8,
  },
  successSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  doneBtn: {
    marginTop: 16,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});

export default ProductDetailScreen;
