import React, { useEffect, useState, useCallback } from 'react';
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
  ArrowUpRight
} from 'lucide-react-native';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import AuthOverlay from '../components/AuthOverlay';
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

  const fetchFeatured = async (showRefresher = false) => {
    if (showRefresher) setRefreshing(true);
    else setLoading(true);
    
    try {
      const data = await productService.getProducts();
      setLiveProducts(data.slice(0, 4));
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

  const onRefresh = useCallback(() => {
    fetchFeatured(true);
  }, []);

  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchMode(!isSearchMode);
    if (isSearchMode) setSearchQuery('');
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      navigation.navigate('Market', { search: searchQuery });
      toggleSearch();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* Search Overlay */}
      {isSearchMode && (
        <View style={[styles.searchOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.searchOverlayHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={toggleSearch} style={[styles.closeSearchBtnOverlay, { backgroundColor: colors.glass }]}>
              <X color={colors.foreground} size={24} />
            </TouchableOpacity>
            <View style={[styles.searchInputWrapperOverlay, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <TextInput
                style={[styles.searchInputOverlay, { color: colors.foreground }]}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                onSubmitEditing={handleSearchSubmit}
              />
              <TouchableOpacity onPress={handleSearchSubmit}>
                <Search color={colors.primary} size={20} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.searchOverlayContent} showsVerticalScrollIndicator={false}>
            {/* Trending Section */}
            {!searchQuery && (
              <View style={styles.searchSection}>
                <View style={styles.searchSectionHeader}>
                  <TrendingUp size={14} color={colors.muted} />
                  <CustomText style={[styles.searchSectionTitle, { color: colors.muted }]}>{t('trendingSearches')}</CustomText>
                </View>
                <View style={styles.trendingGrid}>
                  {trendingSearches.map((t, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.trendingItem, { backgroundColor: colors.glass, borderColor: colors.border }]}
                      onPress={() => {
                        setSearchQuery(t);
                        navigation.navigate('Market', { search: t });
                        toggleSearch();
                      }}
                    >
                      <Zap size={14} color={colors.primary} style={{ marginRight: 8 }} />
                      <CustomText style={[styles.trendingText, { color: colors.foreground }]}>{t}</CustomText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Categories Section */}
            {!searchQuery && (
              <View style={styles.searchSection}>
                <View style={styles.searchSectionHeader}>
                  <Tag size={14} color={colors.muted} />
                  <CustomText style={[styles.searchSectionTitle, { color: colors.muted }]}>{t('browseCategories')}</CustomText>
                </View>
                <View style={styles.searchCategoriesGrid}>
                  {categories.map((cat, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.searchCategoryCard, { backgroundColor: colors.glass, borderColor: colors.border }]}
                      onPress={() => {
                        navigation.navigate('Market', { category: cat.label });
                        toggleSearch();
                      }}
                    >
                      <View style={[styles.searchCategoryIcon, { backgroundColor: cat.color + '15' }]}>
                        <cat.icon size={22} color={cat.color} />
                      </View>
                      <CustomText style={[styles.searchCategoryLabel, { color: colors.foreground }]}>{cat.label}</CustomText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Quick Result Action */}
            {searchQuery.length > 0 && (
              <View style={styles.searchSection}>
                <TouchableOpacity 
                  style={[styles.searchResultItem, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
                  onPress={handleSearchSubmit}
                >
                  <Search size={18} color={colors.muted} style={{ marginRight: 12 }} />
                  <CustomText style={[styles.searchResultText, { color: colors.foreground }]}>{t('searchFor', { query: searchQuery })}</CustomText>
                  <ArrowUpRight size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

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
          <TouchableOpacity onPress={toggleSearch} style={[styles.iconButton, { backgroundColor: colors.glass, marginRight: 8 }]}>
            <Search color={colors.foreground} size={20} />
          </TouchableOpacity>
          <NotificationIcon />
          <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={[styles.iconButton, { backgroundColor: colors.glass, marginLeft: 8 }]}>
            <ShoppingCart color={colors.foreground} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
  
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200' }}
            style={styles.heroImage}
            imageStyle={{ borderRadius: 24 }}
          >
            <View style={styles.heroOverlay}>
              <CustomText variant="h1" style={styles.heroTitle}>
                {t('heroTitle')}
              </CustomText>
              <CustomText variant="subtitle" style={styles.heroSubtitle}>
                {t('heroSubtitle')}
              </CustomText>
              <CustomButton 
                title={t('shopNow')} 
                style={styles.heroButton}
                onPress={() => navigation.navigate('Market')} 
              />
            </View>
          </ImageBackground>
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CustomText variant="h2">{t('popularCategories')}</CustomText>
            <TouchableOpacity onPress={() => navigation.navigate('Market')}>
              <CustomText variant="subtitle" style={{ color: colors.primary }}>{t('viewAll')}</CustomText>
            </TouchableOpacity>
          </View>
          <View style={styles.categoriesGrid}>
            {categories.map((cat, index) => (
              <CategoryItem 
                key={index}
                label={cat.label}
                icon={cat.icon}
                color={cat.color}
                onPress={() => navigation.navigate('Market', { category: cat.label })}
              />
            ))}
          </View>
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
            { icon: Truck, title: t('verifiedCouriers') },
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
            <CustomText variant="h2">{t('featuredProducts')}</CustomText>
            <TouchableOpacity onPress={() => navigation.navigate('Market')}>
              <CustomText variant="subtitle" style={{ color: colors.primary }}>{t('seeAll')}</CustomText>
            </TouchableOpacity>
          </View>
          <View style={styles.productsGrid}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              liveProducts.map((item) => (
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

      <AuthOverlay />
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
  },
  heroImage: {
    height: 380,
    width: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroOverlay: {
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 32,
    lineHeight: 38,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
  },
  heroButton: {
    marginTop: 24,
    width: 140,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trustBar: {
    borderRadius: 20,
    marginVertical: 10,
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
