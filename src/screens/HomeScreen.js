import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  StatusBar, 
  Dimensions,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Smartphone, 
  Shirt, 
  Home as HomeIcon, 
  Dumbbell, 
  BookOpen, 
  Car, 
  Tag, 
  Zap,
  ShieldCheck,
  Truck,
  Headphones,
  Star,
  ArrowRight,
  Search,
  ShoppingCart,
  Menu,
  X,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Flame
} from 'lucide-react-native';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import CategoryItem from '../components/CategoryItem';
import ProductCard from '../components/ProductCard';
import GlassContainer from '../components/GlassContainer';
import NotificationIcon from '../components/NotificationIcon';
import { productService } from '../api/productService';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const categories = [
  { label: "Electronics", icon: Smartphone, color: "#3b82f6" },
  { label: "Fashion", icon: Shirt, color: "#ec4899" },
  { label: "Home & Living", icon: HomeIcon, color: "#eab308" },
  { label: "Sports", icon: Dumbbell, color: "#22c55e" },
  { label: "Books", icon: BookOpen, color: "#a855f7" },
  { label: "Vehicles", icon: Car, color: "#ef4444" },
  { label: "Beauty", icon: Tag, color: "#f97316" },
  { label: "Deals", icon: Zap, color: "#4f46e5" },
];

const trendingSearches = ["iPhone 15", "Nike sneakers", "MacBook Pro", "Gaming chair", "Smart watch"];

const HomeScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const [liveProducts, setLiveProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const flatListRef = useRef(null);
  const mainScrollRef = useRef(null);
  const timerRef = useRef(null);

  const heroProducts = useMemo(() => {
    if (!liveProducts || liveProducts.length === 0) return [null];
    const hotDeals = liveProducts.filter(p => p.isHotDeal).map(p => ({
      id: p.id,
      slug: p.slug || p.id,
      name: p.title,
      title: p.title, // Keep title for existing UI binding
      price: p.price,
      originalPrice: p.originalPrice || p.price,
      discountType: p.discountType || "PERCENTAGE",
      discountPercent: p.discountPercent ?? 0,
      discountFixedAmount: p.discountFixedAmount ?? 0,
      bogoBuyQuantity: p.bogoBuyQuantity ?? null,
      bogoGetQuantity: p.bogoGetQuantity ?? null,
      dealTitle: p.dealTitle ?? null,
      category: p.category,
      stock: p.stock ?? null,
      hotDealEndsAt: p.hotDealEndsAt || null,
      image: p.media?.[0]?.url ?? null,
      media: p.media, // Keep media for existing UI binding
      isHotDeal: true
    }));
    if (hotDeals.length > 0) return hotDeals.slice(0, 5);
    return liveProducts.slice(0, 5);
  }, [liveProducts]);

  useEffect(() => {
    // Start auto-slide timer
    if (heroProducts[0] !== null) {
      timerRef.current = setInterval(() => {
        const nextIndex = (activeHeroIndex + 1) % heroProducts.length;
        setActiveHeroIndex(nextIndex);
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      }, 4000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [heroProducts, activeHeroIndex]);

  const fetchFeatured = async (showRefresher = false) => {
    if (showRefresher) setRefreshing(true);
    else setLoading(true);
    
    try {
      const data = await productService.getProducts();
      setLiveProducts(data); // Show all products
    } catch (error) {
      console.error('Home fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFeatured();
    }, [])
  );

  const filteredProducts = useMemo(() => {
    let list = liveProducts;
    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category === selectedCategory);
    }
    if (searchQuery) {
      list = list.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  }, [liveProducts, selectedCategory, searchQuery]);

  const scrollToProducts = () => {
    mainScrollRef.current?.scrollTo({ y: 320, animated: true });
  };

  const onRefresh = useCallback(() => {
    fetchFeatured(true);
  }, []);

  const handleSearchPress = () => {
    navigation.navigate('GlobalSearch');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* Main Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.glass }]}>
            <Menu color={colors.foreground} size={24} />
          </TouchableOpacity>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={{ width: 28, height: 28, resizeMode: 'contain', marginRight: 8 }} 
            />
            <Svg height="24" width="105">
              <Defs>
                <LinearGradient id="grad2" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#A855F7" stopOpacity="1" />
                  <Stop offset="1" stopColor="#3B82F6" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <SvgText
                fill="url(#grad2)"
                fontSize="16"
                fontWeight="900"
                x="0"
                y="18"
                textAnchor="start"
              >AMO Market</SvgText>
            </Svg>
          </View>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handleSearchPress} style={[styles.iconButton, { backgroundColor: colors.glass, marginRight: 8 }]}>
            <Search color={colors.foreground} size={20} />
          </TouchableOpacity>
          <NotificationIcon />
        </View>
      </View>

      <ScrollView 
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
  
        {/* Hero Section - Auto-sliding Carousel */}
        <View style={styles.heroContainer}>
          <FlatList
            ref={flatListRef}
            data={heroProducts}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => item?.id || index.toString()}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / (width - 32));
              setActiveHeroIndex(index);
            }}
            renderItem={({ item }) => (
              <View style={styles.heroSlide}>
                <ImageBackground
                  source={{ 
                    uri: item?.media?.[0]?.url || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200' 
                  }}
                  style={styles.heroImage}
                  imageStyle={{ borderRadius: 24 }}
                >
                  <View style={styles.heroOverlay}>
                    {item?.isHotDeal && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 }}>
                        <Flame size={12} color="#ffffff" />
                        <CustomText style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold', marginLeft: 4 }}>HOT DEAL</CustomText>
                      </View>
                    )}
                    <CustomText variant="h1" style={styles.heroTitle} numberOfLines={2}>
                      {item?.title || t('heroTitle')}
                    </CustomText>
                    <CustomText variant="subtitle" style={styles.heroSubtitle}>
                      {item?.price ? `Rwf ${item.price.toLocaleString()}` : t('heroSubtitle')}
                    </CustomText>
                    <CustomButton 
                      title={t('shopNow')} 
                      style={styles.heroButton}
                      onPress={() => {
                        if (item?.id) {
                          navigation.navigate('ProductDetail', { product: item });
                        } else {
                          scrollToProducts();
                        }
                      }} 
                    />
                  </View>
                </ImageBackground>
              </View>
            )}
          />
          {/* Pagination Dots */}
          <View style={styles.heroPagination}>
            {heroProducts.map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.heroDot, 
                  { backgroundColor: activeHeroIndex === i ? colors.primary : 'rgba(255,255,255,0.5)' }
                ]} 
              />
            ))}
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CustomText variant="h2">{t('popularCategories')}</CustomText>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            <TouchableOpacity 
              style={[styles.categoryPill, selectedCategory === 'All' && styles.activeCategoryPill]} 
              onPress={() => setSelectedCategory('All')}
            >
              <CustomText style={[styles.categoryPillText, selectedCategory === 'All' && styles.activeCategoryPillText]}>All</CustomText>
            </TouchableOpacity>
            {categories.map((cat, index) => (
              <TouchableOpacity 
                key={index}
                style={[styles.categoryPill, selectedCategory === cat.label && styles.activeCategoryPill]}
                onPress={() => setSelectedCategory(cat.label)}
              >
                <cat.icon size={16} color={selectedCategory === cat.label ? 'white' : cat.color} />
                <CustomText style={[styles.categoryPillText, selectedCategory === cat.label && styles.activeCategoryPillText, { marginLeft: 6 }]}>
                  {cat.label}
                </CustomText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Trust Bar */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={[styles.trustBar, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}
          contentContainerStyle={styles.trustBarContent}
        >
          {[
            { icon: ShieldCheck, title: t('buyerProtection') },
            // { icon: Truck, title: t('verifiedCouriers') },
            { icon: Headphones, title: t('support247') },
            { icon: Star, title: t('verifiedSellers') }
          ].map((item, index) => (
            <View key={index} style={[styles.trustItem, { backgroundColor: colors.primary + '10' }]}>
              <View style={styles.trustIconContainer}>
                <item.icon size={20} color={colors.primary} />
              </View>
              <CustomText variant="caption" style={[styles.trustText, { color: colors.foreground }]}>{item.title}</CustomText>
            </View>
          ))}
        </ScrollView>

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CustomText variant="h2">{selectedCategory === 'All' ? t('All Products') : selectedCategory}</CustomText>
          </View>
          <View style={styles.productsGrid}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              filteredProducts.map((item) => (
                <ProductCard key={item.id} product={item} onPress={() => navigation.navigate('ProductDetail', { product: item })} />
              ))
            )}
          </View>
        </View>

        {/* PRO Banner */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <GlassContainer style={styles.proBanner}>
            <View style={styles.proBadge}>
              <CustomText style={styles.proBadgeText}>⭐ {t('proSeller')}</CustomText>
            </View>
            <CustomText variant="h2" style={{ color: '#ffffff', marginTop: 12 }}>
              {t('unlockPremium')}
            </CustomText>
            <CustomText variant="subtitle" style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>
              {t('boostVisibility')}
            </CustomText>
            <CustomButton 
              title={t('getStarted')} 
              variant="secondary"
              style={{ marginTop: 24, width: 160 }}
              onPress={() => {}}
            />
          </GlassContainer>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  searchOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeSearchBtnOverlay: {
    padding: 8,
    marginRight: 8,
    borderRadius: 12,
  },
  searchInputWrapperOverlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
  },
  searchInputOverlay: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  searchOverlayContent: {
    flex: 1,
    padding: 20,
  },
  searchSection: {
    marginBottom: 32,
  },
  searchSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  searchSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  trendingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  searchCategoryCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  searchCategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchCategoryLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchResultText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  heroContainer: {
    padding: 16,
    position: 'relative',
  },
  heroSlide: {
    width: width - 32,
  },
  heroImage: {
    height: 220,
    width: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    borderRadius: 24,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 28,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    fontSize: 13,
  },
  heroButton: {
    marginTop: 16,
    width: 120,
    height: 48,
  },
  heroPagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoriesScroll: {
    paddingVertical: 10,
    gap: 12,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeCategoryPill: {
    backgroundColor: '#e67e22',
    borderColor: '#e67e22',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  activeCategoryPillText: {
    color: 'white',
  },
  trustBar: {
    borderRadius: 20,
    marginTop: 4,
    marginBottom: 12,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
  },
  trustBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  trustIconContainer: {
    marginRight: 8,
  },
  trustText: {
    fontWeight: '600',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  proBanner: {
    backgroundColor: '#e67e22',
    padding: 32,
    borderRadius: 24,
  },
  proBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});

export default HomeScreen;
