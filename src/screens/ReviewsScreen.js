import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  MessageSquare,
  ThumbsUp,
  Pencil,
  Trash2,
  User,
} from 'lucide-react-native';
import CustomText from '../components/CustomText';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { reviewService } from '../api/reviewService';

const ReviewsScreen = ({ route, navigation }) => {
  const { productId, productName } = route.params || {};
  const { colors } = useTheme();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [helpfulVoted, setHelpfulVoted] = useState({});
  const [helpfulCounts, setHelpfulCounts] = useState({});

  useEffect(() => {
    loadReviews();
  }, [productId, user?.id]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const revs = await reviewService.getProductReviews(productId, user?.id);
      setReviews(revs || []);
      
      // Initialize helpful counts
      const initialCounts = {};
      const initialVoted = {};
      revs.forEach(r => {
        initialCounts[r.id] = r.helpfulVotes || 0;
        initialVoted[r.id] = r.votedHelpful || false;
      });
      setHelpfulCounts(initialCounts);
      setHelpfulVoted(initialVoted);
    } catch (error) {
      console.error('Error loading reviews:', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkHelpful = async (reviewId) => {
    if (!user?.id) {
      Alert.alert('Login Required', 'You must be logged in to vote.');
      return;
    }

    const review = reviews.find(r => r.id === reviewId);
    if (review?.buyerId === user.id) {
      Alert.alert('Not Allowed', 'You cannot vote on your own review.');
      return;
    }

    const isVoted = helpfulVoted[reviewId];
    const count = helpfulCounts[reviewId] || 0;
    const newVoted = !isVoted;
    const newCount = newVoted ? count + 1 : Math.max(0, count - 1);

    // Optimistic update
    setHelpfulVoted(prev => ({ ...prev, [reviewId]: newVoted }));
    setHelpfulCounts(prev => ({ ...prev, [reviewId]: newCount }));

    try {
      const res = await reviewService.markHelpful(user.id, reviewId);
      setHelpfulVoted(prev => ({ ...prev, [reviewId]: res.voted }));
      setHelpfulCounts(prev => ({ ...prev, [reviewId]: res.voted ? count + 1 : Math.max(0, count - 1) }));
    } catch (err) {
      // Rollback on error
      setHelpfulVoted(prev => ({ ...prev, [reviewId]: isVoted }));
      setHelpfulCounts(prev => ({ ...prev, [reviewId]: count }));
      Alert.alert('Error', err.message || 'Failed to vote');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await reviewService.deleteReview(user.id, reviewId);
              await loadReviews();
              Alert.alert('Deleted', 'Your review has been removed.');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete review.');
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, si) => (
      <Star
        key={si}
        size={14}
        color={si < rating ? (rating >= 4 ? '#10B981' : rating === 3 ? '#F59E0B' : '#EF4444') : colors.muted}
        fill={si < rating ? (rating >= 4 ? '#10B981' : rating === 3 ? '#F59E0B' : '#EF4444') : 'none'}
      />
    ));
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return '#10B981';
    if (rating === 3) return '#F59E0B';
    return '#EF4444';
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <CustomText style={[styles.headerTitle, { color: colors.foreground }]}>
            Reviews
          </CustomText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <CustomText style={[styles.headerTitle, { color: colors.foreground }]}>
          Reviews
        </CustomText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Info */}
        <View style={[styles.productInfo, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <CustomText style={[styles.productName, { color: colors.foreground }]} numberOfLines={2}>
            {productName || 'Product'}
          </CustomText>
          <View style={styles.ratingSummary}>
            <View style={[styles.ratingBox, { backgroundColor: getRatingColor(parseFloat(avgRating)) + '15' }]}>
              <CustomText style={[styles.avgRating, { color: getRatingColor(parseFloat(avgRating)) }]}>
                {avgRating}
              </CustomText>
              <Star size={16} color={getRatingColor(parseFloat(avgRating))} fill={getRatingColor(parseFloat(avgRating))} />
            </View>
            <View style={styles.ratingDetails}>
              <CustomText style={[styles.totalReviews, { color: colors.foreground }]}>
                {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
              </CustomText>
              <CustomText style={[styles.ratingLabel, { color: colors.muted }]}>
                Average rating
              </CustomText>
            </View>
          </View>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsContainer}>
          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Star size={48} color={colors.muted} style={{ opacity: 0.3 }} />
              <CustomText style={[styles.emptyText, { color: colors.muted }]}>
                No reviews yet
              </CustomText>
            </View>
          ) : (
            reviews.map((review, index) => {
              const isVoted = helpfulVoted[review.id];
              const count = helpfulCounts[review.id] || 0;
              const buyerName = review.buyer?.name || 'Anonymous';
              const isOwnReview = user?.id && review.buyerId === user.id;

              return (
                <View key={review.id} style={[styles.reviewContainer, { borderBottomColor: colors.border }]}>
                  {/* Review Header */}
                  <View style={styles.reviewHeader}>
                    <View style={styles.userInfo}>
                      <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                        {review.buyer?.image ? (
                          <Image source={{ uri: review.buyer.image }} style={styles.avatarImage} />
                        ) : (
                          <User color={colors.primary} size={16} />
                        )}
                      </View>
                      <View style={styles.userDetails}>
                        <View style={styles.userNameRow}>
                          <CustomText style={[styles.userName, { color: colors.foreground }]}>
                            {buyerName}
                          </CustomText>
                          <ShieldCheck color="#10B981" size={12} />
                        </View>
                        <CustomText style={[styles.reviewDate, { color: colors.muted }]}>
                          {new Date(review.createdAt).toLocaleDateString('en-RW', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </CustomText>
                      </View>
                    </View>
                    <View style={styles.starsContainer}>
                      {renderStars(review.rating)}
                    </View>
                  </View>

                  {/* Review Comment */}
                  {review.comment && (
                    <CustomText style={[styles.reviewComment, { color: colors.foreground }]}>
                      {review.comment}
                    </CustomText>
                  )}

                  {/* Seller Reply */}
                  {review.reply && (
                    <View style={[styles.sellerReply, { backgroundColor: colors.primary + '08', borderLeftColor: colors.primary }]}>
                      <View style={styles.replyHeader}>
                        <MessageSquare color={colors.primary} size={12} />
                        <CustomText style={[styles.replyLabel, { color: colors.primary }]}>
                          Seller Reply
                        </CustomText>
                      </View>
                      <CustomText style={[styles.replyText, { color: colors.foreground }]}>
                        {review.reply}
                      </CustomText>
                    </View>
                  )}

                  {/* Review Actions */}
                  <View style={styles.reviewActions}>
                    <TouchableOpacity
                      style={[
                        styles.helpfulButton,
                        {
                          backgroundColor: isVoted ? colors.primary + '15' : 'transparent',
                          borderColor: isVoted ? colors.primary + '40' : colors.border,
                        },
                      ]}
                      onPress={() => handleMarkHelpful(review.id)}
                    >
                      <ThumbsUp
                        size={14}
                        color={isVoted ? colors.primary : colors.muted}
                        fill={isVoted ? colors.primary : 'transparent'}
                      />
                      <CustomText
                        style={[
                          styles.helpfulText,
                          { color: isVoted ? colors.primary : colors.muted },
                        ]}
                      >
                        {count > 0 ? `${count} Helpful` : 'Helpful'}
                      </CustomText>
                    </TouchableOpacity>

                    {isOwnReview && (
                      <View style={styles.ownReviewActions}>
                        <TouchableOpacity
                          style={[styles.iconButton, { borderColor: colors.border }]}
                          onPress={() => {
                            Alert.alert('Edit Review', 'Edit functionality coming soon');
                          }}
                        >
                          <Pencil size={14} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.iconButton, { borderColor: '#EF444430' }]}
                          onPress={() => handleDeleteReview(review.id)}
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  productInfo: {
    padding: 20,
    borderBottomWidth: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  avgRating: {
    fontSize: 24,
    fontWeight: '700',
  },
  ratingDetails: {
    flex: 1,
  },
  totalReviews: {
    fontSize: 18,
    fontWeight: '600',
  },
  ratingLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  reviewsContainer: {
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  reviewContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 12,
    marginTop: 2,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  sellerReply: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: 12,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  replyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  helpfulText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ownReviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});

export default ReviewsScreen;
