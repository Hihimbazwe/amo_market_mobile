import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Pencil, 
  Eye, 
  EyeOff, 
  Flame, 
  Tag, 
  Box, 
  CheckCircle2, 
  Package,
  Play
} from 'lucide-react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { productService } from '../../api/productService';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const formatRwf = (amount) => {
  return `Rwf ${Math.round(amount || 0).toLocaleString()}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const SellerProductDetailScreen = ({ route, navigation }) => {
  const { productId, product: initialProduct } = route.params || {};
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  
  const [product, setProduct] = useState(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct);

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId && !initialProduct?.id) return;
      try {
        setLoading(true);
        // Pass user.id to allow viewing drafts
        const data = await productService.getProductById(productId || initialProduct.id, user?.id);
        if (data) {
          setProduct(data);
        }
      } catch (error) {
        console.error('Error fetching product details:', error);
        // Don't show alert if we already have initial data
        if (!product) {
          Alert.alert('Error', 'Could not load product details.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadProduct();
  }, [productId, initialProduct, user?.id]);

  if (loading || !product) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const media = product.media || [];
  const attributes = product.attributes || [];
  const variants = product.variants || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.card} />
      
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.foreground} size={24} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <CustomText style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
              {product.title}
            </CustomText>
            <CustomText style={[styles.headerSubtitle, { color: colors.muted }]}>
              #{product.id.slice(-6).toUpperCase()} · {product.category}
            </CustomText>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.05)' }]}
              onPress={() => {
                // Navigate back to inventory and handle edit logic
                navigation.goBack();
                // Note: The parent screen should handle opening the edit modal if needed
              }}
            >
              <Pencil size={14} color={colors.foreground} />
              <CustomText style={[styles.actionBtnText, { color: colors.foreground }]}>Edit Product</CustomText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => navigation.navigate('ProductDetail', { product })}
            >
              <Eye size={14} color="#fff" />
              <CustomText style={[styles.actionBtnText, { color: '#fff' }]}>Preview Store Page</CustomText>
            </TouchableOpacity>
          </View>

          {/* Media Section */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {media.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, padding: 16 }}>
                {media.map((item) => (
                  <View key={item.id} style={[styles.mediaItem, { borderColor: colors.border }]}>
                    {item.type?.toLowerCase() === 'video' || item.url?.match(/\.(mp4|mov|avi|webm)$/i) ? (
                      <View style={[styles.mediaImage, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
                        <Play size={24} color="#fff" fill="#fff" />
                      </View>
                    ) : (
                      <Image source={{ uri: item.url }} style={styles.mediaImage} />
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.emptyMedia, { borderColor: colors.border }]}>
                <Package size={32} color={colors.muted} />
                <CustomText style={{ color: colors.muted, marginTop: 8 }}>No media uploaded</CustomText>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CustomText variant="h3" style={[styles.sectionTitle, { color: colors.foreground }]}>Description</CustomText>
            <CustomText style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>
              {product.description || "No description added yet."}
            </CustomText>
          </View>

          {/* Attributes */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CustomText style={styles.gridTitle}>ATTRIBUTES</CustomText>
            {attributes.length > 0 ? (
              <View style={{ gap: 8 }}>
                {attributes.map(attr => (
                  <View key={attr.id} style={styles.attrRow}>
                    <CustomText style={[styles.attrName, { color: colors.muted }]}>{attr.name}</CustomText>
                    <CustomText style={[styles.attrValue, { color: colors.foreground }]}>{attr.value}</CustomText>
                  </View>
                ))}
              </View>
            ) : (
              <CustomText style={{ color: colors.muted, fontSize: 12 }}>No extra attributes.</CustomText>
            )}
          </View>

          {/* Variants */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CustomText style={styles.gridTitle}>VARIANTS</CustomText>
            {variants.length > 0 ? (
              <View style={{ gap: 8 }}>
                {variants.map(variant => (
                  <View key={variant.id} style={[styles.variantBox, { borderColor: colors.border }]}>
                    <View style={styles.variantTop}>
                      <CustomText style={[styles.variantName, { color: colors.foreground }]}>{variant.name}: {variant.value}</CustomText>
                      <CustomText style={[styles.variantStock, { color: colors.muted }]}>Stock {variant.stock ?? 0}</CustomText>
                    </View>
                    {typeof variant.price === "number" && variant.price > 0 && (
                      <CustomText style={styles.variantPrice}>+{formatRwf(variant.price)}</CustomText>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <CustomText style={{ color: colors.muted, fontSize: 12 }}>No variants added.</CustomText>
            )}
          </View>


          {/* Product Details */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CustomText variant="h3" style={[styles.sectionTitle, { color: colors.foreground }]}>Product Details</CustomText>
            
            <View style={styles.detailRow}>
              <CustomText style={[styles.detailLabel, { color: colors.muted }]}>Price</CustomText>
              <CustomText style={[styles.detailValue, { color: colors.primary, fontWeight: '900' }]}>{formatRwf(product.price)}</CustomText>
            </View>
            <View style={styles.detailRow}>
              <CustomText style={[styles.detailLabel, { color: colors.muted }]}>Stock</CustomText>
              <CustomText style={[styles.detailValue, { color: colors.foreground }]}>{product.stock ?? 0}</CustomText>
            </View>
            <View style={styles.detailRow}>
              <CustomText style={[styles.detailLabel, { color: colors.muted }]}>Province</CustomText>
              <CustomText style={[styles.detailValue, { color: colors.foreground }]}>{product.province || '-'}</CustomText>
            </View>
            <View style={styles.detailRow}>
              <CustomText style={[styles.detailLabel, { color: colors.muted }]}>District</CustomText>
              <CustomText style={[styles.detailValue, { color: colors.foreground }]}>{product.district || '-'}</CustomText>
            </View>
            <View style={styles.detailRow}>
              <CustomText style={[styles.detailLabel, { color: colors.muted }]}>Delivery</CustomText>
              <CustomText style={[styles.detailValue, { color: colors.foreground }]}>{product.deliveryOptions || '-'}</CustomText>
            </View>
            <View style={styles.detailRow}>
              <CustomText style={[styles.detailLabel, { color: colors.muted }]}>Added On</CustomText>
              <CustomText style={[styles.detailValue, { color: colors.foreground }]}>{formatDate(product.createdAt)}</CustomText>
            </View>
            <View style={styles.detailRow}>
              <CustomText style={[styles.detailLabel, { color: colors.muted }]}>Status</CustomText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {product.published ? <CheckCircle2 size={14} color="#4ade80" /> : <EyeOff size={14} color="#fbbf24" />}
                <CustomText style={[styles.detailValue, { color: colors.foreground }]}>{product.published ? "Live" : "Draft"}</CustomText>
              </View>
            </View>
          </View>


          {/* Flags */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 40 }]}>
            <CustomText variant="h3" style={[styles.sectionTitle, { color: colors.foreground }]}>Flags</CustomText>
            <View style={styles.flagsContainer}>
              
              <View style={[styles.flagBadge, product.published ? styles.flagPublished : [styles.flagDraft, { borderColor: colors.border }]]}>
                {product.published ? <Eye size={12} color="#4ade80" /> : <EyeOff size={12} color={colors.muted} />}
                <CustomText style={[styles.flagText, { color: product.published ? '#4ade80' : colors.muted }]}>
                  {product.published ? "Published" : "Draft"}
                </CustomText>
              </View>

              {product.isHotDeal && (
                <View style={[styles.flagBadge, styles.flagHotDeal]}>
                  <Flame size={12} color="#f87171" />
                  <CustomText style={[styles.flagText, { color: '#f87171' }]}>Hot Deal</CustomText>
                </View>
              )}

              {product.isDiscount && (
                <View style={[styles.flagBadge, styles.flagDiscount]}>
                  <Tag size={12} color="#c084fc" />
                  <CustomText style={[styles.flagText, { color: '#c084fc' }]}>
                    {product.discountPercent ? `-${product.discountPercent}%` : "Discount"}
                  </CustomText>
                </View>
              )}

              {product.isAuthentic && (
                <View style={[styles.flagBadge, styles.flagAuthentic]}>
                  <Box size={12} color="#60a5fa" />
                  <CustomText style={[styles.flagText, { color: '#60a5fa' }]}>Authentic</CustomText>
                </View>
              )}

            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  mediaItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  emptyMedia: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    margin: 16,
  },
  gridTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 12,
  },
  attrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  attrName: {
    fontSize: 12,
    flex: 1,
  },
  attrValue: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  variantBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  variantTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variantName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  variantStock: {
    fontSize: 11,
  },
  variantPrice: {
    fontSize: 11,
    color: '#f97316',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  flagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  flagText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  flagPublished: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  flagDraft: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  flagHotDeal: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  flagDiscount: {
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderColor: 'rgba(192, 132, 252, 0.2)',
  },
  flagAuthentic: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderColor: 'rgba(96, 165, 250, 0.2)',
  },
});

export default SellerProductDetailScreen;
