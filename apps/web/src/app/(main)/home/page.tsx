'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  RefreshCw,
  Search,
  Settings,
  Bell,
  MoreHorizontal,
} from 'lucide-react';
import { MainLayout } from '../../../components/layout/MainLayout';
import { PostComposer } from '../../../components/feed/PostComposer';
import { PostCard } from '../../../components/feed/PostCard';
import { apiRequest } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import { useAuthStore } from '../../../stores/authStore';
import { PostItem, PaginatedResponse, MediaType } from '@varta/shared';

export default function HomePage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('for-you');
  const [searchQuery, setSearchQuery] = useState('');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // When user is not logged in, redirect to welcome / splash screen
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/');
    }
  }, [isInitialized, user, router]);

  // Fetch unread notifications count
  const { data: unreadNotificationsData } = useQuery<{ count: number; unreadCount: number }>({
    queryKey: ['unread-notifications-count'],
    queryFn: () => apiRequest('/notifications/unread-count'),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const unreadNotificationsCount =
    unreadNotificationsData?.count ?? unreadNotificationsData?.unreadCount ?? 0;

  // Real-time listener for notification updates
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const handleNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    };
    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [user, queryClient]);

  const handlePostDeleted = (deletedId: string) => {
    queryClient.setQueriesData<any>(
      { queryKey: ['feed'] },
      (old: any) => {
        if (!old) return old;
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: (page.items || []).filter((p: any) => p.id !== deletedId),
            })),
          };
        }
        if (old.items) {
          return {
            ...old,
            items: old.items.filter((p: any) => p.id !== deletedId),
          };
        }
        return old;
      }
    );
  };

  const feedTabs = [
    { id: 'for-you', label: 'For You' },
    { id: 'following', label: 'Following' },
    { id: 'india-trends', label: 'India Trends' },
    { id: 'tech', label: 'Technology' },
    { id: 'travel', label: 'Travel' },
    { id: 'food', label: 'Food' },
    { id: 'lifestyle', label: 'Lifestyle' },
    { id: 'fitness-health', label: 'Fitness & Health' },
    { id: 'sports', label: 'Sports' },
    { id: 'entertainment', label: 'Entertainment' },
  ];

  const getFeedEndpoint = (tab: string, cursor?: string) => {
    const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    switch (tab) {
      case 'following':
        return `/feed/following?limit=20${cursorParam}`;
      case 'india-trends':
        return `/feed/for-you?category=India%20Trends&limit=20${cursorParam}`;
      case 'tech':
        return `/feed/for-you?category=Technology&limit=20${cursorParam}`;
      case 'travel':
        return `/feed/for-you?category=Travel&limit=20${cursorParam}`;
      case 'food':
        return `/feed/for-you?category=Food&limit=20${cursorParam}`;
      case 'lifestyle':
        return `/feed/for-you?category=Lifestyle&limit=20${cursorParam}`;
      case 'fitness-health':
        return `/feed/for-you?category=Fitness%20%26%20Health&limit=20${cursorParam}`;
      case 'sports':
        return `/feed/for-you?category=Sports&limit=20${cursorParam}`;
      case 'entertainment':
        return `/feed/for-you?category=Entertainment&limit=20${cursorParam}`;
      case 'for-you':
      default:
        return `/feed/for-you?limit=20${cursorParam}`;
    }
  };

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
    error,
  } = useInfiniteQuery<PaginatedResponse<PostItem>>({
    queryKey: ['feed', activeTab],
    queryFn: ({ pageParam }) =>
      apiRequest(getFeedEndpoint(activeTab, pageParam as string | undefined)),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    enabled: !!user && (activeTab !== 'following' || !!user),
  });

  // Automatically fetch next page on scroll down
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '350px' }
    );

    const currentTarget = loadMoreRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Curated showcase posts directly matching the design prompt and mockup
  const mockShowcasePosts: PostItem[] = [
    {
      id: 'showcase-priya-varanasi',
      content:
        "Varanasi at sunrise is pure magic! ✨ India's heritage, culture and people always inspire me. Proud to be Indian! 🇮🇳\n#Varanasi #IncredibleIndia #Travel #VARTA",
      authorId: 'user-priya',
      parentId: null,
      likeCount: 2420,
      replyCount: 128,
      repostCount: 342,
      quoteCount: 14,
      bookmarkCount: 88,
      isEdited: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      isLiked: false,
      isReposted: false,
      isBookmarked: false,
      author: {
        id: 'user-priya',
        username: 'priyasharma',
        displayName: 'Priya Sharma',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
        isVerified: true,
        isPrivate: false,
      },
      media: [
        {
          id: 'media-varanasi',
          url: '/assets/post-varanasi.jpg',
          thumbnailUrl: null,
          type: MediaType.IMAGE,
          mimeType: 'image/jpeg',
          order: 0,
        },
      ],
    },
    {
      id: 'showcase-rohit-mountains',
      content:
        'India is not just a place, it\'s a feeling. Mountains, people, food, diversity – everything here is special. 🧡 🇮🇳\n#TravelIndia #Mountains #Bharat',
      authorId: 'user-rohit',
      parentId: null,
      likeCount: 1840,
      replyCount: 96,
      repostCount: 221,
      quoteCount: 8,
      bookmarkCount: 64,
      isEdited: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      isLiked: false,
      isReposted: false,
      isBookmarked: false,
      author: {
        id: 'user-rohit',
        username: 'rohitverma',
        displayName: 'Rohit Verma',
        avatarUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
        isVerified: true,
        isPrivate: false,
      },
      media: [
        {
          id: 'media-mountains',
          url: '/assets/post-mountains.jpg',
          thumbnailUrl: null,
          type: MediaType.IMAGE,
          mimeType: 'image/jpeg',
          order: 0,
        },
      ],
    },
    {
      id: 'showcase-techindia',
      content:
        "India's startup ecosystem is reaching new heights! 🚀 From AI to space tech, the next decade is going to be incredible.\n#Startups #India #AI #Innovation",
      authorId: 'user-techindia',
      parentId: null,
      likeCount: 3120,
      replyCount: 245,
      repostCount: 680,
      quoteCount: 42,
      bookmarkCount: 180,
      isEdited: false,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      isLiked: false,
      isReposted: false,
      isBookmarked: false,
      author: {
        id: 'user-techindia',
        username: 'techindia',
        displayName: 'Tech India',
        avatarUrl:
          'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=100&h=100&fit=crop',
        isVerified: true,
        isPrivate: false,
      },
      media: [],
    },
  ];

  const allPosts = data?.pages?.flatMap((page) => page.items) || [];
  const postsList =
    allPosts.length > 0
      ? allPosts
      : activeTab === 'for-you' || activeTab === 'india-trends' || activeTab === 'travel'
      ? mockShowcasePosts
      : [];

  // Show loading indicator until user session is confirmed; redirects guests to welcome screen
  if (!isInitialized || !user) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050B14] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF9933]" />
      </div>
    );
  }

  return (
    <MainLayout>
      {/* 1. Top Header Search & Controls (Desktop) */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#050B14]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#1E293B]">
        <div className="hidden lg:flex items-center justify-between px-4 py-2.5 gap-3">
          {/* Search Bar with Ctrl K */}
          <form onSubmit={handleSearch} className="relative flex-1 max-w-lg">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search people, topics, communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-[#0B1422] border border-slate-200 dark:border-[#1E293B] focus:border-[#FF9933] rounded-2xl py-2 pl-10 pr-12 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 outline-none transition"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-[#101D2D] px-1.5 py-0.5 rounded font-mono border border-slate-200 dark:border-[#1E293B]">
              Ctrl K
            </span>
          </form>

          {/* Quick Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              title="Refresh"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0B1422] transition"
            >
              <RefreshCw
                size={18}
                className={isRefetching ? 'animate-spin text-[#FF9933]' : ''}
              />
            </button>
            <Link
              href="/settings"
              title="Settings"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0B1422] transition"
            >
              <Settings size={18} />
            </Link>
            <Link
              href="/notifications"
              title="Notifications"
              className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0B1422] transition"
            >
              <Bell size={18} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF9933] text-white text-[10px] font-bold shadow-md shadow-[#FF9933]/30 animate-in zoom-in-75">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </Link>

            {/* User Mini Avatar */}
            <Link href={user ? `/${user.username}` : '/login'}>
              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-[#101D2D] ring-1 ring-slate-200 dark:ring-[#1E293B] flex items-center justify-center text-xs font-bold text-[#FF9933] overflow-hidden">
                {user?.profile?.avatarUrl ? (
                  <img
                    src={user.profile.avatarUrl}
                    alt={user.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (user?.username || 'K').charAt(0).toUpperCase()
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* 2. Horizontal Feed Navigation Tabs */}
        <div className="flex items-center overflow-x-auto scrollbar-none px-2 border-t border-slate-200 dark:border-[#1E293B]/60">
          {feedTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-semibold transition shrink-0 relative flex items-center gap-1.5 ${
                  isActive
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#FF9933] rounded-full" />
                )}
              </button>
            );
          })}
          <button
            title="More categories"
            className="px-3 py-3 text-slate-400 hover:text-white shrink-0"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* 3. Post Composer (hidden on mobile, uses floating post button) */}
      {user && (
        <div className="hidden lg:block p-4 border-b border-slate-200 dark:border-[#1E293B]">
          <PostComposer />
        </div>
      )}

      {/* Category Indicator Banner */}
      {activeTab !== 'for-you' && activeTab !== 'following' && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white dark:from-[#0C1726] dark:to-[#0B1422] border-b border-amber-200/80 dark:border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#EA580C] dark:bg-[#FF9933] animate-pulse" />
            <span className="text-xs font-black text-amber-950 dark:text-slate-100 uppercase tracking-wider">
              {feedTabs.find((t) => t.id === activeTab)?.label}
            </span>
            <span className="text-[11px] text-amber-900/80 dark:text-slate-400 font-medium">
              • Showing top posts & community discussions
            </span>
          </div>
          <Link
            href="/communities"
            className="text-xs text-[#EA580C] dark:text-[#FF9933] hover:underline flex items-center gap-1 font-bold"
          >
            <span>Explore Groups →</span>
          </Link>
        </div>
      )}

      {/* 4. Timeline Feed */}
      <div className="flex flex-col">
        {isLoading && postsList.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 size={30} className="animate-spin text-[#FF9933]" />
            <span className="text-sm">Curating your timeline...</span>
          </div>
        ) : activeTab === 'following' && !user ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <p className="text-base text-slate-200 font-medium">Welcome to your Following feed</p>
            <p className="text-sm text-slate-400 max-w-sm">Sign in to view real-time updates and discussions from creators you follow.</p>
            <Link
              href="/login"
              className="mt-2 px-6 py-2 rounded-full bg-[#FF9933] text-black font-semibold text-sm hover:bg-[#e68a2e] transition"
            >
              Sign In
            </Link>
          </div>
        ) : activeTab === 'following' && user && postsList.length === 0 && !isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <p className="text-base text-slate-200 font-medium">No posts in your following feed yet</p>
            <p className="text-sm text-slate-400 max-w-sm">When you follow people or join community groups, their latest posts will show up here.</p>
            <button
              onClick={() => setActiveTab('for-you')}
              className="mt-2 px-6 py-2 rounded-full bg-[#FF9933] text-black font-semibold text-sm hover:bg-[#e68a2e] transition"
            >
              Explore For You Feed
            </button>
          </div>
        ) : error && postsList.length === 0 ? (
          <div className="p-8 text-center text-red-400 text-sm">
            Failed to load timeline. Please verify your connection or try again.
          </div>
        ) : (
          <>
            {postsList.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPostDeleted={handlePostDeleted}
              />
            ))}

            {/* Infinite Scroll Sentinel / Load More Status */}
            <div ref={loadMoreRef} className="py-6 flex flex-col items-center justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-sm text-[#FF9933] font-medium py-3">
                  <Loader2 size={20} className="animate-spin text-[#FF9933]" />
                  <span>Loading more posts...</span>
                </div>
              ) : hasNextPage ? (
                <button
                  onClick={() => fetchNextPage()}
                  className="text-xs font-semibold text-slate-300 hover:text-white bg-[#0C1726] hover:bg-[#101D2D] border border-[#1E293B] px-5 py-2.5 rounded-full transition shadow-lg"
                >
                  Load more posts
                </button>
              ) : postsList.length > 0 ? (
                <div className="text-xs text-slate-500 py-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  <span>You have reached the end of the timeline</span>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
