import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Modal, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Image, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { X, Upload, Image as ImageIcon, Flame, ChevronDown, Video, Plus, Check, Star } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import CustomText from './CustomText';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = ["Electronics", "Fashion", "Home & Living", "Sports", "Beauty", "Books", "Groceries", "Toys", "Vehicles", "Other"];
const PROVINCES = ["Kigali City", "Northern Province", "Southern Province", "Eastern Province", "Western Province"];
const DISTRICTS = {
  "Kigali City": ["Gasabo", "Kicukiro", "Nyarugenge"],
  "Northern Province": ["Burera", "Gakenke", "Gicumbi", "Musanze", "Rulindo"],
  "Southern Province": ["Gisagara", "Huye", "Kamonyi", "Muhanga", "Nyamagabe", "Nyanza", "Nyaruguru", "Ruhango"],
  "Eastern Province": ["Bugesera", "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Nyagatare", "Rwamagana"],
  "Western Province": ["Karongi", "Ngororero", "Nyabihu", "Nyamasheke", "Rubavu", "Rutsiro", "Rusizi"]
};
const DELIVERY_OPTIONS = ["Standard Delivery", "Express Delivery", "Pickup Only", "Standard + Express"];
const CONDITIONS = ["Brand New", "Like New", "Used (Good)", "Used (Fair)", "Refurbished"];

const CATEGORY_FIELDS = {
  books: [
    { name: "Author", placeholder: "e.g. Chinua Achebe", required: true },
    { name: "Genre", placeholder: "e.g. Fiction, Biography", required: true },
    { name: "Format", placeholder: "e.g. Paperback, Hardcover", required: true },
    { name: "Language", placeholder: "e.g. English, Kinyarwanda" },
    { name: "Pages", placeholder: "e.g. 320" },
    { name: "Publisher", placeholder: "e.g. Penguin Books" },
    { name: "ISBN", placeholder: "e.g. 978-..." },
  ],
  fashion: [
    { name: "Material", placeholder: "e.g. 100% Cotton", required: true },
    { name: "Fit", placeholder: "e.g. Slim, Regular, Oversized", required: true },
    { name: "Color", placeholder: "e.g. Black, Navy Blue", required: true },
    { name: "Size Range", placeholder: "e.g. S-XXL, 38-46" },
    { name: "Gender", placeholder: "e.g. Men, Women, Unisex" },
    { name: "Care Instructions", placeholder: "e.g. Machine wash cold" },
    { name: "Fit Note", placeholder: "e.g. Runs small — size up" },
  ],
  electronics: [
    { name: "Brand", placeholder: "e.g. Samsung, Apple", required: true },
    { name: "Model", placeholder: "e.g. Galaxy S24, iPhone 15", required: true },
    { name: "RAM", placeholder: "e.g. 8GB, 16GB" },
    { name: "Storage", placeholder: "e.g. 128GB, 256GB" },
    { name: "Battery", placeholder: "e.g. 5000mAh" },
    { name: "Screen Size", placeholder: "e.g. 6.7 inches" },
    { name: "Operating System", placeholder: "e.g. Android 14, iOS 17" },
    { name: "Warranty", placeholder: "e.g. 1 Year" },
  ],
  "home & living": [
    { name: "Material", placeholder: "e.g. Wood, Metal", required: true },
    { name: "Color", placeholder: "e.g. Walnut, White", required: true },
    { name: "Room Type", placeholder: "e.g. Living Room, Kitchen" },
    { name: "Assembly Required", placeholder: "e.g. Yes" },
    { name: "Weight", placeholder: "e.g. 12kg" },
  ],
  groceries: [
    { name: "Weight/Volume", placeholder: "e.g. 1kg, 500ml", required: true },
    { name: "Expiry Date", placeholder: "e.g. Dec 2026", required: true },
    { name: "Ingredients", placeholder: "e.g. Tomatoes, Salt..." },
    { name: "Storage Instructions", placeholder: "e.g. Keep refrigerated" },
    { name: "Origin", placeholder: "e.g. Made in Rwanda" },
  ],
  beauty: [
    { name: "Skin Type", placeholder: "e.g. All, Sensitive", required: true },
    { name: "Ingredients", placeholder: "e.g. Shea Butter, Aloe Vera", required: true },
    { name: "Volume", placeholder: "e.g. 50ml, 100ml" },
    { name: "Usage Instructions", placeholder: "e.g. Apply twice daily" },
    { name: "Certifications", placeholder: "e.g. FDA Approved" },
    { name: "Expiry Date", placeholder: "e.g. Jun 2027" },
  ],
  sports: [
    { name: "Material", placeholder: "e.g. Carbon Fiber, Nylon", required: true },
    { name: "Size/Weight", placeholder: "e.g. 42cm, 300g" },
    { name: "Usage", placeholder: "e.g. Indoor, Outdoor" },
    { name: "Target Group", placeholder: "e.g. Adults, Kids" },
  ],
  toys: [
    { name: "Age Group", placeholder: "e.g. 3-6 years", required: true },
    { name: "Material", placeholder: "e.g. Wood, Plastic", required: true },
    { name: "Safety Certification", placeholder: "e.g. CE Certified" },
    { name: "Educational Value", placeholder: "e.g. STEM" },
  ],
  vehicles: [
    { name: "Brand", placeholder: "e.g. Toyota, Honda", required: true },
    { name: "Model", placeholder: "e.g. RAV4, Civic", required: true },
    { name: "Year", placeholder: "e.g. 2020", required: true },
    { name: "Mileage", placeholder: "e.g. 45,000 km" },
    { name: "Fuel Type", placeholder: "e.g. Petrol, Hybrid" },
    { name: "Color", placeholder: "e.g. White, Silver" },
  ],
  other: [
    { name: "Brand", placeholder: "Brand name" },
    { name: "Material", placeholder: "Material/Composition" },
    { name: "Color", placeholder: "Main color" },
  ]
};

const AddProductModal = ({ visible, onClose, onSubmit, isSubmitting, initialData = null }) => {
  const { colors, isDarkMode } = useTheme();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '', category: '', price: '', stock: '', weight: '1.0',
    condition: 'Brand New', isAuthentic: true, allowTryOnDelivery: false,
    brand: '', warranty: '', length: '', width: '', height: '',
    province: '', district: '', deliveryOptions: DELIVERY_OPTIONS[0], deliveryCost: '0',
    description: ''
  });
  const [attributes, setAttributes] = useState([]);
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (visible) {
      setStep(1);
      if (initialData) {
        setForm({
          title: initialData.title || '',
          category: initialData.category || '',
          price: initialData.price ? initialData.price.toString() : '',
          stock: initialData.stock ? initialData.stock.toString() : '',
          weight: initialData.weight ? initialData.weight.toString() : '1.0',
          condition: initialData.condition || 'Brand New',
          isAuthentic: initialData.isAuthentic !== undefined ? initialData.isAuthentic : true,
          allowTryOnDelivery: initialData.allowTryOnDelivery || false,
          brand: initialData.brand || '',
          warranty: initialData.warranty || '',
          length: initialData.length ? initialData.length.toString() : '',
          width: initialData.width ? initialData.width.toString() : '',
          height: initialData.height ? initialData.height.toString() : '',
          province: initialData.province || '',
          district: initialData.district || '',
          deliveryOptions: initialData.deliveryOptions || DELIVERY_OPTIONS[0],
          deliveryCost: initialData.deliveryCost ? initialData.deliveryCost.toString() : '0',
          description: initialData.description || ''
        });
        setAttributes(initialData.attributes || []);
        
        // Group variants if they exist (backend might return flat list)
        if (initialData.variants && initialData.variants.length > 0) {
           const grouped = [];
           initialData.variants.forEach(v => {
             let g = grouped.find(x => x.name === v.name);
             if (!g) {
               g = { name: v.name, values: [] };
               grouped.push(g);
             }
             g.values.push({ value: v.value, priceOverride: v.price || 0, stock: v.stock || 0 });
           });
           setVariants(grouped);
        } else {
           setVariants([]);
        }

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
          title: '', category: '', price: '', stock: '', weight: '1.0',
          condition: 'Brand New', isAuthentic: true, allowTryOnDelivery: false,
          brand: '', warranty: '', length: '', width: '', height: '',
          province: '', district: '', deliveryOptions: DELIVERY_OPTIONS[0], deliveryCost: '0',
          description: ''
        });
        setAttributes([]);
        setVariants([]);
        setImages([]);
      }
    }
  }, [visible, initialData]);

  useEffect(() => {
    if (visible && (!initialData || form.category !== initialData.category)) {
      const key = form.category.toLowerCase();
      const fields = CATEGORY_FIELDS[key] || CATEGORY_FIELDS["other"] || [];
      setAttributes(fields.map(f => ({ name: f.name, value: '' })));
    }
  }, [form.category, visible]);
  
  const updateForm = (key, value) => {
    if (key === 'province') {
      setForm(prev => ({ ...prev, province: value, district: '' }));
    } else {
      setForm(prev => ({ ...prev, [key]: value }));
    }
  };

  const updateAttribute = (name, value) => {
    setAttributes(prev => {
      const existing = prev.find(a => a.name === name);
      if (existing) {
        return prev.map(a => a.name === name ? { ...a, value } : a);
      }
      return [...prev, { name, value }];
    });
  };

  const addVariantType = () => {
    setVariants([...variants, { name: '', values: [{ value: '', priceOverride: 0, stock: 0 }] }]);
  };

  const removeVariantType = (idx) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const updateVariantName = (idx, name) => {
    setVariants(variants.map((v, i) => i === idx ? { ...v, name } : v));
  };

  const addVariantValue = (vIdx) => {
    setVariants(variants.map((v, i) => i === vIdx ? { ...v, values: [...v.values, { value: '', priceOverride: 0, stock: 0 }] } : v));
  };

  const updateVariantValue = (vIdx, valIdx, field, val) => {
    setVariants(variants.map((v, i) => i === vIdx ? { 
      ...v, 
      values: v.values.map((vval, j) => j === valIdx ? { ...vval, [field]: val } : vval) 
    } : v));
  };

  const pickMedia = async (type) => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can only upload up to 5 media files.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: type === 'image',
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages(prev => [...prev, { uri: result.assets[0].uri, type, mimeType: result.assets[0].mimeType }]);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (published) => {
    const requiredAttributes = (CATEGORY_FIELDS[form.category.toLowerCase()] || []).filter(f => f.required);
    const missingAttr = requiredAttributes.find(ra => !attributes.find(a => a.name === ra.name)?.value);
    
    if (!form.title || !form.category || !form.price || !form.stock || !form.province || !form.district || !form.description || missingAttr) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    
    if (images.length === 0) {
      Alert.alert('Error', 'Please add at least one media file.');
      return;
    }

    const submissionData = {
      ...form,
      price: parseInt(form.price.replace(/[^0-9]/g, '') || '0', 10),
      stock: parseInt(form.stock.replace(/[^0-9]/g, '') || '0', 10),
      weight: parseFloat(form.weight) || 1.0,
      deliveryCost: parseInt(form.deliveryCost.replace(/[^0-9]/g, '') || '0', 10),
      length: form.length ? parseFloat(form.length) : undefined,
      width: form.width ? parseFloat(form.width) : undefined,
      height: form.height ? parseFloat(form.height) : undefined,
      published,
      attributes: attributes.filter(a => a.value.trim() !== ''),
      variants: variants.length > 0 ? variants.flatMap(v => v.values.map(val => ({
        name: v.name,
        value: val.value,
        price: parseInt(String(val.priceOverride || '0').replace(/[^0-9]/g, ''), 10) || undefined,
        stock: parseInt(String(val.stock || '0').replace(/[^0-9]/g, ''), 10)
      }))) : undefined
    };

    onSubmit(submissionData, images);
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <CustomText style={styles.sectionTitle}>Product Information</CustomText>
            
            <View style={styles.inputGroup}>
              <CustomText style={styles.label}>Product Title *</CustomText>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.glass, borderColor: colors.border, color: colors.foreground }]} 
                placeholder="E.g., Wireless Headphones" 
                placeholderTextColor={colors.muted}
                value={form.title}
                onChangeText={v => updateForm('title', v)}
              />
            </View>

            <View style={styles.inputGroup}>
              <CustomText style={styles.label}>Category *</CustomText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat} style={[styles.chip, form.category === cat && styles.chipActive]} onPress={() => updateForm('category', cat)}>
                    <CustomText style={[styles.chipText, form.category === cat && styles.chipTextActive]}>{cat}</CustomText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <CustomText style={styles.label}>Price (Rwf) *</CustomText>
                <TextInput style={styles.input} keyboardType="numeric" value={form.price} onChangeText={v => updateForm('price', v)} placeholder="0" placeholderTextColor={colors.muted} />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <CustomText style={styles.label}>Stock *</CustomText>
                <TextInput style={styles.input} keyboardType="numeric" value={form.stock} onChangeText={v => updateForm('stock', v)} placeholder="0" placeholderTextColor={colors.muted} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <CustomText style={styles.label}>Province *</CustomText>
                <TouchableOpacity style={[styles.input, styles.dropdownTrigger]} onPress={() => {}}>
                  <CustomText style={form.province ? { color: colors.foreground } : { color: colors.muted }}>
                    {form.province || 'Select...'}
                  </CustomText>
                </TouchableOpacity>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScrollMini}>
                  {PROVINCES.map(p => (
                    <TouchableOpacity key={p} onPress={() => updateForm('province', p)} style={[styles.chipMini, form.province === p && styles.chipActive]}>
                      <CustomText style={[styles.chipTextMini, form.province === p && styles.chipTextActive]}>{p}</CustomText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <CustomText style={styles.label}>District *</CustomText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScrollMini}>
                  {(DISTRICTS[form.province] || []).map(d => (
                    <TouchableOpacity key={d} onPress={() => updateForm('district', d)} style={[styles.chipMini, form.district === d && styles.chipActive]}>
                      <CustomText style={[styles.chipTextMini, form.district === d && styles.chipTextActive]}>{d}</CustomText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <CustomText style={styles.label}>Description *</CustomText>
                <CustomText style={styles.charCount}>{form.description.length}/500</CustomText>
              </View>
              <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={4} value={form.description} onChangeText={v => { updateForm('description', v); }} textAlignVertical="top" placeholder="Describe your product..." placeholderTextColor={colors.muted} />
            </View>
          </View>
        );
      case 2:
        const fields = CATEGORY_FIELDS[form.category.toLowerCase()] || CATEGORY_FIELDS["other"] || [];
        return (
          <View style={styles.stepContainer}>
            <CustomText style={styles.sectionTitle}>Product Details</CustomText>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <CustomText style={styles.label}>Brand</CustomText>
                <TextInput style={styles.input} value={form.brand} onChangeText={v => updateForm('brand', v)} placeholder="e.g. Samsung" placeholderTextColor={colors.muted} />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <CustomText style={styles.label}>Warranty</CustomText>
                <TextInput style={styles.input} value={form.warranty} onChangeText={v => updateForm('warranty', v)} placeholder="e.g. 1 Year" placeholderTextColor={colors.muted} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <CustomText style={styles.label}>Condition *</CustomText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {CONDITIONS.map(c => (
                  <TouchableOpacity key={c} style={[styles.chip, form.condition === c && styles.chipActive]} onPress={() => updateForm('condition', c)}>
                    <CustomText style={[styles.chipText, form.condition === c && styles.chipTextActive]}>{c}</CustomText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.checkboxRow, { flex: 1 }]} 
                onPress={() => updateForm('isAuthentic', !form.isAuthentic)}
              >
                <View style={[styles.checkbox, form.isAuthentic && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  {form.isAuthentic && <Check size={12} color="white" />}
                </View>
                <CustomText style={styles.checkboxLabel}>Authentic Product</CustomText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.checkboxRow, { flex: 1 }]} 
                onPress={() => updateForm('allowTryOnDelivery', !form.allowTryOnDelivery)}
              >
                <View style={[styles.checkbox, form.allowTryOnDelivery && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  {form.allowTryOnDelivery && <Check size={12} color="white" />}
                </View>
                <CustomText style={styles.checkboxLabel}>Allow Try-on</CustomText>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <CustomText style={styles.label}>Dimensions (L x W x H cm)</CustomText>
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1, marginRight: 4 }]} keyboardType="numeric" placeholder="L" value={form.length} onChangeText={v => updateForm('length', v)} placeholderTextColor={colors.muted} />
                <TextInput style={[styles.input, { flex: 1, marginHorizontal: 4 }]} keyboardType="numeric" placeholder="W" value={form.width} onChangeText={v => updateForm('width', v)} placeholderTextColor={colors.muted} />
                <TextInput style={[styles.input, { flex: 1, marginLeft: 4 }]} keyboardType="numeric" placeholder="H" value={form.height} onChangeText={v => updateForm('height', v)} placeholderTextColor={colors.muted} />
              </View>
            </View>

            <View style={{ marginTop: 10 }}>
              <CustomText style={[styles.label, { color: colors.primary }]}>{form.category} Specifications</CustomText>
              {fields.map(field => (
                <View key={field.name} style={styles.inputGroup}>
                  <CustomText style={styles.label}>{field.name} {field.required && '*'}</CustomText>
                  <TextInput 
                    style={styles.input}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.muted}
                    value={attributes.find(a => a.name === field.name)?.value || ''}
                    onChangeText={v => updateAttribute(field.name, v)}
                  />
                </View>
              ))}
            </View>

            {/* Variants Section */}
            <View style={styles.variantsSection}>
              <View style={styles.variantsHeader}>
                <CustomText style={[styles.label, { color: colors.primary }]}>Product Variants</CustomText>
                <TouchableOpacity onPress={addVariantType} style={styles.addVariantBtn}>
                   <Plus size={16} color={colors.primary} />
                   <CustomText style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12 }}>Add Type</CustomText>
                </TouchableOpacity>
              </View>
              
              {variants.map((v, vIdx) => (
                <View key={vIdx} style={styles.variantTypeBox}>
                  <View style={styles.variantTypeHeader}>
                    <TextInput 
                      style={[styles.input, { flex: 1, height: 40, paddingVertical: 0 }]} 
                      placeholder="Type (e.g. Size)" 
                      value={v.name}
                      onChangeText={val => updateVariantName(vIdx, val)}
                      placeholderTextColor={colors.muted}
                    />
                    <TouchableOpacity onPress={() => removeVariantType(vIdx)} style={styles.removeBtn}>
                      <X size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  
                  {v.values.map((val, valIdx) => (
                    <View key={valIdx} style={styles.variantValueRow}>
                      <TextInput 
                        style={[styles.input, { flex: 2, height: 36, paddingVertical: 0 }]} 
                        placeholder="Value (e.g. XL)" 
                        value={val.value}
                        onChangeText={text => updateVariantValue(vIdx, valIdx, 'value', text)}
                        placeholderTextColor={colors.muted}
                      />
                      <TextInput 
                        style={[styles.input, { flex: 1, height: 36, paddingVertical: 0, marginHorizontal: 4 }]} 
                        placeholder="+Price" 
                        keyboardType="numeric"
                        value={String(val.priceOverride || '')}
                        onChangeText={text => updateVariantValue(vIdx, valIdx, 'priceOverride', text)}
                        placeholderTextColor={colors.muted}
                      />
                      <TextInput 
                        style={[styles.input, { flex: 1, height: 36, paddingVertical: 0 }]} 
                        placeholder="Stock" 
                        keyboardType="numeric"
                        value={String(val.stock || '')}
                        onChangeText={text => updateVariantValue(vIdx, valIdx, 'stock', text)}
                        placeholderTextColor={colors.muted}
                      />
                    </View>
                  ))}
                  <TouchableOpacity onPress={() => addVariantValue(vIdx)} style={styles.addValueBtn}>
                    <Plus size={12} color={colors.muted} />
                    <CustomText style={{ fontSize: 11, color: colors.muted }}>Add Value</CustomText>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <CustomText style={styles.sectionTitle}>Product Media</CustomText>
            <CustomText style={[styles.label, { marginBottom: 16 }]}>Add up to 5 photos or videos</CustomText>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll} style={{ marginBottom: 20 }}>
              {images.map((media, index) => (
                <View key={index} style={styles.imageBox}>
                  {media.type === 'video' ? (
                    <View style={[styles.image, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
                      <Video color="#94a3b8" size={32} />
                    </View>
                  ) : (
                    <Image source={{ uri: media.uri }} style={styles.image} />
                  )}
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <CustomText style={styles.coverText}>COVER</CustomText>
                    </View>
                  )}
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}><X color="#ffffff" size={14} /></TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <>
                  <TouchableOpacity style={styles.addImageBtn} onPress={() => pickMedia('image')}>
                    <ImageIcon color="#94a3b8" size={24} />
                    <CustomText style={{ fontSize: 10, color: colors.muted, marginTop: 4 }}>Image</CustomText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addImageBtn} onPress={() => pickMedia('video')}>
                    <Video color="#94a3b8" size={24} />
                    <CustomText style={{ fontSize: 10, color: colors.muted, marginTop: 4 }}>Video</CustomText>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><X color={colors.foreground} size={24} /></TouchableOpacity>
            <View style={styles.stepIndicator}>
              {[1,2,3].map(s => (
                <View key={s} style={[styles.stepDot, step >= s && { backgroundColor: colors.primary }, step === s && { width: 20 }]} />
              ))}
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            style={styles.body} 
            contentContainerStyle={styles.contentContainer} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderStep()}
          </ScrollView>

          <View style={styles.footer}>
            {step > 1 && (
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(step - 1)}>
                <CustomText style={styles.prevText}>Previous</CustomText>
              </TouchableOpacity>
            )}
            {step < 3 ? (
              <TouchableOpacity 
                style={[styles.nextBtn, { backgroundColor: colors.primary }]} 
                onPress={() => setStep(step + 1)}
              >
                <CustomText style={styles.nextText}>Next</CustomText>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 2, flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.publishBtn, { backgroundColor: colors.glass, flex: 1 }]} onPress={() => handleSubmit(false)} disabled={isSubmitting}>
                  <CustomText style={[styles.publishText, { color: colors.foreground }]}>Draft</CustomText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.publishBtn, { backgroundColor: colors.primary, flex: 2 }]} onPress={() => handleSubmit(true)} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="white" /> : <CustomText style={styles.publishText}>Publish</CustomText>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  closeBtn: { padding: 8 },
  stepIndicator: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
  body: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 100 },
  stepContainer: { },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, color: '#ffffff', fontSize: 14 },
  textArea: { height: 100 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  chipsScroll: { flexDirection: 'row', marginBottom: 10 },
  chipsScrollMini: { flexDirection: 'row', marginTop: 6 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 8, backgroundColor: 'rgba(255,255,255,0.04)' },
  chipMini: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginRight: 6, backgroundColor: 'rgba(255,255,255,0.02)' },
  chipActive: { backgroundColor: 'rgba(249, 115, 22, 0.1)', borderColor: 'rgba(249, 115, 22, 0.4)' },
  chipText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  chipTextMini: { color: '#94a3b8', fontSize: 11, fontWeight: '500' },
  chipTextActive: { color: '#F97316', fontWeight: 'bold' },
  
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  checkboxLabel: { fontSize: 12, fontWeight: '600' },
  
  variantsSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 20 },
  variantsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addVariantBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  variantTypeBox: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  variantTypeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  variantValueRow: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  addValueBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start', padding: 4 },
  removeBtn: { padding: 4 },

  imageScroll: { gap: 10 },
  imageBox: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  image: { width: '100%', height: '100%' },
  coverBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(249, 115, 22, 0.8)', paddingVertical: 2, alignItems: 'center' },
  coverText: { color: 'white', fontSize: 8, fontWeight: '900' },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 4 },
  addImageBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  
  footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, gap: 10, borderTopColor: 'rgba(255,255,255,0.05)' },
  prevBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  prevText: { color: '#94a3b8', fontWeight: 'bold' },
  nextBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  nextText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  publishBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  publishText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  charCount: { fontSize: 10, color: '#94a3b8' },
  dropdownTrigger: { justifyContent: 'center' }
});

export default AddProductModal;
