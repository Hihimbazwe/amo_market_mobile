import React, { useEffect, useState } from 'react';
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
  Image
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
} from 'lucide-react-native';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import AuthOverlay from '../components/AuthOverlay';
import CategoryItem from '../components/CategoryItem';
import ProductCard from '../components/ProductCard';
import GlassContainer from '../components/GlassContainer';
import { Colors } from '../theme/colors';
import { productService } from '../api/productService';

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

const HomeScreen = ({ navigation }) => {
  const [liveProducts, setLiveProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchFeatured = async () => {
      setLoading(true);
      try {
        const data = await productService.getProducts();
        setLiveProducts(data.slice(0, 4));
      } catch (error) {
        console.error('Home fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, isSearchMode && styles.headerSearchMode]}>
        {!isSearchMode ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={{ marginRight: 16 }}>
                <Menu color={Colors.foreground} size={24} />
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
              <TouchableOpacity onPress={toggleSearch}>
                <Search color={Colors.foreground} size={24} style={{ marginRight: 16 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
                <ShoppingCart color={Colors.foreground} size={24} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.searchBarContainer}>
            <TouchableOpacity onPress={toggleSearch} style={styles.closeSearchBtn}>
              <X color={Colors.foreground} size={24} />
            </TouchableOpacity>
            <View style={styles.searchInputWrapper}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                placeholderTextColor={Colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                onSubmitEditing={handleSearchSubmit}
              />
              <TouchableOpacity onPress={handleSearchSubmit}>
                <Search color={Colors.primary} size={20} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
  
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200' }}
            style={styles.heroImage}
            imageStyle={{ borderRadius: 24 }}
          >
            <View style={styles.heroOverlay}>
              <CustomText variant="h1" style={styles.heroTitle}>
                Discover the Future of Shopping
              </CustomText>
              <CustomText variant="subtitle" style={styles.heroSubtitle}>
                Premium products from verified Rwanda sellers.
              </CustomText>
              <CustomButton 
                title="Shop Now" 
                style={styles.heroButton}
                onPress={() => navigation.navigate('Market')} 
              />
            </View>
          </ImageBackground>
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CustomText variant="h2">Popular Categories</CustomText>
            <TouchableOpacity onPress={() => navigation.navigate('Market')}>
              <CustomText variant="subtitle" style={{ color: Colors.primary }}>View all</CustomText>
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
          style={styles.trustBar}
          contentContainerStyle={styles.trustBarContent}
        >
          {[
            { icon: ShieldCheck, title: "Buyer Protection" },
            { icon: Truck, title: "Verified Couriers" },
            { icon: Headphones, title: "24/7 Support" },
            { icon: Star, title: "Verified Sellers" }
          ].map((item, index) => (
            <View key={index} style={styles.trustItem}>
              <View style={styles.trustIconContainer}>
                <item.icon size={20} color={Colors.primary} />
              </View>
              <CustomText variant="caption" style={styles.trustText}>{item.title}</CustomText>
            </View>
          ))}
        </ScrollView>

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CustomText variant="h2">Featured Products</CustomText>
            <TouchableOpacity onPress={() => navigation.navigate('Market')}>
              <CustomText variant="subtitle" style={{ color: Colors.primary }}>See all</CustomText>
            </TouchableOpacity>
          </View>
          <View style={styles.productsGrid}>
            {liveProducts.map((item) => (
              <ProductCard key={item.id} product={item} onPress={() => navigation.navigate('ProductDetail', { product: item })} />
            ))}
          </View>
        </View>

        {/* PRO Banner */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <GlassContainer style={styles.proBanner}>
            <View style={styles.proBadge}>
              <CustomText style={styles.proBadgeText}>⭐ PRO SELLER</CustomText>
            </View>
            <CustomText variant="h2" style={{ color: Colors.white, marginTop: 12 }}>
              Unlock Premium Features
            </CustomText>
            <CustomText variant="subtitle" style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>
              Boost your visibility and sales with Pro.
            </CustomText>
            <CustomButton 
              title="Get Started" 
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerSearchMode: {
    paddingHorizontal: 12,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeSearchBtn: {
    padding: 8,
    marginRight: 4,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    color: Colors.foreground,
    fontSize: 16,
    paddingVertical: 8,
  },
  logoText: {
    letterSpacing: 1,
    fontWeight: '900',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  welcomeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  welcomeInfo: {
    flex: 1,
  },
  authButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
  },
  loginBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  registerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
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
    color: Colors.white,
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
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderRadius: 20,
    marginVertical: 10,
    paddingHorizontal: 10,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  trustBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
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
    color: Colors.foreground,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  proBanner: {
    backgroundColor: Colors.primary,
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
    color: Colors.white,
  },
});

export default HomeScreen;
