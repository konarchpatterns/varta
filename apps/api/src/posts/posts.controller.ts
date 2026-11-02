import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePostDto } from '@varta/shared';

const getUploadDir = () => {
  const envDir = process.env.MEDIA_UPLOAD_DIR || './uploads';
  return resolve(process.cwd(), envDir);
};

const createPostMediaStorage = () => {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = getUploadDir();
      const targetDir = join(uploadDir, 'posts');
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }
      cb(null, targetDir);
    },
    filename: (_req, file, cb) => {
      const fileExt = extname(file.originalname).toLowerCase();
      const allowedExts = [
        '.jpg', '.jpeg', '.png', '.webp', '.gif',
        '.mp4', '.webm', '.mov', '.mkv', '.ogg', '.3gp'
      ];
      const cleanExt = allowedExts.includes(fileExt) ? fileExt : '.bin';
      const uniqueName = `${uuidv4()}${cleanExt}`;
      cb(null, uniqueName);
    },
  });
};

const postMediaFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/ogg',
    'video/3gpp',
  ];
  if (
    allowedMimes.includes(file.mimetype.toLowerCase()) ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('image/')
  ) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        'Unsupported file type. Please upload images (JPEG, PNG, WEBP, GIF) or videos/reels (MP4, WebM, MOV).',
      ),
      false,
    );
  }
};

const getPublicMediaUrl = (filename: string) => {
  const baseUrl = process.env.MEDIA_PUBLIC_URL || 'http://localhost:3001/uploads';
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}/posts/${filename}`;
};

@ApiTags('Posts & Interactions')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post('media')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload media for post (images, videos, reels, GIFs)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: createPostMediaStorage(),
      fileFilter: postMediaFileFilter,
      limits: {
        fileSize: Number(process.env.MAX_VIDEO_SIZE_BYTES) || 50 * 1024 * 1024,
        files: 4,
      },
    }),
  )
  async uploadMedia(
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one media file is required (field name: "files" or "file")');
    }

    const items = files.map((file) => {
      const isVideo =
        file.mimetype.startsWith('video/') ||
        /\.(mp4|webm|mov|mkv|ogg|3gp)$/i.test(file.originalname);
      const isGif = file.mimetype === 'image/gif' || /\.gif$/i.test(file.originalname);
      const type = isVideo ? 'VIDEO' : isGif ? 'GIF' : 'IMAGE';
      const publicUrl = getPublicMediaUrl(file.filename);

      return {
        url: publicUrl,
        thumbnailUrl: publicUrl,
        type,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        originalName: file.originalname,
      };
    });

    return { media: items };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post, reply, quote, poll, or repost' })
  async createPost(
    @CurrentUser() user: any,
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.createPost(user.id, dto);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get single post details with media and polls' })
  async getPostById(
    @Param('id') id: string,
    @CurrentUser() viewer: any,
  ) {
    return this.postsService.getPostById(id, viewer?.id);
  }

  @Get(':id/interaction')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Reply/quote permission state for the current viewer' })
  async getInteractionState(@Param('id') id: string, @CurrentUser() viewer: any) {
    return this.postsService.getInteractionState(id, viewer?.id);
  }

  @Get(':id/replies')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get replies to post' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getReplies(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @CurrentUser() viewer?: any,
  ) {
    return this.postsService.getReplies(id, cursor, limit ? Number(limit) : 20, viewer?.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete a post' })
  async deletePost(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.postsService.deletePost(id, user.id, user.role);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like on post' })
  async toggleLike(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.postsService.toggleLike(id, user.id);
  }

  @Post(':id/repost')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle repost on post' })
  async toggleRepost(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.postsService.toggleRepost(id, user.id);
  }

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle private bookmark on post' })
  async toggleBookmark(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.postsService.toggleBookmark(id, user.id);
  }

  @Post('poll/:pollId/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cast vote on a poll option' })
  async votePoll(
    @Param('pollId') pollId: string,
    @Body('optionId') optionId: string,
    @CurrentUser() user: any,
  ) {
    return this.postsService.votePoll(pollId, optionId, user.id);
  }
}
