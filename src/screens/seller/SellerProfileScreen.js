import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, RefreshControl, TextInput,
  Keyboard, Platform, Image,
} from 'react-native';
import {
  Menu, Store, Camera, MapPin, Navigation, Search,
  X, Check, ChevronRight,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import CustomText from '../../components/CustomText';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import LocationMapWebView from '../../components/LocationMapWebView';
import { SellerDrawerContext } from '../../context/SellerDrawerContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { sellerService } from '../../api/sellerService';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

// ─── Nominatim helpers ────────────────────────────────────────────────────────
const NOMINATIM_HEADERS = { 'Accept-Language': 'en', 'User-Agent': 'AMOMobile/1.0' };

const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: NOMINATIM_HEADERS }
    );
    const data = await res.json();
    const addr = data.address || {};
    const name =
      addr.amenity || addr.building || addr.shop || addr.office ||
      addr.road || addr.neighbourhood || addr.suburb ||
      addr.village || addr.town || addr.city || '';
    const parts = [
      addr.road || addr.neighbourhood || addr.suburb,
      addr.city_district || addr.district || addr.county,
      addr.state || addr.province,
      addr.country,
    ].filter(Boolean);
    const address = parts.length > 0 ? parts.join(', ') : data.display_name;
    return { name, address };
  } catch {
    return { name: '', address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
  }
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const SellerProfileScreen = () => {
  const { toggleDrawer } = React.useContext(SellerDrawerContext);
  const { user, login } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);

  // Profile state
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const uploadAvatar = async (uri) => {
    setLoading(true);
    try {
      const uploadRes = await authService.uploadFile(user.id, uri);
      if (!uploadRes.url) throw new Error('Upload failed: No URL returned.');
      
      await authService.updateProfile(user.id, { image: uploadRes.url });
      login({ ...user, image: uploadRes.url });
      Alert.alert(t('success'), t('profilePictureUpdated') || 'Profile picture updated successfully.');
      fetchProfile();
    } catch (err) {
      console.error('Upload Avatar Error:', err);
      Alert.alert(t('error'), err.message || t('failedToUploadPhoto'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvatar = () => {
    Alert.alert(
      t('profilePicture') || 'Profile Picture',
      t('chooseSource') || 'Choose how you want to update your profile picture:',
      [
        {
          text: t('takePhoto') || 'Take Photo...',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(t('error'), t('cameraPermissionDenied') || 'Camera permission is required.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled && result.assets && result.assets[0]) {
              uploadAvatar(result.assets[0].uri);
            }
          }
        },
        {
          text: t('chooseLibrary') || 'Choose from Library...',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(t('error'), t('galleryPermissionDenied') || 'Gallery permission is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled && result.assets && result.assets[0]) {
              uploadAvatar(result.assets[0].uri);
            }
          }
        },
        ...(user?.image ? [{
          text: t('removePhoto') || 'Remove Profile Picture',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await authService.updateProfile(user.id, { image: null });
              login({ ...user, image: null });
              Alert.alert(t('success'), t('profilePictureRemoved') || 'Profile picture removed successfully.');
              fetchProfile();
            } catch (err) {
              Alert.alert(t('error'), err.message || t('failedToRemovePhoto'));
            } finally {
              setLoading(false);
            }
          }
        }] : []),
        {
          text: t('cancel') || 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  // Location state
  const [locData, setLocData] = useState({ locationName: '', locationAddress: '', locationLat: 0, locationLng: 0 });
  const [savingLoc, setSavingLoc] = useState(false);
  const [savedLoc, setSavedLoc] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimer = useRef(null);

  // GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Map WebView ref (exposes flyTo)
  const mapRef = useRef(null);

  // ── Fetch Profile ──────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    if (!user?.id) return;
    try {
      const data = await sellerService.getProfile(user.id);
      setProfile(data);
      // user fields are spread at the top level of the response { ...user, sellerProfile }
      setName(data.name || '');
      // sellerProfile nested fields
      const sp = data.sellerProfile || {};
      setStoreName(sp.storeName || '');
      setPhone(sp.phone || '');
      // Location fields are inside sellerProfile
      if (sp.locationLat) {
        setLocData({
          locationName: sp.locationName || '',
          locationAddress: sp.locationAddress || '',
          locationLat: sp.locationLat || 0,
          locationLng: sp.locationLng || 0,
        });
        setSearchQuery(sp.locationName || sp.locationAddress || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchProfile(); }, [user]);

  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  // ── Save Profile ───────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!name.trim()) return Alert.alert(t('error'), t('nameEmptyError'));
    setSaving(true);
    try {
      const updated = await sellerService.updateProfile(user.id, { name, storeName, phone });
      if (updated.user) {
        login({ ...user, name: updated.user.name, storeName: updated.storeName || '' });
      }
      Alert.alert(t('success'), t('sellerProfileUpdated'));
      fetchProfile();
    } catch (e) {
      Alert.alert(t('error'), e.message || t('failedToUpdateProfile'));
    } finally {
      setSaving(false);
    }
  };

  // ── Map Location Change ────────────────────────────────────────────────────
  const handleMapLocationChange = useCallback(async (lat, lng) => {
    const { name: n, address } = await reverseGeocode(lat, lng);
    setLocData({ locationName: n, locationAddress: address, locationLat: lat, locationLng: lng });
    setSearchQuery(n || address);
  }, []);

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearchInput = (q) => {
    setSearchQuery(q);
    setShowResults(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 3) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`,
          { headers: NOMINATIM_HEADERS }
        );
        setSearchResults(await res.json());
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const pickResult = (r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const placeName = r.address?.amenity || r.address?.building || r.address?.road || r.display_name.split(',')[0];
    setLocData({ locationName: placeName, locationAddress: r.display_name, locationLat: lat, locationLng: lng });
    setSearchQuery(r.display_name);
    setShowResults(false);
    Keyboard.dismiss();
    // Fly map to the selected location
    setTimeout(() => mapRef.current?.flyTo(lat, lng), 200);
  };

  // ── GPS: Use My Location ───────────────────────────────────────────────────
  const useCurrentLocation = async () => {
    setGpsLoading(true);
    setGpsError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('Location access denied. Please allow location access in Settings.');
        setGpsLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude: lat, longitude: lng } = pos.coords;
      const { name: n, address } = await reverseGeocode(lat, lng);
      setLocData({ locationName: n, locationAddress: address, locationLat: lat, locationLng: lng });
      setSearchQuery(n || address);
      mapRef.current?.flyTo(lat, lng);
    } catch (e) {
      setGpsError('Could not get location. Please try again or search manually.');
    } finally {
      setGpsLoading(false);
    }
  };

  // ── Save Location ──────────────────────────────────────────────────────────
  const handleSaveLocation = async () => {
    if (!locData.locationLat) {
      Alert.alert(t('error'), 'Please pick a location on the map first.');
      return;
    }
    setSavingLoc(true);
    try {
      await sellerService.updateLocation(user.id, locData);
      setSavedLoc(true);
      setTimeout(() => setSavedLoc(false), 2500);
    } catch (e) {
      Alert.alert(t('error'), e.message || 'Failed to save location.');
    } finally {
      setSavingLoc(false);
    }
  };

  const hasCoords = locData.locationLat !== 0 && locData.locationLng !== 0;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleDrawer} style={[styles.menuButton, { backgroundColor: colors.glass }]}>
          <Menu color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">{t('sellerProfile')}</CustomText>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <>
             <View style={styles.avatarSection}>
              <TouchableOpacity 
                onPress={handleUpdateAvatar}
                activeOpacity={0.8}
                style={[styles.avatarPlaceholder, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
              >
                {user?.image ? (
                  <Image source={{ uri: user.image }} style={styles.avatarImage} />
                ) : (
                  <CustomText style={{ fontSize: 32, fontWeight: '900', color: colors.primary }}>
                    {(name || user?.name || "S").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </CustomText>
                )}
                <View style={[styles.cameraBtn, { borderColor: colors.background, backgroundColor: colors.primary }]}>
                  <Camera color="white" size={16} />
                </View>
              </TouchableOpacity>
              <CustomText variant="h2" style={{ marginTop: 16 }}>{name || t('sellerName')}</CustomText>
              <CustomText style={{ color: colors.muted }}>{user?.email || 'seller@example.com'}</CustomText>
              <View style={styles.roleBadge}>
                <CustomText style={styles.roleText}>
                  {t((profile?.sellerProfile?.membershipType || 'official').toLowerCase())} {t('sellerRole')}
                </CustomText>
              </View>
            </View>

            {/* ── Profile Form ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CustomText style={[styles.sectionLabel, { color: colors.muted }]}>ACCOUNT INFORMATION</CustomText>
              <View style={styles.formSection}>
                <CustomInput label={t('fullName')} value={name} onChangeText={setName} placeholder={t('enterFullName')} />
                <CustomInput label={t('storeName')} value={storeName} onChangeText={setStoreName} placeholder={t('storeNamePlaceholder')} />
                <CustomInput label={t('phoneNumber')} value={phone} onChangeText={setPhone} placeholder={t('phonePlaceholder')} keyboardType="phone-pad" />
                <CustomInput label={t('emailAddress')} value={user?.email || ''} editable={false} />
                <CustomButton title={saving ? t('saving') : t('saveProfile')} style={styles.saveButton} onPress={handleSaveProfile} disabled={saving} />
              </View>
            </View>

            {/* ── Business Location ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 24 }]}>
              <View style={styles.sectionHeader}>
                <MapPin color={colors.primary} size={16} />
                <CustomText style={[styles.sectionLabel, { color: colors.muted, marginLeft: 8 }]}>BUSINESS LOCATION</CustomText>
              </View>

              {/* GPS error */}
              {!!gpsError && (
                <View style={styles.errorBox}>
                  <CustomText style={styles.errorText}>{gpsError}</CustomText>
                </View>
              )}

              {/* Search row */}
              <View style={styles.searchHeader}>
                <CustomText style={[styles.inputLabel, { color: colors.muted }]}>Search your location</CustomText>
                <TouchableOpacity
                  onPress={useCurrentLocation}
                  disabled={gpsLoading}
                  style={[styles.gpsBtn, { borderColor: colors.border }]}
                >
                  {gpsLoading
                    ? <ActivityIndicator size={12} color={colors.muted} />
                    : <Navigation color={colors.muted} size={12} />
                  }
                  <CustomText style={[styles.gpsBtnText, { color: colors.muted }]}>
                    {gpsLoading ? 'Detecting...' : 'Use My Location'}
                  </CustomText>
                </TouchableOpacity>
              </View>

              {/* Search input + dropdown */}
              <View style={styles.searchWrapper}>
                <View style={[styles.searchInputRow, { backgroundColor: colors.glass, borderColor: colors.border }]}>
                  <Search color={colors.muted} size={14} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.foreground }]}
                    placeholder="Type a place, street or landmark..."
                    placeholderTextColor={colors.muted}
                    value={searchQuery}
                    onChangeText={handleSearchInput}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {searchLoading && <ActivityIndicator size={12} color={colors.muted} />}
                  {searchQuery !== '' && !searchLoading && (
                    <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                      <X color={colors.muted} size={14} />
                    </TouchableOpacity>
                  )}
                </View>

                {showResults && searchResults.length > 0 && (
                  <View style={[styles.resultsDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {searchResults.map((r) => (
                      <TouchableOpacity
                        key={r.place_id}
                        style={[styles.resultItem, { borderBottomColor: colors.border }]}
                        onPress={() => pickResult(r)}
                      >
                        <MapPin color={colors.primary} size={13} style={{ marginRight: 8, marginTop: 2 }} />
                        <CustomText style={[styles.resultText, { color: colors.foreground }]} numberOfLines={2}>
                          {r.display_name}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <CustomText style={[styles.mapHint, { color: colors.muted }]}>
                Or click anywhere on the map, or drag the pin to your exact location.
              </CustomText>

              {/* Map */}
              <View style={[styles.mapContainer, { borderColor: colors.border }]}>
                <LocationMapWebView
                  initialLocation={hasCoords ? { lat: locData.locationLat, lng: locData.locationLng } : null}
                  onLocationChange={handleMapLocationChange}
                  mapRef={mapRef}
                />
              </View>

              {/* Selected location pill */}
              {hasCoords && (
                <View style={[styles.locPill, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
                  {!!locData.locationName && (
                    <CustomText style={[styles.locPillName, { color: colors.foreground }]}>{locData.locationName}</CustomText>
                  )}
                  <CustomText style={[styles.locPillAddr, { color: colors.muted }]}>{locData.locationAddress}</CustomText>
                  <CustomText style={[styles.locPillCoords, { color: colors.muted }]}>
                    {locData.locationLat.toFixed(6)}, {locData.locationLng.toFixed(6)}
                  </CustomText>
                </View>
              )}

              {/* Save Location button */}
              <TouchableOpacity
                onPress={handleSaveLocation}
                disabled={savingLoc || !hasCoords}
                style={[
                  styles.saveLocBtn,
                  { backgroundColor: colors.primary, opacity: (savingLoc || !hasCoords) ? 0.5 : 1 }
                ]}
              >
                {savingLoc
                  ? <ActivityIndicator size={14} color="white" />
                  : savedLoc
                    ? <Check color="white" size={14} />
                    : <MapPin color="white" size={14} />
                }
                <CustomText style={styles.saveLocBtnText}>
                  {savingLoc ? 'Saving...' : savedLoc ? 'Saved!' : 'Save Location'}
                </CustomText>
              </TouchableOpacity>
            </View>

          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  menuButton: { marginRight: 16, padding: 8, borderRadius: 12 },
  content: { padding: 24, paddingBottom: 40 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, position: 'relative',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3,
  },
  roleBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 12 },
  roleText: { color: '#10B981', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  // Card
  card: { borderRadius: 20, borderWidth: 1, padding: 20 },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  formSection: { gap: 16 },
  saveButton: { marginTop: 8 },

  // GPS / Search
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  errorText: { color: '#EF4444', fontSize: 12 },
  searchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  inputLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  gpsBtnText: { fontSize: 11, fontWeight: '600' },
  searchWrapper: { position: 'relative', zIndex: 10 },
  searchInputRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchInput: { flex: 1, fontSize: 13 },
  resultsDropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    borderRadius: 12, borderWidth: 1, marginTop: 4,
    zIndex: 999, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
    maxHeight: 240,
  },
  resultItem: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  resultText: { flex: 1, fontSize: 12, lineHeight: 18 },
  mapHint: { fontSize: 10, marginTop: 8, marginBottom: 12 },

  // Map
  mapContainer: { height: 260, borderRadius: 16, overflow: 'hidden', borderWidth: 1, marginBottom: 12 },

  // Location pill
  locPill: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  locPillName: { fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  locPillAddr: { fontSize: 12, lineHeight: 18 },
  locPillCoords: { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 4, opacity: 0.5 },

  // Save location btn
  saveLocBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 },
  saveLocBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});

export default SellerProfileScreen;
