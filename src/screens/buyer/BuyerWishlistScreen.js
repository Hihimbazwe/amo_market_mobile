import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Menu, Heart } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText';
import { BuyerDrawerContext as DrawerContext } from '../../context/BuyerDrawerContext';
import { useTheme } from '../../context/ThemeContext';
import { useWishlist } from '../../context/WishlistContext';
import ProductCard from '../../components/ProductCard';

const BuyerWishlistScreen = ({ navigation }) => {
  const { toggleDrawer } = React.useContext(DrawerContext);
  const { colors } = useTheme();
  const { wishlistItems, loading } = useWishlist();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">My Wishlist</CustomText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading && wishlistItems.length === 0 ? (
          <View style={styles.emptyState}>
             <Heart color={colors.muted} size={48} />
             <CustomText variant="subtitle" style={{ marginTop: 16 }}>Loading wishlist...</CustomText>
          </View>
        ) : wishlistItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart color={colors.muted} size={48} />
            <CustomText variant="subtitle" style={{ marginTop: 16, color: colors.muted }}>Your wishlist is empty.</CustomText>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {wishlistItems.map((item) => (
              <ProductCard 
                key={item.id} 
                product={item.product} 
                onPress={() => navigation.navigate('Home', { screen: 'ProductDetail', params: { product: item.product } })}
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
