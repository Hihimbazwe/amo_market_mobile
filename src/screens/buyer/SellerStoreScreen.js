import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  ShieldCheck, 
  ShoppingBag,
  Filter,
  Search,
  Clock,
  Package,
  MessageSquare,
  ChevronLeft
} from 'lucide-react-native';
import CustomText from '../../components/CustomText';
import ProductCard from '../../components/ProductCard';
import { useTheme } from '../../context/ThemeContext';
import { sellerService } from '../../api/sellerService';
import { productService } from '../../api/productService';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const SellerStoreScreen = ({ route, navigation }) => {
  const { sellerId, sellerName } = route.params || {};
  const { colors, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStoreData = async () => {
    try {
      console.log(`[SellerStoreScreen] Fetching data for sellerId: ${sellerId}`);
      setLoading(true);
      
      const [sellerProducts, sellerData] = await Promise.all([
        productService.getProducts({ sellerId: sellerId }),
        sellerService.getPublicProfile(sellerId)
      ]);

      setProducts(sellerProducts || []);
      setSeller(sellerData);
    } catch (error) {
      console.error('[SellerStoreScreen] Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (sellerId) {
      fetchStoreData();
    }
  }, [sellerId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStoreData();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <CustomText style={{ marginTop: 16, color: colors.muted }}>Loading Store...</CustomText>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Banner / Cover */}
      <View style={styles.bannerContainer}>
        {seller?.storeBanner ? (
          <Image source={{ uri: seller.storeBanner }} style={styles.bannerImage} />
        ) : (
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerPlaceholder}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.bannerOverlay}
        />
      </View>

      {/* Profile Info Overlay */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatarBorder, { borderColor: colors.primary }]}>
            {seller?.user?.image || seller?.image ? (
              <Image source={{ uri: seller?.user?.image || seller?.image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholderInner, { backgroundColor: colors.primary + '20' }]}>
                <CustomText style={[styles.initials, { color: colors.primary }]}>
                  {(sellerName || seller?.user?.name || 'S')[0].toUpperCase()}
                </CustomText>
              </View>
            )}
          </View>
          {seller?.kycVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
              <ShieldCheck size={14} color="#ffffff" />
            </View>
          )}
        </View>

        <View style={styles.storeNameSection}>
          <CustomText variant="h1" style={styles.storeName}>
            {sellerName || seller?.user?.name || 'Seller Store'}
          </CustomText>
          <View style={styles.locationTag}>
            <MapPin size={12} color={colors.primary} />
            <CustomText variant="caption" style={[styles.locationText, { color: colors.muted }]}>
              {seller?.locationName || seller?.district || 'Rwanda'}
            </CustomText>
          </View>
        </View>

        {/* Improved Stats Bar */}
        <View style={[styles.statsBar, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Star size={14} color="#f59e0b" fill="#f59e0b" />
              <CustomText style={styles.statValue}>{seller?.rating || '4.8'}</CustomText>
            </View>
            <CustomText style={styles.statLabel}>Rating</CustomText>
          </View>
          <View style={[styles.statBox, styles.statDivider, { borderColor: colors.glassBorder }]}>
            <View style={styles.statHeader}>
              <Package size={14} color={colors.primary} />
              <CustomText style={styles.statValue}>{products.length}</CustomText>
            </View>
            <CustomText style={styles.statLabel}>Products</CustomText>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
              <Clock size={14} color="#10b981" />
              <CustomText style={styles.statValue}>{seller?.responseTime || '2h'}</CustomText>
            </View>
            <CustomText style={styles.statLabel}>Response</CustomText>
          </View>
        </View>

        {seller?.bio && (
          <View style={styles.bioSection}>
            <CustomText numberOfLines={3} style={[styles.bioText, { color: colors.foreground }]}>
              {seller.bio}
            </CustomText>
          </View>
        )}
      </View>

      <View style={styles.inventoryHeader}>
        <View>
          <CustomText variant="h2" style={styles.inventoryTitle}>Store Inventory</CustomText>
          <View style={styles.inventoryUnderline} />
        </View>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.glass }]}>
          <Filter size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Custom Sticky Header */}
      <View style={styles.stickyHeader}>
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView>
          <View style={styles.headerNav}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={[styles.headerCircleBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
            >
              <ChevronLeft color="#fff" size={28} />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity style={[styles.headerCircleBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                <Search color="#fff" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard 
            product={item} 
            hideBadge={true}
            style={{ width: '48.5%' }}
            onPress={() => navigation.navigate('ProductDetail', { product: item })} 
          />
        )}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
              <ShoppingBag size={40} color={colors.muted} />
            </View>
            <CustomText variant="h3" style={{ marginTop: 20 }}>No items yet</CustomText>
            <CustomText style={{ color: colors.muted, textAlign: 'center', marginTop: 8 }}>
              This seller hasn't listed any products in their inventory.
            </CustomText>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: 100,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerContainer: {
    marginBottom: 16,
  },
  bannerContainer: {
    height: 220,
    width: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  profileCard: {
    marginTop: -80,
    marginHorizontal: 16,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    alignItems: 'center',
  },
  avatarWrapper: {
    marginTop: -70,
    position: 'relative',
  },
  avatarBorder: {
    width: 100,
    height: 100,
    borderRadius: 35,
    borderWidth: 4,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 5,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholderInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 40,
    fontWeight: '900',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  storeNameSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  storeName: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  locationText: {
    marginLeft: 4,
    fontWeight: '700',
  },
  statsBar: {
    flexDirection: 'row',
    marginTop: 24,
    borderRadius: 20,
    padding: 16,
    width: '100%',
    borderWidth: 1,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bioSection: {
    marginTop: 20,
    width: '100%',
  },
  bioText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.8,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  inventoryTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  inventoryUnderline: {
    height: 4,
    width: 40,
    backgroundColor: '#e67e22',
    marginTop: 4,
    borderRadius: 2,
  },
  filterBtn: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  listContent: {
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});

export default SellerStoreScreen;
