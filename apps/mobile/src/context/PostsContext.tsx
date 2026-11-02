import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Comment, Paginated, Post } from '../types';
import {
  createPostApi,
  CreatePostInput,
  deletePostApi,
  fetchBookmarksPage,
  fetchFeedPage,
  fetchRepliesPage,
  fetchUserPostsPage,
  toggleBookmarkApi,
  toggleLikeApi,
  toggleRepostApi,
  uploadMediaApi,
  votePollApi,
} from '../api/client';
import { useAuth } from './AuthContext';

export interface FeedTab {
  id: string;
  label: string;
  /** backend `category` filter (undefined = For You / everything) */
  category?: string;
}

/** Same tab list as the website (apps/web .../home/page.tsx). */
export const FEED_TABS: FeedTab[] = [
  { id: 'for-you', label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'india-trends', label: 'India Trends', category: 'India Trends' },
  { id: 'tech', label: 'Technology', category: 'Technology' },
  { id: 'travel', label: 'Travel', category: 'Travel' },
  { id: 'food', label: 'Food', category: 'Food' },
  { id: 'lifestyle', label: 'Lifestyle', category: 'Lifestyle' },
  { id: 'fitness-health', label: 'Fitness & Health', category: 'Fitness & Health' },
  { id: 'sports', label: 'Sports', category: 'Sports' },
  { id: 'entertainment', label: 'Entertainment', category: 'Entertainment' },
];

/**
 * Turns the modal state into the API's `replySettings` string:
 *   anyone | nobody | custom  (for custom, the enabled rules are sent as a JSON array)
 */
export function serializeReplySettings(settings?: InteractionSettings): string {
  if (!settings) return 'anyone';
  if (settings.replyMode === 'nobody') return 'nobody';
  if (settings.replyMode !== 'custom') return 'anyone';

  const rules = settings.allowedReplyRules;
  const active: string[] = [];
  if (rules?.followers) active.push('followers');
  if (rules?.following) active.push('following');
  if (rules?.mentioned) active.push('mentioned');
  if (rules && rules.lists?.length) active.push('lists');

  return active.length > 0 ? JSON.stringify(active) : 'anyone';
}

export interface InteractionSettings {
  replyMode: 'anyone' | 'nobody' | 'custom';
  allowQuotePosts: boolean;
  allowedReplyRules?: {
    followers: boolean;
    following: boolean;
    mentioned: boolean;
    lists: string[];
  };
}

interface PostsContextType {
  posts: Post[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refreshFeed: () => Promise<void>;
  loadMorePosts: () => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  repostPost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  votePoll: (postId: string, pollId: string, optionId: string) => Promise<void>;
  createPost: (
    content: string,
    mediaUrls?: string[],
    group?: { id: string; name: string; category?: string; avatarUrl?: string },
    poll?: { question: string; options: string[]; durationHours?: number },
    interactionSettings?: InteractionSettings,
    quotePostId?: string,
  ) => Promise<Post>;
  deletePost: (postId: string) => Promise<void>;
  addReply: (postId: string, content: string) => Promise<Comment>;
  getPostById: (postId: string) => Post | undefined;
  getReplies: (postId: string) => Promise<Comment[]>;
  /** load a profile timeline (posts / replies / media / likes / bookmarks) */
  loadUserPosts: (username: string, tab?: string) => Promise<Post[]>;
  loadBookmarks: () => Promise<Post[]>;
}

const PostsContext = createContext<PostsContextType | null>(null);

export const PostsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<string>('for-you');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const requestId = useRef(0);

  const tabConfig = FEED_TABS.find((t) => t.id === activeTab) || FEED_TABS[0];

  const load = useCallback(
    async (tabId: string) => {
      const config = FEED_TABS.find((t) => t.id === tabId) || FEED_TABS[0];
      const thisRequest = ++requestId.current;

      // "Following" needs a session; fall back to For You when signed out
      const tab = config.id === 'following' && !isAuthenticated ? 'for-you' : config.id;

      setIsLoading(true);
      setError(null);
      try {
        const page: Paginated<Post> = await fetchFeedPage(tab, config.category, undefined, 20);
        if (thisRequest !== requestId.current) return; // stale response
        setPosts(page.items);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (err: any) {
        if (thisRequest !== requestId.current) return;
        setError(err?.message || 'Could not load the feed');
        setPosts([]);
        setHasMore(false);
      } finally {
        if (thisRequest === requestId.current) setIsLoading(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    load(activeTab);
  }, [activeTab, load]);

  const refreshFeed = useCallback(async () => {
    setIsRefreshing(true);
    await load(activeTab);
    setIsRefreshing(false);
  }, [activeTab, load]);

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || isLoading || !hasMore || !nextCursor) return;
    const config = FEED_TABS.find((t) => t.id === activeTab) || FEED_TABS[0];
    const tab = config.id === 'following' && !isAuthenticated ? 'for-you' : config.id;

    setIsLoadingMore(true);
    try {
      const page = await fetchFeedPage(tab, config.category, nextCursor, 20);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (err: any) {
      setError(err?.message || 'Could not load more posts');
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeTab, hasMore, isLoading, isLoadingMore, isAuthenticated, nextCursor]);

  /** Apply a patch to every copy of a post (feed, replies cache, etc). */
  const patchPost = useCallback((postId: string, patch: (p: Post) => Post) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? patch(p) : p)));
    setReplies((prev) => {
      const next: Record<string, Comment[]> = {};
      Object.keys(prev).forEach((key) => {
        next[key] = prev[key].map((c) => (c.id === postId ? c : c));
      });
      return next;
    });
  }, []);

  // ---- Optimistic toggles with rollback (this is what made the app feel broken)
  const likePost = useCallback(
    async (postId: string) => {
      if (!isAuthenticated) return;
      let snapshot: Post | undefined;

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          snapshot = p;
          const liked = !p.isLiked;
          return { ...p, isLiked: liked, likes: Math.max(0, p.likes + (liked ? 1 : -1)) };
        }),
      );

      try {
        const res = await toggleLikeApi(postId);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLiked: res.liked, likes: res.likeCount ?? p.likes }
              : p,
          ),
        );
      } catch {
        if (snapshot) {
          const restore = snapshot;
          setPosts((prev) => prev.map((p) => (p.id === postId ? restore : p)));
        }
      }
    },
    [isAuthenticated],
  );

  const repostPost = useCallback(
    async (postId: string) => {
      if (!isAuthenticated) return;
      let snapshot: Post | undefined;

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          snapshot = p;
          const reposted = !p.isReposted;
          return {
            ...p,
            isReposted: reposted,
            reposts: Math.max(0, p.reposts + (reposted ? 1 : -1)),
          };
        }),
      );

      try {
        const res = await toggleRepostApi(postId);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isReposted: res.reposted, reposts: res.repostCount ?? p.reposts }
              : p,
          ),
        );
      } catch {
        if (snapshot) {
          const restore = snapshot;
          setPosts((prev) => prev.map((p) => (p.id === postId ? restore : p)));
        }
      }
    },
    [isAuthenticated],
  );

  const bookmarkPost = useCallback(
    async (postId: string) => {
      if (!isAuthenticated) return;
      let snapshot: Post | undefined;

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          snapshot = p;
          return { ...p, isBookmarked: !p.isBookmarked };
        }),
      );

      try {
        const res = await toggleBookmarkApi(postId);
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isBookmarked: res.bookmarked } : p)),
        );
      } catch {
        if (snapshot) {
          const restore = snapshot;
          setPosts((prev) => prev.map((p) => (p.id === postId ? restore : p)));
        }
      }
    },
    [isAuthenticated],
  );

  const votePoll = useCallback(async (postId: string, pollId: string, optionId: string) => {
    await votePollApi(pollId, optionId);
    try {
      const fresh = await fetchFeedPage('for-you', undefined, undefined, 1); // warm cache
      void fresh;
    } catch {
      // ignore — the caller can refresh
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId && p.poll
          ? {
              ...p,
              poll: {
                ...p.poll,
                userVoteOptionId: optionId,
                totalVotes: p.poll.userVoteOptionId ? p.poll.totalVotes : p.poll.totalVotes + 1,
                options: p.poll.options.map((o) => ({
                  ...o,
                  voteCount:
                    o.id === optionId
                      ? o.voteCount + (p.poll!.userVoteOptionId === optionId ? 0 : 1)
                      : o.id === p.poll!.userVoteOptionId
                        ? Math.max(0, o.voteCount - 1)
                        : o.voteCount,
                  hasVoted: o.id === optionId,
                })),
              },
            }
          : p,
      ),
    );
  }, []);

  const createPost = useCallback(
    async (
      content: string,
      mediaUrls: string[] = [],
      group?: { id: string; name: string; category?: string; avatarUrl?: string },
      poll?: { question: string; options: string[]; durationHours?: number },
      interactionSettings?: InteractionSettings,
      quotePostId?: string,
    ): Promise<Post> => {
      if (!user) throw new Error('Please sign in to post');

      const optimistic: Post = {
        id: `pending-${Date.now()}`,
        author: user,
        content,
        createdAt: 'now',
        media: mediaUrls.map((url, i) => ({
          id: `local-media-${i}`,
          url,
          type: /\.(mp4|webm|mov|mkv|ogg|3gp)(\?|$)/i.test(url) ? 'video' : 'image',
        })),
        likes: 0,
        reposts: 0,
        replies: 0,
        bookmarks: 0,
        isLiked: false,
        isReposted: false,
        isBookmarked: false,
        category: group?.category || 'For You',
        groupId: group?.id,
        group: group ? { ...group } : undefined,
        isPending: true,
      };

      setPosts((prev) => [optimistic, ...prev]);

      const payload: CreatePostInput = {
        content,
        groupId: group?.id,
        quotePostId,
        mediaUrls: mediaUrls.length
          ? mediaUrls.map((url) => ({
              url,
              type: /\.(mp4|webm|mov|mkv|ogg|3gp)(\?|$)/i.test(url)
                ? ('VIDEO' as const)
                : ('IMAGE' as const),
            }))
          : undefined,
        poll:
          poll && poll.question
            ? {
                question: poll.question,
                options: poll.options.filter((o) => o.trim().length > 0),
                durationHours: poll.durationHours ?? 24,
              }
            : undefined,
        replySettings: serializeReplySettings(interactionSettings),
        allowQuotePosts: interactionSettings?.allowQuotePosts,
      };

      try {
        const created = await createPostApi(payload);
        setPosts((prev) => prev.map((p) => (p.id === optimistic.id ? created : p)));
        return created;
      } catch (err) {
        // remove the optimistic card so the user sees the failure, not a ghost post
        setPosts((prev) => prev.filter((p) => p.id !== optimistic.id));
        throw err;
      }
    },
    [user],
  );

  const deletePost = useCallback(async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await deletePostApi(postId);
    } catch (err) {
      // restore by refetching on next pull-to-refresh
      throw err;
    }
  }, []);

  const addReply = useCallback(
    async (postId: string, content: string): Promise<Comment> => {
      if (!user) throw new Error('Please sign in to reply');

      const optimistic: Comment = {
        id: `pending-reply-${Date.now()}`,
        author: user,
        content,
        createdAt: 'now',
        likes: 0,
        replies: 0,
        isLiked: false,
        isPending: true,
      };

      setReplies((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), optimistic] }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, replies: p.replies + 1 } : p)),
      );

      try {
        const created = await createPostApi({ content, parentId: postId });
        const asComment: Comment = {
          id: created.id,
          author: created.author,
          content: created.content,
          createdAt: created.createdAt,
          likes: created.likes,
          replies: created.replies,
          isLiked: false,
        };
        setReplies((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).map((c) => (c.id === optimistic.id ? asComment : c)),
        }));
        return asComment;
      } catch (err) {
        setReplies((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).filter((c) => c.id !== optimistic.id),
        }));
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, replies: Math.max(0, p.replies - 1) } : p,
          ),
        );
        throw err;
      }
    },
    [user],
  );

  const getPostById = useCallback(
    (postId: string) => posts.find((p) => p.id === postId),
    [posts],
  );

  const getReplies = useCallback(
    async (postId: string): Promise<Comment[]> => {
      const page = await fetchRepliesPage(postId, undefined, 50);
      setReplies((prev) => ({ ...prev, [postId]: page.items }));
      return page.items;
    },
    [],
  );

  const loadUserPosts = useCallback(
    async (username: string, tab = 'posts'): Promise<Post[]> => {
      const page = await fetchUserPostsPage(username, tab, undefined, 30);
      return page.items;
    },
    [],
  );

  const loadBookmarks = useCallback(async (): Promise<Post[]> => {
    const page = await fetchBookmarksPage(undefined, 30);
    return page.items;
  }, []);

  return (
    <PostsContext.Provider
      value={{
        posts,
        activeTab,
        setActiveTab,
        isLoading,
        isRefreshing,
        isLoadingMore,
        hasMore,
        error,
        refreshFeed,
        loadMorePosts,
        likePost,
        repostPost,
        bookmarkPost,
        votePoll,
        createPost,
        deletePost,
        addReply,
        getPostById,
        getReplies,
        loadUserPosts,
        loadBookmarks,
      }}
    >
      {children}
    </PostsContext.Provider>
  );
};

export const usePosts = (): PostsContextType => {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error('usePosts must be used inside <PostsProvider>');
  return ctx;
};

/** Helper used by the composer: upload local media before creating the post. */
export async function uploadPostMedia(items: Array<{ uri: string; name?: string; type?: string }>) {
  const urls: string[] = [];
  for (const item of items) {
    urls.push(await uploadMediaApi(item));
  }
  return urls;
}
