import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackIcon, ShareIcon } from '../components/common/Icons';
import { PostCard } from '../components/feed/PostCard';
import { BottomNav } from '../components/common/BottomNav';
import { Post, ScreenName, CommunityItem, PostGroup, User } from '../types';
import { colors } from '../theme/colors';
import {
  fetchCommunityApi,
  fetchCommunityPostsPage,
  toggleJoinCommunityApi,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePosts } from '../context/PostsContext';

interface CommunityDetailScreenProps {
  community: CommunityItem | PostGroup;
  onNavigate: (screen: ScreenName) => void;
  onBack: () => void;
  onSelectPost: (post: Post) => void;
  onSelectCommunity?: (group: PostGroup | CommunityItem) => void;
  onSelectUser?: (user: User) => void;
  onSearchHashtag?: (hashtag: string) => void;
}

export const CommunityDetailScreen: React.FC<CommunityDetailScreenProps> = ({
  community,
  onNavigate,
  onBack,
  onSelectPost,
  onSelectCommunity,
  onSelectUser,
  onSearchHashtag,
}) => {
  const { likePost, repostPost, bookmarkPost } = usePosts();
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
  const [details, setDetails] = useState<CommunityItem>({
    id: community.id,
    name: community.name,
    slug: (community as any).slug || community.id,
    members: (community as any).members || '120 members',
    avatar:
      ('avatarUrl' in community ? community.avatarUrl : undefined) ||
      ('avatar' in community ? community.avatar : undefined) ||
      'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=200',
    coverUrl:
      (community as any).coverUrl ||
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000',
    category: community.category || 'Community',
    description:
      (community as any).description ||
      'Welcome to this community on VARTA! Share insights, connect with fellow members, and discover what matters to India.',
    postCount: (community as any).postCount ?? 0,
    isJoined: (community as any).isJoined ?? false,
    rules: [
      'Respect fellow members and maintain civil discourse.',
      'Post relevant, factual, and constructive insights.',
      'No spam, self-promotion, or abusive material.',
    ],
  });

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  // Load community details
  useEffect(() => {
    fetchCommunityApi(community.id).then((res) => {
      if (res) {
        setDetails((prev) => ({
          ...prev,
          ...res,
          avatar: res.avatar || prev.avatar,
          coverUrl: res.coverUrl || prev.coverUrl,
        }));
      }
    });
  }, [community.id]);

  // Load community posts
  const loadPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    try {
      const page = await fetchCommunityPostsPage(community.id, undefined, 15);
      setPosts(page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [community.id]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const page = await fetchCommunityPostsPage(community.id, undefined, 15);
      setPosts(page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;
    setIsLoadingMore(true);
    try {
      const page = await fetchCommunityPostsPage(community.id, nextCursor, 15);
      if (page.items.length > 0) {
        setPosts((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const unique = page.items.filter((p) => !ids.has(p.id));
          return [...prev, ...unique];
        });
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } else {
        setHasMore(false);
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleToggleJoin = async () => {
    if (!isAuthenticated) {
      onNavigate('signin');
      return;
    }
    setIsJoining(true);
    const previous = details;
    setDetails((prev) => ({
      ...prev,
      isJoined: !prev.isJoined,
      memberCount: Math.max(0, (prev.memberCount ?? 0) + (prev.isJoined ? -1 : 1)),
      members: `${Math.max(0, (prev.memberCount ?? 0) + (prev.isJoined ? -1 : 1))} members`,
    }));
    try {
      const res = await toggleJoinCommunityApi(details.id || community.id);
      setDetails((prev) => ({
        ...prev,
        isJoined: typeof res?.isJoined === 'boolean' ? res.isJoined : prev.isJoined,
        memberCount: res?.memberCount ?? prev.memberCount,
        members: `${res?.memberCount ?? prev.memberCount ?? 0} members`,
      }));
    } catch {
      setDetails(previous); // rollback
    } finally {
      setIsJoining(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join the "${details.name}" community on VARTA — Baat Sabki! https://varta.kevindevops.online/communities?id=${details.id}`,
      });
    } catch {}
  };

  const renderHeader = () => (
    <View style={styles.headerComponent}>
      {/* Cover Banner */}
      <View style={styles.coverContainer}>
        <Image
          source={{ uri: details.coverUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000' }}
          style={styles.coverImage}
          resizeMode="cover"
        />
        <View style={styles.coverOverlay} />

        {/* Top Floating Action Bar */}
        <View style={styles.floatingTopBar}>
          <TouchableOpacity
            style={styles.iconCircleButton}
            onPress={onBack}
            activeOpacity={0.8}
          >
            <BackIcon size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconCircleButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <ShareIcon size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Community Avatar floating over banner */}
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: details.avatar }} style={styles.avatarImage} />
        </View>
      </View>

      {/* Community Info Box */}
      <View style={styles.infoBox}>
        <View style={styles.topInfoRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.communityName}>{details.name}</Text>
            <View style={styles.categoryBadgeRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>📁 {details.category}</Text>
              </View>
              <Text style={styles.statsText}>👥 {details.members}</Text>
            </View>
          </View>

          {/* Join / Joined Button */}
          <TouchableOpacity
            style={[
              styles.joinButton,
              details.isJoined && styles.joinedButton,
              isJoining && { opacity: 0.7 },
            ]}
            onPress={handleToggleJoin}
            disabled={isJoining}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.joinButtonText,
                details.isJoined && styles.joinedButtonText,
              ]}
            >
              {details.isJoined ? '✓ Joined' : '+ Join Community'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Text style={styles.descriptionText}>{details.description}</Text>

        {/* Tabs: Posts / About */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'posts' && styles.tabButtonActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'posts' && styles.tabButtonTextActive]}>
              Community Posts ({posts.length})
            </Text>
            {activeTab === 'posts' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'about' && styles.tabButtonActive]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'about' && styles.tabButtonTextActive]}>
              About & Rules
            </Text>
            {activeTab === 'about' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Render About Tab Content when selected */}
      {activeTab === 'about' && (
        <View style={styles.aboutContainer}>
          <Text style={styles.sectionHeading}>Community Guidelines</Text>
          {(details.rules || []).map((rule, idx) => (
            <View key={idx} style={styles.ruleItem}>
              <View style={styles.ruleNumberBox}>
                <Text style={styles.ruleNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.ruleContentText}>{rule}</Text>
            </View>
          ))}

          <View style={styles.aboutMetaCard}>
            <Text style={styles.aboutMetaTitle}>About {details.name}</Text>
            <Text style={styles.aboutMetaDesc}>{details.description}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Category:</Text>
              <Text style={styles.metaValue}>{details.category}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Access:</Text>
              <Text style={styles.metaValue}>Public Community (Anyone can view)</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {activeTab === 'posts' ? (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            renderItem={({ item }) => (
              <PostCard
                post={item}
                onPress={() => {
                  onSelectPost(item);
                  onNavigate('post-detail');
                }}
                onPressAuthor={(author) => {
                  if (onSelectUser) onSelectUser(author || item.author);
                  onNavigate('profile');
                }}
                onPressGroup={(group) => {
                  if (group.id !== community.id && onSelectCommunity) {
                    onSelectCommunity(group);
                  }
                }}
                onPressHashtag={(tag) => {
                  if (onSearchHashtag) {
                    onSearchHashtag(tag);
                  } else {
                    onNavigate('search');
                  }
                }}
                onPressMention={(mention) => {
                  if (onSelectUser) {
                    onSelectUser({
                      id: `user-${mention.replace('@', '')}`,
                      name: mention.replace('@', ''),
                      handle: mention,
                      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
                    });
                    onNavigate('profile');
                  }
                }}
                onLike={() => likePost(item.id)}
                onRepost={() => repostPost(item.id)}
                onBookmark={() => bookmarkPost(item.id)}
              />
            )}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.footerLoaderText}>Loading more community posts...</Text>
                </View>
              ) : !hasMore && posts.length > 0 ? (
                <View style={styles.endOfFeedBox}>
                  <Text style={styles.endOfFeedText}>You've caught up with all community posts ✨</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              !isLoadingPosts ? (
                <View style={styles.emptyFeed}>
                  <Text style={styles.emptyFeedTitle}>No posts yet in this community</Text>
                  <Text style={styles.emptyFeedSub}>
                    Be the first to share an insight or story with the {details.name} community!
                  </Text>
                  <TouchableOpacity
                    style={styles.createPostBtn}
                    onPress={() => onNavigate('create-post')}
                  >
                    <Text style={styles.createPostBtnText}>Create Community Post</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.initialLoader}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.initialLoaderText}>Loading {details.name} posts...</Text>
                </View>
              )
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={[]}
            keyExtractor={(_, index) => String(index)}
            ListHeaderComponent={renderHeader}
          />
        )}

        <BottomNav currentScreen="communities" onNavigate={onNavigate} />
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
  headerComponent: {
    backgroundColor: '#FFFFFF',
  },
  coverContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  floatingTopBar: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  iconCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    position: 'absolute',
    bottom: -32,
    left: 16,
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  infoBox: {
    paddingHorizontal: 16,
    paddingTop: 38,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  communityName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  statsText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  joinedButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  joinedButtonText: {
    color: '#334155',
  },
  descriptionText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    position: 'relative',
    marginRight: 12,
  },
  tabButtonActive: {},
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 12,
    right: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  aboutContainer: {
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ruleNumberBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  ruleNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  ruleContentText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 17,
  },
  aboutMetaCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  aboutMetaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  aboutMetaDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 12,
    color: '#64748B',
  },
  endOfFeedBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endOfFeedText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  emptyFeed: {
    padding: 30,
    alignItems: 'center',
  },
  emptyFeedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyFeedSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  createPostBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createPostBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  initialLoader: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  initialLoaderText: {
    fontSize: 13,
    color: '#64748B',
  },
});
