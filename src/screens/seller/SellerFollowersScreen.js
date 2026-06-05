import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Users, User as UserIcon, ArrowLeft } from 'lucide-react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';

export default function SellerFollowersScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();
  
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowers = async () => {
    try {
      setLoading(true);
      const data = await sellerService.getFollowers(user.id);
      setFollowers(data || []);
    } catch (error) {
      console.error('Failed to fetch followers:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFollowers();
    }, [])
  );

  const renderFollower = ({ item }) => {
    const followerUser = item.User || {};
    return (
      <View style={[styles.followerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.avatarContainer}>
          {followerUser.image ? (
            <Image source={{ uri: followerUser.image }} style={styles.avatar} />
          ) : (
            <UserIcon color={colors.muted} size={24} />
          )}
        </View>
        <View style={styles.infoContainer}>
          <CustomText style={[styles.name, { color: colors.foreground }]}>
            {followerUser.name || 'Unknown User'}
          </CustomText>
          {followerUser.email ? (
            <CustomText style={[styles.email, { color: colors.muted }]}>
              {followerUser.email}
            </CustomText>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.glass }]}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <CustomText variant="h2">{t('myFollowers') || 'My Followers'}</CustomText>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : followers.length === 0 ? (
        <View style={styles.center}>
          <Users color={colors.muted} size={48} />
          <CustomText style={[styles.emptyText, { color: colors.muted }]}>
            You don't have any followers yet.
          </CustomText>
        </View>
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item.id || item.followerid}
          renderItem={renderFollower}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

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
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  followerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: 50,
    height: 50,
    resizeMode: 'cover',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
});
