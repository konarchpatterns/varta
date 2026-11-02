export type ScreenName =
  | 'onboarding'
  | 'signin'
  | 'signup'
  | 'home'
  | 'explore'
  | 'post-detail'
  | 'profile'
  | 'create-post'
  | 'messages'
  | 'notifications'
  | 'communities'
  | 'community-detail'
  | 'search'
  | 'settings'
  | 'bookmarks';

export interface User {
  id: string;
  name: string;
  handle: string;
  /** raw username without the @ — needed for API calls */
  username?: string;
  avatar: string;
  verified?: boolean;
  email?: string;
  phone?: string;
  bio?: string;
  location?: string;
  website?: string;
  isPrivate?: boolean;
  joinedDate?: string;
  followingCount?: number;
  followersCount?: number;
  postCount?: number;
  bannerImage?: string;
  /** viewer relationship flags */
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  isPendingFollow?: boolean;
  isBlocked?: boolean;
  isMuted?: boolean;
}

export interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  aspectRatio?: number;
}

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
  hasVoted: boolean;
}

export interface Poll {
  id: string;
  question: string;
  expiresAt: string;
  isExpired: boolean;
  totalVotes: number;
  userVoteOptionId: string | null;
  options: PollOption[];
}

export interface PostGroup {
  id: string;
  name: string;
  slug?: string;
  category?: string;
  avatarUrl?: string;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  createdAt: string;
  createdAtRaw?: string;
  media?: PostMedia[];
  poll?: Poll;
  quotePost?: Post;
  parentId?: string;
  likes: number;
  reposts: number;
  replies: number;
  quotes?: number;
  bookmarks?: number;
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
  isFollowing?: boolean;
  category?: string;
  groupId?: string;
  group?: PostGroup;
  /** author-chosen interaction rules (mirrors the API) */
  replySettings?: 'anyone' | 'nobody' | 'custom';
  allowQuotePosts?: boolean;
  replyRules?: { followers: boolean; following: boolean; mentioned: boolean };
  /** whether the signed-in viewer may reply / quote this post */
  canReply?: boolean;
  replyRestrictionReason?: string | null;
  /** client-side only: optimistic post not yet confirmed by the API */
  isPending?: boolean;
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  createdAt: string;
  likes: number;
  replies?: number;
  isLiked?: boolean;
  isPending?: boolean;
}

export interface TrendingItem {
  id: string;
  rank: number;
  tag: string;
  category: string;
  postCount: string;
  imageUrl?: string;
}

export interface ConversationMember {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isVerified?: boolean;
}

export interface ConversationItem {
  id: string;
  isGroup: boolean;
  title: string;
  avatarUrl: string;
  otherUsername?: string;
  otherUserId?: string;
  members: ConversationMember[];
  lastMessage: string;
  lastMessageSenderId?: string;
  time: string;
  unreadCount: number;
  updatedAt?: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderUsername?: string;
  senderAvatar: string;
  content: string;
  mediaUrl?: string;
  isRead: boolean;
  createdAt: string;
  time: string;
  isPending?: boolean;
  failed?: boolean;
}

/** Kept for backwards compatibility with older screens. */
export type MessageThread = ConversationItem;

export interface NotificationItem {
  id: string;
  type: 'like' | 'follow' | 'reply' | 'repost' | 'message' | 'system';
  actor: User;
  actionText: string;
  entityId?: string;
  postSnippet?: string;
  time: string;
  read: boolean;
}

export interface CommunityItem {
  id: string;
  name: string;
  slug?: string;
  members: string;
  memberCount?: number;
  avatar: string;
  category: string;
  description?: string;
  coverUrl?: string;
  postCount?: number;
  isJoined?: boolean;
  isPrivate?: boolean;
  creatorId?: string;
  rules?: string[];
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
