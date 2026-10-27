'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Link as LinkIcon,
  CheckCircle,
  Lock,
  Mail,
  MoreHorizontal,
  Loader2,
  Edit3,
  Camera,
  X,
  Trash2,
  Globe,
  AlertCircle,
  Heart,
  MessageCircle,
  Bookmark,
} from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '../../../components/layout/MainLayout';
import { PostCard } from '../../../components/feed/PostCard';
import { apiRequest } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';
import { UserProfileDetails, PostItem, PaginatedResponse } from '@varta/shared';

function UserProfileContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const username = params.username as string;
  const { user: currentUser } = useAuthStore();

  const profileTabs = ['posts', 'replies', 'media', 'likes', 'bookmarks'];

  const urlTab = searchParams.get('tab')?.toLowerCase();
  const initialTab = urlTab && profileTabs.includes(urlTab) ? urlTab : 'posts';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    if (urlTab && profileTabs.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const newUrl = tab === 'posts' ? `/${username}` : `/${username}?tab=${tab}`;
    router.replace(newUrl, { scroll: false });
  };
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editWebsite, setEditWebsite] = useState('');

  // Avatar and Cover Photo state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [showAvatarUrlInput, setShowAvatarUrlInput] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [showCoverUrlInput, setShowCoverUrlInput] = useState(false);
  const [isRemovingCover, setIsRemovingCover] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Profile
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery<UserProfileDetails>({
    queryKey: ['profile', username],
    queryFn: () => apiRequest(`/users/${username}`),
  });

  // 2. Fetch User Timeline Posts
  const {
    data: timelineData,
    isLoading: isTimelineLoading,
    refetch: refetchTimeline,
  } = useQuery<PaginatedResponse<PostItem> & { isPrivate?: boolean }>({
    queryKey: ['user-posts', username, activeTab],
    queryFn: () =>
      apiRequest(`/feed/user/${username}?tab=${activeTab}&limit=30`),
    enabled:
      !!profile &&
      (!profile.isPrivate ||
        profile.isFollowing ||
        currentUser?.username === username),
  });

  // Follow/Unfollow Mutation
  const followMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/social/follow/${username}`, {
        method: profile?.isFollowing ? 'DELETE' : 'POST',
      }),
    onSuccess: () => {
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  // Block Mutation
  const blockMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/social/block/${username}`, {
        method: profile?.isBlocked ? 'DELETE' : 'POST',
      }),
    onSuccess: () => {
      refetchProfile();
    },
  });

  const handleEditOpen = () => {
    if (!profile) return;
    setEditDisplayName(profile.displayName || '');
    setEditBio(profile.bio || '');
    setEditLocation(profile.location || '');
    setEditWebsite(profile.website || '');
    setAvatarFile(null);
    setAvatarPreview(profile.avatarUrl || null);
    setAvatarUrlInput(profile.avatarUrl || '');
    setShowAvatarUrlInput(false);
    setIsRemovingAvatar(false);
    setCoverFile(null);
    setCoverPreview(profile.coverUrl || null);
    setCoverUrlInput(profile.coverUrl || '');
    setShowCoverUrlInput(false);
    setIsRemovingCover(false);
    setSaveError(null);
    setIsEditModalOpen(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSaveError('Avatar image must be smaller than 5MB');
        return;
      }
      setAvatarFile(file);
      setIsRemovingAvatar(false);
      setAvatarPreview(URL.createObjectURL(file));
      setSaveError(null);
    }
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSaveError('Cover image must be smaller than 5MB');
        return;
      }
      setCoverFile(file);
      setIsRemovingCover(false);
      setCoverPreview(URL.createObjectURL(file));
      setSaveError(null);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarUrlInput('');
    setIsRemovingAvatar(true);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setCoverUrlInput('');
    setIsRemovingCover(true);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      let finalAvatarUrl: string | null | undefined = undefined;
      let finalCoverUrl: string | null | undefined = undefined;

      // 1. Upload avatar file if selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        const res = await apiRequest<{ avatarUrl: string }>('/users/avatar', {
          method: 'POST',
          body: formData,
        });
        finalAvatarUrl = res.avatarUrl;
      } else if (isRemovingAvatar) {
        finalAvatarUrl = null;
      } else if (showAvatarUrlInput && avatarUrlInput !== profile?.avatarUrl) {
        finalAvatarUrl = avatarUrlInput.trim() || null;
      }

      // 2. Upload cover file if selected
      if (coverFile) {
        const formData = new FormData();
        formData.append('file', coverFile);
        const res = await apiRequest<{ coverUrl: string }>('/users/cover', {
          method: 'POST',
          body: formData,
        });
        finalCoverUrl = res.coverUrl;
      } else if (isRemovingCover) {
        finalCoverUrl = null;
      } else if (showCoverUrlInput && coverUrlInput !== profile?.coverUrl) {
        finalCoverUrl = coverUrlInput.trim() || null;
      }

      // 3. Update profile information
      await apiRequest('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: editDisplayName.trim() || profile?.username,
          bio: editBio.trim() || null,
          location: editLocation.trim() || null,
          website: editWebsite.trim() || null,
          ...(finalAvatarUrl !== undefined && { avatarUrl: finalAvatarUrl }),
          ...(finalCoverUrl !== undefined && { coverUrl: finalCoverUrl }),
        }),
      });

      // 4. Update auth state globally so left nav / mobile nav / composer update
      await useAuthStore.getState().initAuth();

      // 5. Invalidate & refetch profile & feed
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', username] }),
        queryClient.invalidateQueries({ queryKey: ['user-posts', username] }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        refetchProfile(),
      ]);

      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setSaveError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartDM = async () => {
    if (!currentUser) {
      router.push(`/login?returnUrl=/${username}`);
      return;
    }
    try {
      const res = await apiRequest<{ conversationId: string }>('/messages/conversations', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      if (res?.conversationId) {
        router.push(`/messages?id=${res.conversationId}`);
      }
    } catch (err: any) {
      console.error('Failed to start DM conversation:', err);
      if (err?.status === 401) {
        router.push(`/login?returnUrl=/${username}`);
      }
    }
  };

  const isOwnProfile =
    currentUser?.username?.toLowerCase() === username.toLowerCase();

  return (
    <MainLayout>
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-[#050B14]/90 backdrop-blur-md border-b border-[#1E293B] px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-[#101D2D] text-slate-300 hover:text-white transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col">
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            {profile?.displayName || username}
            {profile?.isVerified && (
              <CheckCircle
                size={14}
                className="text-[#FF9933] fill-[#FF9933]/20"
              />
            )}
          </h2>
          <span className="text-xs text-slate-400">
            {profile?.postCount || 0} posts
          </span>
        </div>
      </div>

      {isProfileLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 size={32} className="animate-spin text-[#FF9933]" />
          <span className="text-sm">Loading profile...</span>
        </div>
      ) : profileError || !profile ? (
        <div className="p-12 text-center text-red-400 text-sm">
          User @{username} does not exist or has deactivated their account.
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Cover Photo */}
          <div className="h-44 sm:h-60 w-full bg-[#101D2D] relative overflow-hidden group">
            <img
              src={profile.coverUrl || '/assets/post-mountains.jpg'}
              alt="Profile cover"
              className="w-full h-full object-cover"
            />
            {isOwnProfile && (
              <button
                onClick={handleEditOpen}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold backdrop-blur-[2px] cursor-pointer"
                title="Change cover photo"
              >
                <div className="px-4 py-2 rounded-full bg-black/70 border border-white/20 flex items-center gap-2 hover:bg-black/90 transition shadow-lg">
                  <Camera size={16} />
                  <span>Update Cover Photo</span>
                </div>
              </button>
            )}
          </div>

          {/* Profile Meta & Actions Bar */}
          <div className="relative z-10 px-4 pb-4 border-b border-[#1E293B] flex flex-col gap-3">
            <div className="flex items-end justify-between -mt-16 sm:-mt-20">
              {/* Avatar */}
              <div className="relative z-20 h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-[#0B1422] border-4 border-[#050B14] flex items-center justify-center text-[#FF9933] font-bold text-3xl overflow-hidden ring-2 ring-[#1E293B] shadow-2xl shrink-0 group">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.username}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  profile.username.charAt(0).toUpperCase()
                )}

                {isOwnProfile && (
                  <button
                    onClick={handleEditOpen}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold backdrop-blur-[2px] cursor-pointer"
                    title="Change profile photo"
                  >
                    <Camera size={22} />
                    <span className="text-[11px] mt-0.5">Edit</span>
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mb-1">
                {isOwnProfile ? (
                  <button
                    onClick={handleEditOpen}
                    className="px-5 py-2 rounded-full border border-[#1E293B] hover:bg-[#101D2D] text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Edit3 size={14} />
                    Edit profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleStartDM}
                      className="p-2 rounded-full border border-[#1E293B] hover:bg-[#101D2D] text-slate-200 transition"
                      title="Direct Message"
                    >
                      <Mail size={16} />
                    </button>

                    <button
                      onClick={() => blockMutation.mutate()}
                      className={`px-3 py-1.5 rounded-full border text-xs font-bold transition ${
                        profile.isBlocked
                          ? 'border-red-500/50 bg-red-500/10 text-red-400'
                          : 'border-[#1E293B] hover:border-red-500/40 text-slate-400 hover:text-red-400'
                      }`}
                    >
                      {profile.isBlocked ? 'Blocked' : 'Block'}
                    </button>

                    <button
                      onClick={() => followMutation.mutate()}
                      disabled={followMutation.isPending}
                      className={`px-5 py-2 rounded-full text-xs font-bold transition active:scale-95 shadow-md cursor-pointer ${
                        profile.isFollowing
                          ? 'border border-slate-300 dark:border-[#1E293B] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 text-slate-700 dark:text-slate-200'
                          : profile.isPendingFollow
                          ? 'bg-slate-200 dark:bg-[#101D2D] text-slate-700 dark:text-slate-300'
                          : 'bg-[#0F172A] hover:bg-[#1E293B] text-white text-force-white dark:bg-white dark:hover:bg-slate-200 dark:text-black'
                      }`}
                    >
                      {profile.isFollowing
                        ? 'Following'
                        : profile.isPendingFollow
                        ? 'Requested'
                        : 'Follow'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Names & Handle */}
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-white flex items-center gap-1.5">
                {profile.displayName || profile.username}
                {profile.isVerified && (
                  <CheckCircle
                    size={17}
                    className="text-[#FF9933] fill-[#FF9933]/20"
                  />
                )}
                {profile.isPrivate && (
                  <span title="Private Account">
                    <Lock size={14} className="text-slate-400" />
                  </span>
                )}
              </h1>
              <span className="text-xs text-slate-400">@{profile.username}</span>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Details: Location, Website, Joined Date */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin size={14} className="text-[#FF9933]" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon size={14} className="text-[#38BDF8]" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#38BDF8] hover:underline"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>
                  Joined{' '}
                  {new Date(profile.createdAt).toLocaleDateString('en-IN', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Followers & Following Counts */}
            <div className="flex items-center gap-5 text-xs text-slate-400 mt-1">
              <Link
                href={`/${profile.username}/following`}
                className="hover:underline flex items-center gap-1"
              >
                <strong className="text-white font-bold">
                  {profile.followingCount}
                </strong>{' '}
                Following
              </Link>
              <Link
                href={`/${profile.username}/followers`}
                className="hover:underline flex items-center gap-1"
              >
                <strong className="text-white font-bold">
                  {profile.followersCount}
                </strong>{' '}
                Followers
              </Link>
            </div>
          </div>

          {/* Profile Tabs */}
          <div className="flex border-b border-[#1E293B] overflow-x-auto scrollbar-none">
            {profileTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex-1 py-3 px-3 text-xs sm:text-sm font-semibold capitalize transition relative whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 inset-x-4 h-0.5 bg-[#FF9933] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex flex-col">
            {isTimelineLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-2.5 text-slate-400">
                <Loader2 size={24} className="animate-spin text-[#FF9933]" />
                <span className="text-xs">Loading {activeTab}...</span>
              </div>
            ) : timelineData?.isPrivate && !isOwnProfile ? (
              <div className="p-16 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-full bg-[#101D2D] border border-[#1E293B] flex items-center justify-center mb-4 text-[#FF9933] shadow-inner">
                  <Lock size={24} />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">
                  Bookmarks are private
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Only @{profile.username} can see their saved bookmarks.
                </p>
              </div>
            ) : timelineData?.items && timelineData.items.length > 0 ? (
              timelineData.items.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPostDeleted={() => refetchTimeline()}
                />
              ))
            ) : (
              // Empty States per Tab
              activeTab === 'bookmarks' ? (
                !isOwnProfile ? (
                  <div className="p-16 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                    <div className="w-14 h-14 rounded-full bg-[#101D2D] border border-[#1E293B] flex items-center justify-center mb-4 text-[#FF9933] shadow-inner">
                      <Lock size={24} />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1.5">
                      Bookmarks are private
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Only @{profile.username} can see their saved bookmarks.
                    </p>
                  </div>
                ) : (
                  <div className="p-16 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                    <div className="w-14 h-14 rounded-full bg-[#101D2D] border border-[#1E293B] flex items-center justify-center mb-4 text-[#FF9933] shadow-inner">
                      <Bookmark size={24} />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1.5">
                      Save posts for later
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Don&apos;t let the good ones fly away! Bookmark posts to easily find them again in the future.
                    </p>
                  </div>
                )
              ) : activeTab === 'media' ? (
                <div className="p-16 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-full bg-[#101D2D] border border-[#1E293B] flex items-center justify-center mb-4 text-[#FF9933] shadow-inner">
                    <Camera size={24} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">
                    {isOwnProfile
                      ? "You haven't posted any media yet"
                      : `@${profile.username} hasn't posted any media`}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Photos and videos posted by{' '}
                    {isOwnProfile ? 'you' : `@${profile.username}`} will appear here.
                  </p>
                </div>
              ) : activeTab === 'likes' ? (
                <div className="p-16 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-500 shadow-inner">
                    <Heart size={24} className="fill-red-500/20" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">
                    {isOwnProfile
                      ? "You haven't liked any posts yet"
                      : `@${profile.username} hasn't liked any posts`}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tap the heart on any post to show it some love. When you do, it will show up here.
                  </p>
                </div>
              ) : activeTab === 'replies' ? (
                <div className="p-16 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-full bg-[#101D2D] border border-[#1E293B] flex items-center justify-center mb-4 text-[#FF9933] shadow-inner">
                    <MessageCircle size={24} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">
                    {isOwnProfile
                      ? "You haven't replied to any posts yet"
                      : `@${profile.username} hasn't replied to any posts`}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    When {isOwnProfile ? 'you reply' : `@${profile.username} replies`} to posts, they will show up here.
                  </p>
                </div>
              ) : (
                <div className="p-16 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-white mb-1.5">
                    {isOwnProfile
                      ? "You haven't posted any Baatein yet"
                      : `@${profile.username} hasn't posted any Baatein yet`}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    When {isOwnProfile ? 'you share a post' : `@${profile.username} shares a post`}, it will show up here.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0B1422] border border-[#1E293B] rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E293B] bg-[#0B1422]/90 backdrop-blur-md sticky top-0 z-30">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[#101D2D] text-slate-400 hover:text-white transition"
                >
                  <X size={18} />
                </button>
                <h3 className="text-base font-bold text-white">Edit Profile</h3>
              </div>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={isSaving}
                className="px-5 py-1.5 bg-[#FF9933] hover:bg-[#E68525] disabled:opacity-50 text-white rounded-full text-xs font-bold shadow-md shadow-[#FF9933]/20 transition flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleEditSave} className="flex-1 overflow-y-auto">
              {/* Cover Photo Editor */}
              <div className="h-36 sm:h-44 w-full bg-[#101D2D] relative overflow-hidden group">
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center text-slate-500 text-xs">
                    No cover photo set
                  </div>
                )}
                {/* Overlay with Cover Actions */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleCoverFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition shadow-lg hover:scale-105 active:scale-95"
                    title="Upload cover photo"
                  >
                    <Camera size={18} />
                  </button>
                  {coverPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="p-3 rounded-full bg-black/60 hover:bg-red-600/80 text-white backdrop-blur-md transition shadow-lg hover:scale-105 active:scale-95"
                      title="Remove cover photo"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCoverUrlInput(!showCoverUrlInput)}
                    className={`p-3 rounded-full backdrop-blur-md transition shadow-lg hover:scale-105 active:scale-95 ${
                      showCoverUrlInput
                        ? 'bg-[#FF9933] text-white'
                        : 'bg-black/60 hover:bg-black/80 text-white'
                    }`}
                    title="Enter cover image URL"
                  >
                    <Globe size={18} />
                  </button>
                </div>
              </div>

              {/* Cover URL Input (Collapsible) */}
              {showCoverUrlInput && (
                <div className="px-5 pt-3 pb-1 bg-[#0E1726] border-b border-[#1E293B] flex items-center gap-2">
                  <Globe size={15} className="text-[#38BDF8] shrink-0" />
                  <input
                    type="url"
                    value={coverUrlInput}
                    onChange={(e) => {
                      setCoverUrlInput(e.target.value);
                      setCoverPreview(e.target.value || null);
                      setCoverFile(null);
                      setIsRemovingCover(false);
                    }}
                    placeholder="Paste cover photo URL (https://...)"
                    className="w-full bg-transparent text-xs text-white placeholder-slate-400 outline-none"
                  />
                </div>
              )}

              {/* Avatar Photo Editor */}
              <div className="px-5 relative">
                <div className="relative -mt-14 sm:-mt-16 h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-[#0B1422] border-4 border-[#0B1422] ring-2 ring-[#1E293B] flex items-center justify-center text-[#FF9933] font-bold text-2xl overflow-hidden shadow-2xl shrink-0 group">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    profile?.username ? profile.username.charAt(0).toUpperCase() : 'U'
                  )}

                  {/* Overlay with Avatar Actions */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition shadow-lg hover:scale-105 active:scale-95"
                      title="Upload profile photo"
                    >
                      <Camera size={16} />
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="p-2 rounded-full bg-black/60 hover:bg-red-600/80 text-white backdrop-blur-md transition shadow-lg hover:scale-105 active:scale-95"
                        title="Remove profile photo"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Avatar URL Toggle Button */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAvatarUrlInput(!showAvatarUrlInput)}
                    className="text-[11px] text-[#38BDF8] hover:underline flex items-center gap-1 font-medium"
                  >
                    <Globe size={12} />
                    {showAvatarUrlInput ? 'Hide image URL input' : 'Use avatar photo URL instead'}
                  </button>
                </div>

                {/* Avatar URL Input (Collapsible) */}
                {showAvatarUrlInput && (
                  <div className="mt-2 p-2.5 bg-[#101D2D] rounded-2xl border border-[#1E293B] flex items-center gap-2">
                    <Globe size={14} className="text-[#38BDF8] shrink-0" />
                    <input
                      type="url"
                      value={avatarUrlInput}
                      onChange={(e) => {
                        setAvatarUrlInput(e.target.value);
                        setAvatarPreview(e.target.value || null);
                        setAvatarFile(null);
                        setIsRemovingAvatar(false);
                      }}
                      placeholder="Paste avatar image URL (https://...)"
                      className="w-full bg-transparent text-xs text-white placeholder-slate-400 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="p-5 flex flex-col gap-4">
                {saveError && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Display Name
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="bg-[#101D2D] border border-[#1E293B] focus:border-[#FF9933] rounded-2xl px-3.5 py-2.5 text-sm text-white outline-none transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300">Bio</label>
                    <span className="text-[11px] text-slate-400">
                      {editBio.length} / 300
                    </span>
                  </div>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Tell the world about yourself..."
                    className="bg-[#101D2D] border border-[#1E293B] focus:border-[#FF9933] rounded-2xl px-3.5 py-2.5 text-sm text-white outline-none resize-none transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Location
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Vadodara, India"
                    className="bg-[#101D2D] border border-[#1E293B] focus:border-[#FF9933] rounded-2xl px-3.5 py-2.5 text-sm text-white outline-none transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Website
                  </label>
                  <input
                    type="url"
                    maxLength={200}
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    placeholder="https://varta.social"
                    className="bg-[#101D2D] border border-[#1E293B] focus:border-[#FF9933] rounded-2xl px-3.5 py-2.5 text-sm text-white outline-none transition"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-5 border-t border-[#1E293B] bg-[#0B1422]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#FF9933] hover:bg-[#E68525] disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-md shadow-[#FF9933]/20 transition flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="p-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 size={32} className="animate-spin text-[#FF9933]" />
            <span className="text-sm">Loading profile...</span>
          </div>
        </MainLayout>
      }
    >
      <UserProfileContent />
    </Suspense>
  );
}
