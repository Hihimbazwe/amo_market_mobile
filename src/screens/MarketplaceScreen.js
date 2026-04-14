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
import { Search, Filter, X, ChevronDown } from 'lucide-react-native';
import CustomText from '../components/CustomText';
import ProductCard from '../components/ProductCard';
import CustomButton from '../components/CustomButton';
import AuthOverlay from '../components/AuthOverlay';
import NotificationIcon from '../components/NotificationIcon';
import {Text } from 'react-native';
import { productService } from '../api/productService';
import { useFocusEffect } from '@react-navigation/native';

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

const FilterModal = ({ visible, onClose, filters, setFilters }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <CustomText variant="h2">Filters</CustomText>
            <TouchableOpacity onPress={onClose}>
              <X color="#e2e8f0" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.filterSection}>
              <CustomText variant="subtitle" style={styles.filterLabel}>PROVINCE</CustomText>
              <View style={styles.pickerContainer}>
                <CustomText>{filters.province}</CustomText>
                <ChevronDown color={'#94a3b8'} size={20} />
              </View>
              {/* Note: Simplified UI for choosing */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {provinces.map(p => (
                  <TouchableOpacity 
                    key={p} 
                    onPress={() => setFilters({ ...filters, province: p, district: "All Districts" })}
                    style={[styles.chip, filters.province === p && styles.activeChip]}
                  >
                    <CustomText style={filters.province === p && styles.activeChipText}>{p}</CustomText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <CustomText variant="subtitle" style={styles.filterLabel}>DISTRICT</CustomText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {(provinceDistricts[filters.province] || ["All Districts"]).map(d => (
                  <TouchableOpacity 
                    key={d} 
                    onPress={() => setFilters({ ...filters, district: d })}
                    style={[styles.chip, filters.district === d && styles.activeChip]}
                  >
                    <CustomText style={filters.district === d && styles.activeChipText}>{d}</CustomText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <CustomText variant="subtitle" style={styles.filterLabel}>CATEGORY</CustomText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {categories.map(c => (
                  <TouchableOpacity 
                    key={c} 
                    onPress={() => setFilters({ ...filters, category: c })}
                    style={[styles.chip, filters.category === c && styles.activeChip]}
                  >
                    <CustomText style={filters.category === c && styles.activeChipText}>{c}</CustomText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <CustomText variant="subtitle" style={styles.filterLabel}>PRICE RANGE (UP TO)</CustomText>
              <TextInput 
                style={styles.priceInput}
                keyboardType="numeric"
                placeholder="Maximum Price"
                placeholderTextColor={'#94a3b8'}
                value={filters.maxPrice.toString()}
                onChangeText={(text) => setFilters({ ...filters, maxPrice: text.replace(/[^0-9]/g, '') })}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <CustomButton 
              title="Apply Filters" 
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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productService.getProducts(filters);
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
  useEffect(() => {
    fetchProducts();
  }, [filters.category, filters.province, filters.district]);

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search color={'#94a3b8'} size={20} style={styles.searchIcon} />
          <TextInput 
            style={styles.input}
            placeholder="Search marketplace..."
            placeholderTextColor={'#94a3b8'}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X color={'#94a3b8'} size={20} />
            </TouchableOpacity>
          )}
        </View>
        <NotificationIcon />
        <TouchableOpacity 
          style={styles.filterButton}
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
      />

      {/* Product List */}
      {loading && filteredProducts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e67e22" />
          <CustomText style={{ marginTop: 12, color: '#94a3b8' }}>Loading products...</CustomText>
        </View>
      ) : (
        <FlatList 
          data={filteredProducts}
          refreshing={loading}
          onRefresh={fetchProducts}
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
              <CustomText variant="subtitle">
                {filters.category !== "All Categories" ? `${filters.category} in ` : ""}
                {filters.province !== "All Provinces" ? `${filters.province}` : "Marketplace"}
              </CustomText>
            </View>
          )}
          ListEmptyComponent={() => !loading && (
            <View style={styles.loadingContainer}>
              <CustomText style={{ color: '#94a3b8' }}>No products found matching your criteria.</CustomText>
            </View>
          )}
        />
      )}

      <AuthOverlay />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
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
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  filterButton: {
    backgroundColor: '#e67e22',
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
    backgroundColor: '#0b101b',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '80%',
    padding: 24,
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
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  activeChip: {
    backgroundColor: '#e67e22',
    borderColor: '#e67e22',
  },
  activeChipText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  priceInput: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 12,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
});

export default MarketplaceScreen;
