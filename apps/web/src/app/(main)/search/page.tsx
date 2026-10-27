'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '../../../components/layout/MainLayout';
import { PostCard } from '../../../components/feed/PostCard';
import { apiRequest } from '../../../lib/api';
import { PostItem, UserSummary, TrendingHashtagItem } from '@varta/shared';

import { useAuthStore } from '../../../stores/authStore';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'all';

  const { user: currentUser } = useAuthStore();
  const [query, setQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState(initialType);
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setQuery(initialQuery);
    setActiveType(initialType);
  }, [initialQuery, initialType]);

  const { data, isLoading, refetch } = useQuery<{
    users: UserSummary[];
    posts: PostItem[];
    hashtags: TrendingHashtagItem[];
  }>({
    queryKey: ['search', query, activeType],
    queryFn: () =>
      apiRequest(
        `/explore/search?q=${encodeURIComponent(query)}&type=${activeType}&limit=30`,
      ),
    enabled: query.trim().length > 0,
  });

  // Query suggested accounts for empty query or when browsing people
  const { data: suggestedPeople, isLoading: isLoadingSuggestions } = useQuery<
    UserSummary[]
  >({
    queryKey: ['who-to-follow-suggestions'],
    queryFn: () => apiRequest('/explore/who-to-follow?limit=25'),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}&type=${activeType}`);
    }
  };

  const handleTabChange = (type: string) => {
    setActiveType(type);
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}&type=${type}`);
    } else {
      router.push(`/search?type=${type}`);
    }
  };

  const handleToggleFollow = async (e: React.MouseEvent, u: UserSummary) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    const currentFollowing = followMap[u.username] ?? u.isFollowing ?? false;
    const isNowFollowing = !currentFollowing;

    setFollowMap((prev) => ({ ...prev, [u.username]: isNowFollowing }));

    try {
      await apiRequest(`/social/follow/${u.username}`, {
        method: currentFollowing ? 'DELETE' : 'POST',
      });
    } catch (err) {
      // Revert if request fails
      setFollowMap((prev) => ({ ...prev, [u.username]: currentFollowing }));
    }
  };

  const renderUserCard = (u: UserSummary) => {
    const isSelf = currentUser?.username === u.username;
    const isFollowing = followMap[u.username] ?? u.isFollowing ?? false;

    return (
      <Link
        key={u.id}
        href={`/${u.username}`}
        className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-[#0B1422] border border-transparent hover:border-[#1E293B] transition group"
      >
        <div className="flex items-start gap-3 min-w-0 pr-3">
          <div className="h-11 w-11 rounded-full bg-[#101D2D] border border-[#1E293B] flex items-center justify-center text-[#FF9933] font-bold overflow-hidden shrink-0 mt-0.5">
            {u.avatarUrl ? (
              <img
                src={u.avatarUrl}
                alt={u.username}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              u.username.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-slate-100 flex items-center gap-1 group-hover:text-[#FF9933] transition">
              <span className="truncate">{u.displayName || u.username}</span>
              {u.isVerified && (
                <CheckCircle
                  size={14}
                  className="text-[#FF9933] fill-[#FF9933]/20 shrink-0"
                />
              )}
            </span>
            <span className="text-xs text-slate-400 truncate">@{u.username}</span>
            {u.bio && (
              <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                {u.bio}
              </p>
            )}
            {typeof u.followersCount === 'number' && (
              <span className="text-[11px] text-slate-500 mt-1">
                {u.followersCount.toLocaleString()} {u.followersCount === 1 ? 'follower' : 'followers'}
              </span>
            )}
          </div>
        </div>

        {!isSelf && (
          <button
            onClick={(e) => handleToggleFollow(e, u)}
            className={`py-1.5 px-4 rounded-full text-xs font-bold transition shrink-0 active:scale-95 cursor-pointer ${
              isFollowing
                ? 'bg-transparent border border-slate-300 dark:border-[#1E293B] text-slate-700 dark:text-slate-300 hover:border-red-500/50 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                : 'bg-[#0F172A] hover:bg-[#1E293B] text-white text-force-white dark:bg-white dark:hover:bg-slate-200 dark:text-black shadow-sm'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </Link>
    );
  };

  return (
    <MainLayout>
      {/* Top Search Bar */}
      <div className="sticky top-0 z-30 bg-[#050B14]/90 backdrop-blur-md border-b border-[#1E293B]">
        <div className="flex items-center gap-3 p-3.5">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-[#101D2D] text-slate-400 hover:text-white transition"
          >
            <ArrowLeft size={18} />
          </button>
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people to follow, posts, #hashtags..."
              className="w-full bg-[#0B1422] border border-[#1E293B] focus:border-[#FF9933] rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none transition"
            />
          </form>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-t border-[#1E293B]/60">
          {[
            { id: 'all', label: 'Top' },
            { id: 'posts', label: 'Posts' },
            { id: 'users', label: 'People' },
            { id: 'tags', label: 'Hashtags' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 py-3 text-xs sm:text-sm font-semibold transition relative ${
                activeType === tab.id
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {activeType === tab.id && (
                <div className="absolute bottom-0 inset-x-6 h-0.5 bg-[#FF9933] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results View */}
      <div className="flex flex-col">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 size={28} className="animate-spin text-[#FF9933]" />
            <span className="text-sm">Searching VARTA...</span>
          </div>
        ) : !query.trim() ? (
          /* Empty Search Query: Show Who to Follow and Discovery */
          activeType === 'users' ? (
            <div className="p-4 flex flex-col gap-3">
              <div className="pb-3 border-b border-[#1E293B]">
                <h2 className="text-lg font-extrabold text-white">Who to follow</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Discover and connect with top creators, journalists, leaders, and voices across India
                </p>
              </div>
              {isLoadingSuggestions ? (
                <div className="p-12 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-[#FF9933]" />
                </div>
              ) : (
                <div className="flex flex-col gap-1 divide-y divide-[#1E293B]/40">
                  {suggestedPeople?.map((u) => renderUserCard(u))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-white">Suggested People to Follow</h2>
                  <p className="text-xs text-slate-400">Popular accounts and creators across Bharat</p>
                </div>
                <button
                  onClick={() => handleTabChange('users')}
                  className="text-xs font-semibold text-[#FF9933] hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="flex flex-col p-2 divide-y divide-[#1E293B]/40">
                {suggestedPeople?.slice(0, 5).map((u) => renderUserCard(u))}
              </div>
            </div>
          )
        ) : (
          <>
            {/* Users Section */}
            {(activeType === 'all' || activeType === 'users') &&
              data?.users &&
              data.users.length > 0 && (
                <div className="border-b border-[#1E293B] p-4 flex flex-col gap-2">
                  <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
                    People ({data.users.length})
                  </h2>
                  <div className="flex flex-col divide-y divide-[#1E293B]/40">
                    {data.users.map((u) => renderUserCard(u))}
                  </div>
                </div>
              )}

            {/* Hashtags Section */}
            {(activeType === 'all' || activeType === 'tags') &&
              data?.hashtags &&
              data.hashtags.length > 0 && (
                <div className="border-b border-[#1E293B] p-4 flex flex-col gap-2">
                  <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                    Hashtags
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.hashtags.map((h) => (
                      <Link
                        key={h.id}
                        href={`/search?q=%23${h.tag}&type=posts`}
                        className="p-3 bg-[#0B1422] hover:bg-[#101D2D] border border-[#1E293B] rounded-2xl flex items-center justify-between transition"
                      >
                        <span className="font-bold text-sm text-[#38BDF8]">
                          #{h.tag}
                        </span>
                        <span className="text-xs text-slate-400">
                          {h.usageCount} posts
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            {/* Posts Section */}
            {(activeType === 'all' || activeType === 'posts' || activeType === 'tags') &&
              data?.posts &&
              data.posts.length > 0 && (
                <div className="flex flex-col">
                  {data.posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onPostDeleted={() => refetch()}
                    />
                  ))}
                </div>
              )}

            {/* Empty Result */}
            {((activeType === 'users' && data?.users?.length === 0) ||
              (activeType === 'posts' && data?.posts?.length === 0) ||
              (activeType === 'tags' &&
                data?.hashtags?.length === 0 &&
                data?.posts?.length === 0) ||
              (activeType === 'all' &&
                data?.users?.length === 0 &&
                data?.posts?.length === 0 &&
                data?.hashtags?.length === 0)) && (
              <div className="flex flex-col">
                <div className="p-12 text-center text-slate-400 text-sm border-b border-[#1E293B]">
                  No results found for &quot;{query}&quot;. Try searching with a different term.
                </div>
                {/* Fallback suggested creators to follow */}
                {suggestedPeople && suggestedPeople.length > 0 && (
                  <div className="p-4 flex flex-col gap-2">
                    <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
                      Suggested people to follow instead
                    </h3>
                    <div className="flex flex-col divide-y divide-[#1E293B]/40">
                      {suggestedPeople.slice(0, 6).map((u) => renderUserCard(u))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="p-16 flex items-center justify-center text-xs text-slate-400">
            <Loader2 size={24} className="animate-spin text-[#FF9933]" />
          </div>
        </MainLayout>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
