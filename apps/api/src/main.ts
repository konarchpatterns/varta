import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('VartaBootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix for all REST routes
  app.setGlobalPrefix('api/v1');

  // Cookie parser for secure HttpOnly session tokens
  app.use(cookieParser());

  // Input validation & sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // CORS Configuration
  //
  // The mobile app (Expo web, emulator, LAN device) has no fixed origin, and
  // native apps do not send an Origin header at all. Requests that do send one
  // are allowed when it is listed in CORS_ALLOWED_ORIGINS or when it is a
  // loopback / private-network / Expo dev address. Anything else is rejected.
  const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  const isDevFriendlyOrigin = (origin: string): boolean => {
    if (configuredOrigins.includes(origin) || configuredOrigins.includes('*')) return true;
    try {
      const { hostname, protocol } = new URL(origin);
      if (protocol !== 'http:' && protocol !== 'https:') return false;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
      // LAN addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x) + expo tunnels
      if (/^(10|127)\./.test(hostname)) return true;
      if (/^192\.168\./.test(hostname)) return true;
      if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
      // hosted previews / tunnels used during development & review
      if (/\.(exp\.direct|expo\.app|expo\.dev|ngrok\.io|ngrok-free\.app|trycloudflare\.com|vercel\.app|netlify\.app)$/.test(hostname)) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // native apps / curl
      return callback(null, isDevFriendlyOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400,
  });

  // Static uploads directory serving
  const uploadDir = path.isAbsolute(process.env.MEDIA_UPLOAD_DIR || '')
    ? process.env.MEDIA_UPLOAD_DIR!
    : path.resolve(process.cwd(), process.env.MEDIA_UPLOAD_DIR || './uploads');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const avatarsDir = path.join(uploadDir, 'avatars');
  const coversDir = path.join(uploadDir, 'covers');
  const postsDir = path.join(uploadDir, 'posts');
  const groupsDir = path.join(uploadDir, 'groups');
  if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
  if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });
  if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });
  if (!fs.existsSync(groupsDir)) fs.mkdirSync(groupsDir, { recursive: true });

  app.use('/uploads', express.static(uploadDir));
  app.use('/api/v1/uploads', express.static(uploadDir));

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('VARTA API — Baat Sabki')
    .setDescription(
      'Official REST and Real-Time WebSocket API specification for VARTA social networking platform.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Health', 'Infrastructure and service health probes')
    .addTag('Authentication', 'User registration, login, session rotation')
    .addTag('Users & Profiles', 'User profile management, privacy settings')
    .addTag('Posts & Interactions', 'Post creation, threaded replies, likes, reposts, polls')
    .addTag('Feeds', 'Following and algorithmic For You discovery feeds')
    .addTag('Social Relationships', 'Follows, follow requests, blocks, mutes')
    .addTag('Explore & Search', 'Full-text search and trending hashtags')
    .addTag('Notifications', 'User alerts and preferences')
    .addTag('Direct Messages', '1-to-1 conversation history and messaging')
    .addTag('Moderation & Admin', 'IT Intermediary Rules grievance handling & review queue')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'VARTA API Documentation',
  });

  const port = process.env.PORT_API || process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 VARTA Backend API running on: http://0.0.0.0:${port}/api/v1`);
  logger.log(`📚 Swagger documentation available at: http://0.0.0.0:${port}/api/docs`);
}

bootstrap();
