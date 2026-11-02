import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/common/Avatar';
import {
  BackIcon,
  VerifiedBadge,
  CommentIcon,
  RepostIcon,
  HeartIcon,
  BookmarkIcon,
  ShareIcon,
  SendIcon,
} from '../components/common/Icons';
import {
  fetchInteractionState,
  fetchPostApi,
  followUserApi,
  unfollowUserApi,
} from '../api/client';
import { Post, ScreenName, Comment, PostGroup, CommunityItem, User } from '../types';
import { colors } from '../theme/colors';
import { usePosts } from '../context/PostsContext';
import { useAuth } from '../context/AuthContext';

interface PostDetailScreenProps {
  post?: Post;
  onNavigate: (screen: ScreenName) => void;
  onBack: () => void;
  onSelectCommunity?: (group: PostGroup | CommunityItem) => void;
  onSelectUser?: (user: User) => void;
  onSearchHashtag?: (hashtag: string) => void;
}

export const PostDetailScreen: React.FC<PostDetailScreenProps> = ({
  post: initialPost,
  onNavigate,
  onBack,
  onSelectCommunity,
  onSelectUser,
  onSearchHashtag,
}) => {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const {
    posts: feedPosts,
    likePost,
    repostPost,
    bookmarkPost,
    addReply,
    getReplies,
    getPostById,
  } = usePosts();

  const [post, setPost] = useState<Post | undefined>(initialPost);
  const [isFollowing, setIsFollowing] = useState(Boolean(initialPost?.author?.isFollowing));
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<Comment[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canReply, setCanReply] = useState<boolean>(true);
  const [replyRestriction, setReplyRestriction] = useState<string | null>(null);
  const [allowQuotePosts, setAllowQuotePosts] = useState<boolean>(true);

  // Keep the visible post in sync with optimistic like/repost/bookmark changes
  useEffect(() => {
    if (!post?.id) return;
    const live = getPostById(post.id);
    if (live && live !== post) setPost(live);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedPosts]);

  // Fetch the authoritative post (counts, poll, media) + replies
  useEffect(() => {
    const postId = initialPost?.id;
    if (!postId) {
      setIsLoadingReplies(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setIsLoadingReplies(true);
      setError(null);
      try {
        const fresh = await fetchPostApi(postId);
        if (cancelled) return;
        setCanReply(fresh.canReply !== false);
        setReplyRestriction(fresh.replyRestrictionReason ?? null);
        setAllowQuotePosts(fresh.allowQuotePosts !== false);
        setPost((prev) => ({ ...fresh, ...(prev?.isLiked ? { isLiked: prev.isLiked } : {}) }));
        const items = await getReplies(postId);
        if (!cancelled) setReplies(items);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Could not load this post');
      } finally {
        if (!cancelled) setIsLoadingReplies(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialPost?.id, getReplies]);

  // Ask the server whether this viewer may reply / quote
  useEffect(() => {
    const postId = initialPost?.id;
    if (!postId) return;
    let cancelled = false;
    fetchInteractionState(postId)
      .then((state) => {
        if (cancelled) return;
        setCanReply(state.canReply);
        setReplyRestriction(state.replyRestrictionReason);
        setAllowQuotePosts(state.allowQuotePosts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialPost?.id, user?.id]);

  const toggleFollow = async () => {
    if (!isAuthenticated) {
      onNavigate('signin');
      return;
    }
    if (!post) return;
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      if (next) await followUserApi(post.author.handle);
      else await unfollowUserApi(post.author.handle);
    } catch {
      setIsFollowing(!next);
    }
  };

  const toggleLike = () => post && likePost(post.id);
  const toggleRepost = () => post && repostPost(post.id);
  const toggleBookmark = () => post && bookmarkPost(post.id);

  const handleSendReply = async () => {
    if (!post || !replyText.trim() || isSubmitting) return;
    if (!isAuthenticated) {
      onNavigate('signin');
      return;
    }
    setIsSubmitting(true);
    const content = replyText.trim();
    setReplyText('');
    try {
      const added = await addReply(post.id, content);
      setReplies((prev) => [added, ...prev.filter((r) => r.id !== added.id)]);
    } catch (err: any) {
      setError(err?.message || 'Could not post your reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <BackIcon size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#64748B', textAlign: 'center' }}>
            {error || 'This post is no longer available.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLiked = post.isLiked ?? false;
  const likesCount = post.likes;
  const isReposted = post.isReposted ?? false;
  const repostCount = post.reposts;
  const isBookmarked = post.isBookmarked ?? false;

  const renderFormattedContent = (text: string) => {
    const parts = text.split(/([#@][a-zA-Z0-9_\u0900-\u097F]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <Text
            key={index}
            style={styles.hashtag}
            onPress={(e) => {
              e.stopPropagation();
              if (onSearchHashtag) {
                onSearchHashtag(part);
              } else {
                onNavigate('search');
              }
            }}
          >
            {part}
          </Text>
        );
      }
      if (part.startsWith('@')) {
        return (
          <Text
            key={index}
            style={styles.mention}
            onPress={(e) => {
              e.stopPropagation();
              if (onSelectUser) {
                onSelectUser({
                  id: `user-${part.slice(1)}`,
                  name: part.slice(1),
                  handle: part,
                  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
                });
                onNavigate('profile');
              }
            }}
          >
            {part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          {/* Top Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <BackIcon size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Post</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {/* Community / Group Badge */}
            {post.group && (
              <View style={styles.groupBadgeContainer}>
                <TouchableOpacity
                  style={styles.groupBadge}
                  activeOpacity={0.75}
                  onPress={() => {
                    if (onSelectCommunity) {
                      onSelectCommunity(post.group!);
                      onNavigate('community-detail');
                    } else {
                      onNavigate('communities');
                    }
                  }}
                >
                  <View style={styles.groupBadgeDot} />
                  <Text style={styles.groupBadgeName} numberOfLines={1}>
                    {post.group.name}
                  </Text>
                  {post.group.category ? (
                    <Text style={styles.groupBadgeCategory}>in {post.group.category}</Text>
                  ) : null}
                </TouchableOpacity>
              </View>
            )}

            {/* Author Row */}
            <View style={styles.authorRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (onSelectUser) onSelectUser(post.author);
                  onNavigate('profile');
                }}
              >
                <Avatar uri={post.author.avatar} name={post.author.name} size={46} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (onSelectUser) onSelectUser(post.author);
                  onNavigate('profile');
                }}
                style={styles.authorDetails}
              >
                <View style={styles.nameRow}>
                  <Text style={styles.authorName}>{post.author.name}</Text>
                  {post.author.verified && <VerifiedBadge size={16} />}
                </View>
                <Text style={styles.authorHandle}>{post.author.handle}</Text>
              </TouchableOpacity>

              {/* Follow Button */}
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                activeOpacity={0.8}
                onPress={toggleFollow}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    isFollowing && styles.followingButtonText,
                  ]}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Post Content */}
            <Text style={styles.postContent}>{renderFormattedContent(post.content)}</Text>

            {/* Large Media Image */}
            {post.media && post.media.length > 0 && (
              <View style={styles.mediaContainer}>
                <Image
                  source={{ uri: post.media[0].url }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Timestamp */}
            <Text style={styles.timestamp}>{post.createdAt}</Text>

            {/* Author interaction settings */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {post.replySettings && post.replySettings !== 'anyone' && (
                <View style={styles.settingChip}>
                  <Text style={styles.settingChipText}>
                    {post.replySettings === 'nobody' ? '🔒 Replies off' : '👥 Limited replies'}
                  </Text>
                </View>
              )}
              {!allowQuotePosts && (
                <View style={styles.settingChip}>
                  <Text style={styles.settingChipText}>🚫 Quotes off</Text>
                </View>
              )}
            </View>

            {/* Stats Divider Row */}
            <View style={styles.statsRow}>
              <Text style={styles.statItem}>
                <Text style={styles.statCount}>
                  {repostCount >= 1000 ? (repostCount / 1000).toFixed(1) + 'K ' : `${repostCount} `}
                </Text>
                <Text style={styles.statLabel}>Reposts</Text>
              </Text>
              <Text style={styles.statItem}>
                <Text style={styles.statCount}>
                  {likesCount >= 1000 ? (likesCount / 1000).toFixed(1) + 'K ' : `${likesCount} `}
                </Text>
                <Text style={styles.statLabel}>Likes</Text>
              </Text>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionsBar}>
              <TouchableOpacity style={styles.actionBtn}>
                <CommentIcon size={20} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={toggleRepost}>
                <RepostIcon size={20} active={isReposted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={toggleLike}>
                <HeartIcon size={20} active={isLiked} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={toggleBookmark}
              >
                <BookmarkIcon size={20} active={isBookmarked} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <ShareIcon size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Replies Section */}
            <View style={styles.repliesSection}>
              {isLoadingReplies && replies.length === 0 && (
                <Text style={{ color: '#94A3B8', paddingVertical: 16 }}>Loading replies...</Text>
              )}

              {!isLoadingReplies && replies.length === 0 && (
                <Text style={{ color: '#94A3B8', paddingVertical: 16 }}>
                  No replies yet. Start the conversation.
                </Text>
              )}

              {replies.map((reply) => (
                <View key={reply.id} style={styles.replyCard}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      if (onSelectUser) onSelectUser(reply.author);
                      onNavigate('profile');
                    }}
                  >
                    <Avatar uri={reply.author.avatar} name={reply.author.name} size={38} />
                  </TouchableOpacity>
                  <View style={styles.replyBody}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        if (onSelectUser) onSelectUser(reply.author);
                        onNavigate('profile');
                      }}
                      style={styles.replyHeader}
                    >
                      <Text style={styles.replyAuthorName}>{reply.author.name}</Text>
                      <Text style={styles.replyMeta}>
                        {reply.author.handle} · {reply.createdAt}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.replyContent}>{renderFormattedContent(reply.content)}</Text>
                    <View style={styles.replyActions}>
                      <View style={styles.replyActionItem}>
                        <CommentIcon size={14} color="#94A3B8" />
                        <Text style={styles.replyActionCount}>{reply.replies || 0}</Text>
                      </View>
                      <View style={styles.replyActionItem}>
                        <RepostIcon size={14} color="#94A3B8" />
                        <Text style={styles.replyActionCount}>0</Text>
                      </View>
                      <View style={styles.replyActionItem}>
                        <HeartIcon size={14} color="#94A3B8" />
                        <Text style={styles.replyActionCount}>{reply.likes}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Sticky Reply Bar — hidden when the author restricted replies */}
          {canReply ? (
            <View style={[styles.replyBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <Avatar uri={user?.avatar || ''} name={user?.name} size={34} />
              <TextInput
                style={styles.replyInput}
                placeholder="Post your reply..."
                placeholderTextColor="#94A3B8"
                value={replyText}
                onChangeText={setReplyText}
              />
              <TouchableOpacity
                style={[styles.sendButton, !replyText.trim() && styles.sendButtonDisabled]}
                onPress={handleSendReply}
                disabled={!replyText.trim()}
              >
                <SendIcon size={18} color={replyText.trim() ? colors.primary : '#CBD5E1'} />
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.replyBar,
                {
                  paddingBottom: Math.max(insets.bottom, 10),
                  justifyContent: 'center',
                  backgroundColor: '#FEF3C7',
                },
              ]}
            >
              <Text style={{ color: '#92400E', fontSize: 13, fontWeight: '600', flex: 1 }}>
                🔒 {replyRestriction || 'Replies are limited for this post.'}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  groupBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 2,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  groupBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EA580C',
  },
  groupBadgeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
  },
  groupBadgeCategory: {
    fontSize: 11,
    fontWeight: '500',
    color: '#C2410C',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  authorDetails: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  authorHandle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  followingButtonText: {
    color: '#0F172A',
  },
  postContent: {
    fontSize: 17,
    lineHeight: 25,
    color: '#0F172A',
    marginBottom: 14,
  },
  hashtag: {
    color: colors.primary,
    fontWeight: '700',
  },
  mention: {
    color: '#0284C7',
    fontWeight: '700',
  },
  mediaContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },
  mediaImage: {
    width: '100%',
    height: 220,
  },
  settingChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  settingChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  statItem: {
    flexDirection: 'row',
  },
  statCount: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: 14,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 14,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionBtn: {
    padding: 8,
  },
  repliesSection: {
    paddingTop: 12,
  },
  replyCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  replyBody: {
    flex: 1,
    marginLeft: 10,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  replyAuthorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  replyMeta: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  replyContent: {
    fontSize: 14,
    lineHeight: 19,
    color: '#1E293B',
    marginBottom: 8,
  },
  replyActions: {
    flexDirection: 'row',
    gap: 20,
  },
  replyActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyActionCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  replyInput: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 38,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendButton: {
    padding: 6,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
