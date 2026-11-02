import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Post, PostGroup, User } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  VerifiedBadge,
  DotsIcon,
  CommentIcon,
  RepostIcon,
  HeartIcon,
  BookmarkIcon,
  ShareIcon,
} from '../common/Icons';
import { colors } from '../../theme/colors';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onPressAuthor?: (author: User) => void;
  onPressCategory?: (cat: string) => void;
  onPressGroup?: (group: PostGroup) => void;
  onPressHashtag?: (hashtag: string) => void;
  onPressMention?: (mention: string) => void;
  onLike?: () => void;
  onRepost?: () => void;
  onBookmark?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onPress,
  onPressAuthor,
  onPressCategory,
  onPressGroup,
  onPressHashtag,
  onPressMention,
  onLike,
  onRepost,
  onBookmark,
}) => {
  const isLiked = post.isLiked ?? false;
  const likesCount = post.likes;
  const isReposted = post.isReposted ?? false;
  const repostCount = post.reposts;
  const isBookmarked = post.isBookmarked ?? false;

  const toggleLike = () => {
    if (onLike) {
      onLike();
    }
  };

  const toggleRepost = () => {
    if (onRepost) {
      onRepost();
    }
  };

  const toggleBookmark = () => {
    if (onBookmark) {
      onBookmark();
    }
  };

  const formatCount = (count: number) => {
    if (!count) return '0';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace('.0', '')}K`;
    }
    return count.toString();
  };

  // Render text with highlighted, clickable hashtags and mentions
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
              if (onPressHashtag) {
                onPressHashtag(part);
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
              if (onPressMention) {
                onPressMention(part);
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
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={onPress}
    >
      {/* Community / Group Badge */}
      {post.group && (
        <View style={styles.groupBadgeContainer}>
          <TouchableOpacity
            style={styles.groupBadge}
            activeOpacity={0.75}
            onPress={() => onPressGroup && onPressGroup(post.group!)}
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

      <View style={styles.headerRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (onPressAuthor) onPressAuthor(post.author);
          }}
        >
          <Avatar uri={post.author.avatar} name={post.author.name} size={42} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (onPressAuthor) onPressAuthor(post.author);
          }}
          style={styles.authorInfo}
        >
          <View style={styles.nameRow}>
            <Text style={styles.displayName} numberOfLines={1}>
              {post.author.name}
            </Text>
            {post.author.verified && <VerifiedBadge size={15} />}
          </View>
          <Text style={styles.handleTime}>
            {post.author.handle} · {post.createdAt}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <DotsIcon size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <Text style={styles.content}>{renderFormattedContent(post.content)}</Text>

      {/* Media Image */}
      {post.media && post.media.length > 0 && (
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: post.media[0].url }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Action Bar */}
      <View style={styles.actionsBar}>
        {/* Comment */}
        <TouchableOpacity style={styles.actionItem} activeOpacity={0.7} onPress={onPress}>
          <CommentIcon size={18} color="#64748B" />
          <Text style={styles.actionText}>{formatCount(post.replies)}</Text>
        </TouchableOpacity>

        {/* Repost */}
        <TouchableOpacity style={styles.actionItem} activeOpacity={0.7} onPress={toggleRepost}>
          <RepostIcon size={18} active={isReposted} />
          <Text style={[styles.actionText, isReposted && styles.repostActiveText]}>
            {formatCount(repostCount)}
          </Text>
        </TouchableOpacity>

        {/* Like */}
        <TouchableOpacity style={styles.actionItem} activeOpacity={0.7} onPress={toggleLike}>
          <HeartIcon size={18} active={isLiked} />
          <Text style={[styles.actionText, isLiked && styles.likeActiveText]}>
            {formatCount(likesCount)}
          </Text>
        </TouchableOpacity>

        {/* Bookmark */}
        <TouchableOpacity
          style={styles.actionIconOnly}
          activeOpacity={0.7}
          onPress={toggleBookmark}
        >
          <BookmarkIcon size={18} active={isBookmarked} />
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionIconOnly} activeOpacity={0.7}>
          <ShareIcon size={18} color="#64748B" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  groupBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 16,
    gap: 6,
    maxWidth: '92%',
  },
  groupBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EA580C',
  },
  groupBadgeName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
    flexShrink: 1,
  },
  groupBadgeCategory: {
    fontSize: 10,
    fontWeight: '500',
    color: '#C2410C',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  handleTime: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  menuButton: {
    padding: 4,
  },
  content: {
    fontSize: 14.5,
    lineHeight: 21,
    color: '#1E293B',
    marginBottom: 10,
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
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mediaImage: {
    width: '100%',
    height: 200,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingRight: 6,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionIconOnly: {
    padding: 6,
  },
  actionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  likeActiveText: {
    color: colors.like,
  },
  repostActiveText: {
    color: colors.retweet,
  },
});
