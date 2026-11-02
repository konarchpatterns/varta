import React from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VartaLogo } from '../components/common/VartaLogo';
import { Avatar } from '../components/common/Avatar';
import {
  BellIcon,
  PhotoIcon,
  VideoIcon,
  PollIcon,
  GifIcon,
  LinkIcon,
  FilmIcon,
  SmileIcon,
  GlobeIcon,
} from '../components/common/Icons';
import { PostCard } from '../components/feed/PostCard';
import { BottomNav } from '../components/common/BottomNav';
import { Post, ScreenName, PostGroup, CommunityItem, User } from '../types';
import { colors } from '../theme/colors';
import { FEED_TABS, usePosts } from '../context/PostsContext';
import { useAuth } from '../context/AuthContext';

interface HomeScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onSelectPost: (post: Post) => void;
  onSelectCommunity?: (group: PostGroup | CommunityItem) => void;
  onSelectUser?: (user: User) => void;
  onSearchHashtag?: (hashtag: string) => void;
}



export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onSelectPost,
  onSelectCommunity,
  onSelectUser,
  onSearchHashtag,
}) => {
  const { user, isAuthenticated } = useAuth();
  const {
    posts,
    activeTab,
    setActiveTab,
    isLoading,
    error,
    likePost,
    repostPost,
    bookmarkPost,
    refreshFeed,
    isRefreshing,
    loadMorePosts,
    isLoadingMore,
    hasMore,
  } = usePosts();

  const renderHeader = () => (
    <View style={styles.listHeaderWrapper}>
      {/* Quick Compose Box (matches Screenshot 1 on website) */}
      <View style={styles.quickComposeCard}>
        {/* Top: Avatar and Input */}
        <TouchableOpacity
          style={styles.quickComposeTopRow}
          activeOpacity={0.8}
          onPress={() => {
            if (!isAuthenticated) {
              onNavigate('signin');
              return;
            }
            onNavigate('create-post');
          }}
        >
          <Avatar uri={user?.avatar} name={user?.name} size={40} />
          <View style={styles.quickComposeInput}>
            <Text style={styles.quickComposePlaceholder}>
              What's on your mind, {user?.name ? user.name.split(' ')[0] : 'citizen'}?
            </Text>
          </View>
        </TouchableOpacity>

        {/* Middle: Inline Reply Setting Pill */}
        <View style={styles.quickComposeInlinePillWrap}>
          <TouchableOpacity
            style={styles.quickComposeInlinePill}
            activeOpacity={0.8}
            onPress={() => onNavigate(isAuthenticated ? 'create-post' : 'signin')}
          >
            <GlobeIcon size={13} color="#1D9BF0" />
            <Text style={styles.quickComposeInlinePillText}>Everyone can reply</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Toolbar: Left icons, Right anyone pill + 500 + Post button */}
        <View style={styles.quickComposeToolbar}>
          {/* Left icons */}
          <View style={styles.quickComposeIconsGroup}>
            <TouchableOpacity
              style={styles.quickComposeIconBtn}
              onPress={() => onNavigate(isAuthenticated ? 'create-post' : 'signin')}
            >
              <PhotoIcon size={18} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickComposeIconBtn}
              onPress={() => onNavigate(isAuthenticated ? 'create-post' : 'signin')}
            >
              <VideoIcon size={18} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickComposeIconBtn}
              onPress={() => onNavigate(isAuthenticated ? 'create-post' : 'signin')}
            >
              <LinkIcon size={16} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickComposeIconBtn}
              onPress={() => onNavigate(isAuthenticated ? 'create-post' : 'signin')}
            >
              <FilmIcon size={18} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickComposeIconBtn}
              onPress={() => onNavigate(isAuthenticated ? 'create-post' : 'signin')}
            >
              <PollIcon size={18} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickComposeIconBtn}
              onPress={() => onNavigate(isAuthenticated ? 'create-post' : 'signin')}
            >
              <SmileIcon size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Right controls */}
          <View style={styles.quickComposeRightControls}>
            <TouchableOpacity
              style={styles.quickComposeInteractionPill}
              activeOpacity={0.8}
              onPress={() => onNavigate(isAuthenticated ? 'create-post' : 'signin')}
            >
              <GlobeIcon size={12} color="#FF9933" />
              <Text style={styles.quickComposeInteractionText}>Anyone</Text>
            </TouchableOpacity>

            <Text style={styles.quickComposeCharCount}>500</Text>

            <TouchableOpacity
              style={styles.quickComposePostBtn}
              activeOpacity={0.85}
              onPress={() => onNavigate(isAuthenticated ? 'create-post' : 'signin')}
            >
              <Text style={styles.quickComposePostBtnText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoaderContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerLoaderText}>Loading more relevant posts for you... ✨</Text>
        </View>
      );
    }

    if (!hasMore && posts.length > 0) {
      return (
        <View style={styles.caughtUpContainer}>
          <Text style={styles.caughtUpIcon}>🇮🇳</Text>
          <Text style={styles.caughtUpText}>You're all caught up with recent posts</Text>
          <Text style={styles.caughtUpSub}>Check other topics or pull down to refresh!</Text>
        </View>
      );
    }

    return <View style={{ height: 24 }} />;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Top App Bar */}
        <View style={styles.topBar}>
          {isAuthenticated && user ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (onSelectUser) onSelectUser(user);
                onNavigate('profile');
              }}
              style={styles.avatarButton}
            >
              <Avatar uri={user.avatar} name={user.name} size={36} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onNavigate('signin')}
              style={styles.topSignInBtn}
            >
              <Text style={styles.topSignInText}>Sign In</Text>
            </TouchableOpacity>
          )}

          <View style={styles.logoCenter}>
            <VartaLogo size={32} showTagline={true} horizontal />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onNavigate('notifications')}
            style={styles.bellButton}
          >
            <BellIcon size={24} color="#0F172A" />
            <View style={styles.bellBadge} />
          </TouchableOpacity>
        </View>

        {/* Sticky Category Tabs */}
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            {FEED_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  activeOpacity={0.8}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Text
                    style={[styles.tabItemText, isActive && styles.tabItemTextActive]}
                  >
                    {tab.label}
                  </Text>
                  {isActive && <View style={styles.activeTabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Feed List with Infinite Scroll */}
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
                if (onSelectCommunity) {
                  onSelectCommunity(group);
                  onNavigate('community-detail');
                } else {
                  onNavigate('communities');
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
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshFeed}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.footerLoaderContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.footerLoaderText}>Loading your feed...</Text>
              </View>
            ) : error ? (
              <View style={styles.caughtUpContainer}>
                <Text style={styles.caughtUpIcon}>⚠️</Text>
                <Text style={styles.caughtUpText}>{error}</Text>
                <TouchableOpacity onPress={refreshFeed} style={{ marginTop: 10 }}>
                  <Text style={[styles.caughtUpSub, { color: colors.primary, fontWeight: '700' }]}>
                    Tap to retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.caughtUpContainer}>
                <Text style={styles.caughtUpIcon}>🇮🇳</Text>
                <Text style={styles.caughtUpText}>No posts here yet</Text>
                <Text style={styles.caughtUpSub}>Be the first to start the conversation!</Text>
              </View>
            )
          }
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          style={styles.feedList}
        />

        {/* Bottom Navigation */}
        <BottomNav currentScreen="home" onNavigate={onNavigate} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarButton: {
    padding: 2,
  },
  topSignInBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  topSignInText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  logoCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellButton: {
    padding: 6,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    gap: 20,
  },
  tabItem: {
    paddingVertical: 12,
    position: 'relative',
  },
  tabItemActive: {},
  tabItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabItemTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  feedList: {
    flex: 1,
  },
  listHeaderWrapper: {
    backgroundColor: '#FFFFFF',
  },
  quickComposeCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  quickComposeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  quickComposeInput: {
    flex: 1,
    justifyContent: 'center',
  },
  quickComposePlaceholder: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },
  quickComposeInlinePillWrap: {
    paddingLeft: 52,
    marginBottom: 10,
  },
  quickComposeInlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5FE',
    borderWidth: 1,
    borderColor: 'rgba(29, 155, 240, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  quickComposeInlinePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D9BF0',
  },
  quickComposeToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  quickComposeIconsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickComposeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickComposeRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickComposeInteractionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF3F4',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quickComposeInteractionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F1419',
  },
  quickComposeCharCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  quickComposePostBtn: {
    backgroundColor: '#FF9933',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickComposePostBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
  },
  footerLoaderContainer: {
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  caughtUpContainer: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caughtUpIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  caughtUpText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  caughtUpSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
