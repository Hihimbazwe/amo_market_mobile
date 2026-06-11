import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Users,
  ArrowLeft,
  Search,
  X,
  ShoppingBag,
  Wallet,
  TrendingUp,
  CalendarDays,
} from 'lucide-react-native';
import CustomText from '../../components/CustomText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { sellerService } from '../../api/sellerService';

const SORT_OPTIONS = [
  { label: 'Newest', key: 'createdat', dir: 'desc' },
  { label: 'Top Spend', key: 'spend', dir: 'desc' },
  { label: 'Most Orders', key: 'orders', dir: 'desc' },
];

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  if (amount <= 0) return 'RWF 0';
  return `RWF ${amount.toLocaleString()}`;
};

const formatDate = (date) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-RW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getFollowerName = (follower) => {
  const followerUser = follower?.User || {};
  return followerUser.username || followerUser.name || 'Anonymous';
};

export default function SellerFollowersScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState(SORT_OPTIONS[0]);

  const fetchFollowers = useCallback(async ({ isRefresh = false } = {}) => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      if (!isRefresh) setLoading(true);
      const data = await sellerService.getFollowers(user.id);
      setFollowers(data || []);
    } catch (error) {
      console.error('Failed to fetch followers:', error);
      Alert.alert('Error', error.message || 'Failed to load followers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchFollowers();
    }, [fetchFollowers])
  );

  const stats = useMemo(() => {
    const buyers = followers.filter((follower) => Number(follower.orders || 0) > 0);
    const totalRevenue = followers.reduce((sum, follower) => sum + Number(follower.spend || 0), 0);
    const conversionRate = followers.length > 0
      ? Math.round((buyers.length / followers.length) * 100)
      : 0;
    const avgSpend = buyers.length > 0 ? Math.round(totalRevenue / buyers.length) : 0;

    return {
      totalFollowers: followers.length,
      buyers: buyers.length,
      totalRevenue,
      conversionRate,
      avgSpend,
    };
  }, [followers]);

  const filteredFollowers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = followers.filter((follower) => {
      if (!term) return true;
      const name = getFollowerName(follower).toLowerCase();
      return name.includes(term);
    });

    return [...filtered].sort((a, b) => {
      const dir = sortOption.dir === 'desc' ? -1 : 1;
      if (sortOption.key === 'createdat') {
        return dir * (new Date(a.createdat || 0).getTime() - new Date(b.createdat || 0).getTime());
      }
      return dir * (Number(a[sortOption.key] || 0) - Number(b[sortOption.key] || 0));
    });
  }, [followers, search, sortOption]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFollowers({ isRefresh: true });
  };

  const renderFollower = ({ item }) => {
    const followerUser = item.User || {};
    const followerName = getFollowerName(item);
    const initials = followerName.slice(0, 2).toUpperCase();
    const orders = Number(item.orders || 0);
    const spend = Number(item.spend || 0);

    return (
      <View style={[styles.followerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.followerTopRow}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '18' }]}>
            {followerUser.image ? (
              <Image source={{ uri: followerUser.image }} style={styles.avatar} />
            ) : (
              <CustomText style={[styles.avatarText, { color: colors.primary }]}>{initials}</CustomText>
            )}
          </View>
          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <CustomText style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                {followerName}
              </CustomText>
              {orders > 0 && (
                <View style={styles.buyerBadge}>
                  <CustomText style={styles.buyerBadgeText}>Buyer</CustomText>
                </View>
              )}
            </View>
            <View style={styles.dateRow}>
              <CalendarDays color={colors.muted} size={12} />
              <CustomText style={[styles.metaText, { color: colors.muted }]}>
                Followed {formatDate(item.createdat)}
              </CustomText>
            </View>
          </View>
        </View>

        <View style={[styles.followerStats, { borderTopColor: colors.border }]}>
          <View style={styles.followerStat}>
            <CustomText style={[styles.followerStatValue, { color: colors.foreground }]}>{orders}</CustomText>
            <CustomText style={[styles.followerStatLabel, { color: colors.muted }]}>Orders</CustomText>
          </View>
          <View style={styles.followerStat}>
            <CustomText style={[styles.followerStatValue, { color: spend > 0 ? '#F97316' : colors.foreground }]} numberOfLines={1}>
              {spend > 0 ? formatCurrency(spend) : '-'}
            </CustomText>
            <CustomText style={[styles.followerStatLabel, { color: colors.muted }]}>Total Spend</CustomText>
          </View>
          <View style={styles.followerStat}>
            <CustomText style={[styles.followerStatValue, { color: colors.foreground }]} numberOfLines={1}>
              {formatDate(item.lastOrderAt)}
            </CustomText>
            <CustomText style={[styles.followerStatLabel, { color: colors.muted }]}>Last Order</CustomText>
          </View>
        </View>
      </View>
    );
  };

  const ListHeader = (
    <View>
      <View style={styles.summaryGrid}>
        {[
          { label: 'Total Followers', value: stats.totalFollowers, icon: Users, color: '#F97316' },
          { label: 'Converted Buyers', value: stats.buyers, icon: ShoppingBag, color: '#3B82F6', sub: `${stats.conversionRate}% conversion` },
          { label: 'Follower Revenue', value: formatCurrency(stats.totalRevenue), icon: Wallet, color: '#10B981' },
          { label: 'Avg Spend / Buyer', value: stats.avgSpend > 0 ? formatCurrency(stats.avgSpend) : '-', icon: TrendingUp, color: '#A855F7' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <View key={stat.label} style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: stat.color + '18' }]}>
                <Icon color={stat.color} size={17} />
              </View>
              <CustomText style={[styles.summaryValue, { color: colors.foreground }]} numberOfLines={1}>
                {stat.value}
              </CustomText>
              <CustomText style={[styles.summaryLabel, { color: colors.muted }]}>{stat.label}</CustomText>
              {stat.sub ? (
                <CustomText style={styles.summarySub}>{stat.sub}</CustomText>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.glass, borderColor: colors.border }]}>
        <Search color={colors.muted} size={16} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search followers..."
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.foreground }]}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X color={colors.muted} size={16} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
        {SORT_OPTIONS.map((option) => {
          const active = option.key === sortOption.key;
          return (
            <TouchableOpacity
              key={option.label}
              style={[
                styles.sortPill,
                {
                  backgroundColor: active ? colors.primary : colors.glass,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSortOption(option)}
              activeOpacity={0.75}
            >
              <CustomText style={[styles.sortText, { color: active ? 'white' : colors.muted }]}>
                {option.label}
              </CustomText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <CustomText style={[styles.resultCount, { color: colors.muted }]}>
        {filteredFollowers.length} follower{filteredFollowers.length !== 1 ? 's' : ''}
        {search.trim() ? ` matching "${search.trim()}"` : ''}
      </CustomText>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.glass }]}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <CustomText variant="h2" style={{ color: colors.foreground }}>Your Followers</CustomText>
          <CustomText style={[styles.headerSubtitle, { color: colors.muted }]}>
            Buyers following your store
          </CustomText>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <CustomText style={[styles.loadingText, { color: colors.muted }]}>Loading followers...</CustomText>
        </View>
      ) : (
        <FlatList
          data={filteredFollowers}
          keyExtractor={(item, index) => item.id || item.followerid || `follower-${index}`}
          renderItem={renderFollower}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={[styles.emptyBox, { backgroundColor: colors.glass, borderColor: colors.border }]}>
              <Users color={colors.muted} size={42} />
              <CustomText style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search.trim() ? 'No matching followers' : 'No followers yet'}
              </CustomText>
              <CustomText style={[styles.emptyText, { color: colors.muted }]}>
                {search.trim()
                  ? 'Try a different follower name.'
                  : "When buyers follow your store, they will appear here."}
              </CustomText>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
  },
  headerText: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    minHeight: 122,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: 3,
  },
  summarySub: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 22,
    fontSize: 13,
    padding: 0,
  },
  sortRow: {
    gap: 8,
    paddingBottom: 12,
  },
  sortPill: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '800',
  },
  resultCount: {
    fontSize: 12,
    marginBottom: 12,
  },
  followerCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  followerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  avatarText: {
    fontSize: 15,
    fontWeight: '900',
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  buyerBadge: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.24)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  buyerBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
  },
  followerStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 14,
    gap: 10,
  },
  followerStat: {
    flex: 1,
  },
  followerStatValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  followerStatLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 34,
    marginTop: 4,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '800',
  },
});
