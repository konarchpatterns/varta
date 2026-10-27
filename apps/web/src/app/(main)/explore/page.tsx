'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  TrendingUp,
  Users,
  CheckCircle,
  Loader2,
  Sparkles,
  Flame,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '../../../components/layout/MainLayout';
import { PostCard } from '../../../components/feed/PostCard';
import { apiRequest } from '../../../lib/api';
import {
  TrendingHashtagItem,
  UserSummary,
  PostItem,
  PaginatedResponse,
} from '@varta/shared';
import { useAuthStore } from '../../../stores/authStore';

export default function ExplorePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [joinedCommunities, setJoinedCommunities] = useState<Record<string, boolean>>({});

  const categories = [
    'All',
    'Trending',
    'News',
    'Technology',
    'Sports',
    'Entertainment',
    'Travel',
    'Lifestyle',
  ];

  // Map category tab to feed backend filter
  const getCategoryQuery = (cat: string) => {
    if (cat === 'All') return '';
    if (cat === 'Trending' || cat === 'News') return 'India Trends';
    return cat;
  };

  // 1. Trending Hashtags (from DB)
  const { data: trendingHashtags, isLoading: isLoadingTrending } = useQuery<
    TrendingHashtagItem[]
  >({
    queryKey: ['explore-trending'],
    queryFn: () => apiRequest('/explore/trending?limit=8'),
  });

  // 2. Who to Follow (from DB)
  const { data: whoToFollowList } = useQuery<UserSummary[]>({
    queryKey: ['who-to-follow-explore'],
    queryFn: () => apiRequest('/explore/who-to-follow?limit=4'),
  });

  // 3. Popular Communities for category (from DB)
  const { data: communitiesData } = useQuery<{
    items: Array<{
      id: string;
      name: string;
      slug: string;
      description: string;
      category: string;
      avatarUrl?: string;
      memberCount: number;
      isJoined?: boolean;
    }>;
  }>({
    queryKey: ['explore-communities', activeCategory],
    queryFn: () => {
      const catParam =
        activeCategory === 'All' || activeCategory === 'Trending'
          ? ''
          : `&category=${encodeURIComponent(getCategoryQuery(activeCategory))}`;
      return apiRequest(`/explore/communities?limit=4${catParam}`);
    },
  });

  // 4. Live Posts Feed for Category (from DB)
  const {
    data: postsData,
    isLoading: isLoadingPosts,
    refetch: refetchPosts,
  } = useQuery<PaginatedResponse<PostItem>>({
    queryKey: ['explore-feed', activeCategory],
    queryFn: () => {
      const cat = getCategoryQuery(activeCategory);
      const catParam = cat ? `&category=${encodeURIComponent(cat)}` : '';
      return apiRequest(`/feed/for-you?limit=25${catParam}`);
    },
  });

  // Follow / Unfollow handler
  const toggleFollow = async (e: React.MouseEvent, username: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push('/login');
      return;
    }

    const currentFollowing = followingStates[username] ?? false;
    const isNowFollowing = !currentFollowing;

    setFollowingStates((prev) => ({
      ...prev,
      [username]: isNowFollowing,
    }));

    try {
      await apiRequest(`/social/follow/${username}`, {
        method: currentFollowing ? 'DELETE' : 'POST',
      });
      queryClient.invalidateQueries({ queryKey: ['who-to-follow-explore'] });
    } catch (err) {
      setFollowingStates((prev) => ({
        ...prev,
        [username]: currentFollowing,
      }));
    }
  };

  // Join / Leave community handler
  const toggleJoinCommunity = async (
    e: React.MouseEvent,
    commId: string,
    initialJoined: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push('/login');
      return;
    }

    const currentJoined = joinedCommunities[commId] ?? initialJoined;
    const isNowJoined = !currentJoined;

    setJoinedCommunities((prev) => ({
      ...prev,
      [commId]: isNowJoined,
    }));

    try {
      await apiRequest(`/explore/communities/${commId}/join`, {
        method: 'POST',
      });
      queryClient.invalidateQueries({ queryKey: ['explore-communities'] });
    } catch (err) {
      setJoinedCommunities((prev) => ({
        ...prev,
        [commId]: currentJoined,
      }));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <MainLayout>
      {/* 1. Explore India Hero Banner (Clean, modern glowing ambient gradient without overlapping ghost text) */}
      <div className="relative overflow-hidden border-b border-[#1E293B] bg-gradient-to-br from-[#0B1422] via-[#060D18] to-[#0A1320] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF9933]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#138808]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3 max-w-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF9933] flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#FF9933]" />
            Discover Bharat
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            Explore India <br />
            <span className="text-slate-300 text-sm sm:text-base font-normal">
              Discover what people across India are talking about
            </span>
          </h1>

          {/* Banner Search Input */}
          <form onSubmit={handleSearch} className="relative mt-2">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search topics, people, or #hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050B14]/90 backdrop-blur-md border border-[#1E293B] focus:border-[#FF9933] rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-400 outline-none transition shadow-lg"
            />
          </form>
        </div>
      </div>

      {/* 2. Category Chips Bar */}
      <div className="sticky top-0 z-30 bg-[#050B14]/95 backdrop-blur-md border-b border-[#1E293B] px-4 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer active:scale-95 ${
              activeCategory === cat
                ? 'bg-[#FF9933] text-white shadow-md shadow-[#FF9933]/20'
                : 'bg-[#0B1422] text-slate-300 hover:text-white hover:bg-[#101D2D] border border-[#1E293B]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 3. Trending Topics in India */}
      {(activeCategory === 'All' || activeCategory === 'Trending') && (
        <div className="p-4 border-b border-[#1E293B]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-base text-white flex items-center gap-2">
              <Flame size={18} className="text-[#FF9933]" />
              Trending Topics in India
            </h2>
            <Link
              href="/search?type=tags"
              className="text-xs font-semibold text-[#FF9933] hover:underline"
            >
              See more
            </Link>
          </div>

          {isLoadingTrending ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#FF9933]" />
            </div>
          ) : trendingHashtags && trendingHashtags.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trendingHashtags.slice(0, 6).map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/search?q=%23${encodeURIComponent(item.tag)}`)}
                  className="p-3 bg-[#0B1422] border border-[#1E293B] rounded-2xl hover:border-[#FF9933]/50 transition cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xs font-bold text-slate-500 mt-0.5">
                      #{index + 1}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-slate-100 group-hover:text-[#FF9933] transition truncate">
                        #{item.tag}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {item.usageCount.toLocaleString()} {item.usageCount === 1 ? 'post' : 'posts'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#101D2D] border border-[#1E293B] text-slate-400 group-hover:text-white transition shrink-0">
                    Trending
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* 4. Who to Follow across India */}
      {whoToFollowList && whoToFollowList.length > 0 && (
        <div className="p-4 border-b border-[#1E293B]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-base text-white flex items-center gap-2">
              <Users size={18} className="text-[#FF9933]" />
              Who to follow across India
            </h2>
            <Link
              href="/search?type=users"
              className="text-xs font-semibold text-[#FF9933] hover:underline"
            >
              See more
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {whoToFollowList.map((creator) => {
              const isFollowing =
                followingStates[creator.username] ?? creator.isFollowing ?? false;

              return (
                <div
                  key={creator.id}
                  onClick={() => router.push(`/${creator.username}`)}
                  className="p-3.5 bg-[#0B1422] border border-[#1E293B] hover:border-[#FF9933]/40 rounded-2xl flex items-center justify-between gap-3 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <div className="h-11 w-11 rounded-full bg-[#101D2D] border border-[#1E293B] flex items-center justify-center font-bold text-[#FF9933] overflow-hidden shrink-0">
                      {creator.avatarUrl ? (
                        <img
                          src={creator.avatarUrl}
                          alt={creator.username}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        creator.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden min-w-0">
                      <span className="font-bold text-sm text-slate-100 truncate group-hover:text-[#FF9933] transition flex items-center gap-1">
                        {creator.displayName || creator.username}
                        {creator.isVerified && (
                          <CheckCircle
                            size={13}
                            className="text-[#FF9933] fill-[#FF9933]/20 shrink-0"
                          />
                        )}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        @{creator.username}
                      </span>
                      {creator.bio && (
                        <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {creator.bio}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => toggleFollow(e, creator.username)}
                    className={`py-1.5 px-3.5 rounded-full text-xs font-bold transition shrink-0 active:scale-95 cursor-pointer ${
                      isFollowing
                        ? 'bg-transparent border border-slate-300 dark:border-[#1E293B] text-slate-700 dark:text-slate-300 hover:border-red-500/50 hover:text-red-400'
                        : 'bg-[#0F172A] hover:bg-[#1E293B] text-white text-force-white dark:bg-white dark:hover:bg-slate-200 dark:text-black shadow-sm'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Popular Communities */}
      {communitiesData?.items && communitiesData.items.length > 0 && (
        <div className="p-4 border-b border-[#1E293B]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-base text-white flex items-center gap-2">
              <Users size={18} className="text-[#00C853]" />
              Popular Communities {activeCategory !== 'All' ? `· ${activeCategory}` : ''}
            </h2>
            <Link
              href="/communities"
              className="text-xs font-semibold text-slate-400 hover:text-white"
            >
              See more
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {communitiesData.items.map((comm) => {
              const isJoined =
                joinedCommunities[comm.id] ?? comm.isJoined ?? false;

              return (
                <div
                  key={comm.id}
                  className="p-3.5 bg-[#0B1422] border border-[#1E293B] rounded-2xl flex items-center justify-between gap-3"
                >
                  <Link
                    href={`/communities?id=${comm.id}`}
                    className="flex items-center gap-3 overflow-hidden min-w-0 flex-1 hover:opacity-85 transition cursor-pointer"
                  >
                    <div className="h-11 w-11 rounded-2xl bg-[#101D2D] border border-[#1E293B] flex items-center justify-center font-bold text-[#FF9933] overflow-hidden shrink-0">
                      {comm.avatarUrl ? (
                        <img
                          src={comm.avatarUrl}
                          alt={comm.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        comm.name.charAt(0)
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden min-w-0">
                      <span className="font-bold text-sm text-slate-100 truncate hover:underline">
                        {comm.name}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        {comm.description}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {comm.memberCount} members · {comm.category}
                      </span>
                    </div>
                  </Link>

                  <button
                    onClick={(e) =>
                      toggleJoinCommunity(e, comm.id, comm.isJoined || false)
                    }
                    className={`py-1.5 px-4 rounded-full text-xs font-bold transition shrink-0 shadow-sm active:scale-95 cursor-pointer ${
                      isJoined
                        ? 'bg-transparent border border-slate-300 dark:border-[#1E293B] text-slate-700 dark:text-slate-300 hover:border-red-500/50 hover:text-red-400'
                        : 'bg-[#0F172A] hover:bg-[#1E293B] text-white text-force-white dark:bg-white dark:hover:bg-slate-200 dark:text-black shadow-sm'
                    }`}
                  >
                    {isJoined ? 'Joined' : 'Join'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Trending Discussions & Posts Stream (The Core Explore Feed!) */}
      <div className="flex flex-col">
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between bg-[#050B14]/50">
          <h2 className="font-extrabold text-base text-white flex items-center gap-2">
            <MessageSquare size={18} className="text-[#38BDF8]" />
            {activeCategory === 'All'
              ? 'Trending Discussions Across Bharat'
              : `Trending in ${activeCategory}`}
          </h2>
          <span className="text-xs text-slate-400">
            {postsData?.items ? `${postsData.items.length} discussions` : 'Live updates'}
          </span>
        </div>

        {isLoadingPosts ? (
          <div className="p-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 size={28} className="animate-spin text-[#FF9933]" />
            <span className="text-sm">Loading discussions...</span>
          </div>
        ) : postsData?.items && postsData.items.length > 0 ? (
          <div className="flex flex-col divide-y divide-[#1E293B]/60">
            {postsData.items.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPostDeleted={() => refetchPosts()}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-sm">
            No discussions found in {activeCategory} right now. Be the first to share a post!
          </div>
        )}
      </div>
    </MainLayout>
  );
}
