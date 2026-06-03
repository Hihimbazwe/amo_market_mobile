import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Image,
  RefreshControl,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  Star,
  ThumbsUp,
  MessageSquare,
  Filter,
  Search,
  X,
  ChevronDown,
  TrendingUp,
  BarChart2,
  Package,
  CheckCircle,
  Send,
  Edit3,
  AlertCircle,
  User,
} from 'lucide-react-native';
import CustomText from '../../components/CustomText';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { reviewService } from '../../api/reviewService';

// ─── Star Row ────────────────────────────────────────────────────────────────
const StarRow = ({ rating, size = 14, color = '#F59E0B' }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={size}
        color={color}
        fill={s <= rating ? color : 'transparent'}
      />
    ))}
  </View>
);

// ─── Rating Distribution Bar ─────────────────────────────────────────────────
const RatingBar = ({ stars, count, pct, total, colors }) => (
  <View style={ratingBarStyles.row}>
    <View style={{ flexDirection: 'row', gap: 2, width: 70, alignItems: 'center' }}>
      <CustomText style={{ fontSize: 12, color: colors.muted, width: 8 }}>{stars}</CustomText>
      <Star size={10} color="#F59E0B" fill="#F59E0B" />
    </View>
    <View style={[ratingBarStyles.track, { backgroundColor: colors.glass }]}>
      <View
        style={[
          ratingBarStyles.fill,
          {
            width: `${pct}%`,
            backgroundColor: stars >= 4 ? '#10B981' : stars === 3 ? '#F59E0B' : '#EF4444',
          },
        ]}
      />
    </View>
    <CustomText style={{ fontSize: 11, color: colors.muted, width: 28, textAlign: 'right' }}>
      {count}
    </CustomText>
  </View>
);

const ratingBarStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

// ─── Reply Modal ──────────────────────────────────────────────────────────────
const ReplyModal = ({ visible, onClose, onSubmit, existingReply, loading }) => {
  const { colors } = useTheme();
  const [text, setText] = useState(existingReply || '');

  React.useEffect(() => {
    setText(existingReply || '');
  }, [existingReply, visible]);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={modalStyles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[modalStyles.dialog, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={modalStyles.header}>
            <CustomText variant="h2" style={{ color: colors.foreground }}>
              {existingReply ? 'Edit Reply' : 'Reply to Review'}
            </CustomText>
            <TouchableOpacity onPress={onClose} style={[modalStyles.closeBtn, { backgroundColor: colors.glass }]}>
              <X color={colors.muted} size={18} />
            </TouchableOpacity>
          </View>
          <CustomText style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
            Your reply is public and visible to all customers.
          </CustomText>
          <ScrollView style={modalStyles.inputContainer} showsVerticalScrollIndicator={false}>
            <TextInput
              style={[
                modalStyles.input,
                { backgroundColor: colors.glass, color: colors.foreground, borderColor: colors.border },
              ]}
              placeholder="Write your professional reply..."
              placeholderTextColor={colors.muted}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>
          <TouchableOpacity
            style={[modalStyles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={() => onSubmit(text)}
            disabled={loading || !text.trim()}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Send color="white" size={16} />
                <CustomText style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                  {existingReply ? 'Update Reply' : 'Post Reply'}
                </CustomText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  dialog: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    maxHeight: '80%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  closeBtn: { padding: 8, borderRadius: 10 },
  inputContainer: {
    maxHeight: 200,
    marginBottom: 16,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 120,
    lineHeight: 20,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
});

// ─── Review Card ──────────────────────────────────────────────────────────────
const ReviewCard = ({ review, userId, colors, onReply, onHelpful, helpfulVoted }) => {
  const [expanded, setExpanded] = useState(false);
  const maxLen = 150;
  const comment = review.comment || '';
  const needsTruncate = comment.length > maxLen;
  const displayComment = needsTruncate && !expanded ? comment.slice(0, maxLen) + '...' : comment;

  const ratingColor =
    review.rating >= 4 ? '#10B981' : review.rating === 3 ? '#F59E0B' : '#EF4444';

  const productImg = review.product?.media?.[0]?.url;

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Product Row */}
      <View style={cardStyles.productRow}>
        {productImg ? (
          <Image source={{ uri: productImg }} style={cardStyles.productImg} />
        ) : (
          <View style={[cardStyles.productImgPlaceholder, { backgroundColor: colors.glass }]}>
            <Package color={colors.muted} size={14} />
          </View>
        )}
        <CustomText style={{ color: colors.muted, fontSize: 11, flex: 1 }} numberOfLines={1}>
          {review.product?.title || 'Product'}
        </CustomText>
        <View style={[cardStyles.ratingBadge, { backgroundColor: ratingColor + '18' }]}>
          <Star size={11} color={ratingColor} fill={ratingColor} />
          <CustomText style={{ color: ratingColor, fontSize: 12, fontWeight: '800' }}>
            {review.rating}
          </CustomText>
        </View>
      </View>

      {/* Buyer Info + Stars */}
      <View style={cardStyles.buyerRow}>
        <View style={[cardStyles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <User color={colors.primary} size={14} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CustomText style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>
              {review.buyer?.name || 'Anonymous'}
            </CustomText>
            {review.buyer?.verified && (
              <CheckCircle color="#10B981" size={12} fill="#10B981" />
            )}
          </View>
          <CustomText style={{ color: colors.muted, fontSize: 10, marginTop: 1 }}>
            {new Date(review.createdAt).toLocaleDateString('en-RW', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </CustomText>
        </View>
        <StarRow rating={review.rating} />
      </View>

      {/* Comment */}
      {comment ? (
        <View style={{ marginTop: 10 }}>
          <CustomText style={{ color: colors.foreground, fontSize: 13, lineHeight: 20 }}>
            {displayComment}
          </CustomText>
          {needsTruncate && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <CustomText style={{ color: colors.primary, fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                {expanded ? 'Show less' : 'Read more'}
              </CustomText>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <CustomText style={{ color: colors.muted, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
          No written comment
        </CustomText>
      )}

      {/* Seller Reply */}
      {review.replied && review.reply && (
        <View style={[cardStyles.replyBox, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '25' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <MessageSquare color={colors.primary} size={12} />
            <CustomText style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
              Your Reply
            </CustomText>
          </View>
          <CustomText style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
            {review.reply.text}
          </CustomText>
        </View>
      )}

      {/* Actions Row */}
      <View style={cardStyles.actionsRow}>
        {/* Helpful count */}
        <TouchableOpacity
          style={[
            cardStyles.helpfulBtn,
            {
              backgroundColor: helpfulVoted ? colors.primary + '18' : colors.glass,
              borderColor: helpfulVoted ? colors.primary + '40' : colors.border,
            },
          ]}
          onPress={() => onHelpful(review.id)}
          activeOpacity={0.7}
        >
          <ThumbsUp
            size={13}
            color={helpfulVoted ? colors.primary : colors.muted}
            fill={helpfulVoted ? colors.primary : 'transparent'}
          />
          <CustomText
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: helpfulVoted ? colors.primary : colors.muted,
            }}
          >
            {review.helpful || 0} Helpful
          </CustomText>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* Reply button */}
        <TouchableOpacity
          style={[cardStyles.replyBtn, { backgroundColor: colors.primary, opacity: 1 }]}
          onPress={() => onReply(review)}
          activeOpacity={0.8}
        >
          {review.replied ? (
            <>
              <Edit3 color="white" size={13} />
              <CustomText style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Edit Reply</CustomText>
            </>
          ) : (
            <>
              <MessageSquare color="white" size={13} />
              <CustomText style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Reply</CustomText>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  productImg: { width: 28, height: 28, borderRadius: 6 },
  productImgPlaceholder: {
    width: 28, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  buyerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  replyBox: {
    marginTop: 12, padding: 12,
    borderRadius: 12, borderWidth: 1,
  },
  actionsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, gap: 8,
  },
  helpfulBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
  },
  replyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const RATING_FILTERS = [
  { label: 'All', value: 'all' },
  { label: '5★', value: '5' },
  { label: '4★', value: '4' },
  { label: '3★', value: '3' },
  { label: '2★', value: '2' },
  { label: '1★', value: '1' },
];

export default function SellerReviewsScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeRating, setActiveRating] = useState('all');
  const [replyModal, setReplyModal] = useState({ visible: false, review: null });
  const [replyLoading, setReplyLoading] = useState(false);
  const [helpfulVoted, setHelpfulVoted] = useState({}); // reviewId -> bool
  const [helpfulCounts, setHelpfulCounts] = useState({}); // reviewId -> number

  const searchTimeout = useRef(null);

  const load = useCallback(
    async ({ isRefresh = false } = {}) => {
      if (!user?.id) return;
      if (!isRefresh) setLoading(true);
      try {
        const result = await reviewService.getSellerReviews(user.id, {
          rating: activeRating,
          search: search.trim() || undefined,
        });
        setData(result);
        // Seed helpful counts from server
        const counts = {};
        (result.reviews || []).forEach((r) => {
          counts[r.id] = r.helpful || 0;
        });
        setHelpfulCounts((prev) => ({ ...counts, ...prev }));
      } catch (err) {
        console.error('SellerReviewsScreen load error:', err);
        Alert.alert('Error', err.message || 'Failed to load reviews');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, activeRating, search]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load({ isRefresh: true });
  };

  const handleSearchChange = (text) => {
    setSearch(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => load(), 600);
  };

  const handleRatingFilter = (val) => {
    setActiveRating(val);
  };

  // Re-fetch when rating filter changes
  React.useEffect(() => {
    load();
  }, [activeRating]);

  const handleHelpful = async (reviewId) => {
    if (!user?.id) {
      Alert.alert('Login Required', 'You must be logged in to vote.');
      return;
    }
    if (helpfulVoted[reviewId]) {
      Alert.alert('Already Voted', 'You have already marked this review as helpful.');
      return;
    }
    // Optimistic update
    setHelpfulVoted((prev) => ({ ...prev, [reviewId]: true }));
    setHelpfulCounts((prev) => ({ ...prev, [reviewId]: (prev[reviewId] || 0) + 1 }));
    try {
      const res = await reviewService.markHelpful(user.id, reviewId);
      if (res?.alreadyVoted) {
        // Already voted on server — revert optimistic
        setHelpfulVoted((prev) => ({ ...prev, [reviewId]: true }));
      }
    } catch (err) {
      // Revert on error
      setHelpfulVoted((prev) => ({ ...prev, [reviewId]: false }));
      setHelpfulCounts((prev) => ({ ...prev, [reviewId]: Math.max(0, (prev[reviewId] || 1) - 1) }));
      Alert.alert('Error', err.message || 'Failed to vote');
    }
  };

  const handleOpenReply = (review) => {
    setReplyModal({ visible: true, review });
  };

  const handleSubmitReply = async (text) => {
    if (!text.trim()) {
      Alert.alert('Empty Reply', 'Please enter a reply before submitting.');
      return;
    }
    setReplyLoading(true);
    try {
      await reviewService.replyToReview(user.id, replyModal.review.id, text.trim());
      setReplyModal({ visible: false, review: null });
      load({ isRefresh: true });
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to post reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const analytics = data?.analytics;
  const reviews = data?.reviews || [];

  const avgRating = analytics?.avgRating || 0;
  const totalReviews = analytics?.totalReviews || 0;
  const unrepliedCount = analytics?.unrepliedCount || 0;
  const totalHelpfulVotes = analytics?.totalHelpfulVotes || 0;
  const ratingDist = analytics?.ratingDistribution || [];

  // Merge optimistic helpful counts into review list for display
  const reviewsWithOptimistic = reviews.map((r) => ({
    ...r,
    helpful: helpfulCounts[r.id] !== undefined ? helpfulCounts[r.id] : r.helpful,
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.glass }]}
        >
          <ArrowLeft color={colors.foreground} size={22} />
        </TouchableOpacity>
        <CustomText variant="h2" style={{ color: colors.foreground }}>
          My Reviews
        </CustomText>
        {unrepliedCount > 0 && (
          <View style={[styles.unrepliedBadge, { backgroundColor: '#EF4444' }]}>
            <CustomText style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>
              {unrepliedCount}
            </CustomText>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <CustomText style={{ color: colors.muted, marginTop: 12 }}>Loading reviews...</CustomText>
          </View>
        ) : (
          <>
            {/* ── Analytics Summary ── */}
            <View style={styles.analyticsGrid}>
              {/* Average Rating */}
              <View style={[styles.analyticsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.analyticsIcon, { backgroundColor: '#F59E0B18' }]}>
                  <Star color="#F59E0B" size={18} fill="#F59E0B" />
                </View>
                <CustomText style={[styles.analyticsValue, { color: colors.foreground }]}>
                  {avgRating.toFixed(1)}
                </CustomText>
                <CustomText style={[styles.analyticsLabel, { color: colors.muted }]}>Avg Rating</CustomText>
                <StarRow rating={Math.round(avgRating)} size={10} />
              </View>

              {/* Total Reviews */}
              <View style={[styles.analyticsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.analyticsIcon, { backgroundColor: '#3B82F618' }]}>
                  <BarChart2 color="#3B82F6" size={18} />
                </View>
                <CustomText style={[styles.analyticsValue, { color: colors.foreground }]}>
                  {totalReviews}
                </CustomText>
                <CustomText style={[styles.analyticsLabel, { color: colors.muted }]}>Total Reviews</CustomText>
              </View>

              {/* Unreplied */}
              <View style={[styles.analyticsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.analyticsIcon, { backgroundColor: '#EF444418' }]}>
                  <AlertCircle color="#EF4444" size={18} />
                </View>
                <CustomText style={[styles.analyticsValue, { color: unrepliedCount > 0 ? '#EF4444' : colors.foreground }]}>
                  {unrepliedCount}
                </CustomText>
                <CustomText style={[styles.analyticsLabel, { color: colors.muted }]}>Unreplied</CustomText>
              </View>

              {/* Helpful Votes */}
              <View style={[styles.analyticsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.analyticsIcon, { backgroundColor: '#10B98118' }]}>
                  <ThumbsUp color="#10B981" size={18} />
                </View>
                <CustomText style={[styles.analyticsValue, { color: colors.foreground }]}>
                  {totalHelpfulVotes}
                </CustomText>
                <CustomText style={[styles.analyticsLabel, { color: colors.muted }]}>Helpful Votes</CustomText>
              </View>
            </View>

            {/* ── Rating Distribution ── */}
            {ratingDist.length > 0 && totalReviews > 0 && (
              <View style={[styles.distCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.distHeader}>
                  <TrendingUp color={colors.primary} size={16} />
                  <CustomText style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }}>
                    Rating Breakdown
                  </CustomText>
                </View>
                {[...ratingDist].reverse().map((item) => (
                  <RatingBar
                    key={item.stars}
                    stars={item.stars}
                    count={item.count}
                    pct={item.pct}
                    total={totalReviews}
                    colors={colors}
                  />
                ))}
              </View>
            )}

            {/* ── Search ── */}
            <View style={[styles.searchBox, { backgroundColor: colors.glass, borderColor: colors.border }]}>
              <Search color={colors.muted} size={16} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search by buyer, product, or comment..."
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={handleSearchChange}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => { setSearch(''); setTimeout(() => load(), 100); }}>
                  <X color={colors.muted} size={16} />
                </TouchableOpacity>
              )}
            </View>

            {/* ── Rating Filter Pills ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
            >
              {RATING_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: activeRating === f.value ? colors.primary : colors.glass,
                      borderColor: activeRating === f.value ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleRatingFilter(f.value)}
                  activeOpacity={0.7}
                >
                  <CustomText
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: activeRating === f.value ? 'white' : colors.muted,
                    }}
                  >
                    {f.label}
                  </CustomText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ── Review List ── */}
            {reviewsWithOptimistic.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                <Star color={colors.muted} size={36} />
                <CustomText style={{ color: colors.muted, marginTop: 12, fontWeight: '700', fontSize: 15 }}>
                  No reviews found
                </CustomText>
                <CustomText style={{ color: colors.muted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                  {search || activeRating !== 'all'
                    ? 'Try adjusting your filters'
                    : 'You have no reviews yet. Keep selling!'}
                </CustomText>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <CustomText style={{ color: colors.muted, fontSize: 12 }}>
                    {reviewsWithOptimistic.length} review{reviewsWithOptimistic.length !== 1 ? 's' : ''}
                    {activeRating !== 'all' ? ` · ${activeRating}★` : ''}
                  </CustomText>
                </View>
                {reviewsWithOptimistic.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    userId={user?.id}
                    colors={colors}
                    onReply={handleOpenReply}
                    onHelpful={handleHelpful}
                    helpfulVoted={!!helpfulVoted[review.id]}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Reply Modal */}
      <ReplyModal
        visible={replyModal.visible}
        onClose={() => setReplyModal({ visible: false, review: null })}
        onSubmit={handleSubmitReply}
        existingReply={replyModal.review?.replied ? replyModal.review?.reply?.text : ''}
        loading={replyLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 8, borderRadius: 12 },
  unrepliedBadge: {
    marginLeft: 'auto',
    minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  scroll: { padding: 16, paddingBottom: 40 },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },

  // Analytics grid
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  analyticsCard: {
    width: '48%',
    borderRadius: 16, padding: 14, borderWidth: 1,
    alignItems: 'flex-start', gap: 4,
  },
  analyticsIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  analyticsValue: { fontSize: 22, fontWeight: '900' },
  analyticsLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Distribution card
  distCard: {
    borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1,
  },
  distHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 13, height: 20 },

  // Rating filter pills
  filtersRow: { gap: 8, paddingBottom: 14, paddingHorizontal: 2 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },

  // Empty
  emptyBox: {
    padding: 40, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderStyle: 'dashed',
    marginTop: 8,
  },
});
