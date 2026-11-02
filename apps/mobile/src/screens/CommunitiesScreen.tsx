import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackIcon, SearchIcon } from '../components/common/Icons';
import { BottomNav } from '../components/common/BottomNav';
import {
  createCommunityApi,
  fetchCommunitiesApi,
  toggleJoinCommunityApi,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { ScreenName, CommunityItem } from '../types';

interface CommunitiesScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onBack: () => void;
  onSelectCommunity?: (community: CommunityItem) => void;
}

const COMMUNITY_CHIPS = [
  'Recommended',
  'India Trends',
  'Technology',
  'Travel',
  'Sports',
  'Entertainment',
  'Food',
  'Lifestyle',
];

const CREATE_CATEGORIES = [
  'India Trends',
  'Technology',
  'Travel',
  'Sports',
  'Entertainment',
  'Food',
  'Lifestyle',
  'Fitness & Health',
];

export const CommunitiesScreen: React.FC<CommunitiesScreenProps> = ({
  onNavigate,
  onBack,
  onSelectCommunity,
}) => {
  const { isAuthenticated } = useAuth();
  const [activeChip, setActiveChip] = useState('Recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create community modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('India Trends');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);
      try {
        const category = activeChip === 'Recommended' ? undefined : activeChip;
        const page = await fetchCommunitiesApi({
          category,
          search: searchQuery.trim() || undefined,
          limit: 50,
        });
        setCommunities(page.items);
      } catch (err: any) {
        setError(err?.message || 'Could not load communities');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeChip, searchQuery],
  );

  // debounce search + category changes, like the web page
  useEffect(() => {
    const timer = setTimeout(() => {
      load('initial');
    }, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const toggleJoin = async (item: CommunityItem) => {
    if (!isAuthenticated) {
      onNavigate('signin');
      return;
    }
    const previous = item.isJoined;
    setCommunities((prev) =>
      prev.map((c) =>
        c.id === item.id
          ? {
              ...c,
              isJoined: !previous,
              memberCount: Math.max(0, (c.memberCount ?? 0) + (previous ? -1 : 1)),
              members: `${Math.max(0, (c.memberCount ?? 0) + (previous ? -1 : 1))} members`,
            }
          : c,
      ),
    );
    try {
      const res = await toggleJoinCommunityApi(item.id);
      setCommunities((prev) =>
        prev.map((c) =>
          c.id === item.id
            ? {
                ...c,
                isJoined: res?.isJoined ?? !previous,
                memberCount: res?.memberCount ?? c.memberCount,
                members: `${res?.memberCount ?? c.memberCount ?? 0} members`,
              }
            : c,
        ),
      );
    } catch {
      // rollback
      setCommunities((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, isJoined: previous } : c)),
      );
    }
  };

  const handleCreateCommunity = async () => {
    if (!isAuthenticated) {
      setIsCreateOpen(false);
      onNavigate('signin');
      return;
    }
    if (!newName.trim()) {
      setCreateError('Please enter a community name');
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await createCommunityApi({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        category: newCategory,
      });
      setCommunities((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      setNewName('');
      setNewDesc('');
      setNewCategory('India Trends');
    } catch (err: any) {
      setCreateError(err?.message || 'Could not create community');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredCommunities = communities.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  });

  const handleCardPress = (item: CommunityItem) => {
    if (onSelectCommunity) {
      onSelectCommunity(item);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <BackIcon size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Communities</Text>
          <TouchableOpacity
            onPress={() => setIsCreateOpen(true)}
            style={{ paddingHorizontal: 10, paddingVertical: 4 }}
          >
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <SearchIcon size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search communities..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.chipsRow}>
          {COMMUNITY_CHIPS.map((chip) => {
            const isActive = activeChip === chip;
            return (
              <TouchableOpacity
                key={chip}
                style={[styles.chip, isActive && styles.chipActive]}
                activeOpacity={0.8}
                onPress={() => setActiveChip(chip)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {chip}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Community Cards List */}
        <ScrollView
          style={styles.contentScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} />
          }
        >
          {isLoading && (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {!isLoading && !!error && (
            <View style={{ paddingVertical: 32, alignItems: 'center', paddingHorizontal: 24 }}>
              <Text style={{ color: '#64748B', textAlign: 'center' }}>{error}</Text>
              <TouchableOpacity onPress={() => load('initial')} style={{ marginTop: 10 }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && !error && filteredCommunities.length === 0 && (
            <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 22 }}>🏘️</Text>
              <Text style={{ color: '#64748B', marginTop: 8, textAlign: 'center' }}>
                No communities found. Try another category or create your own.
              </Text>
            </View>
          )}

          {filteredCommunities.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.communityCard}
              activeOpacity={0.85}
              onPress={() => handleCardPress(item)}
            >
              <Image source={{ uri: item.avatar }} style={styles.communityAvatar} />
              <View style={styles.communityInfo}>
                <Text style={styles.communityName}>{item.name}</Text>
                <Text style={styles.communityMembers}>{item.members}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.joinButton,
                  item.isJoined && styles.joinedButton,
                ]}
                activeOpacity={0.8}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleJoin(item);
                }}
              >
                <Text
                  style={[
                    styles.joinButtonText,
                    item.isJoined && styles.joinedButtonText,
                  ]}
                >
                  {item.isJoined ? 'Joined' : 'Join'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNav currentScreen="explore" onNavigate={onNavigate} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  contentScroll: {
    flex: 1,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  communityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  communityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  communityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  communityMembers: {
    fontSize: 12.5,
    color: '#64748B',
  },
  joinButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  joinedButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  joinButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  joinedButtonText: {
    color: '#FFFFFF',
  },
});
