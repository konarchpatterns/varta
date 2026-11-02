import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackIcon,
  SearchIcon,
  CloseIcon,
  TopicIcon,
  VerifiedBadge,
} from '../components/common/Icons';
import { Avatar } from '../components/common/Avatar';
import { PostCard } from '../components/feed/PostCard';
import { BottomNav } from '../components/common/BottomNav';
import {
  fetchCommunitiesApi,
  fetchHashtagPostsPage,
  fetchTrendingApi,
  fetchWhoToFollow,
  followUserApi,
  searchApi,
  toggleJoinCommunityApi,
  unfollowUserApi,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { ScreenName, Post, PostGroup, CommunityItem, User } from '../types';
import { usePosts } from '../context/PostsContext';

interface SearchScreenProps {
  initialQuery?: string;
  onNavigate: (screen: ScreenName) => void;
  onBack: () => void;
  onSelectPost: (post: Post) => void;
  onSelectCommunity?: (group: PostGroup | CommunityItem) => void;
  onSelectUser?: (user: User) => void;
  onSearchHashtag?: (hashtag: string) => void;
}

const SEARCH_TABS = ['All', 'Posts', 'People', 'Communities', 'Topics'];

const POPULAR_SUGGESTIONS = [
  '#Varanasi',
  '#IncredibleIndia',
  '#TechBharat',
  '#NewIndia',
  '#Ayurveda',
  '#DesiDesign',
];


export const SearchScreen: React.FC<SearchScreenProps> = ({
  initialQuery = 'Varanasi',
  onNavigate,
  onBack,
  onSelectPost,
  onSelectCommunity,
  onSelectUser,
  onSearchHashtag,
}) => {
  const { posts, likePost, repostPost, bookmarkPost } = usePosts();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(initialQuery?.startsWith('#') ? 'Posts' : 'All');
  const [isSearching, setIsSearching] = useState(false);

  // API Results
  const [apiPosts, setApiPosts] = useState<Post[]>([]);
  const [apiUsers, setApiUsers] = useState<User[]>([]);
  const [apiHashtags, setApiHashtags] = useState<string[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [allCommunities, setAllCommunities] = useState<CommunityItem[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);

  // Empty query -> show suggestions from the API (same as web /search)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [peopleRes, commRes, trendRes] = await Promise.allSettled([
        fetchWhoToFollow(25),
        fetchCommunitiesApi({ limit: 50 }),
        fetchTrendingApi(20),
      ]);
      if (cancelled) return;
      if (peopleRes.status === 'fulfilled') setSuggestedUsers(peopleRes.value);
      if (commRes.status === 'fulfilled') setAllCommunities(commRes.value.items);
      if (trendRes.status === 'fulfilled') setTrendingTags(trendRes.value.map((t) => t.tag));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Follow & Join local toggles
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [joinedCommMap, setJoinedCommMap] = useState<Record<string, boolean>>({});

  // Sync state if initialQuery changes from outside (e.g. user clicked hashtag in a post)
  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
      if (initialQuery.startsWith('#')) {
        setActiveTab('Posts');
      }
    }
  }, [initialQuery]);

  // Debounced API search
  useEffect(() => {
    if (!query.trim()) {
      setApiPosts([]);
      setApiUsers([]);
      setApiHashtags([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const typeMap: Record<string, 'all' | 'users' | 'posts' | 'tags'> = {
          All: 'all',
          People: 'users',
          Posts: 'posts',
          Topics: 'tags',
        };
        const results = await searchApi(query.trim(), typeMap[activeTab] || 'all', 30);
        setApiPosts(results.posts || []);
        setApiUsers(results.users || []);
        setApiHashtags((results.hashtags || []).map((h) => h.tag));
      } catch {
        setApiPosts([]);
        setApiUsers([]);
        setApiHashtags([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, activeTab]);

  const handleClear = () => {
    setQuery('');
  };

  const isHashtagSearch = query.trim().startsWith('#');
  const cleanQuery = query.trim().replace(/^#/, '').toLowerCase();

  // Matched Posts
  const filteredPosts = useMemo(() => {
    if (!cleanQuery) return [];
    const map = new Map<string, Post>();
    apiPosts.forEach((p) => map.set(p.id, p));
    // posts already in the feed keep their live like/bookmark state
    posts.forEach((p) => {
      if (map.has(p.id)) map.set(p.id, p);
    });
    return Array.from(map.values());
  }, [cleanQuery, posts, apiPosts]);

  // Matched Users
  const filteredUsers = useMemo(() => {
    if (!cleanQuery) return suggestedUsers;
    return apiUsers;
  }, [cleanQuery, apiUsers, suggestedUsers]);

  // Matched Communities
  const filteredCommunities = useMemo(() => {
    if (!cleanQuery) return allCommunities;
    return allCommunities.filter(
      (c) =>
        c.name.toLowerCase().includes(cleanQuery) ||
        (c.category || '').toLowerCase().includes(cleanQuery) ||
        (c.description || '').toLowerCase().includes(cleanQuery),
    );
  }, [cleanQuery, allCommunities]);

  // Matched Topics / Hashtags
  const filteredHashtags = useMemo(() => {
    const tagsSet = new Set<string>();

    // From trending hashtags
    trendingTags.forEach((t) => {
      tagsSet.add(t.startsWith('#') ? t : `#${t}`);
    });

    // Extract from posts
    filteredPosts.forEach((p) => {
      const found = p.content.match(/#[a-zA-Z0-9_\u0900-\u097F]+/g);
      if (found) {
        found.forEach((t) => tagsSet.add(t));
      }
    });

    // From API
    apiHashtags.forEach((h) => {
      tagsSet.add(h.startsWith('#') ? h : `#${h}`);
    });

    const list = Array.from(tagsSet);
    if (!cleanQuery) return list;
    return list.filter((t) => t.toLowerCase().includes(cleanQuery));
  }, [cleanQuery, filteredPosts, apiHashtags, trendingTags]);

  // Follow / Unfollow user
  const handleToggleFollow = async (handle: string) => {
    if (!isAuthenticated) {
      onNavigate('signin');
      return;
    }
    const next = !followingMap[handle];
    setFollowingMap((prev) => ({ ...prev, [handle]: next }));
    try {
      if (next) await followUserApi(handle);
      else await unfollowUserApi(handle);
    } catch {
      setFollowingMap((prev) => ({ ...prev, [handle]: !next })); // rollback
    }
  };

  // Join / Leave community
  const handleToggleJoin = async (commId: string) => {
    if (!isAuthenticated) {
      onNavigate('signin');
      return;
    }
    const next = !joinedCommMap[commId];
    setJoinedCommMap((prev) => ({ ...prev, [commId]: next }));
    setAllCommunities((prev) =>
      prev.map((c) => (c.id === commId ? { ...c, isJoined: next } : c)),
    );
    try {
      await toggleJoinCommunityApi(commId);
    } catch {
      setJoinedCommMap((prev) => ({ ...prev, [commId]: !next }));
      setAllCommunities((prev) =>
        prev.map((c) => (c.id === commId ? { ...c, isJoined: !next } : c)),
      );
    }
  };

  // Hashtag click handler
  const handleHashtagPress = (tag: string) => {
    const formatted = tag.startsWith('#') ? tag : `#${tag}`;
    setQuery(formatted);
    setActiveTab('Posts');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Top Search Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <BackIcon size={24} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.searchBar}>
            <SearchIcon size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search posts, #hashtags, people..."
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              autoFocus={!initialQuery}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
                <CloseIcon size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Hashtag Spotlight Banner when searching a hashtag */}
        {isHashtagSearch && (
          <View style={styles.hashtagBanner}>
            <View style={styles.hashtagIconBox}>
              <TopicIcon size={22} color={colors.primary} />
            </View>
            <View style={styles.hashtagBannerInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.hashtagBannerTitle}>{query}</Text>
                <View style={styles.trendingTagBadge}>
                  <Text style={styles.trendingTagBadgeText}>Hashtag</Text>
                </View>
              </View>
              <Text style={styles.hashtagBannerSubtitle}>
                {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'} tagged with{' '}
                {query} across Bharat
              </Text>
            </View>
          </View>
        )}

        {/* Search Filter Tabs */}
        <View style={styles.tabsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {SEARCH_TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
                  >
                    {tab}
                  </Text>
                  {isActive && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Search Results Content */}
        <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
          {isSearching && (
            <View style={styles.searchLoadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.searchLoadingText}>Searching across VARTA...</Text>
            </View>
          )}

          {/* TAB: ALL */}
          {activeTab === 'All' && (
            <View>
              {/* People Preview in All */}
              {filteredUsers.length > 0 && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>👤 People</Text>
                    {filteredUsers.length > 2 && (
                      <TouchableOpacity onPress={() => setActiveTab('People')}>
                        <Text style={styles.seeAllText}>See all ({filteredUsers.length})</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {filteredUsers.slice(0, 2).map((u) => {
                    const isFollowed = followingMap[u.handle] ?? false;
                    return (
                      <TouchableOpacity
                        key={u.id}
                        style={styles.userCard}
                        activeOpacity={0.85}
                        onPress={() => {
                          if (onSelectUser) onSelectUser(u);
                          onNavigate('profile');
                        }}
                      >
                        <Avatar uri={u.avatar} name={u.name} size={44} />
                        <View style={styles.userInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={styles.userName}>{u.name}</Text>
                            {u.verified && <VerifiedBadge size={14} />}
                          </View>
                          <Text style={styles.userHandle}>{u.handle}</Text>
                          {u.bio ? (
                            <Text style={styles.userBio} numberOfLines={1}>
                              {u.bio}
                            </Text>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          style={[styles.followBtn, isFollowed && styles.followBtnActive]}
                          onPress={() => handleToggleFollow(u.handle)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.followBtnText,
                              isFollowed && styles.followBtnTextActive,
                            ]}
                          >
                            {isFollowed ? 'Following' : 'Follow'}
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Communities Preview in All */}
              {filteredCommunities.length > 0 && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🏛️ Communities</Text>
                    {filteredCommunities.length > 2 && (
                      <TouchableOpacity onPress={() => setActiveTab('Communities')}>
                        <Text style={styles.seeAllText}>
                          See all ({filteredCommunities.length})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {filteredCommunities.slice(0, 2).map((comm) => {
                    const isJoined = joinedCommMap[comm.id] ?? comm.isJoined;
                    return (
                      <TouchableOpacity
                        key={comm.id}
                        style={styles.commCard}
                        activeOpacity={0.85}
                        onPress={() => {
                          if (onSelectCommunity) onSelectCommunity(comm);
                          onNavigate('community-detail');
                        }}
                      >
                        <Avatar uri={comm.avatar} name={comm.name} size={42} />
                        <View style={styles.commInfo}>
                          <Text style={styles.commName}>{comm.name}</Text>
                          <Text style={styles.commMeta}>
                            {comm.category} · {comm.members}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.joinBtn, isJoined && styles.joinBtnActive]}
                          onPress={() => handleToggleJoin(comm.id)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[styles.joinBtnText, isJoined && styles.joinBtnTextActive]}
                          >
                            {isJoined ? 'Joined' : 'Join'}
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Posts Section in All */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>📝 Posts & Conversations</Text>
                {filteredPosts.length > 0 ? (
                  filteredPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onPress={() => {
                        onSelectPost(post);
                        onNavigate('post-detail');
                      }}
                      onPressAuthor={(author) => {
                        if (onSelectUser) onSelectUser(author || post.author);
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
                      onPressHashtag={handleHashtagPress}
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
                      onLike={() => likePost(post.id)}
                      onRepost={() => repostPost(post.id)}
                      onBookmark={() => bookmarkPost(post.id)}
                    />
                  ))
                ) : (
                  <View style={styles.noResultsBox}>
                    <Text style={styles.noResultsTitle}>No posts found</Text>
                    <Text style={styles.noResultsSub}>
                      Try exploring other trending hashtags or terms below!
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB: POSTS */}
          {activeTab === 'Posts' && (
            <View>
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPress={() => {
                      onSelectPost(post);
                      onNavigate('post-detail');
                    }}
                    onPressAuthor={(author) => {
                      if (onSelectUser) onSelectUser(author || post.author);
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
                    onPressHashtag={handleHashtagPress}
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
                    onLike={() => likePost(post.id)}
                    onRepost={() => repostPost(post.id)}
                    onBookmark={() => bookmarkPost(post.id)}
                  />
                ))
              ) : (
                <View style={styles.noResultsBox}>
                  <Text style={styles.noResultsTitle}>No posts found for "{query}"</Text>
                  <Text style={styles.noResultsSub}>
                    Try searching for another topic or tap a trending hashtag below.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* TAB: PEOPLE */}
          {activeTab === 'People' && (
            <View style={styles.sectionBlock}>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isFollowed = followingMap[u.handle] ?? false;
                  return (
                    <TouchableOpacity
                      key={u.id}
                      style={styles.userCard}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (onSelectUser) onSelectUser(u);
                        onNavigate('profile');
                      }}
                    >
                      <Avatar uri={u.avatar} name={u.name} size={48} />
                      <View style={styles.userInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={styles.userName}>{u.name}</Text>
                          {u.verified && <VerifiedBadge size={14} />}
                        </View>
                        <Text style={styles.userHandle}>{u.handle}</Text>
                        {u.bio ? (
                          <Text style={styles.userBio} numberOfLines={2}>
                            {u.bio}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={[styles.followBtn, isFollowed && styles.followBtnActive]}
                        onPress={() => handleToggleFollow(u.handle)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.followBtnText,
                            isFollowed && styles.followBtnTextActive,
                          ]}
                        >
                          {isFollowed ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.noResultsBox}>
                  <Text style={styles.noResultsTitle}>No creators found</Text>
                  <Text style={styles.noResultsSub}>Try searching with a different name or handle.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB: COMMUNITIES */}
          {activeTab === 'Communities' && (
            <View style={styles.sectionBlock}>
              {filteredCommunities.length > 0 ? (
                filteredCommunities.map((comm) => {
                  const isJoined = joinedCommMap[comm.id] ?? comm.isJoined;
                  return (
                    <TouchableOpacity
                      key={comm.id}
                      style={styles.commCard}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (onSelectCommunity) onSelectCommunity(comm);
                        onNavigate('community-detail');
                      }}
                    >
                      <Avatar uri={comm.avatar} name={comm.name} size={46} />
                      <View style={styles.commInfo}>
                        <Text style={styles.commName}>{comm.name}</Text>
                        <Text style={styles.commMeta}>
                          {comm.category} · {comm.members}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.joinBtn, isJoined && styles.joinBtnActive]}
                        onPress={() => handleToggleJoin(comm.id)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[styles.joinBtnText, isJoined && styles.joinBtnTextActive]}
                        >
                          {isJoined ? 'Joined' : 'Join'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.noResultsBox}>
                  <Text style={styles.noResultsTitle}>No communities found</Text>
                  <Text style={styles.noResultsSub}>
                    Try searching for Technology, Travel, India, or Culture clubs.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* TAB: TOPICS / HASHTAGS */}
          {activeTab === 'Topics' && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>🏷️ Trending Hashtags on VARTA</Text>
              <View style={styles.hashtagsGrid}>
                {filteredHashtags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.hashtagChip}
                    onPress={() => handleHashtagPress(tag)}
                    activeOpacity={0.8}
                  >
                    <TopicIcon size={16} color={colors.primary} />
                    <Text style={styles.hashtagChipText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Popular Hashtag Quick Picks suggestions footer */}
          <View style={styles.quickPicksContainer}>
            <Text style={styles.quickPicksTitle}>✨ Popular Bharat Hashtags</Text>
            <View style={styles.quickPicksRow}>
              {POPULAR_SUGGESTIONS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.quickPickTag}
                  onPress={() => handleHashtagPress(tag)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.quickPickTagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
  },
  hashtagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  hashtagIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashtagBannerInfo: {
    flex: 1,
  },
  hashtagBannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  trendingTagBadge: {
    backgroundColor: '#FF9933',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendingTagBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  hashtagBannerSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  tabsRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 22,
  },
  tabButton: {
    paddingVertical: 12,
    position: 'relative',
  },
  tabButtonActive: {},
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  resultsScroll: {
    flex: 1,
  },
  searchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  searchLoadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  sectionBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  seeAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  userHandle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  userBio: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  followBtnActive: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  followBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  followBtnTextActive: {
    color: '#0F172A',
  },
  commCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  commInfo: {
    flex: 1,
  },
  commName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  commMeta: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  joinBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  joinBtnActive: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  joinBtnTextActive: {
    color: '#0F172A',
  },
  hashtagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  hashtagChipText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#C2410C',
  },
  quickPicksContainer: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
  },
  quickPicksTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  quickPicksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickPickTag: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  quickPickTagText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  noResultsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  noResultsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  noResultsSub: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
