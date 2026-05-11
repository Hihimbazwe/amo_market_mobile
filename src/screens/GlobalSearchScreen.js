import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView
} from 'react-native';
import {
  Search,
  ArrowLeft,
  X,
  Package,
  ShoppingBag,
  User,
  ChevronRight,
  History,
  TrendingUp,
  Tag
} from 'lucide-react-native';
import CustomText from '../components/CustomText';
import { useTheme } from '../context/ThemeContext';
import { productService } from '../api/productService';

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const { width } = Dimensions.get('window');

const GlobalSearchScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ products: [], orders: [], users: [] });
  const [activeTab, setActiveTab] = useState('ALL');

  const searchAPI = useCallback(
    debounce(async (q) => {
      if (q.length < 2) {
        setResults({ products: [], orders: [], users: [] });
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${productService.API_BASE_URL}/api/search?q=${encodeURIComponent(q)}`);
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('[SEARCH_ERROR]', error);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (query.length >= 2) {
      setLoading(true);
      searchAPI(query);
    } else {
      setResults({ products: [], orders: [], users: [] });
      setLoading(false);
    }
  }, [query, searchAPI]);

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: colors.border }]}
      onPress={() => navigation.navigate('ProductDetail', { product: item })}
    >
      <Image
        source={{ uri: item.media?.[0]?.url || 'https://via.placeholder.com/150' }}
        style={styles.productThumb}
      />
      <View style={styles.resultInfo}>
        <CustomText style={{ color: colors.foreground, fontWeight: 'bold' }}>{item.title}</CustomText>
        <CustomText style={{ color: colors.primary, fontSize: 12 }}>Rwf {item.price.toLocaleString()}</CustomText>
        <CustomText style={{ color: colors.muted, fontSize: 10 }}>{item.category}</CustomText>
      </View>
      <ChevronRight size={16} color={colors.muted} />
    </TouchableOpacity>
  );

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: colors.border }]}
      onPress={() => navigation.navigate('OrderSuccess', { orderId: item.id })}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.glass }]}>
        <ShoppingBag size={20} color={colors.primary} />
      </View>
      <View style={styles.resultInfo}>
        <CustomText style={{ color: colors.foreground, fontWeight: 'bold' }}>Order #{item.id.slice(-8).toUpperCase()}</CustomText>
        <CustomText style={{ color: colors.muted, fontSize: 12 }}>Recipient: {item.recipientName}</CustomText>
        <CustomText style={{ color: colors.primary, fontSize: 10 }}>{item.status}</CustomText>
      </View>
      <ChevronRight size={16} color={colors.muted} />
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: colors.border }]}
      onPress={() => navigation.navigate('SellerStore', { sellerId: item.id, sellerName: item.name })}
    >
      <View style={[styles.userThumb, { backgroundColor: colors.glass }]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.userThumbImage} />
        ) : (
          <User size={20} color={colors.primary} />
        )}
      </View>
      <View style={styles.resultInfo}>
        <CustomText style={{ color: colors.foreground, fontWeight: 'bold' }}>{item.name}</CustomText>
        <CustomText style={{ color: colors.muted, fontSize: 12 }}>Official Seller</CustomText>
      </View>
      <ChevronRight size={16} color={colors.muted} />
    </TouchableOpacity>
  );

  const filteredData = () => {
    if (activeTab === 'PRODUCTS') return results.products;
    if (activeTab === 'ORDERS') return results.orders;
    if (activeTab === 'USERS') return results.users;
    
    // Combine for ALL
    const combined = [];
    if (results.products.length > 0) combined.push({ type: 'HEADER', title: 'Products' }, ...results.products.map(i => ({ ...i, type: 'PRODUCT' })));
    if (results.orders.length > 0) combined.push({ type: 'HEADER', title: 'Orders' }, ...results.orders.map(i => ({ ...i, type: 'ORDER' })));
    if (results.users.length > 0) combined.push({ type: 'HEADER', title: 'Sellers' }, ...results.users.map(i => ({ ...i, type: 'USER' })));
    return combined;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        
        <View style={[styles.searchBox, { backgroundColor: colors.glass, borderColor: colors.border }]}>
          <Search color={colors.muted} size={18} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Search products, orders, sellers..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X color={colors.muted} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.length < 2 ? (
        <ScrollView style={styles.initialState}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <History size={16} color={colors.muted} />
              <CustomText style={[styles.sectionTitle, { color: colors.muted }]}>Recent Searches</CustomText>
            </View>
            <View style={styles.tags}>
              {['iPhone 15', 'Sneakers', 'Laptops', 'Organic Honey'].map(tag => (
                <TouchableOpacity key={tag} style={[styles.tag, { backgroundColor: colors.glass, borderColor: colors.border }]} onPress={() => setQuery(tag)}>
                  <CustomText style={{ fontSize: 12, color: colors.foreground }}>{tag}</CustomText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={16} color={colors.primary} />
              <CustomText style={[styles.sectionTitle, { color: colors.primary }]}>Trending Now</CustomText>
            </View>
            {['MacBook Air M3', 'Air Jordan 1', 'Smart Watch', 'Skin Care Kit'].map((item, i) => (
              <TouchableOpacity key={i} style={styles.trendingItem} onPress={() => setQuery(item)}>
                <Tag size={14} color={colors.muted} />
                <CustomText style={{ color: colors.foreground, marginLeft: 12 }}>{item}</CustomText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
            {['ALL', 'PRODUCTS', 'ORDERS', 'USERS'].map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
              >
                <CustomText style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.muted }]}>{tab}</CustomText>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : filteredData().length > 0 ? (
            <FlatList
              data={filteredData()}
              keyExtractor={(item, index) => item.id || `h-${index}`}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                if (item.type === 'HEADER') {
                  return (
                    <View style={styles.listHeader}>
                      <CustomText style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>{item.title}</CustomText>
                    </View>
                  );
                }
                if (item.type === 'PRODUCT' || activeTab === 'PRODUCTS') return renderProductItem({ item });
                if (item.type === 'ORDER' || activeTab === 'ORDERS') return renderOrderItem({ item });
                if (item.type === 'USER' || activeTab === 'USERS') return renderUserItem({ item });
                return null;
              }}
            />
          ) : (
            <View style={styles.center}>
              <Package size={48} color={colors.muted} opacity={0.3} />
              <CustomText style={{ color: colors.muted, marginTop: 12 }}>No results found for "{query}"</CustomText>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  backBtn: { marginRight: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  input: { flex: 1, marginLeft: 10, fontSize: 14, padding: 0 },
  initialState: { padding: 20 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { marginLeft: 8, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  trendingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1 },
  tab: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 12, fontWeight: 'bold' },
  list: { paddingBottom: 40 },
  listHeader: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.02)' },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  productThumb: { width: 50, height: 50, borderRadius: 8 },
  userThumb: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  userThumbImage: { width: '100%', height: '100%' },
  iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  resultInfo: { flex: 1, marginLeft: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }
});

export default GlobalSearchScreen;
