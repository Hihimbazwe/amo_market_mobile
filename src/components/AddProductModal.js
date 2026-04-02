import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { X, Upload, Image as ImageIcon, Flame, ChevronDown, Video } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import CustomText from './CustomText';
import { Colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = ["Electronics", "Fashion", "Home & Living", "Sports", "Beauty", "Books", "Vehicles", "Other"];
const PROVINCES = ["Kigali City", "Northern Province", "Southern Province", "Eastern Province", "Western Province"];
// Simplified for mobile - you can expand this or fetch from an API
const DISTRICTS = {
  "Kigali City": ["Gasabo", "Kicukiro", "Nyarugenge"],
  "Northern Province": ["Burera", "Gakenke", "Gicumbi", "Musanze", "Rulindo"],
  "Southern Province": ["Gisagara", "Huye", "Kamonyi", "Muhanga", "Nyamagabe", "Nyanza", "Nyaruguru", "Ruhango"],
  "Eastern Province": ["Bugesera", "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Nyagatare", "Rwamagana"],
  "Western Province": ["Karongi", "Ngororero", "Nyabihu", "Nyamasheke", "Rubavu", "Rutsiro", "Rusizi"]
};
const DELIVERY_OPTIONS = ["Delivery", "Pickup"];

const AddProductModal = ({ visible, onClose, onSubmit, isSubmitting, initialData = null }) => {
  const { colors, isDarkMode } = useTheme();
  const [form, setForm] = useState({
    title: '', category: '', price: '', stock: '',
    province: '', district: '', deliveryOptions: DELIVERY_OPTIONS[0], deliveryCost: '0',
    description: ''
  });
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setForm({
          title: initialData.title || '',
          category: initialData.category || '',
          price: initialData.price ? initialData.price.toString() : '',
          stock: initialData.stock ? initialData.stock.toString() : '',
          province: initialData.province || '',
          district: initialData.district || '',
          deliveryOptions: initialData.deliveryOptions || DELIVERY_OPTIONS[0],
          deliveryCost: initialData.deliveryCost ? initialData.deliveryCost.toString() : '0',
          description: initialData.description || ''
        });
        if (initialData.media && initialData.media.length > 0) {
          setImages(initialData.media.map(m => ({
            uri: m.url,
            type: m.type?.toLowerCase() === 'video' ? 'video' : 'image',
            mimeType: m.type?.toLowerCase() === 'video' ? 'video/mp4' : 'image/jpeg',
            isExisting: true
          })));
        } else {
          setImages([]);
        }
      } else {
        setForm({
          title: '', category: '', price: '', stock: '',
          province: '', district: '', deliveryOptions: DELIVERY_OPTIONS[0], deliveryCost: '0',
          description: ''
        });
        setImages([]);
      }
    }
  }, [visible, initialData]);
  
  const updateForm = (key, value) => {
    if (key === 'province') {
      setForm(prev => ({ ...prev, province: value, district: '' }));
    } else {
      setForm(prev => ({ ...prev, [key]: value }));
    }
  };

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can only upload up to 5 media files.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages(prev => [...prev, {
        uri: result.assets[0].uri,
        type: 'image',
        mimeType: result.assets[0].mimeType
      }]);
    }
  };

  const pickVideo = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can only upload up to 5 media files.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) {
        Alert.alert('File too large', 'Please upload a video under 100MB.');
        return;
      }
      setImages(prev => [...prev, {
        uri: asset.uri,
        type: 'video',
        mimeType: asset.mimeType
      }]);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (published) => {
    if (!form.title || !form.category || !form.price || !form.stock || !form.province || !form.district || !form.description) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    
    if (images.length === 0) {
      Alert.alert('Error', 'Please add at least one media file.');
      return;
    }

    onSubmit({
      title: form.title,
      category: form.category,
      price: parseInt(form.price.replace(/[^0-9]/g, '') || '0', 10),
      stock: parseInt(form.stock.replace(/[^0-9]/g, '') || '0', 10),
      province: form.province,
      district: form.district,
      deliveryOptions: form.deliveryOptions,
      deliveryCost: parseInt(form.deliveryCost.replace(/[^0-9]/g, '') || '0', 10),
      description: form.description,
      published: published,
    }, images);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.glass }]} disabled={isSubmitting}>
            <X color={colors.foreground} size={24} />
          </TouchableOpacity>
          <CustomText variant="h3">{initialData ? "Edit Product" : "New Product"}</CustomText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Images Section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CustomText style={[styles.sectionTitle, { color: colors.foreground }]}>Media (Max 5)</CustomText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
              {images.map((media, index) => (
                <View key={index} style={styles.imageBox}>
                  {media.type === 'video' ? (
                    <View style={[styles.image, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
                      <Video color={Colors.muted} size={32} />
                    </View>
                  ) : (
                    <Image source={{ uri: media.uri }} style={styles.image} />
                  )}
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <CustomText style={styles.coverText}>COVER</CustomText>
                    </View>
                  )}
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)} disabled={isSubmitting}>
                    <X color={Colors.white} size={14} />
                  </TouchableOpacity>
                </View>
              ))}
              
              {images.length < 5 && (
                <>
                  <TouchableOpacity style={styles.addImageBtn} onPress={pickImage} disabled={isSubmitting}>
                    <ImageIcon color={Colors.muted} size={24} />
                    <CustomText style={styles.addText}>Add Photo</CustomText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addImageBtn} onPress={pickVideo} disabled={isSubmitting}>
                    <Video color={Colors.muted} size={24} />
                    <CustomText style={styles.addText}>Add Video</CustomText>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>

          {/* Info Section */}
          <View style={styles.section}>
            <CustomText style={styles.sectionTitle}>Product Information</CustomText>
            
            <View style={styles.inputGroup}>
              <CustomText style={styles.label}>Title *</CustomText>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.foreground }]} 
                placeholder="E.g., Wireless Headphones" 
                placeholderTextColor={colors.muted}
                value={form.title}
                onChangeText={v => updateForm('title', v)}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <CustomText style={styles.label}>Price (Rwf) *</CustomText>
                <TextInput 
                  style={styles.input} 
                  placeholder="0" 
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                  value={form.price}
                  onChangeText={v => updateForm('price', v)}
                  editable={!isSubmitting}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <CustomText style={styles.label}>Stock *</CustomText>
                <TextInput 
                  style={styles.input} 
                  placeholder="0" 
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                  value={form.stock}
                  onChangeText={v => updateForm('stock', v)}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <CustomText style={styles.label}>Category *</CustomText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.chip, form.category === cat && styles.chipActive]}
                    onPress={() => updateForm('category', cat)}
                    disabled={isSubmitting}
                  >
                    <CustomText style={[styles.chipText, form.category === cat && styles.chipTextActive]}>{cat}</CustomText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <CustomText style={styles.sectionTitle}>Location & Delivery</CustomText>
            
            <View style={styles.inputGroup}>
              <CustomText style={styles.label}>Province *</CustomText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {PROVINCES.map(prov => (
                  <TouchableOpacity 
                    key={prov} 
                    style={[styles.chip, form.province === prov && styles.chipActive]}
                    onPress={() => updateForm('province', prov)}
                    disabled={isSubmitting}
                  >
                    <CustomText style={[styles.chipText, form.province === prov && styles.chipTextActive]}>{prov}</CustomText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {form.province ? (
              <View style={styles.inputGroup}>
                <CustomText style={styles.label}>District *</CustomText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {DISTRICTS[form.province].map(dist => (
                    <TouchableOpacity 
                      key={dist} 
                      style={[styles.chip, form.district === dist && styles.chipActive]}
                      onPress={() => updateForm('district', dist)}
                      disabled={isSubmitting}
                    >
                      <CustomText style={[styles.chipText, form.district === dist && styles.chipTextActive]}>{dist}</CustomText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <CustomText style={styles.label}>Delivery Option *</CustomText>
              <View style={styles.chipsScroll}>
                {DELIVERY_OPTIONS.map(opt => (
                  <TouchableOpacity 
                    key={opt} 
                    style={[styles.chip, { backgroundColor: colors.glass, borderColor: colors.border }, form.deliveryOptions === opt && { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}
                    onPress={() => updateForm('deliveryOptions', opt)}
                    disabled={isSubmitting}
                  >
                    <CustomText style={[styles.chipText, form.deliveryOptions === opt && { color: colors.primary, fontWeight: 'bold' }]}>{opt}</CustomText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {form.deliveryOptions !== 'Pickup' && (
              <View style={styles.inputGroup}>
                <CustomText style={styles.label}>Delivery Cost (Rwf)</CustomText>
                <TextInput 
                  style={styles.input} 
                  placeholder="0" 
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                  value={form.deliveryCost}
                  onChangeText={v => updateForm('deliveryCost', v)}
                  editable={!isSubmitting}
                />
              </View>
            )}
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <CustomText style={styles.sectionTitle}>Description *</CustomText>
              <CustomText style={styles.charCount}>{form.description.length}/500</CustomText>
            </View>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="Describe your product..." 
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              numberOfLines={4}
              maxLength={500}
              value={form.description}
              onChangeText={v => updateForm('description', v)}
              editable={!isSubmitting}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {isSubmitting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#F97316" size="large" />
              <CustomText style={styles.loadingText}>Uploading product...</CustomText>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.draftBtn} onPress={() => handleSubmit(false)}>
                <CustomText style={styles.draftText}>Save Draft</CustomText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.publishBtn} onPress={() => handleSubmit(true)}>
                <Upload color={Colors.white} size={18} style={{ marginRight: 8 }} />
                <CustomText style={styles.publishText}>Publish Product</CustomText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' 
  },
  closeBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
  body: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  section: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.white, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, color: Colors.muted, marginBottom: 8, fontWeight: 'bold' },
  input: { 
    backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: Colors.white, fontSize: 14 
  },
  textArea: { height: 100 },
  row: { flexDirection: 'row' },
  chipsScroll: { flexDirection: 'row' },
  chip: { 
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 8, backgroundColor: 'rgba(255,255,255,0.05)' 
  },
  chipActive: { backgroundColor: 'rgba(249, 115, 22, 0.1)', borderColor: 'rgba(249, 115, 22, 0.4)' },
  chipText: { color: Colors.muted, fontSize: 13 },
  chipTextActive: { color: '#F97316', fontWeight: 'bold' },
  imageScroll: { flexDirection: 'row', gap: 12 },
  imageBox: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  image: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 4 },
  coverBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(249, 115, 22, 0.9)', paddingVertical: 4, alignItems: 'center' },
  coverText: { color: Colors.white, fontSize: 9, fontWeight: 'bold' },
  addImageBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
  addText: { color: Colors.muted, fontSize: 11, marginTop: 4 },
  footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', backgroundColor: Colors.background, gap: 12 },
  draftBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  draftText: { color: Colors.muted, fontWeight: 'bold' },
  publishBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  publishText: { color: Colors.white, fontWeight: 'bold', fontSize: 15 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  loadingText: { color: '#F97316', marginTop: 8, fontWeight: 'bold' },
  charCount: { fontSize: 11, color: Colors.muted }
});

export default AddProductModal;
