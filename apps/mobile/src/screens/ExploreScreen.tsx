import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  SearchIcon,
  CloseIcon,
  DotsIcon,
  VerifiedBadge,
  TopicIcon,
  HeartIcon,
  BookmarkIcon,
  CheckIcon,
} from '../components/common/Icons';
import { Avatar } from '../components/common/Avatar';
import { PostCard } from '../components/feed/PostCard';
import { BottomNav } from '../components/common/BottomNav';
import {
  fetchCommunitiesApi,
  fetchFeedPage,
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
import { ScreenName, TrendingItem, Post, User, CommunityItem, PostGroup } from '../types';
import { usePosts } from '../context/PostsContext';

interface ExploreScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onSearchTopic?: (topic: string) => void;
  onSelectUser?: (user: any) => void;
  onSelectPost?: (post: Post) => void;
  onSelectCommunity?: (group: PostGroup | CommunityItem) => void;
}

const CATEGORY_TABS = [
  'All',
  'Trending',
  'Technology',
  'News',
  'Culture',
  'Communities',
  'Travel',
];

const SEARCH_RESULT_TABS = ['All', 'People', 'Communities', 'Posts', 'Topics'];

interface CreatorSuggestion {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  isFollowing: boolean;
  category?: string;
}

const INITIAL_CREATORS: CreatorSuggestion[] = [
  {
    id: 'aarav_sharma',
    name: 'Aarav Sharma',
    handle: '@aarav_sharma',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
    bio: 'Fullstack Dev & Open Source. Building for Bharat 🇮🇳.',
    isFollowing: false,
    category: 'Technology',
  },
  {
    id: 'priya_designs',
    name: 'Priya Iyer',
    handle: '@priya_designs',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    bio: 'Product Designer @ Mumbai. Indian folk art revivals.',
    isFollowing: true,
    category: 'Culture',
  },
  {
    id: 'travelindia',
    name: 'Travel India 🇮🇳',
    handle: '@travelindia',
    avatar: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=200',
    bio: 'Discover the hidden gems of Incredible Bharat.',
    isFollowing: false,
    category: 'Travel',
  },
  {
    id: 'dr_anand_v',
    name: 'Dr. Anand Verma',
    handle: '@anand_verma',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    bio: 'Ayurveda & Modern Science researcher. New Delhi.',
    isFollowing: false,
    category: 'News',
  },
  {
    id: 'varta_official',
    name: 'VARTA Official',
    handle: '@varta_official',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
    bio: 'The voice of every citizen. Built in Bharat 🇮🇳',
    isFollowing: true,
    category: 'Trending',
  },
];

const POPULAR_COMMUNITIES: (CommunityItem & { banner?: string; description?: string })[] = [
  {
    id: 'comm-tech',
    name: 'Tech Bharat 💻',
    category: 'Technology',
    members: '124K members',
    avatar: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200',
    description: 'AI, Open Source, UPI & building software for 1.4B citizens.',
    isJoined: false,
  },
  {
    id: 'comm-travel',
    name: 'Incredible India 🇮🇳',
    category: 'Travel',
    members: '98K members',
    avatar: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=200',
    description: 'Himalayas to Kanyakumari — hidden gems, trails & culture.',
    isJoined: true,
  },
  {
    id: 'comm-design',
    name: 'Desi Designers 🎨',
    category: 'Culture',
    members: '45K members',
    avatar: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200',
    description: 'Indian typography, folk art motifs & UI/UX innovation.',
    isJoined: false,
  },
  {
    id: 'comm-heritage',
    name: 'Sanskrit & Heritage 🛕',
    category: 'Culture',
    members: '82K members',
    avatar: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=200',
    description: 'Ancient texts, temples, civilizational history & architecture.',
    isJoined: false,
  },
  {
    id: 'comm-startups',
    name: 'Startup Hub India 🚀',
    category: 'Technology',
    members: '160K members',
    avatar: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=200',
    description: 'Founders, angel networks, bootstrapping & unicorn journeys.',
    isJoined: false,
  },
];

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  onNavigate,
  onSearchTopic,
  onSelectUser,
  onSelectPost,
  onSelectCommunity,
}) => {
  const { posts, likePost, repostPost, bookmarkPost } = usePosts();
  const [categoryPostsState, setCategoryPostsState] = useState<Post[]>([]);
  const [isLoadingCategoryFeed, setIsLoadingCategoryFeed] = useState(true);
  const { isAuthenticated } = useAuth();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilterTab, setSearchFilterTab] = useState('All');
  const [isSearching, setIsSearching] = useState(false);

  // Category Browse State
  const [activeCategory, setActiveCategory] = useState('All');
  const [trends, setTrends] = useState<TrendingItem[]>([]);
  const [creators, setCreators] = useState<CreatorSuggestion[]>([]);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [isLoadingExplore, setIsLoadingExplore] = useState(true);
  // Communities matching the current query, fetched from the API (server-side search)
  const [searchedCommunities, setSearchedCommunities] = useState<CommunityItem[]>([]);
  const [isSearchingCommunities, setIsSearchingCommunities] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Category chip -> backend feed category (same mapping as the web Explore page)
  const categoryToFeed: Record<string, string | undefined> = {
    All: undefined,
    Trending: 'India Trends',
    News: 'India Trends',
    Technology: 'Technology',
    Travel: 'Travel',
    Sports: 'Sports',
    Entertainment: 'Entertainment',
    Food: 'Food',
    Lifestyle: 'Lifestyle',
    Communities: undefined,
    Culture: undefined,
  };

  // Category feed from the API (mirrors the website's Explore tabs)
  useEffect(() => {
    let cancelled = false;
    setIsLoadingCategoryFeed(true);
    const category = categoryToFeed[activeCategory];
    fetchFeedPage('for-you', category, undefined, 25)
      .then((page) => {
        if (!cancelled) setCategoryPostsState(page.items);
      })
      .catch(() => {
        if (!cancelled) setCategoryPostsState([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCategoryFeed(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  // Reload communities when the category chip changes (server-side filter)
  useEffect(() => {
    let cancelled = false;
    const category =
      activeCategory === 'All' ||
      activeCategory === 'Trending' ||
      activeCategory === 'News' ||
      activeCategory === 'Culture' ||
      activeCategory === 'Communities'
        ? undefined
        : activeCategory;
    fetchCommunitiesApi({ category, limit: 12 })
      .then((page) => {
        if (!cancelled) setCommunities(page.items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  // Load trending, who-to-follow and communities from the live API
  useEffect(() => {
    let cancelled = false;
    setIsLoadingExplore(true);

    (async () => {
      const [trendingRes, creatorsRes, communitiesRes] = await Promise.allSettled([
        fetchTrendingApi(10),
        fetchWhoToFollow(10),
        fetchCommunitiesApi({ limit: 12 }),
      ]);

      if (cancelled) return;

      if (trendingRes.status === 'fulfilled') setTrends(trendingRes.value);
      if (creatorsRes.status === 'fulfilled') {
        setCreators(
          creatorsRes.value.map((u) => ({
            id: u.id,
            name: u.name,
            handle: u.handle,
            avatar: u.avatar,
            bio: u.bio || '',
            isFollowing: Boolean(u.isFollowing),
            category: 'Suggested',
          })),
        );
      }
      if (communitiesRes.status === 'fulfilled') setCommunities(communitiesRes.value.items);

      setIsLoadingExplore(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // When search query is entered, query API or filter locally
  const [apiUsers, setApiUsers] = useState<User[]>([]);
  const [apiPosts, setApiPosts] = useState<Post[]>([]);
  const [apiHashtags, setApiHashtags] = useState<string[]>([]);
  // Posts for a hashtag searched through the API (fallback when text search is thin)
  const [hashtagPosts, setHashtagPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setApiUsers([]);
      setApiPosts([]);
      setApiHashtags([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      const typeMap: Record<string, 'all' | 'users' | 'posts' | 'tags'> = {
        All: 'all',
        People: 'users',
        Posts: 'posts',
        Topics: 'tags',
        Communities: 'all',
      };
      searchApi(searchQuery.trim(), typeMap[searchFilterTab] || 'all', 30)
        .then((res) => {
          setApiUsers(res.users || []);
          setApiPosts(res.posts || []);
          setApiHashtags((res.hashtags || []).map((h) => h.tag));
        })
        .catch(() => {
          setApiUsers([]);
          setApiPosts([]);
          setApiHashtags([]);
        })
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchFilterTab]);

  // Hashtag searches use the dedicated endpoint (/explore/hashtag/:tag)
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term.startsWith('#')) {
      setHashtagPosts([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchHashtagPostsPage(term.slice(1), undefined, 30)
        .then((page) => {
          if (!cancelled) setHashtagPosts(page.items);
        })
        .catch(() => {
          if (!cancelled) setHashtagPosts([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Server-side community search (the API filters by name/description/category)
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchedCommunities([]);
      setIsSearchingCommunities(false);
      return;
    }
    setIsSearchingCommunities(true);
    setSearchError(null);
    const timer = setTimeout(() => {
      fetchCommunitiesApi({ search: term, limit: 50 })
        .then((page) => setSearchedCommunities(page.items))
        .catch((err: any) => {
          setSearchedCommunities([]);
          setSearchError(err?.message || 'Community search failed');
        })
        .finally(() => setIsSearchingCommunities(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Combined Results Filtered by Query
  const q = searchQuery.toLowerCase().trim();

  // Matched Users
  const filteredUsers = useMemo(() => {
    if (!q) return [];
    return apiUsers;
  }, [q, apiUsers]);

  // Matched Communities
  const filteredCommunities = useMemo(() => {
    if (!q) return [];
    const merged = new Map<string, CommunityItem>();
    searchedCommunities.forEach((c) => merged.set(c.id, c));
    communities
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.category || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q),
      )
      .forEach((c) => {
        if (!merged.has(c.id)) merged.set(c.id, c);
      });
    return Array.from(merged.values());
  }, [q, communities, searchedCommunities]);

  // Matched Posts
  const filteredPosts = useMemo(() => {
    if (!q) return [];
    if (hashtagPosts.length === 0) return apiPosts;
    const merged = new Map<string, Post>();
    apiPosts.forEach((p) => merged.set(p.id, p));
    hashtagPosts.forEach((p) => {
      if (!merged.has(p.id)) merged.set(p.id, p);
    });
    return Array.from(merged.values());
  }, [q, apiPosts, hashtagPosts]);

  // Matched Topics / Hashtags
  const filteredHashtags = useMemo(() => {
    if (!q) return [];
    const set = new Set<string>();
    trends
      .filter((t) => t.tag.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      .forEach((t) => set.add(t.tag));
    apiHashtags.forEach((h) => set.add(h.startsWith('#') ? h : `#${h}`));
    return Array.from(set);
  }, [q, trends, apiHashtags]);

  // Category feed is loaded from the API (/feed/for-you?category=...)
  const categoryPosts = categoryPostsState;

  // Handlers
  const handleSelectHashtag = (tag: string) => {
    const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;
    setSearchQuery(formattedTag);
    setSearchFilterTab('All');
    if (onSearchTopic) {
      onSearchTopic(formattedTag);
    }
  };

  const toggleFollowCreator = async (id: string, handle: string) => {
    if (!isAuthenticated) {
      showToast('Sign in to follow creators');
      return;
    }
    const target = creators.find((c) => c.id === id);
    if (!target) return;
    const next = !target.isFollowing;

    setCreators((prev) => prev.map((c) => (c.id === id ? { ...c, isFollowing: next } : c)));
    try {
      if (next) await followUserApi(handle);
      else await unfollowUserApi(handle);
      showToast(next ? `Following ${handle} ✓` : `Unfollowed ${handle}`);
    } catch {
      // rollback
      setCreators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isFollowing: !next } : c)),
      );
      showToast('Could not update follow. Try again.');
    }
  };

  const toggleJoinComm = async (commId: string, commName: string) => {
    if (!isAuthenticated) {
      showToast('Sign in to join communities');
      return;
    }
    const target = communities.find((c) => c.id === commId);
    const next = !target?.isJoined;

    setCommunities((prev) =>
      prev.map((c) => (c.id === commId ? { ...c, isJoined: next } : c)),
    );
    try {
      const res = await toggleJoinCommunityApi(commId);
      setCommunities((prev) =>
        prev.map((c) =>
          c.id === commId
            ? {
                ...c,
                isJoined: typeof res?.isJoined === 'boolean' ? res.isJoined : next,
                memberCount: res?.memberCount ?? c.memberCount,
                members: `${res?.memberCount ?? c.memberCount ?? 0} members`,
              }
            : c,
        ),
      );
      showToast(next ? `Joined ${commName}! 🏛️` : `Left ${commName}`);
    } catch {
      setCommunities((prev) =>
        prev.map((c) => (c.id === commId ? { ...c, isJoined: !next } : c)),
      );
      showToast('Could not update membership. Try again.');
    }
  };

  const handleOpenUser = (targetUser: User) => {
    if (onSelectUser) onSelectUser(targetUser);
    onNavigate('profile');
  };

  const handleOpenMention = (mention: string) => {
    const username = mention.replace('@', '');
    handleOpenUser({
      id: `user-${username}`,
      name: username,
      handle: `@${username}`,
      username,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0F172A&color=FFFFFF`,
    });
  };

  const handleOpenCommunity = (comm: CommunityItem) => {
    if (onSelectCommunity) onSelectCommunity(comm);
    onNavigate('community-detail');
  };

  const handleOpenPost = (post: Post) => {
    if (onSelectPost) onSelectPost(post);
    onNavigate('post-detail');
  };

  const totalResultsCount =
    filteredUsers.length +
    filteredCommunities.length +
    filteredPosts.length +
    filteredHashtags.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Top Header Title */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explore Bharat</Text>
          <Text style={styles.headerSubtitle}>Discover stories, people & trends</Text>
        </View>

        {/* Live Functional Search Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <SearchIcon size={18} color={q ? colors.primary : '#94A3B8'} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people, topics, communities..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CloseIcon size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Conditional Content: Search Results vs Explore Browse Feed */}
        {searchQuery.trim().length > 0 ? (
          /* ================= SEARCH RESULTS MODE ================= */
          <View style={{ flex: 1 }}>
            {/* Search Result Category Tabs */}
            <View style={styles.searchTabsRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.searchTabsContent}
              >
                {SEARCH_RESULT_TABS.map((tab) => {
                  const isActive = searchFilterTab === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.searchTabChip, isActive && styles.searchTabChipActive]}
                      onPress={() => setSearchFilterTab(tab)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.searchTabChipText,
                          isActive && styles.searchTabChipTextActive,
                        ]}
                      >
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Results Status Header */}
            <View style={styles.resultsStatusRow}>
              <Text style={styles.resultsStatusText}>
                {isSearching || isSearchingCommunities
                  ? 'Searching Bharat...'
                  : totalResultsCount === 0
                    ? `No results for "${searchQuery}"`
                    : `${totalResultsCount} results for "${searchQuery}"`}
              </Text>
              {(isSearching || isSearchingCommunities) && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>

            {!!searchError && (
              <Text style={{ color: '#DC2626', fontSize: 12, paddingHorizontal: 16, paddingBottom: 6 }}>
                {searchError}
              </Text>
            )}

            <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
              {/* 1. People Results */}
              {(searchFilterTab === 'All' || searchFilterTab === 'People') &&
                filteredUsers.length > 0 && (
                  <View style={styles.searchSectionBlock}>
                    <Text style={styles.searchSectionTitle}>👤 People</Text>
                    {filteredUsers.map((u) => {
                      const isFollowed =
                        creators.find((c) => c.handle.toLowerCase() === u.handle.toLowerCase())
                          ?.isFollowing || false;
                      return (
                        <TouchableOpacity
                          key={u.id}
                          style={styles.userResultCard}
                          activeOpacity={0.85}
                          onPress={() => handleOpenUser(u)}
                        >
                          <Avatar uri={u.avatar} name={u.name} size={46} />
                          <View style={styles.userResultInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={styles.userResultName}>{u.name}</Text>
                              {u.verified && <VerifiedBadge size={14} />}
                            </View>
                            <Text style={styles.userResultHandle}>{u.handle}</Text>
                            {u.bio ? (
                              <Text style={styles.userResultBio} numberOfLines={2}>
                                {u.bio}
                              </Text>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.followBtnSmall,
                              isFollowed && styles.followBtnSmallActive,
                            ]}
                            onPress={() => toggleFollowCreator(u.id, u.handle)}
                          >
                            <Text
                              style={[
                                styles.followBtnSmallText,
                                isFollowed && styles.followBtnSmallTextActive,
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

              {/* 2. Communities Results */}
              {(searchFilterTab === 'All' || searchFilterTab === 'Communities') &&
                isSearchingCommunities &&
                filteredCommunities.length === 0 && (
                  <View style={styles.searchSectionBlock}>
                    <Text style={styles.searchSectionTitle}>🏛️ Communities & Clubs</Text>
                    <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  </View>
                )}

              {(searchFilterTab === 'All' || searchFilterTab === 'Communities') &&
                !isSearchingCommunities &&
                filteredCommunities.length === 0 &&
                !!q && (
                  <View style={styles.searchSectionBlock}>
                    <Text style={styles.searchSectionTitle}>🏛️ Communities & Clubs</Text>
                    <Text style={styles.emptyResultsInline}>
                      No communities match "{searchQuery.trim()}"
                    </Text>
                  </View>
                )}

              {(searchFilterTab === 'All' || searchFilterTab === 'Communities') &&
                filteredCommunities.length > 0 && (
                  <View style={styles.searchSectionBlock}>
                    <Text style={styles.searchSectionTitle}>🏛️ Communities & Clubs</Text>
                    {filteredCommunities.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.communityResultCard}
                        activeOpacity={0.85}
                        onPress={() => handleOpenCommunity(c)}
                      >
                        <Image source={{ uri: c.avatar }} style={styles.commResultAvatar} />
                        <View style={styles.commResultInfo}>
                          <Text style={styles.commResultName}>{c.name}</Text>
                          <Text style={styles.commResultDesc} numberOfLines={1}>
                            {c.description || `${c.category} · ${c.members}`}
                          </Text>
                          <View style={styles.commMetaRow}>
                            <Text style={styles.commCategoryPill}>{c.category}</Text>
                            <Text style={styles.commMembersText}>{c.members}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[styles.joinBtnSmall, c.isJoined && styles.joinBtnSmallActive]}
                          onPress={() => toggleJoinComm(c.id, c.name)}
                        >
                          <Text
                            style={[
                              styles.joinBtnSmallText,
                              c.isJoined && styles.joinBtnSmallTextActive,
                            ]}
                          >
                            {c.isJoined ? 'Joined' : 'Join'}
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

              {/* 3. Topics / Hashtags Results */}
              {(searchFilterTab === 'All' || searchFilterTab === 'Topics') &&
                filteredHashtags.length > 0 && (
                  <View style={styles.searchSectionBlock}>
                    <Text style={styles.searchSectionTitle}>🏷️ Trending Hashtags</Text>
                    <View style={styles.hashtagsGrid}>
                      {filteredHashtags.map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={styles.hashtagPill}
                          onPress={() => handleSelectHashtag(h)}
                        >
                          <TopicIcon size={14} color={colors.primary} />
                          <Text style={styles.hashtagPillText}>{h}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

              {/* 4. Posts Results */}
              {(searchFilterTab === 'All' || searchFilterTab === 'Posts') && (
                <View style={styles.searchSectionBlock}>
                  <Text style={styles.searchSectionTitle}>📝 Posts & Conversations</Text>
                  {filteredPosts.length > 0 ? (
                    filteredPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onPress={() => handleOpenPost(post)}
                        onPressAuthor={(author) => handleOpenUser(author || post.author)}
                        onPressGroup={(group) => {
                          if (onSelectCommunity) {
                            onSelectCommunity(group);
                            onNavigate('community-detail');
                          }
                        }}
                        onPressHashtag={(tag) => handleSelectHashtag(tag)}
                        onPressMention={handleOpenMention}
                        onLike={() => likePost(post.id)}
                        onRepost={() => repostPost(post.id)}
                        onBookmark={() => bookmarkPost(post.id)}
                      />
                    ))
                  ) : (
                    <Text style={styles.emptyResultsInline}>No posts matching this filter</Text>
                  )}
                </View>
              )}

              {/* Empty State */}
              {totalResultsCount === 0 && !isSearching && (
                <View style={styles.noResultsBox}>
                  <Text style={styles.noResultsTitle}>No results found</Text>
                  <Text style={styles.noResultsSub}>
                    Try searching for "Varanasi", "Tech", "#NewIndia", or "Priya"
                  </Text>
                </View>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        ) : (
          /* ================= EXPLORE BROWSE MODE ================= */
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {/* 1. Discover Bharat Hero Banner */}
            <View style={styles.heroBanner}>
              <View style={styles.heroHeaderRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>✨ DISCOVER BHARAT</Text>
                </View>
                <Text style={styles.heroFlag}>🇮🇳</Text>
              </View>
              <Text style={styles.heroTitle}>
                Explore What India is Talking About Today
              </Text>
              <Text style={styles.heroSub}>
                Culture, technology, news & public discourse across 28 states & 8 UTs.
              </Text>

              {/* Quick Hashtag Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.heroTagsScroll}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {(trends.length > 0
                  ? trends.slice(0, 6).map((t) => t.tag)
                  : ['#DigitalBharat', '#Varanasi', '#Chandrayaan', '#UPI', '#TechIndia']
                ).map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.heroTagPill}
                    onPress={() => handleSelectHashtag(tag)}
                  >
                    <Text style={styles.heroTagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 2. Category Browse Chips Bar */}
            <View style={styles.categoryChipsBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChipsContent}
              >
                {CATEGORY_TABS.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                      onPress={() => setActiveCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          isActive && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 3. Trending Topics in India */}
            {(activeCategory === 'All' || activeCategory === 'Trending') && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>🔥 Trending Topics in India</Text>
                  <TouchableOpacity onPress={() => onNavigate('search')}>
                    <Text style={styles.seeMoreLink}>See more</Text>
                  </TouchableOpacity>
                </View>

                {isLoadingExplore && trends.length === 0 && (
                  <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}

                {!isLoadingExplore && trends.length === 0 && (
                  <Text style={{ color: '#94A3B8', paddingVertical: 12 }}>
                    No trending topics yet.
                  </Text>
                )}

                {trends.slice(0, 5).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.trendingCard}
                    activeOpacity={0.8}
                    onPress={() => handleSelectHashtag(item.tag)}
                  >
                    <View style={styles.trendingLeft}>
                      <Text style={styles.rankNumber}>#{item.rank}</Text>
                      <View style={styles.trendingInfo}>
                        <Text style={styles.trendingTag}>{item.tag}</Text>
                        <Text style={styles.trendingCategory}>{item.category}</Text>
                        <Text style={styles.trendingPosts}>{item.postCount}</Text>
                      </View>
                    </View>

                    <View style={styles.trendingRight}>
                      {item.imageUrl && (
                        <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
                      )}
                      <View style={styles.menuBtn}>
                        <DotsIcon size={18} color="#94A3B8" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 4. Popular Communities Showcase */}
            {(activeCategory === 'All' || activeCategory === 'Communities') && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>🏛️ Popular Bharat Communities</Text>
                  <TouchableOpacity onPress={() => onNavigate('communities')}>
                    <Text style={styles.seeMoreLink}>View all</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.commScrollContent}
                >
                  {isLoadingExplore && communities.length === 0 && (
                    <View style={{ paddingVertical: 18, paddingHorizontal: 16 }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  )}

                  {communities.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.commCardHorizontal}
                      activeOpacity={0.85}
                      onPress={() => handleOpenCommunity(c)}
                    >
                      <Image source={{ uri: c.avatar }} style={styles.commCardAvatar} />
                      <Text style={styles.commCardName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.commCardMembers}>{c.members}</Text>
                      <TouchableOpacity
                        style={[styles.commJoinBtn, c.isJoined && styles.commJoinBtnActive]}
                        onPress={() => toggleJoinComm(c.id, c.name)}
                      >
                        <Text
                          style={[
                            styles.commJoinBtnText,
                            c.isJoined && styles.commJoinBtnTextActive,
                          ]}
                        >
                          {c.isJoined ? '✓ Joined' : '+ Join'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 5. Who to Follow / Featured Creators */}
            {(activeCategory === 'All' || activeCategory === 'Culture') && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>✨ Featured Citizens & Creators</Text>
                </View>

                {!isLoadingExplore && creators.length === 0 && (
                  <Text style={{ color: '#94A3B8', paddingVertical: 12 }}>
                    No suggestions right now.
                  </Text>
                )}

                {creators.slice(0, 4).map((c) => {
                  const creatorUser: User = {
                    id: c.id,
                    name: c.name,
                    handle: c.handle,
                    avatar: c.avatar,
                    bio: c.bio,
                    verified: true,
                    followersCount: 1450,
                    followingCount: 320,
                  };
                  return (
                    <View key={c.id} style={styles.creatorCard}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleOpenUser(creatorUser)}
                      >
                        <Avatar uri={c.avatar} name={c.name} size={44} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.creatorInfo}
                        onPress={() => handleOpenUser(creatorUser)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={styles.creatorName}>{c.name}</Text>
                          <VerifiedBadge size={14} />
                        </View>
                        <Text style={styles.creatorHandle}>{c.handle}</Text>
                        <Text style={styles.creatorBio} numberOfLines={1}>
                          {c.bio}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.followToggleBtn,
                          c.isFollowing && styles.followingToggleBtn,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => toggleFollowCreator(c.id, c.handle)}
                      >
                        <Text
                          style={[
                            styles.followToggleText,
                            c.isFollowing && styles.followingToggleText,
                          ]}
                        >
                          {c.isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* 6. Live Category Feed */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  {activeCategory === 'All'
                    ? '📢 Live Bharat Conversations'
                    : `📢 ${activeCategory} Feed`}
                </Text>
              </View>

              {isLoadingCategoryFeed && categoryPosts.length === 0 && (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}

              {!isLoadingCategoryFeed && categoryPosts.length === 0 && (
                <Text style={{ color: '#94A3B8', paddingVertical: 12 }}>
                  No posts in {activeCategory} yet.
                </Text>
              )}

              {categoryPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPress={() => handleOpenPost(post)}
                  onPressAuthor={(author) => handleOpenUser(author || post.author)}
                  onPressGroup={(group) => {
                    if (onSelectCommunity) {
                      onSelectCommunity(group);
                      onNavigate('community-detail');
                    }
                  }}
                  onPressHashtag={(tag) => handleSelectHashtag(tag)}
                  onPressMention={handleOpenMention}
                  onLike={() => likePost(post.id)}
                  onRepost={() => repostPost(post.id)}
                  onBookmark={() => bookmarkPost(post.id)}
                />
              ))}
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <View style={styles.toastContainer}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A',
    flex: 1,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  /* Hero Banner */
  heroBanner: {
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroBadge: {
    backgroundColor: 'rgba(255, 153, 51, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroFlag: {
    fontSize: 18,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 10,
  },
  heroTagsScroll: {
    flexDirection: 'row',
  },
  heroTagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  heroTagText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  /* Category Chips Bar */
  categoryChipsBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  categoryChipsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  contentScroll: {
    flex: 1,
  },
  sectionWrap: {
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeMoreLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  trendingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  trendingLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    width: 26,
    marginTop: 2,
  },
  trendingInfo: {
    flex: 1,
  },
  trendingTag: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  trendingCategory: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  trendingPosts: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  trendingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  menuBtn: {
    padding: 6,
  },
  /* Popular Communities Horizontal Scroll */
  commScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 12,
    flexDirection: 'row',
  },
  commCardHorizontal: {
    width: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commCardAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginBottom: 8,
  },
  commCardName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 2,
  },
  commCardMembers: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  commJoinBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  commJoinBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  commJoinBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  commJoinBtnTextActive: {
    color: '#0F172A',
  },
  /* Creator Card */
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  creatorHandle: {
    fontSize: 12,
    color: '#64748B',
  },
  creatorBio: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  followToggleBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  followingToggleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  followToggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  followingToggleText: {
    color: '#0F172A',
  },
  /* Search Results UI */
  searchTabsRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  searchTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  searchTabChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  searchTabChipActive: {
    backgroundColor: colors.primary,
  },
  searchTabChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  searchTabChipTextActive: {
    color: '#FFFFFF',
  },
  resultsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  resultsStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  resultsScroll: {
    flex: 1,
  },
  searchSectionBlock: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  userResultInfo: {
    flex: 1,
  },
  userResultName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  userResultHandle: {
    fontSize: 12,
    color: '#64748B',
  },
  userResultBio: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  followBtnSmall: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  followBtnSmallActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  followBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  followBtnSmallTextActive: {
    color: '#0F172A',
  },
  communityResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  commResultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  commResultInfo: {
    flex: 1,
  },
  commResultName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  commResultDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  commMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  commCategoryPill: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  commMembersText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  joinBtnSmall: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  joinBtnSmallActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  joinBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  joinBtnSmallTextActive: {
    color: '#0F172A',
  },
  hashtagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  hashtagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  hashtagPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyResultsInline: {
    fontSize: 13,
    color: '#94A3B8',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  noResultsBox: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  noResultsSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
