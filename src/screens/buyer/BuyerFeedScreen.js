import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Menu, Heart, Store, MapPin, Star, Users, Package, ChevronRight, Loader2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { sellerService } from '../../api/sellerService';

const BuyerFeedScreen = ({ navigation }) => {
  const { toggleDrawer } = useContext(DrawerContext);
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unfollowingId, setUnfollowingId] = useState(null);

  const fetchFeed = useCallback(async (showLoadingIndicator = true) => {
    if (!user?.id) return;
    if (showLoadingIndicator) setLoading(true);
    try {
      const data = await sellerService.getFollowedSellers(user.id);
      setSellers(data || []);
    } catch (error) {
      console.error('Fetch feed error:', error);
      Alert.alert(t('error') || 'Error', t('feedFetchError') || 'Failed to fetch followed sellers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, t]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed(false);
  };

  const handleUnfollow = async (sellerId) => {
    if (!user?.id) return;
    setUnfollowingId(sellerId);
    try {
      await sellerService.toggleFollow(user.id, sellerId, 'unfollow');
      setSellers(prev => prev.filter(s => s.sellerId !== sellerId));
    } catch (error) {
      console.error('Unfollow error:', error);
      Alert.alert(t('error') || 'Error', t('unfollowFailed') || 'Failed to unfollow store');
    } finally {
      setUnfollowingId(null);
    }
  };

  const renderProductItem = ({ item }) => {
    const defaultImage = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=300&q=80';
    return (
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
        onPress={() => navigation.navigate('ProductDetail', { product: { id: item.id } })}
      >
        <Image
          source={{ uri: item.image || defaultImage }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.productInfo}>
          <CustomText style={[styles.productTitle, { color: colors.foreground }]} numberOfLines={1}>
            {item.title}
          </CustomText>
          <CustomText style={[styles.productPrice, { color: colors.primary }]}>
            RWF {item.price.toLocaleString()}
          </CustomText>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSellerItem = ({ item }) => {
    return (
      <View style={[styles.sellerCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        {/* Seller Info Header */}
        <View style={styles.sellerHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.avatarImage} />
            ) : (
              <CustomText style={[styles.avatarInitial, { color: colors.primary }]}>
                {item.storeName[0]?.toUpperCase()}
              </CustomText>
            )}
          </View>

          <View style={styles.sellerMeta}>
            <View style={styles.storeNameRow}>
              <CustomText style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>
                {item.storeName}
              </CustomText>
              {item.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: '#3b82f620', borderColor: '#3b82f640' }]}>
                  <CustomText style={styles.verifiedText}>{t('verified') || 'Verified'}</CustomText>
                </View>
              )}
            </View>

            <View style={styles.detailsRow}>
              {item.location && (
                <View style={styles.detailItem}>
                  <MapPin size={12} color={colors.muted} />
                  <CustomText style={[styles.detailText, { color: colors.muted }]} numberOfLines={1}>
                    {item.location}
                  </CustomText>
                </View>
              )}

              {item.rating > 0 && (
                <View style={styles.detailItem}>
                  <Star size={12} color="#facc15" fill="#facc15" />
                  <CustomText style={[styles.detailText, { color: '#facc15' }]}>
                    {item.rating.toFixed(1)} ({item.ratingCount})
                  </CustomText>
                </View>
              )}

              <View style={styles.detailItem}>
                <Users size={12} color={colors.muted} />
                <CustomText style={[styles.detailText, { color: colors.muted }]}>
                  {item.followerCount}
                </CustomText>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.unfollowBtn, { borderColor: '#ef444440', backgroundColor: '#ef444410' }]}
            onPress={() => handleUnfollow(item.sellerId)}
            disabled={unfollowingId === item.sellerId}
          >
            {unfollowingId === item.sellerId ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <>
                <Heart size={14} color="#ef4444" fill="#ef4444" />
                <CustomText style={[styles.actionBtnText, { color: '#ef4444', marginLeft: 6 }]}>
                  {t('unfollow') || 'Unfollow'}
                </CustomText>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
            onPress={() => navigation.navigate('SellerStore', { sellerId: item.sellerId, sellerName: item.storeName })}
          >
            <Store size={14} color={colors.foreground} />
            <CustomText style={[styles.actionBtnText, { color: colors.foreground, marginLeft: 6 }]}>
              {t('visitShop') || 'Visit Shop'}
            </CustomText>
          </TouchableOpacity>
        </View>

        {/* Latest Products list */}
        {item.latestProducts && item.latestProducts.length > 0 && (
          <View style={styles.productsSection}>
            <View style={styles.productsHeader}>
              <View style={styles.productsHeaderLeft}>
                <Package size={14} color={colors.primary} />
                <CustomText style={[styles.productsTitle, { color: colors.foreground, marginLeft: 6 }]}>
                  {t('latestArrivals') || 'Latest Arrivals'}
                </CustomText>
              </View>
              <TouchableOpacity
                style={styles.productsHeaderRight}
                onPress={() => navigation.navigate('SellerStore', { sellerId: item.sellerId, sellerName: item.storeName })}
              >
                <CustomText style={[styles.viewAllText, { color: colors.primary }]}>
                  {t('viewAll') || 'View all'}
                </CustomText>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={item.latestProducts}
              renderItem={renderProductItem}
              keyExtractor={(p) => p.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <CustomText variant="h2">{t('feed') || 'Feed'}</CustomText>
          <View style={[styles.followingCountBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
            <Heart size={12} color={colors.primary} fill={colors.primary} />
            <CustomText style={[styles.followingCountText, { color: colors.primary }]}>
              {sellers.length} {t('following') || 'Following'}
            </CustomText>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <CustomText style={[styles.loadingText, { color: colors.muted }]}>
            {t('loadingFeed') || 'Loading updates...'}
          </CustomText>
        </View>
      ) : sellers.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.glass }]}>
            <Store size={48} color={colors.muted} opacity={0.5} />
          </View>
          <CustomText style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t('noFollows') || "You aren't following anyone"}
          </CustomText>
          <CustomText style={[styles.emptySub, { color: colors.muted }]}>
            {t('noFollowsDesc') || 'Follow your favorite stores to see their latest product updates and arrivals here.'}
          </CustomText>
          <TouchableOpacity
            style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Home')}
          >
            <CustomText style={styles.exploreBtnText}>
              {t('exploreMarketplace') || 'Explore Marketplace'}
            </CustomText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sellers}
          renderItem={renderSellerItem}
          keyExtractor={(s) => s.sellerId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
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
    padding: 20,
    borderBottomWidth: 1,
  },
  menuButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  followingCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  followingCountText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  exploreBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sellerCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sellerMeta: {
    flex: 1,
    marginLeft: 12,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  verifiedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  verifiedText: {
    color: '#3b82f6',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  detailText: {
    fontSize: 11,
    marginLeft: 4,
    maxWidth: 100,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  unfollowBtn: {
    // red outline / tint
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  productsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  productsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 2,
  },
  productsList: {
    paddingRight: 16,
  },
  productCard: {
    width: 120,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 90,
  },
  productInfo: {
    padding: 8,
  },
  productTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
});

export default BuyerFeedScreen;
