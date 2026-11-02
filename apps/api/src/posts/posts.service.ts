import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePostDto } from '@varta/shared';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  private extractHashtags(content: string): string[] {
    const matches = content.match(/#[a-zA-Z0-9_]+/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((tag) => tag.slice(1).toLowerCase())));
  }

  private extractMentions(content: string): string[] {
    const matches = content.match(/@[a-zA-Z0-9_]+/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
  }

  /**
   * Reply / quote permissions are sent by the clients as:
   *   replySettings: 'anyone' | 'nobody' | 'custom'
   *   allowQuotePosts: boolean
   * and for 'custom' the enabled rules arrive as a JSON array, e.g.
   *   ["followers","following","mentioned"]
   */
  private parseReplySettings(dto: CreatePostDto) {
    const raw = (dto as any).replySettings;
    const allowQuotePosts = (dto as any).allowQuotePosts;

    let mode: 'anyone' | 'nobody' | 'custom' = 'anyone';
    let rules: string[] = [];

    if (typeof raw === 'string' && raw.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) rules = parsed.map((r) => String(r));
      } catch {
        rules = [];
      }
      mode = rules.length > 0 ? 'custom' : 'anyone';
    } else if (typeof raw === 'string' && ['anyone', 'nobody', 'custom'].includes(raw)) {
      mode = raw as any;
    }

    return {
      replySettings: mode,
      allowQuotePosts: allowQuotePosts === undefined ? true : Boolean(allowQuotePosts),
      replyRuleFollowers: rules.includes('followers'),
      replyRuleFollowing: rules.includes('following'),
      replyRuleMentioned: rules.includes('mentioned'),
    };
  }

  /** true when `viewerId` is allowed to reply to `post` */
  async canReply(
    post: { id: string; authorId: string; replySettings?: string | null; replyRuleFollowers?: boolean; replyRuleFollowing?: boolean; replyRuleMentioned?: boolean },
    viewerId?: string,
  ) {
    if (!viewerId) return { allowed: false, reason: 'Sign in to reply' };
    if (viewerId === post.authorId) return { allowed: true };
    if (post.replySettings === 'nobody') {
      return { allowed: false, reason: 'The author has limited who can reply to this post.' };
    }
    if (!post.replySettings || post.replySettings === 'anyone') return { allowed: true };

    const [followsAuthor, authorFollowsViewer, mentions] = await Promise.all([
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: post.authorId } },
      }),
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: post.authorId, followingId: viewerId } },
      }),
      this.prisma.mention.findFirst({ where: { postId: post.id, userId: viewerId } }),
    ]);

    const allowed =
      (post.replyRuleFollowers && authorFollowsViewer) ||
      (post.replyRuleFollowing && followsAuthor) ||
      (post.replyRuleMentioned && !!mentions) ||
      (post.replySettings === 'custom' && !!mentions);

    return allowed
      ? { allowed: true }
      : { allowed: false, reason: 'The author has limited who can reply to this post.' };
  }

  async createPost(authorId: string, dto: CreatePostDto) {
    const content = (dto.content || '').trim();

    // Verify parent exists if reply
    if (dto.parentId) {
      const parent = await this.prisma.post.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.deletedAt) {
        throw new NotFoundException('Parent post not found');
      }
      const permission = await this.canReply(parent as any, authorId);
      if (!permission.allowed) {
        throw new ForbiddenException(permission.reason || 'You cannot reply to this post');
      }
    }

    // Verify quote permission
    if (dto.quotePostId) {
      const quoted = await this.prisma.post.findUnique({ where: { id: dto.quotePostId } });
      if (quoted && (quoted as any).allowQuotePosts === false) {
        throw new ForbiddenException('The author has disabled quote posts for this post');
      }
    }

    // Verify quote post exists if quoting
    if (dto.quotePostId) {
      const quoted = await this.prisma.post.findUnique({
        where: { id: dto.quotePostId },
      });
      if (!quoted || quoted.deletedAt) {
        throw new NotFoundException('Quoted post not found');
      }
    }

    // Check repost idempotency
    if (dto.repostOfId) {
      const target = await this.prisma.post.findUnique({
        where: { id: dto.repostOfId },
      });
      if (!target || target.deletedAt) {
        throw new NotFoundException('Target repost post not found');
      }
    }

    // Execute in transaction
    const post = await this.prisma.$transaction(async (tx) => {
      // 1. Create Post
      const created = await tx.post.create({
        data: {
          authorId,
          content,
          groupId: (dto as any).groupId || null,
          parentId: dto.parentId,
          quotePostId: dto.quotePostId,
          repostOfId: dto.repostOfId,
          ...this.parseReplySettings(dto),
          // Attach media if provided
          ...(dto.mediaUrls && dto.mediaUrls.length > 0 && {
            media: {
              create: dto.mediaUrls.map((m, index) => ({
                url: m.url,
                thumbnailUrl: m.thumbnailUrl || m.url,
                type: m.type as any,
                mimeType: m.mimeType,
                sizeBytes: m.sizeBytes,
                width: m.width,
                height: m.height,
                order: index,
              })),
            },
          }),
          // Attach poll if provided
          ...(dto.poll && {
            poll: {
              create: {
                question: dto.poll.question,
                expiresAt: new Date(Date.now() + dto.poll.durationHours * 60 * 60 * 1000),
                options: {
                  create: dto.poll.options.map((optText, idx) => ({
                    text: optText,
                    order: idx,
                  })),
                },
              },
            },
          }),
        },
        include: {
          author: { include: { profile: true } },
          media: true,
          poll: { include: { options: true } },
          quotePost: {
            include: {
              author: { include: { profile: true } },
              media: true,
            },
          },
        },
      });

      // 2. Increment parent replyCount
      if (dto.parentId) {
        await tx.post.update({
          where: { id: dto.parentId },
          data: { replyCount: { increment: 1 } },
        });
      }

      // 3. Increment quoteCount
      if (dto.quotePostId) {
        await tx.post.update({
          where: { id: dto.quotePostId },
          data: { quoteCount: { increment: 1 } },
        });
      }

      // 3b. Increment group postCount
      if ((dto as any).groupId) {
        await (tx as any).group.update({
          where: { id: (dto as any).groupId },
          data: { postCount: { increment: 1 } },
        }).catch(() => {});
      }

      // 4. Handle hashtags
      const tags = this.extractHashtags(content);
      for (const tag of tags) {
        const hashtag = await tx.hashtag.upsert({
          where: { tag },
          update: { usageCount: { increment: 1 } },
          create: { tag, usageCount: 1 },
        });

        await tx.postHashtag.create({
          data: {
            postId: created.id,
            hashtagId: hashtag.id,
          },
        });
      }

      // 5. Handle mentions
      const mentions = this.extractMentions(content);
      if (mentions.length > 0) {
        const mentionedUsers = await tx.user.findMany({
          where: { username: { in: mentions } },
          select: { id: true },
        });

        for (const u of mentionedUsers) {
          if (u.id !== authorId) {
            await tx.mention.create({
              data: {
                postId: created.id,
                userId: u.id,
              },
            });
            // Notification
            await tx.notification.create({
              data: {
                userId: u.id,
                actorId: authorId,
                type: 'MENTION',
                entityId: created.id,
                message: 'mentioned you in a post',
              },
            });
          }
        }
      }

      // 6. Handle reply notification
      if (dto.parentId) {
        const parent = await tx.post.findUnique({
          where: { id: dto.parentId },
          select: { authorId: true },
        });
        if (parent && parent.authorId !== authorId) {
          await tx.notification.create({
            data: {
              userId: parent.authorId,
              actorId: authorId,
              type: 'REPLY',
              entityId: created.id,
              message: 'replied to your post',
            },
          });
        }
      }

      return created;
    });

    return this.formatPostResponse(post, authorId);
  }

  /** Reply/quote permission state for a viewer (used by the UI to hide the reply box). */
  async getInteractionState(postId: string, viewerId?: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }
    const permission = await this.canReply(post as any, viewerId);
    return {
      postId,
      replySettings: (post as any).replySettings || 'anyone',
      allowQuotePosts: (post as any).allowQuotePosts !== false,
      replyRules: {
        followers: Boolean((post as any).replyRuleFollowers),
        following: Boolean((post as any).replyRuleFollowing),
        mentioned: Boolean((post as any).replyRuleMentioned),
      },
      canReply: permission.allowed,
      replyRestrictionReason: permission.reason || null,
    };
  }

  async getPostById(postId: string, viewerId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { include: { profile: true } },
        group: true,
        media: { orderBy: { order: 'asc' } },
        poll: {
          include: {
            options: { orderBy: { order: 'asc' } },
          },
        },
        parent: {
          include: {
            author: { include: { profile: true } },
            media: true,
          },
        },
        quotePost: {
          include: {
            author: { include: { profile: true } },
            media: true,
          },
        },
      },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    return this.formatPostResponse(post, viewerId);
  }

  async getReplies(postId: string, cursor?: string, limit = 20, viewerId?: string) {
    const replies = await this.prisma.post.findMany({
      where: {
        parentId: postId,
        deletedAt: null,
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'asc' },
      include: {
        author: { include: { profile: true } },
        group: true,
        media: true,
        poll: { include: { options: true } },
      },
    });

    const hasMore = replies.length > limit;
    const items = hasMore ? replies.slice(0, limit) : replies;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const formattedItems = await Promise.all(
      items.map((p) => this.formatPostResponse(p, viewerId)),
    );

    return {
      items: formattedItems,
      nextCursor,
      hasMore,
    };
  }

  async deletePost(postId: string, userId: string, userRole: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId && userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Soft delete
    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: 'Post deleted' };
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existingLike) {
      // Remove like
      await this.prisma.$transaction([
        this.prisma.like.delete({
          where: { id: existingLike.id },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false, likeCount: Math.max(0, post.likeCount - 1) };
    } else {
      // Add like
      await this.prisma.$transaction([
        this.prisma.like.create({
          data: { userId, postId },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        }),
        ...(post.authorId !== userId
          ? [
              this.prisma.notification.create({
                data: {
                  userId: post.authorId,
                  actorId: userId,
                  type: 'LIKE',
                  entityId: postId,
                  message: 'liked your post',
                },
              }),
            ]
          : []),
      ]);
      return { liked: true, likeCount: post.likeCount + 1 };
    }
  }

  async toggleRepost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.prisma.repost.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.repost.delete({
          where: { id: existing.id },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { repostCount: { decrement: 1 } },
        }),
      ]);
      return { reposted: false, repostCount: Math.max(0, post.repostCount - 1) };
    } else {
      await this.prisma.$transaction([
        this.prisma.repost.create({
          data: { userId, postId },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { repostCount: { increment: 1 } },
        }),
        ...(post.authorId !== userId
          ? [
              this.prisma.notification.create({
                data: {
                  userId: post.authorId,
                  actorId: userId,
                  type: 'REPOST',
                  entityId: postId,
                  message: 'reposted your post',
                },
              }),
            ]
          : []),
      ]);
      return { reposted: true, repostCount: post.repostCount + 1 };
    }
  }

  async toggleBookmark(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.prisma.bookmark.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.bookmark.delete({
          where: { id: existing.id },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { bookmarkCount: { decrement: 1 } },
        }),
      ]);
      return { bookmarked: false };
    } else {
      await this.prisma.$transaction([
        this.prisma.bookmark.create({
          data: { userId, postId },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { bookmarkCount: { increment: 1 } },
        }),
      ]);
      return { bookmarked: true };
    }
  }

  async votePoll(pollId: string, optionId: string, userId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });

    if (!poll) throw new NotFoundException('Poll not found');
    if (new Date() > poll.expiresAt) {
      throw new BadRequestException('This poll has expired');
    }

    const validOption = poll.options.some((o) => o.id === optionId);
    if (!validOption) {
      throw new BadRequestException('Invalid poll option selected');
    }

    // Check duplicate vote
    const existingVote = await this.prisma.pollVote.findUnique({
      where: {
        pollId_userId: { pollId, userId },
      },
    });

    if (existingVote) {
      throw new ConflictException('You have already voted in this poll');
    }

    await this.prisma.$transaction([
      this.prisma.pollVote.create({
        data: { pollId, optionId, userId },
      }),
      this.prisma.pollOption.update({
        where: { id: optionId },
        data: { voteCount: { increment: 1 } },
      }),
    ]);

    const updatedPoll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    const totalVotes = updatedPoll!.options.reduce((acc, curr) => acc + curr.voteCount, 0);

    return {
      pollId,
      totalVotes,
      options: updatedPoll!.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        voteCount: opt.voteCount,
        percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
        hasVoted: opt.id === optionId,
      })),
      userVoteOptionId: optionId,
    };
  }

  async formatPostResponse(post: any, viewerId?: string) {
    let isLiked = false;
    let isReposted = false;
    let isBookmarked = false;

    if (viewerId) {
      const [like, repost, bookmark] = await Promise.all([
        this.prisma.like.findUnique({
          where: { userId_postId: { userId: viewerId, postId: post.id } },
        }),
        this.prisma.repost.findUnique({
          where: { userId_postId: { userId: viewerId, postId: post.id } },
        }),
        this.prisma.bookmark.findUnique({
          where: { userId_postId: { userId: viewerId, postId: post.id } },
        }),
      ]);
      isLiked = !!like;
      isReposted = !!repost;
      isBookmarked = !!bookmark;
    }

    let pollData: any = null;
    if (post.poll) {
      const totalVotes = post.poll.options?.reduce(
        (acc: number, curr: any) => acc + curr.voteCount,
        0,
      ) || 0;

      let userVoteOptionId: string | null = null;
      if (viewerId) {
        const userVote = await this.prisma.pollVote.findUnique({
          where: { pollId_userId: { pollId: post.poll.id, userId: viewerId } },
        });
        userVoteOptionId = userVote?.optionId || null;
      }

      pollData = {
        id: post.poll.id,
        question: post.poll.question,
        expiresAt: post.poll.expiresAt.toISOString(),
        isExpired: new Date() > post.poll.expiresAt,
        totalVotes,
        userVoteOptionId,
        options: (post.poll.options || []).map((o: any) => ({
          id: o.id,
          text: o.text,
          voteCount: o.voteCount,
          percentage: totalVotes > 0 ? Math.round((o.voteCount / totalVotes) * 100) : 0,
          hasVoted: o.id === userVoteOptionId,
        })),
      };
    }

    return {
      id: post.id,
      content: post.content,
      authorId: post.authorId,
      author: {
        id: post.author.id,
        username: post.author.username,
        displayName: post.author.profile?.displayName || post.author.username,
        avatarUrl: post.author.profile?.avatarUrl,
        isVerified: post.author.isVerified,
        isPrivate: post.author.isPrivate,
      },
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      isEdited: post.isEdited,
      replySettings: post.replySettings || 'anyone',
      allowQuotePosts: post.allowQuotePosts !== false,
      replyRules: {
        followers: Boolean(post.replyRuleFollowers),
        following: Boolean(post.replyRuleFollowing),
        mentioned: Boolean(post.replyRuleMentioned),
      },
      canReply: true,
      media: (post.media || []).map((m: any) => ({
        id: m.id,
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        type: m.type,
        mimeType: m.mimeType,
        width: m.width,
        height: m.height,
        order: m.order,
      })),
      poll: pollData,
      parentId: post.parentId,
      replyToAuthor: (post as any).parent?.author
        ? {
            username: (post as any).parent.author.username,
            displayName:
              (post as any).parent.author.profile?.displayName ||
              (post as any).parent.author.username,
          }
        : null,
      quotePost: post.quotePost
        ? {
            id: post.quotePost.id,
            content: post.quotePost.content,
            author: {
              id: post.quotePost.author.id,
              username: post.quotePost.author.username,
              displayName:
                post.quotePost.author.profile?.displayName ||
                post.quotePost.author.username,
              avatarUrl: post.quotePost.author.profile?.avatarUrl,
              isVerified: post.quotePost.author.isVerified,
            },
            createdAt: post.quotePost.createdAt.toISOString(),
            media: post.quotePost.media || [],
          }
        : null,
      likeCount: post.likeCount,
      replyCount: post.replyCount,
      repostCount: post.repostCount,
      quoteCount: post.quoteCount,
      bookmarkCount: post.bookmarkCount,
      isLiked,
      isReposted,
      isBookmarked,
      groupId: post.groupId || null,
      group: post.group
        ? {
            id: post.group.id,
            name: post.group.name,
            slug: post.group.slug,
            category: post.group.category,
            avatarUrl: post.group.avatarUrl,
          }
        : null,
    };
  }
}
