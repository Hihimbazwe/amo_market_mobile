import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Menu, Heart } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { Colors } from '../../theme/colors';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import ProductCard from '../../components/ProductCard';

const mockWishlist = [
  { id: '101', name: 'Smartphone Case', price: 15000, location: 'Kigali', image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=400' },
  { id: '102', name: 'Fast Charger', price: 45000, location: 'Kigali', image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400' },
];

const BuyerWishlistScreen = ({ navigation }) => {
  const { toggleDrawer } = React.useContext(DrawerContext);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
          <Menu color={Colors.white} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">My Wishlist</CustomText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {mockWishlist.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart color={Colors.muted} size={48} />
            <CustomText variant="subtitle" style={{ marginTop: 16 }}>Your wishlist is empty.</CustomText>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {mockWishlist.map((item) => (
              <ProductCard 
                key={item.id} 
                product={item} 
                onPress={() => navigation.navigate('Home', { screen: 'ProductDetail', params: { product: item } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  content: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

export default BuyerWishlistScreen;
