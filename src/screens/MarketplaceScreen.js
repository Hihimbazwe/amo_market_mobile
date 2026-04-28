import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StatusBar,
  Modal,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, X, ChevronDown, ArrowUp } from 'lucide-react-native';
import CustomText from '../components/CustomText';
import { useRef } from 'react';
import ProductCard from '../components/ProductCard';
import CustomButton from '../components/CustomButton';
import AuthOverlay from '../components/AuthOverlay';
import NotificationIcon from '../components/NotificationIcon';
import {Text } from 'react-native';
import { productService } from '../api/productService';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const provinces = ["All Provinces", "Kigali", "East", "North", "South", "West"];
const provinceDistricts = {
  "All Provinces": ["All Districts"],
  "Kigali": ["All Districts", "Gasabo", "Kicukiro", "Nyarugenge"],
  "East": ["All Districts", "Bugesera", "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Nyagatare", "Rwamagana"],
  "North": ["All Districts", "Burera", "Gakenke", "Gicumbi", "Musanze", "Rulindo"],
  "South": ["All Districts", "Gisagara", "Huye", "Kamonyi", "Muhanga", "Nyamagabe", "Nyanza", "Nyaruguru", "Ruhango"],
  "West": ["All Districts", "Karongi", "Ngororero", "Nyabihu", "Nyamasheke", "Rubavu", "Rusizi", "Rutsiro"]
};
const categories = ["All Categories", "Electronics", "Fashion", "Home & Living", "Sports", "Beauty", "Books", "Vehicles"];

const FilterModal = ({ visible, onClose, filters, setFilters, colors, t }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <CustomText variant="h2">{t('filters')}</CustomText>
            <TouchableOpacity onPress={onClose}>
              <X color={colors.foreground} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.filterSection}>
              <CustomText variant="subtitle" style={[styles.filterLabel, { color: colors.muted }]}>{t('province')}</CustomText>
              <View style={[styles.pickerContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <CustomText>{filters.province === "All Provinces" ? t('allProvinces') : filters.province}</CustomText>
                <ChevronDown color={colors.muted} size={20} />
              </View>
              {/* Note: Simplified UI for choosing */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {provinces.map(p => (
                  <TouchableOpacity 
                    key={p} 
                    onPress={() => setFilters({ ...filters, province: p, district: "All Districts" })}
                    style={[styles.chip, { backgroundColor: colors.glass, borderColor: colors.border }, filters.province === p && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <CustomText style={[filters.province === p && { color: '#ffffff', fontWeight: 'bold' }]}>{p === "All Provinces" ? t('allProvinces') : p}</CustomText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <CustomText variant="subtitle" style={[styles.filterLabel, { color: colors.muted }]}>{t('district')}</CustomText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {(provinceDistricts[filters.province] || ["All Districts"]).map(d => (
                  <TouchableOpacity 
                    key={d} 
                    onPress={() => setFilters({ ...filters, district: d })}
                    style={[styles.chip, { backgroundColor: colors.glass, borderColor: colors.border }, filters.district === d && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <CustomText style={[filters.district === d && { color: '#ffffff', fontWeight: 'bold' }]}>{d === "All Districts" ? t('allDistricts') : d}</CustomText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <CustomText variant="subtitle" style={[styles.filterLabel, { color: colors.muted }]}>{t('category')}</CustomText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {categories.map(c => (
                  <TouchableOpacity 
                    key={c} 
                    onPress={() => setFilters({ ...filters, category: c })}
                    style={[styles.chip, { backgroundColor: colors.glass, borderColor: colors.border }, filters.category === c && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <CustomText style={[filters.category === c && { color: '#ffffff', fontWeight: 'bold' }]}>{c === "All Categories" ? t('allCategories') : t(c.toLowerCase())}</CustomText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <CustomText variant="subtitle" style={[styles.filterLabel, { color: colors.muted }]}>{t('priceRange')}</CustomText>
              <TextInput 
                style={[styles.priceInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.foreground }]}
                keyboardType="numeric"
                placeholder={t('maxPrice')}
                placeholderTextColor={colors.muted}
                value={filters.maxPrice.toString()}
                onChangeText={(text) => setFilters({ ...filters, maxPrice: text.replace(/[^0-9]/g, '') })}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <CustomButton 
              title={t('applyFilters')} 
              onPress={onClose}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const MarketplaceScreen = ({ navigation, route }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const [search, setSearch] = useState(route.params?.search || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Initialize with values from navigation params if they exist
  const [filters, setFilters] = useState({
    province: "All Provinces",
    district: "All Districts",
    category: route.params?.category || "All Categories",
    maxPrice: 5000000
  });

  // Sync filters if route params change (e.g., navigating from Home with a different category or search)
  useEffect(() => {
    if (route.params?.category) {
      setFilters(prev => ({ ...prev, category: route.params.category }));
    }
    if (route.params?.search) {
      setSearch(route.params.search);
    }
  }, [route.params?.category, route.params?.search]);

  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef(null);
  const { user } = useAuth();

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  };
  
  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productService.getProducts({
        ...filters,
        followerId: user?.id
      });
      setAllProducts(data);
      applyLocalFilters(data, search, filters.maxPrice);
    } catch (error) {
      console.error('Fetch error:', error);
      const errorMsg = error.message || 'Unknown error occurred while fetching products.';
      require('react-native').Alert.alert(
        'Connection Error',
        `Failed to reach the marketplace: ${errorMsg}\n\nPlease check if your backend is running and your API_BASE_URL in .env is correct.`,
        [{ text: 'Retry', onPress: fetchProducts }, { text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when persistent filters change (Category, Region)
  useFocusEffect(
    React.useCallback(() => {
      fetchProducts();
    }, [filters.category, filters.province, filters.district])
  );

  // Apply local filtering when search or price changes
  const applyLocalFilters = (products, searchTerm, max) => {
    const filtered = products.filter(p => {
      const matchesSearch = !searchTerm || 
        (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesPrice = !max || p.price <= parseInt(max);
      
      return matchesSearch && matchesPrice;
    });
    setFilteredProducts(filtered);
  };

  useEffect(() => {
    applyLocalFilters(allProducts, search, filters.maxPrice);
  }, [search, filters.maxPrice, allProducts]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* Search Header */}
      <View style={styles.header}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Search color={colors.muted} size={20} style={styles.searchIcon} />
          <TextInput 
            style={[styles.input, { color: colors.foreground }]}
            placeholder={t('searchMarketplace')}
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X color={colors.muted} size={20} />
            </TouchableOpacity>
          )}
        </View>
        <NotificationIcon />
        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: colors.primary }]}
          onPress={() => setFiltersOpen(true)}
        >
          <Filter color={'#ffffff'} size={20} />
        </TouchableOpacity>
      </View>

      <FilterModal 
        visible={filtersOpen} 
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        setFilters={setFilters}
        colors={colors}
        t={t}
      />

      {/* Product List */}
      {loading && filteredProducts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <CustomText style={{ marginTop: 12, color: colors.muted }}>{t('loading')}...</CustomText>
        </View>
      ) : (
        <FlatList 
          ref={listRef}
          data={filteredProducts}
          refreshing={loading}
          onRefresh={fetchProducts}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { product: item })} />
          )}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              <CustomText variant="subtitle" style={{ color: colors.foreground }}>
                {filters.category !== "All Categories" ? `${t(filters.category.toLowerCase())} in ` : ""}
                {filters.province !== "All Provinces" ? `${filters.province}` : t('dashboard')}
              </CustomText>
            </View>
          )}
          ListEmptyComponent={() => !loading && (
            <View style={styles.loadingContainer}>
              <CustomText style={{ color: colors.muted }}>{t('noMarketplaceResults')}</CustomText>
            </View>
          )}
        />
      )}

      <AuthOverlay />

      {showScrollTop && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={scrollToTop} activeOpacity={0.8}>
          <ArrowUp color="#fff" size={24} />
        </TouchableOpacity>
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
    paddingTop: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  listHeader: {
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '80%',
    padding: 24,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalBody: {
    flex: 1,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  chipScroll: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  priceInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalFooter: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});

export default MarketplaceScreen;
