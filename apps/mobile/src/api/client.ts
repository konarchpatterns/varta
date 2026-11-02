/**
 * VARTA Mobile — API client
 *
 * Mirrors apps/web/src/lib/api.ts so the mobile app behaves exactly like the
 * website:
 *   • one `apiRequest()` entry point (JSON + FormData, 204, ApiError)
 *   • access token persisted on device + silent refresh/rotation on 401
 *   • refresh token kept locally because React Native has no cookie jar for
 *     the HttpOnly cookie the web app relies on
 *   • every mapper is defensive, and no mapper silently returns mock data:
 *     a failed request must fail loudly, otherwise the UI shows stale demo
 *     content and "nothing works" (the original glitch).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  Comment,
  CommunityItem,
  ConversationItem,
  MessageItem,
  NotificationItem,
  Post,
  PostGroup,
  TrendingItem,
  User,
} from '../types';

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

const DEFAULT_PRODUCTION_URL = 'https://varta.kevindevops.online/api/v1';

/** Android emulator reaches the host machine through 10.0.2.2, not localhost. */
function defaultDevUrl(): string {
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:3001/api/v1`;
}

/**
 * In Expo, the Metro host (`hostUri`, e.g. "192.168.1.24:8081") is the machine
 * running the dev server. The API usually runs on that same machine, so this is
 * the most reliable dev default — it works on simulators, emulators and a
 * physical phone on the same Wi-Fi without any .env editing.
 */
/**
 * When the dev server is opened as `localhost` (common on web / iOS simulator)
 * we cannot learn the machine's LAN address from Expo, so the physical phone
 * needs an explicit hint. Fill `EXPO_PUBLIC_LAN_HOST` with your computer's
 * Wi-Fi IP to make every device on the network work without editing .env again.
 */
const LAN_HOST_HINT: string | undefined = process.env.EXPO_PUBLIC_LAN_HOST;

/** The dev-machine hostname Expo is being served from (e.g. "192.168.1.24"). */
function metroHostname(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    const hostUri: string | undefined =
      Constants?.expoConfig?.hostUri ||
      Constants?.expoGoConfig?.debuggerHost ||
      Constants?.manifest2?.extra?.expoGo?.debuggerHost;
    if (!hostUri) return null;
    const host = String(hostUri).split(':')[0];
    return host || null;
  } catch {
    return null;
  }
}

const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '3001';

function devApiUrlForHost(host: string): string {
  return `http://${host}:${API_PORT}/api/v1`;
}

function metroHostApiUrl(): string | null {
  const host = metroHostname();
  const isLoopback = !host || host === 'localhost' || host === '127.0.0.1';

  if (isLoopback) {
    if (LAN_HOST_HINT) return devApiUrlForHost(LAN_HOST_HINT);
    // A real phone cannot reach the dev machine through "localhost"
    if (Platform.OS === 'android' && !isExpoGoOverLan()) return devApiUrlForHost('10.0.2.2');
    return devApiUrlForHost('localhost');
  }
  return devApiUrlForHost(host);
}

/** In Expo Go the phone loaded the bundle from a LAN IP, so Metro knows it. */
function isExpoGoOverLan(): boolean {
  const host = metroHostname();
  return !!host && host !== 'localhost' && host !== '127.0.0.1';
}

/**
 * Where the API lives.
 *
 * `EXPO_PUBLIC_API_URL` (in `apps/mobile/.env`) always wins — set it to
 * http://<your-lan-ip>:3001/api/v1 when the phone talks to a dev machine.
 * Otherwise: dev builds use the local API, release builds use production.
 */
// Metro only inlines literal `process.env.EXPO_PUBLIC_*` reads — do not extract
// this into a helper or a destructured variable, or the value becomes undefined.
const CUSTOM_API_URL_FROM_ENV: string | undefined = process.env.EXPO_PUBLIC_API_URL;

// Always start from production, then refine at runtime (dev builds / .env).
let customApiUrl: string = DEFAULT_PRODUCTION_URL;

/**
 * A bundle served from a public host (Expo web export, EAS update, ngrok…) is
 * NOT on the developer's machine, so a localhost/10.0.2.2/LAN API is unreachable
 * for every visitor. In that case only the deployed API makes sense.
 */
function isHostedBundle(): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    if (typeof window === 'undefined' || !window.location) return false;
    const { hostname, protocol } = window.location;
    if (protocol === 'file:') return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
    if (/^(10|127)\./.test(hostname) || /^192\.168\./.test(hostname)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function resolveApiBaseUrl(): string {
  const fromEnv = CUSTOM_API_URL_FROM_ENV;
  if (fromEnv) return normalizeApiUrl(fromEnv);
  // hosted web build -> the deployed API
  if (isHostedBundle()) return DEFAULT_PRODUCTION_URL;
  if (__DEV__) return metroHostApiUrl() || defaultDevUrl();
  return DEFAULT_PRODUCTION_URL;
}

customApiUrl = resolveApiBaseUrl();
// eslint-disable-next-line no-console
console.log(`[VARTA] API base URL: ${customApiUrl} (env=${CUSTOM_API_URL_FROM_ENV || 'unset'}, dev=${__DEV__})`);

/** Last connection problem, surfaced in Settings so the cause is visible. */
let lastNetworkError: string | null = null;

export function getLastNetworkError(): string | null {
  return lastNetworkError;
}

export function clearLastNetworkError() {
  lastNetworkError = null;
}

export function normalizeApiUrl(url: string): string {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_PRODUCTION_URL;
  if (/\/api\/v1$/i.test(trimmed)) return trimmed;
  return `${trimmed}/api/v1`;
}

export function getApiBaseUrl(): string {
  return customApiUrl;
}

/** Where the URL came from — shown on the sign-in screen while developing. */
export function getApiUrlSource():
  | 'env'
  | 'hosted-web'
  | 'metro-host'
  | 'android-emulator'
  | 'local'
  | 'production' {
  if (CUSTOM_API_URL_FROM_ENV) return 'env';
  if (isHostedBundle()) return 'hosted-web';
  if (!__DEV__) return 'production';
  if (metroHostApiUrl()) return Platform.OS === 'android' && customApiUrl.includes('10.0.2.2') ? 'android-emulator' : 'metro-host';
  return 'local';
}

export function getWsBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_WS_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  return customApiUrl.replace(/\/api\/v1\/?$/, '');
}

// ---------------------------------------------------------------------------
// Token storage (access + refresh)
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'varta.access_token';
const REFRESH_KEY = 'varta.refresh_token';
const API_URL_KEY = 'varta.api_url';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let hydrated = false;

export function setAuthToken(token: string | null) {
  accessToken = token;
  if (token) AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
  else AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
}

export function getAuthToken(): string | null {
  return accessToken;
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
  if (token) AsyncStorage.setItem(REFRESH_KEY, token).catch(() => {});
  else AsyncStorage.removeItem(REFRESH_KEY).catch(() => {});
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

/** Called once at app start before any request is made. */
export async function hydrateSession(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const [token, refresh, url] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(REFRESH_KEY),
      AsyncStorage.getItem(API_URL_KEY),
    ]);
    accessToken = token;
    refreshToken = refresh;
    if (url) customApiUrl = normalizeApiUrl(url);
  } catch {
    // storage unavailable — stay with in-memory session
  }
}

export async function setCustomApiUrl(url: string) {
  customApiUrl = normalizeApiUrl(url);
  await AsyncStorage.setItem(API_URL_KEY, customApiUrl).catch(() => {});
}

export async function clearSessionStorage() {
  accessToken = null;
  refreshToken = null;
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY).catch(() => {}),
    AsyncStorage.removeItem(REFRESH_KEY).catch(() => {}),
  ]);
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: any;
  timeoutMs?: number;
  /** internal: prevents infinite refresh loops */
  _retried?: boolean;
  /** internal: don't run the network-candidate recovery twice */
};

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${customApiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.accessToken) return null;
      setAuthToken(data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      return data.accessToken as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Ping `/health` on an explicit base URL (bypasses the resolved client URL).
 * Used by Settings to show which candidate addresses actually answer.
 */
export async function probeApiUrl(baseUrl: string, timeoutMs = 5000): Promise<number> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const started = Date.now();
  try {
    const res = await fetch(`${normalizeApiUrl(baseUrl)}/health`, {
      headers: { 'ngrok-skip-browser-warning': '1' },
      signal: controller?.signal,
    });
    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
    return Date.now() - started;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Candidate API addresses for this device, in the order they are tried. */
export function getApiCandidates(): string[] {
  const list: string[] = [];
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) list.push(normalizeApiUrl(fromEnv));
  if (LAN_HOST_HINT) list.push(devApiUrlForHost(LAN_HOST_HINT));
  const host = metroHostname();
  if (host && host !== 'localhost' && host !== '127.0.0.1') list.push(devApiUrlForHost(host));
  list.push(devApiUrlForHost('10.0.2.2'));
  list.push(devApiUrlForHost('localhost'));
  list.push(DEFAULT_PRODUCTION_URL);
  return Array.from(new Set(list));
}

/** Switch the client to a different base URL at runtime (persisted). */
export async function useApiBaseUrl(baseUrl: string) {
  await setCustomApiUrl(baseUrl);
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, timeoutMs = 20000, _retried, headers: rawHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': '1',
    ...(rawHeaders as Record<string, string> | undefined),
  };

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${customApiUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal: controller?.signal,
    });
  } catch (err: any) {
    if (timer) clearTimeout(timer);
    const aborted = err?.name === 'AbortError';
    const detail = aborted
      ? `timed out after ${Math.round(timeoutMs / 1000)}s`
      : err?.message || String(err);

    lastNetworkError = `${url} — ${detail}`;

    throw new ApiError(
      0,
      aborted
        ? `The server at ${customApiUrl} did not respond in time. Check that the API is running and reachable from this device.`
        : `Cannot reach the VARTA server at ${customApiUrl}. Check that the API is running, and that the phone/emulator can reach that address.`,
      { cause: detail, url, baseUrl: customApiUrl },
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
  lastNetworkError = null;

  // Silent refresh + single retry (same behaviour as the web client)
  if (
    response.status === 401 &&
    !_retried &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/register')
  ) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      return apiRequest<T>(endpoint, { ...options, _retried: true });
    }
  }

  if (response.status === 204) return {} as T;

  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const raw = payload?.message ?? payload?.error ?? response.statusText;
    const message = Array.isArray(raw) ? raw[0] : raw || 'Request failed';
    throw new ApiError(response.status, message, payload);
  }

  return (payload ?? {}) as T;
}

// ---------------------------------------------------------------------------
// Mappers (API DTO -> mobile view models)
// ---------------------------------------------------------------------------

export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'now';
  const diff = Date.now() - new Date(dateString).getTime();
  if (Number.isNaN(diff)) return 'now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function initialsAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'VARTA')}&background=0F172A&color=FFFFFF`;
}

export function mapApiUserToMobile(apiUser: any): User {
  const profile = apiUser?.profile || {};
  const username = apiUser?.username || 'user';
  const displayName = profile.displayName || apiUser?.displayName || username;

  return {
    id: apiUser?.id || `user-${username}`,
    name: displayName,
    handle: username.startsWith('@') ? username : `@${username}`,
    username,
    avatar: profile.avatarUrl || apiUser?.avatarUrl || initialsAvatar(displayName),
    verified: Boolean(apiUser?.isVerified),
    email: apiUser?.email,
    phone: apiUser?.phoneNumber || undefined,
    bio: profile.bio || '',
    location: profile.location || '',
    website: profile.website || '',
    isPrivate: Boolean(apiUser?.isPrivate ?? profile.isPrivate),
    joinedDate: apiUser?.createdAt
      ? `Joined ${new Date(apiUser.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        })}`
      : 'Joined recently',
    followersCount: apiUser?.followersCount ?? apiUser?._count?.followers ?? 0,
    followingCount: apiUser?.followingCount ?? apiUser?._count?.following ?? 0,
    postCount: apiUser?.postCount ?? apiUser?._count?.posts ?? 0,
    isFollowing: apiUser?.isFollowing,
    bannerImage: profile.coverUrl || apiUser?.coverUrl || '',
  };
}

/** `/auth/me` and `/auth/login` return the current user in this shape. */
export function mapCurrentUser(apiUser: any): User {
  const mapped = mapApiUserToMobile(apiUser);
  return {
    ...mapped,
    followersCount: apiUser?.counts?.followers ?? mapped.followersCount,
    followingCount: apiUser?.counts?.following ?? mapped.followingCount,
    postCount: apiUser?.counts?.posts ?? mapped.postCount,
  };
}

export function mapApiPostToMobile(item: any): Post {
  const author = item?.author || {};
  const authorName = author.displayName || author.username || 'VARTA Voice';

  return {
    id: item?.id,
    author: {
      id: author.id || 'unknown',
      name: authorName,
      handle: `@${author.username || 'user'}`,
      username: author.username,
      avatar: author.avatarUrl || initialsAvatar(authorName),
      verified: Boolean(author.isVerified),
      isPrivate: Boolean(author.isPrivate),
    },
    content: item?.content || '',
    createdAt: formatRelativeTime(item?.createdAt),
    createdAtRaw: item?.createdAt,
    media: (item?.media || []).map((m: any, index: number) => ({
      id: m.id || `media-${index}`,
      url: m.url || m.thumbnailUrl,
      type: m.type === 'VIDEO' ? 'video' : 'image',
      aspectRatio: m.width && m.height ? m.width / m.height : undefined,
    })),
    poll: item?.poll
      ? {
          id: item.poll.id,
          question: item.poll.question,
          expiresAt: item.poll.expiresAt,
          isExpired: Boolean(item.poll.isExpired),
          totalVotes: item.poll.totalVotes ?? 0,
          userVoteOptionId: item.poll.userVoteOptionId ?? null,
          options: (item.poll.options || []).map((o: any) => ({
            id: o.id,
            text: o.text,
            voteCount: o.voteCount ?? 0,
            percentage: o.percentage ?? 0,
            hasVoted: Boolean(o.hasVoted),
          })),
        }
      : undefined,
    quotePost: item?.quotePost ? mapApiPostToMobile(item.quotePost) : undefined,
    parentId: item?.parentId ?? undefined,
    likes: item?.likeCount ?? 0,
    reposts: item?.repostCount ?? 0,
    replies: item?.replyCount ?? 0,
    quotes: item?.quoteCount ?? 0,
    bookmarks: item?.bookmarkCount ?? 0,
    isLiked: Boolean(item?.isLiked),
    isReposted: Boolean(item?.isReposted),
    isBookmarked: Boolean(item?.isBookmarked),
    replySettings: item?.replySettings || 'anyone',
    allowQuotePosts: item?.allowQuotePosts !== false,
    replyRules: item?.replyRules,
    canReply: item?.canReply !== false,
    replyRestrictionReason: item?.replyRestrictionReason ?? null,
    category: item?.group?.category || item?.category || 'For You',
    groupId: item?.groupId || item?.group?.id,
    group: item?.group
      ? {
          id: item.group.id,
          name: item.group.name,
          slug: item.group.slug,
          category: item.group.category,
          avatarUrl: item.group.avatarUrl,
        }
      : undefined,
  };
}

export function mapApiCommentToMobile(item: any): Comment {
  const author = item?.author || {};
  const authorName = author.displayName || author.username || 'VARTA Voice';
  return {
    id: item?.id,
    author: {
      id: author.id || 'unknown',
      name: authorName,
      handle: `@${author.username || 'user'}`,
      username: author.username,
      avatar: author.avatarUrl || initialsAvatar(authorName),
      verified: Boolean(author.isVerified),
    },
    content: item?.content || '',
    createdAt: formatRelativeTime(item?.createdAt),
    likes: item?.likeCount ?? 0,
    replies: item?.replyCount ?? 0,
    isLiked: Boolean(item?.isLiked),
  };
}

export function mapApiNotificationToMobile(n: any): NotificationItem {
  const actor = n?.actor || {};
  const actorName = actor.displayName || actor.username || 'VARTA Member';
  const rawType = String(n?.type || 'system').toLowerCase();

  const type: NotificationItem['type'] =
    rawType === 'like'
      ? 'like'
      : rawType === 'follow'
        ? 'follow'
        : rawType === 'reply' || rawType === 'mention'
          ? 'reply'
          : rawType === 'repost' || rawType === 'quote'
            ? 'repost'
            : rawType === 'direct_message'
              ? 'message'
              : 'system';

  return {
    id: n?.id || `notification-${Math.random().toString(36).slice(2)}`,
    type,
    actor: {
      id: actor.id || 'unknown',
      name: actorName,
      handle: `@${actor.username || 'member'}`,
      username: actor.username,
      avatar: actor.avatarUrl || initialsAvatar(actorName),
      verified: Boolean(actor.isVerified),
    },
    actionText: n?.message || 'interacted with you',
    entityId: n?.entityId || undefined,
    time: formatRelativeTime(n?.createdAt),
    read: Boolean(n?.isRead),
  };
}

export function mapApiCommunityToMobile(c: any): CommunityItem {
  const members = c?.memberCount ?? c?.membersCount ?? 0;
  return {
    id: c?.id,
    name: c?.name || 'VARTA Community',
    slug: c?.slug,
    members: `${members} ${members === 1 ? 'member' : 'members'}`,
    memberCount: members,
    avatar: c?.avatarUrl || initialsAvatar(c?.name || 'Community'),
    coverUrl: c?.coverUrl || '',
    category: c?.category || 'India Trends',
    description: c?.description || '',
    postCount: c?.postCount ?? 0,
    isJoined: Boolean(c?.isJoined ?? c?.isMember),
    isPrivate: Boolean(c?.isPrivate),
    creatorId: c?.creatorId,
  };
}

export function mapApiConversationToMobile(c: any): ConversationItem {
  const other = c?.otherMember || {};
  const members = c?.members || [];
  const title = c?.title || other.displayName || other.username || 'Conversation';

  return {
    id: c?.id,
    isGroup: Boolean(c?.isGroup),
    title,
    avatarUrl: c?.avatarUrl || other.avatarUrl || initialsAvatar(title),
    otherUsername: c?.isGroup ? undefined : other.username,
    otherUserId: c?.isGroup ? undefined : other.id,
    members: members.map((m: any) => ({
      id: m.id,
      username: m.username,
      displayName: m.displayName || m.username,
      avatarUrl: m.avatarUrl || initialsAvatar(m.displayName || m.username),
      isVerified: Boolean(m.isVerified),
    })),
    lastMessage: c?.lastMessage?.content || '',
    lastMessageSenderId: c?.lastMessage?.senderId,
    time: formatRelativeTime(c?.lastMessage?.createdAt || c?.updatedAt),
    unreadCount: c?.unreadCount ?? 0,
    updatedAt: c?.updatedAt,
  };
}

export function mapApiMessageToMobile(m: any): MessageItem {
  const sender = m?.sender || {};
  const senderName = sender.displayName || sender.username || 'Member';
  return {
    id: m?.id,
    conversationId: m?.conversationId,
    senderId: m?.senderId,
    senderName,
    senderUsername: sender.username,
    senderAvatar: sender.avatarUrl || initialsAvatar(senderName),
    content: m?.content || '',
    mediaUrl: m?.mediaUrl || undefined,
    isRead: Boolean(m?.isRead),
    createdAt: m?.createdAt,
    time: m?.createdAt
      ? new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
      : 'now',
  };
}

export function mapApiTrendingToMobile(t: any, index: number): TrendingItem {
  const tag = String(t?.tag || t?.name || '').replace(/^#/, '');
  return {
    id: t?.id || `trend-${index}`,
    rank: index + 1,
    tag: tag ? `#${tag}` : '#VARTA',
    category: t?.category || 'Trending in India',
    postCount: `${t?.usageCount ?? t?.postCount ?? t?.count ?? 0} posts`,
  };
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

function persistAuth(data: any): AuthResult {
  if (data?.accessToken) setAuthToken(data.accessToken);
  if (data?.refreshToken) setRefreshToken(data.refreshToken);
  return {
    user: mapCurrentUser(data?.user),
    accessToken: data?.accessToken || '',
    refreshToken: data?.refreshToken,
  };
}

export async function loginApi(identifier: string, password: string): Promise<AuthResult> {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
  return persistAuth(data);
}

export async function registerApi(dto: {
  email: string;
  username: string;
  displayName: string;
  password: string;
}): Promise<{ requiresVerification: boolean; message: string; auth?: AuthResult }> {
  const data = await apiRequest('/auth/register', { method: 'POST', body: dto });
  if (data?.accessToken && data?.user) {
    return { requiresVerification: false, message: data?.message || 'Account created', auth: persistAuth(data) };
  }
  return {
    requiresVerification: true,
    message: data?.message || 'Account created. Please verify your email to continue.',
  };
}

export async function fetchMeApi(): Promise<User> {
  const data = await apiRequest('/auth/me');
  return mapCurrentUser(data);
}

export async function logoutApi(): Promise<void> {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: refreshToken ? { refreshToken } : {},
    });
  } catch {
    // best-effort revoke
  }
  await clearSessionStorage();
}

export async function sendPhoneOtpApi(dto: {
  countryCode: string;
  phoneNumber: string;
  purpose: 'login' | 'signup';
}) {
  return apiRequest<{
    success: boolean;
    message: string;
    phone?: string;
    countryCode?: string;
    isSmsConfigured?: boolean;
    devOtp?: string;
    expiresInSeconds?: number;
  }>('/auth/phone/send-otp', { method: 'POST', body: dto });
}

export async function verifyPhoneLoginApi(dto: {
  countryCode: string;
  phoneNumber: string;
  otp: string;
}): Promise<AuthResult> {
  const data = await apiRequest('/auth/phone/verify-login', { method: 'POST', body: dto });
  return persistAuth(data);
}

export async function verifyPhoneSignupApi(dto: {
  countryCode: string;
  phoneNumber: string;
  otp: string;
  displayName: string;
  username: string;
  password: string;
}): Promise<AuthResult> {
  const data = await apiRequest('/auth/phone/verify-signup', { method: 'POST', body: dto });
  return persistAuth(data);
}

export async function googleAuthApi(dto: {
  email: string;
  displayName: string;
  avatarUrl?: string;
  googleId?: string;
  idToken?: string;
}): Promise<AuthResult> {
  const data = await apiRequest('/auth/google', { method: 'POST', body: dto });
  return persistAuth(data);
}

export async function sendLoginOtpApi(identifier: string) {
  return apiRequest<{ success: boolean; maskedEmail: string; message: string }>(
    '/auth/login/send-otp',
    { method: 'POST', body: { identifier } },
  );
}

export async function verifyLoginOtpApi(identifier: string, otp: string): Promise<AuthResult> {
  const data = await apiRequest('/auth/login/verify-otp', { method: 'POST', body: { identifier, otp } });
  return persistAuth(data);
}

export async function sendSignupOtpApi(email: string, displayName?: string) {
  return apiRequest<{ success: boolean; message: string; email: string }>('/auth/signup/send-otp', {
    method: 'POST',
    body: { email, displayName },
  });
}

export async function verifySignupOtpApi(dto: {
  email: string;
  username: string;
  displayName: string;
  password: string;
  otp: string;
}): Promise<AuthResult> {
  const data = await apiRequest('/auth/signup/verify-otp', { method: 'POST', body: dto });
  return persistAuth(data);
}

// ---------------------------------------------------------------------------
// Feed & posts
// ---------------------------------------------------------------------------

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

function mapPage<T>(data: any, mapper: (item: any) => T): Page<T> {
  const items = Array.isArray(data?.items) ? data.items.map(mapper) : [];
  return {
    items,
    nextCursor: data?.nextCursor ? String(data.nextCursor) : null,
    hasMore: Boolean(data?.hasMore),
  };
}

export async function fetchFeedPage(
  tab: string = 'for-you',
  category?: string,
  cursor?: string,
  limit = 20,
): Promise<Page<Post>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (category && category !== 'For You' && category !== 'All') params.set('category', category);
  if (cursor) params.set('cursor', cursor);

  const endpoint =
    tab === 'following' ? `/feed/following?${params}` : `/feed/for-you?${params}`;

  const data = await apiRequest(endpoint);
  return mapPage(data, mapApiPostToMobile);
}

export async function fetchBookmarksPage(cursor?: string, limit = 30): Promise<Page<Post>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const data = await apiRequest(`/feed/bookmarks?${params}`);
  return mapPage(data, mapApiPostToMobile);
}

/** Alias used by the Bookmarks screen. */
export const loadBookmarksPage = fetchBookmarksPage;

export async function fetchUserPostsPage(
  username: string,
  tab = 'posts',
  cursor?: string,
  limit = 20,
): Promise<Page<Post>> {
  const params = new URLSearchParams({ tab, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const data = await apiRequest(`/feed/user/${encodeURIComponent(username)}?${params}`);
  return mapPage(data, mapApiPostToMobile);
}

export async function fetchPostApi(postId: string): Promise<Post> {
  return mapApiPostToMobile(await apiRequest(`/posts/${postId}`));
}

/** Reply/quote permission state for a post as seen by the current viewer. */
export async function fetchInteractionState(postId: string): Promise<{
  canReply: boolean;
  replySettings: 'anyone' | 'nobody' | 'custom';
  allowQuotePosts: boolean;
  replyRestrictionReason: string | null;
}> {
  return apiRequest(`/posts/${postId}/interaction`);
}

export async function fetchRepliesPage(postId: string, cursor?: string, limit = 20): Promise<Page<Comment>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const data = await apiRequest(`/posts/${postId}/replies?${params}`);
  return mapPage(data, mapApiCommentToMobile);
}

export interface CreatePostInput {
  content: string;
  mediaUrls?: Array<{ url: string; type: 'IMAGE' | 'VIDEO' | 'GIF'; thumbnailUrl?: string }>;
  parentId?: string;
  quotePostId?: string;
  repostOfId?: string;
  groupId?: string;
  poll?: { question: string; options: string[]; durationHours: number };
  replySettings?: string;
  allowQuotePosts?: boolean;
}

export async function createPostApi(input: CreatePostInput): Promise<Post> {
  const data = await apiRequest('/posts', { method: 'POST', body: input });
  return mapApiPostToMobile(data);
}

export async function deletePostApi(postId: string): Promise<void> {
  await apiRequest(`/posts/${postId}`, { method: 'DELETE' });
}

export async function toggleLikeApi(postId: string) {
  return apiRequest<{ liked: boolean; likeCount: number }>(`/posts/${postId}/like`, { method: 'POST' });
}

export async function toggleRepostApi(postId: string) {
  return apiRequest<{ reposted: boolean; repostCount: number }>(`/posts/${postId}/repost`, {
    method: 'POST',
  });
}

export async function toggleBookmarkApi(postId: string) {
  return apiRequest<{ bookmarked: boolean }>(`/posts/${postId}/bookmark`, { method: 'POST' });
}

export async function votePollApi(pollId: string, optionId: string) {
  return apiRequest(`/posts/poll/${pollId}/vote`, { method: 'POST', body: { optionId } });
}

/** Upload one media file to `/posts/media` (field name: files). Returns the public URL. */
export async function uploadMediaApi(file: {
  uri: string;
  name?: string;
  type?: string;
  base64?: string;
}): Promise<string> {
  const form = new FormData();

  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append('files', blob, file.name || 'upload.jpg');
  } else {
    const filename = file.name || file.uri.split('/').pop() || `upload-${Date.now()}.jpg`;
    form.append('files', {
      uri: file.uri,
      name: filename,
      type: file.type || 'image/jpeg',
    } as any);
  }

  const data = await apiRequest<{ media: Array<{ url: string }> }>('/posts/media', {
    method: 'POST',
    body: form,
    timeoutMs: 60000,
  });

  if (!data?.media?.[0]?.url) throw new ApiError(500, 'Upload failed — no media URL returned');
  return data.media[0].url;
}

// ---------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------

export async function followUserApi(username: string) {
  return apiRequest(`/social/follow/${encodeURIComponent(stripAt(username))}`, { method: 'POST' });
}

export async function unfollowUserApi(username: string) {
  return apiRequest(`/social/follow/${encodeURIComponent(stripAt(username))}`, { method: 'DELETE' });
}

export async function blockUserApi(username: string) {
  return apiRequest(`/social/block/${encodeURIComponent(stripAt(username))}`, { method: 'POST' });
}

export async function unblockUserApi(username: string) {
  return apiRequest(`/social/block/${encodeURIComponent(stripAt(username))}`, { method: 'DELETE' });
}

export async function toggleMuteApi(username: string) {
  return apiRequest(`/social/mute/${encodeURIComponent(stripAt(username))}`, { method: 'POST' });
}

function stripAt(username: string) {
  return (username || '').replace(/^@/, '');
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function fetchProfileApi(username: string): Promise<User & {
  isFollowedBy?: boolean;
  isPendingFollow?: boolean;
  isBlocked?: boolean;
  isMuted?: boolean;
}> {
  const data = await apiRequest(`/users/${encodeURIComponent(stripAt(username))}`);
  return {
    ...mapApiUserToMobile(data),
    isFollowedBy: Boolean(data?.isFollowedBy),
    isPendingFollow: Boolean(data?.isPendingFollow),
    isBlocked: Boolean(data?.isBlocked),
    isMuted: Boolean(data?.isMuted),
  };
}

export async function updateProfileApi(dto: {
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
}): Promise<void> {
  await apiRequest('/users/profile', { method: 'PATCH', body: dto });
}

export async function uploadAvatarApi(file: { uri: string; name?: string; type?: string }) {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append('file', blob, file.name || 'avatar.jpg');
  } else {
    form.append('file', {
      uri: file.uri,
      name: file.name || file.uri.split('/').pop() || 'avatar.jpg',
      type: file.type || 'image/jpeg',
    } as any);
  }
  const data = await apiRequest<{ avatarUrl: string }>('/users/avatar', {
    method: 'POST',
    body: form,
    timeoutMs: 60000,
  });
  return data.avatarUrl;
}

export async function uploadCoverApi(file: { uri: string; name?: string; type?: string }) {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append('file', blob, file.name || 'cover.jpg');
  } else {
    form.append('file', {
      uri: file.uri,
      name: file.name || file.uri.split('/').pop() || 'cover.jpg',
      type: file.type || 'image/jpeg',
    } as any);
  }
  const data = await apiRequest<{ coverUrl: string }>('/users/cover', {
    method: 'POST',
    body: form,
    timeoutMs: 60000,
  });
  return data.coverUrl;
}

export async function updatePrivacyApi(isPrivate: boolean) {
  return apiRequest('/users/settings/privacy', { method: 'PATCH', body: { isPrivate } });
}

export async function updateAccountApi(dto: { username?: string; email?: string }) {
  return apiRequest<{ success: boolean; username: string; email: string }>('/users/settings/account', {
    method: 'PATCH',
    body: dto,
  });
}

export async function changePasswordApi(currentPassword: string, newPassword: string) {
  return apiRequest('/users/settings/password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}

export async function togglePremiumApi() {
  return apiRequest<{ success: boolean; isVerified: boolean; message: string }>(
    '/users/settings/premium',
    { method: 'POST' },
  );
}

export async function fetchFollowersPage(username: string, cursor?: string, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const data = await apiRequest(`/users/${encodeURIComponent(stripAt(username))}/followers?${params}`);
  return mapPage(data, mapApiUserToMobile);
}

export async function fetchFollowingPage(username: string, cursor?: string, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const data = await apiRequest(`/users/${encodeURIComponent(stripAt(username))}/following?${params}`);
  return mapPage(data, mapApiUserToMobile);
}

// ---------------------------------------------------------------------------
// Explore, search, hashtags
// ---------------------------------------------------------------------------

export async function fetchTrendingApi(limit = 10): Promise<TrendingItem[]> {
  const data = await apiRequest<any[]>(`/explore/trending?limit=${limit}`);
  return (Array.isArray(data) ? data : []).map(mapApiTrendingToMobile);
}

export async function searchApi(
  query: string,
  type: 'all' | 'users' | 'posts' | 'tags' = 'all',
  limit = 30,
): Promise<{ users: User[]; posts: Post[]; hashtags: TrendingItem[] }> {
  const params = new URLSearchParams({ q: query, type, limit: String(limit) });
  const data = await apiRequest(`/explore/search?${params}`);
  return {
    users: (data?.users || []).map(mapApiUserToMobile),
    posts: (data?.posts || []).map(mapApiPostToMobile),
    hashtags: (data?.hashtags || []).map(mapApiTrendingToMobile),
  };
}

export async function fetchHashtagPostsPage(tag: string, cursor?: string, limit = 20): Promise<Page<Post>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const data = await apiRequest(`/explore/hashtag/${encodeURIComponent(stripAt(tag))}?${params}`);
  return mapPage(data, mapApiPostToMobile);
}

export async function fetchWhoToFollow(limit = 10): Promise<User[]> {
  const data = await apiRequest<any[]>(`/explore/who-to-follow?limit=${limit}`);
  return (Array.isArray(data) ? data : []).map(mapApiUserToMobile);
}

// ---------------------------------------------------------------------------
// Communities
// ---------------------------------------------------------------------------

export async function fetchCommunitiesApi(params?: {
  category?: string;
  search?: string;
  joined?: boolean;
  cursor?: string;
  limit?: number;
}): Promise<Page<CommunityItem>> {
  const qs = new URLSearchParams();
  if (params?.category && params.category !== 'All') qs.set('category', params.category);
  if (params?.search) qs.set('search', params.search);
  if (params?.joined) qs.set('joined', 'true');
  if (params?.cursor) qs.set('cursor', params.cursor);
  qs.set('limit', String(params?.limit ?? 50));

  const data = await apiRequest(`/explore/communities?${qs}`);
  if (Array.isArray(data)) {
    return { items: data.map(mapApiCommunityToMobile), nextCursor: null, hasMore: false };
  }
  return mapPage(data, mapApiCommunityToMobile);
}

export async function fetchCommunityApi(idOrSlug: string): Promise<CommunityItem> {
  const data = await apiRequest(`/explore/communities/${encodeURIComponent(idOrSlug)}`);
  return mapApiCommunityToMobile(data);
}

export async function fetchCommunityPostsPage(
  idOrSlug: string,
  cursor?: string,
  limit = 20,
): Promise<Page<Post>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const data = await apiRequest(`/explore/communities/${encodeURIComponent(idOrSlug)}/posts?${params}`);
  return mapPage(data, mapApiPostToMobile);
}

export async function toggleJoinCommunityApi(idOrSlug: string) {
  return apiRequest<{ isJoined: boolean; memberCount?: number }>(
    `/explore/communities/${encodeURIComponent(idOrSlug)}/join`,
    { method: 'POST' },
  );
}

export async function createCommunityApi(dto: {
  name: string;
  description?: string;
  category?: string;
  avatarUrl?: string;
  coverUrl?: string;
  isPrivate?: boolean;
}): Promise<CommunityItem> {
  const data = await apiRequest('/explore/communities', { method: 'POST', body: dto });
  return mapApiCommunityToMobile(data);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function fetchNotificationsPage(cursor?: string, limit = 40): Promise<Page<NotificationItem>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const data = await apiRequest(`/notifications?${params}`);
  return mapPage(data, mapApiNotificationToMobile);
}

export async function fetchUnreadCountsApi(): Promise<{ notifications: number; messages: number }> {
  const [n, m] = await Promise.all([
    apiRequest<{ count: number }>('/notifications/unread-count').catch(() => ({ count: 0 })),
    apiRequest<{ count: number }>('/messages/unread-count').catch(() => ({ count: 0 })),
  ]);
  return { notifications: n?.count ?? 0, messages: m?.count ?? 0 };
}

export async function markAllNotificationsReadApi() {
  return apiRequest('/notifications/mark-all-read', { method: 'PATCH' });
}

export async function markNotificationReadApi(id: string) {
  return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function fetchNotificationPreferencesApi() {
  return apiRequest<any>('/notifications/preferences');
}

export async function updateNotificationPreferencesApi(body: Record<string, any>) {
  return apiRequest('/notifications/preferences', { method: 'PATCH', body });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function fetchConversationsApi(): Promise<ConversationItem[]> {
  const data = await apiRequest<any[]>('/messages/conversations');
  return (Array.isArray(data) ? data : []).map(mapApiConversationToMobile);
}

export async function startConversationApi(username: string) {
  return apiRequest<{ conversationId: string }>('/messages/conversations', {
    method: 'POST',
    body: { username: stripAt(username) },
  });
}

export async function createGroupConversationApi(title: string, usernames: string[]) {
  return apiRequest<{ conversationId: string; title: string }>('/messages/groups', {
    method: 'POST',
    body: { title, usernames: usernames.map(stripAt) },
  });
}

export async function fetchMessagesPage(
  conversationId: string,
  cursor?: string,
  limit = 50,
): Promise<Page<MessageItem>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const data = await apiRequest(`/messages/conversations/${conversationId}?${params}`);
  return mapPage(data, mapApiMessageToMobile);
}

export async function sendMessageApi(conversationId: string, content: string, mediaUrl?: string) {
  const data = await apiRequest(`/messages/conversations/${conversationId}`, {
    method: 'POST',
    body: { content, mediaUrl },
  });
  return mapApiMessageToMobile(data);
}

export async function markConversationReadApi(conversationId: string) {
  return apiRequest(`/messages/conversations/${conversationId}/read`, { method: 'PATCH' });
}

export async function fetchUnreadMessagesCountApi() {
  return apiRequest<{ count: number }>('/messages/unread-count');
}

// ---------------------------------------------------------------------------
// Moderation / reports
// ---------------------------------------------------------------------------

export async function reportPostApi(dto: {
  category: string;
  reason: string;
  postId?: string;
  targetUserId?: string;
}) {
  return apiRequest('/moderation/reports', { method: 'POST', body: dto });
}

export async function reportUserApi(dto: {
  category: string;
  reason: string;
  targetUserId: string;
  postId?: string;
}) {
  return apiRequest('/moderation/reports', { method: 'POST', body: dto });
}
