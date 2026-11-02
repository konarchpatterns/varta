import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '../components/common/Avatar';
import {
  BackIcon,
  DotsIcon,
  LocationIcon,
  CloseIcon,
  BookmarkIcon,
  HeartIcon,
  VerifiedBadge,
  MessagesIcon,
  SettingsIcon,
  CameraIcon,
  TrashIcon,
  LinkIcon,
  PhotoIcon,
} from '../components/common/Icons';
import { PostCard } from '../components/feed/PostCard';
import { BottomNav } from '../components/common/BottomNav';
import {
  fetchProfileApi,
  followUserApi,
  unfollowUserApi,
  updateProfileApi,
  uploadAvatarApi,
  uploadCoverApi,
} from '../api/client';
import { colors } from '../theme/colors';
import { ScreenName, Post, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePosts } from '../context/PostsContext';

export const PRESET_BANNERS = [
  { id: 'b1', name: 'Varanasi', url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1000' },
  { id: 'b2', name: 'Bengaluru Tech', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000' },
  { id: 'b3', name: 'Marine Drive', url: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1000' },
  { id: 'b4', name: 'Himalayas', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000' },
  { id: 'b5', name: 'Tricolor Bharat', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000' },
];

export const PRESET_AVATARS = [
  { id: 'a1', name: 'Aarav (Dev)', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' },
  { id: 'a2', name: 'Priya (Design)', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' },
  { id: 'a3', name: 'Creator', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
  { id: 'a4', name: 'Leader', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200' },
  { id: 'a5', name: 'Folk Artist', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
  { id: 'a6', name: 'VARTA Official', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200' },
];

interface ProfileScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onBack: () => void;
  onSelectPost: (post: Post) => void;
  profileUser?: User | null;
  onSearchHashtag?: (hashtag: string) => void;
}

const PROFILE_TABS = ['Posts', 'Replies', 'Media', 'Likes', 'Bookmarks'];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onNavigate,
  onBack,
  onSelectPost,
  profileUser,
  onSearchHashtag,
}) => {
  const { user, logout, updateUser, refreshUser, activeDomain, isAuthenticated } = useAuth();
  const { posts, likePost, repostPost, bookmarkPost, loadUserPosts } = usePosts();
  const [activeTab, setActiveTab] = useState('Posts');

  const isOtherUser = !!profileUser && !!user && profileUser.id !== user.id && profileUser.handle !== user.handle;
  const fallbackUser: User = user || {
    id: 'guest',
    name: 'Guest',
    handle: '@guest',
    avatar: '',
  };
  const [fetchedProfile, setFetchedProfile] = useState<User | null>(null);
  const targetUser: User = isOtherUser ? fetchedProfile || profileUser! : fallbackUser;
  const [isFollowing, setIsFollowing] = useState<boolean>(Boolean(profileUser?.isFollowing));

  // Timeline for this profile (real API: posts / replies / media / likes / bookmarks)
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  const tabParamMap: Record<string, string> = {
    Posts: 'posts',
    Replies: 'replies',
    Media: 'media',
    Likes: 'likes',
    Bookmarks: 'bookmarks',
  };

  useEffect(() => {
    const username = (isOtherUser ? profileUser?.username || profileUser?.handle : user?.username || user?.handle) || '';
    if (!username) return;
    let cancelled = false;
    setIsLoadingPosts(true);
    setPostsError(null);
    loadUserPosts(username.replace(/^@/, ''), tabParamMap[activeTab] || 'posts')
      .then((items) => {
        if (!cancelled) setProfilePosts(items);
      })
      .catch((err: any) => {
        if (!cancelled) setPostsError(err?.message || 'Could not load posts');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPosts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, isOtherUser, profileUser?.handle, profileUser?.username, user?.handle, user?.username, loadUserPosts]);

  // Load the authoritative profile (counts, bio, follow state)
  useEffect(() => {
    const username = (isOtherUser ? profileUser?.username || profileUser?.handle : user?.username || user?.handle) || '';
    if (!username) return;
    let cancelled = false;
    fetchProfileApi(username.replace(/^@/, ''))
      .then((fresh) => {
        if (cancelled) return;
        setFetchedProfile(fresh);
        setIsFollowing(Boolean(fresh.isFollowing));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOtherUser, profileUser?.handle, profileUser?.username, user?.handle, user?.username]);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editLocation, setEditLocation] = useState(user?.location || '');
  const [editWebsite, setEditWebsite] = useState(user?.website || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '');
  const [editBanner, setEditBanner] = useState(user?.bannerImage || '');
  const [showAvatarUrlInput, setShowAvatarUrlInput] = useState(false);
  const [showBannerUrlInput, setShowBannerUrlInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);
  // urls already uploaded to the server for this edit session
  const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null);
  const [uploadedCover, setUploadedCover] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<'avatar' | 'banner' | null>(null);

  const notify = (msg: string) => {
    setSaveSuccessToast(msg);
    setTimeout(() => setSaveSuccessToast(null), 3500);
  };

  /** Upload a picked/captured image and remember the hosted URL. */
  const uploadImage = async (target: 'avatar' | 'banner', asset: { uri: string; type?: string }) => {
    setIsUploadingImage(target);
    try {
      const url =
        target === 'avatar'
          ? await uploadAvatarApi({ uri: asset.uri, type: asset.type })
          : await uploadCoverApi({ uri: asset.uri, type: asset.type });

      if (target === 'avatar') {
        setUploadedAvatar(url);
        setEditAvatar(url);
      } else {
        setUploadedCover(url);
        setEditBanner(url);
      }
      // reflect it immediately in the app (header avatar, banner)
      updateUser(target === 'avatar' ? { avatar: url } : { bannerImage: url });
      notify(`${target === 'avatar' ? 'Avatar' : 'Cover'} updated ✅`);
      return url;
    } catch (err: any) {
      notify(err?.message || `${target === 'avatar' ? 'Avatar' : 'Cover'} upload failed`);
      return null;
    } finally {
      setIsUploadingImage(null);
    }
  };

  // Info / Domain Modal State
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    onNavigate('signin');
  };

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      onNavigate('signin');
      return;
    }
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      if (next) await followUserApi(targetUser.handle);
      else await unfollowUserApi(targetUser.handle);
    } catch {
      setIsFollowing(!next); // rollback
    }
  };

  const handlePickLocalImage = async (target: 'avatar' | 'banner') => {
    try {
      // 1. Try Expo ImagePicker (iOS, Android, and Web)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: target === 'avatar' ? [1, 1] : [16, 9],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const previewUri = asset.base64
          ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
          : asset.uri;

        // instant preview while the upload runs
        if (target === 'avatar') setEditAvatar(previewUri);
        else setEditBanner(previewUri);

        // upload immediately so the change survives closing the modal
        await uploadImage(target, { uri: asset.uri, type: asset.mimeType || 'image/jpeg' });
        return;
      }
    } catch (err) {
      console.warn('ImagePicker launch error, falling back to file input:', err);
    }

    // 2. Web / Fallback file input
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const resultUrl = event.target?.result as string;
            if (target === 'avatar') setEditAvatar(resultUrl);
            else setEditBanner(resultUrl);
            await uploadImage(target, { uri: resultUrl, type: file.type });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      if (target === 'avatar') setShowAvatarUrlInput(true);
      else setShowBannerUrlInput(true);
    }
  };

  const handleCaptureCamera = async (target: 'avatar' | 'banner') => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setSaveSuccessToast('Camera permission required to take photo');
        setTimeout(() => setSaveSuccessToast(null), 3000);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: target === 'avatar' ? [1, 1] : [16, 9],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const previewUri = asset.base64
          ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
          : asset.uri;

        if (target === 'avatar') setEditAvatar(previewUri);
        else setEditBanner(previewUri);

        await uploadImage(target, { uri: asset.uri, type: asset.mimeType || 'image/jpeg' });
      }
    } catch (err) {
      console.warn('Camera error:', err);
    }
  };

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditBio(user?.bio || '');
    setEditLocation(user?.location || '');
    setEditWebsite(user?.website || '');
    setEditAvatar(user?.avatar || '');
    setEditBanner(user?.bannerImage || '');
    setShowAvatarUrlInput(false);
    setShowBannerUrlInput(false);
    setUploadedAvatar(null);
    setUploadedCover(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateProfileApi({
        displayName: editName.trim() || user?.name || '',
        bio: editBio.trim(),
        location: editLocation.trim(),
        website: editWebsite.trim(),
      });

      // Avatar / cover: prefer the uploaded URL, otherwise a manually typed http(s) URL
      const avatarUrl =
        uploadedAvatar ||
        (editAvatar && /^https?:\/\//.test(editAvatar) ? editAvatar : null);
      const coverUrl =
        uploadedCover ||
        (editBanner && /^https?:\/\//.test(editBanner) ? editBanner : null);

      if (avatarUrl) updateUser({ avatar: avatarUrl });
      if (coverUrl) updateUser({ bannerImage: coverUrl });

      updateUser({
        name: editName.trim() || user?.name || '',
        bio: editBio.trim(),
        location: editLocation.trim(),
        website: editWebsite.trim(),
      });
      await refreshUser();
      setIsEditModalOpen(false);
      setSaveSuccessToast('Profile updated successfully! ✨');
      setTimeout(() => setSaveSuccessToast(null), 3500);
    } catch (err: any) {
      setSaveSuccessToast(err?.message || 'Could not save your profile');
      setTimeout(() => setSaveSuccessToast(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  // Live like/bookmark state from the feed is merged over the profile timeline
  const displayPosts: Post[] = profilePosts.map((p) => {
    const live = posts.find((fp) => fp.id === p.id);
    return live ? { ...p, ...live, author: p.author } : p;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Top Banner & Header Controls */}
          <View style={styles.bannerContainer}>
            <Image
              source={{
                uri:
                  targetUser.bannerImage ||
                  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000',
              }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            {/* Top Bar on Banner */}
            <View style={styles.bannerTopBar}>
              <TouchableOpacity
                onPress={onBack}
                style={styles.bannerCircleBtn}
                activeOpacity={0.8}
              >
                <BackIcon size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.bannerRightActions}>
                {!isOtherUser && (
                  <TouchableOpacity
                    style={styles.bannerCircleBtn}
                    activeOpacity={0.8}
                    onPress={() => onNavigate('settings')}
                  >
                    <SettingsIcon size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.bannerCircleBtn}
                  activeOpacity={0.8}
                  onPress={() => setIsInfoModalOpen(true)}
                >
                  <DotsIcon size={20} color="#FFFFFF" />
                </TouchableOpacity>

                {!isOtherUser && (
                  <TouchableOpacity
                    style={styles.logoutPillBtn}
                    activeOpacity={0.8}
                    onPress={handleLogout}
                  >
                    <Text style={styles.logoutPillText}>Sign Out</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Profile Header Details */}
          <View style={styles.profileBody}>
            {/* Avatar & Action Button */}
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrapper}>
                <Avatar
                  uri={targetUser.avatar}
                  name={targetUser.name}
                  size={76}
                  borderWidth={3.5}
                  borderColor="#FFFFFF"
                />
              </View>
              <View style={styles.actionButtonsCol}>
                {isOtherUser ? (
                  <View style={styles.otherUserActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.followButton,
                        isFollowing && styles.followingButton,
                      ]}
                      activeOpacity={0.85}
                      onPress={handleToggleFollow}
                    >
                      <Text
                        style={[
                          styles.followButtonText,
                          isFollowing && styles.followingButtonText,
                        ]}
                      >
                        {isFollowing ? '✓ Following' : '+ Follow'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.messageUserButton}
                      activeOpacity={0.85}
                      onPress={() => onNavigate('messages')}
                    >
                      <MessagesIcon size={18} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.editProfileButton}
                    activeOpacity={0.8}
                    onPress={openEditModal}
                  >
                    <Text style={styles.editProfileText}>Edit Profile</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Name & Handle */}
            <View style={styles.nameSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.displayName}>{targetUser.name}</Text>
                {targetUser.verified && <VerifiedBadge size={18} />}
              </View>
              <Text style={styles.handle}>{targetUser.handle}</Text>
            </View>

            {/* Bio */}
            {targetUser.bio ? <Text style={styles.bio}>{targetUser.bio}</Text> : null}

            {/* Location & Joined Date */}
            <View style={styles.metaRow}>
              {targetUser.location ? (
                <View style={styles.metaItem}>
                  <LocationIcon size={16} color="#64748B" />
                  <Text style={styles.metaText}>{targetUser.location}</Text>
                </View>
              ) : null}
              <View style={styles.metaItem}>
                <Text style={styles.metaText}>
                  📅 {targetUser.joinedDate || 'Joined October 2026'}
                </Text>
              </View>
              {targetUser.website ? (
                <View style={styles.metaItem}>
                  <LinkIcon size={14} color={colors.primary} />
                  <Text style={[styles.metaText, { color: colors.primary, fontWeight: '700' }]}>
                    {targetUser.website.replace(/^https?:\/\//, '')}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Stats: Following / Followers */}
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statItem}>
                <Text style={styles.statNumber}>{targetUser.followingCount || 380} </Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem}>
                <Text style={styles.statNumber}>{targetUser.followersCount || 1420} </Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsRowScroll}
            contentContainerStyle={styles.tabsRowContent}
          >
            {PROFILE_TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      isActive && styles.tabButtonTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                  {isActive && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Profile Posts or Empty State */}
          {isLoadingPosts && displayPosts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptySubtitle}>Loading {activeTab.toLowerCase()}...</Text>
            </View>
          ) : postsError && displayPosts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Could not load posts</Text>
              <Text style={styles.emptySubtitle}>{postsError}</Text>
            </View>
          ) : displayPosts.length > 0 ? (
            displayPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPress={() => {
                  onSelectPost(post);
                  onNavigate('post-detail');
                }}
                onPressHashtag={(tag) => {
                  if (onSearchHashtag) {
                    onSearchHashtag(tag);
                  } else {
                    onNavigate('search');
                  }
                }}
                onLike={() => likePost(post.id)}
                onRepost={() => repostPost(post.id)}
                onBookmark={() => bookmarkPost(post.id)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              {activeTab === 'Bookmarks' ? (
                <>
                  <View style={styles.emptyIconCircle}>
                    <BookmarkIcon size={28} color={colors.primary} active />
                  </View>
                  <Text style={styles.emptyTitle}>Save posts for later</Text>
                  <Text style={styles.emptySubtitle}>
                    Don't let the good ones fly away! Bookmark posts to easily find them again in the future.
                  </Text>
                </>
              ) : activeTab === 'Likes' ? (
                <>
                  <View style={[styles.emptyIconCircle, { backgroundColor: '#FEE2E2' }]}>
                    <HeartIcon size={28} color="#EF4444" active />
                  </View>
                  <Text style={styles.emptyTitle}>No liked posts yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Tap the heart icon on any post you enjoy to see them gathered here.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>No posts here yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Share your thoughts with the Bharat community by creating your first post!
                  </Text>
                </>
              )}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Edit Profile Modal */}
        <Modal
          visible={isEditModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsEditModalOpen(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setIsEditModalOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <CloseIcon size={22} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity
                  style={[styles.saveProfileBtn, isSaving && { opacity: 0.7 }]}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveProfileBtnText}>
                    {isUploadingImage
                      ? `Uploading ${isUploadingImage === 'avatar' ? 'avatar' : 'cover'}…`
                      : isSaving
                        ? 'Saving...'
                        : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* 1. Cover / Banner Photo Section */}
                <Text style={styles.sectionHeaderTitle}>Header Cover Photo</Text>
                <View style={styles.coverEditorContainer}>
                  <Image
                    source={{
                      uri:
                        editBanner ||
                        'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000',
                    }}
                    style={styles.coverEditorPreview}
                    resizeMode="cover"
                  />
                  {/* Overlay Controls */}
                  <View style={styles.coverEditorOverlay}>
                    <TouchableOpacity
                      style={styles.circleActionButton}
                      activeOpacity={0.8}
                      onPress={() => handlePickLocalImage('banner')}
                    >
                      <PhotoIcon size={18} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.circleActionButton}
                      activeOpacity={0.8}
                      onPress={() => handleCaptureCamera('banner')}
                    >
                      <CameraIcon size={18} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.circleActionButton,
                        showBannerUrlInput && styles.circleActionButtonActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setShowBannerUrlInput(!showBannerUrlInput)}
                    >
                      <LinkIcon size={16} color="#FFFFFF" />
                    </TouchableOpacity>

                    {editBanner ? (
                      <TouchableOpacity
                        style={styles.circleActionButton}
                        activeOpacity={0.8}
                        onPress={() => setEditBanner('')}
                      >
                        <TrashIcon size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* Collapsible Banner URL Input */}
                {showBannerUrlInput && (
                  <View style={styles.urlInputBox}>
                    <LinkIcon size={15} color={colors.primary} />
                    <TextInput
                      style={styles.urlTextInput}
                      value={editBanner}
                      onChangeText={setEditBanner}
                      placeholder="Paste cover image URL (https://...)"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {/* Preset Banner Selector */}
                <Text style={styles.presetsLabel}>Curated Bharat Covers:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
                  {PRESET_BANNERS.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.presetBannerCard,
                        editBanner === b.url && styles.presetCardActive,
                      ]}
                      onPress={() => setEditBanner(b.url)}
                    >
                      <Image source={{ uri: b.url }} style={styles.presetBannerThumb} />
                      <Text style={styles.presetName} numberOfLines={1}>
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 2. Avatar / Profile Picture Section */}
                <Text style={[styles.sectionHeaderTitle, { marginTop: 18 }]}>Profile Picture</Text>
                <View style={styles.avatarEditorRow}>
                  <View style={styles.avatarPreviewWrap}>
                    <Avatar
                      uri={editAvatar}
                      name={editName}
                      size={76}
                      borderWidth={3}
                      borderColor="#FFFFFF"
                    />
                    <TouchableOpacity
                      style={styles.avatarCameraBadge}
                      activeOpacity={0.8}
                      onPress={() => handlePickLocalImage('avatar')}
                    >
                      <CameraIcon size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.avatarControlsCol}>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      <TouchableOpacity
                        style={styles.actionPillBtn}
                        onPress={() => handlePickLocalImage('avatar')}
                      >
                        <PhotoIcon size={13} color="#0F172A" />
                        <Text style={styles.actionPillBtnText}>Choose Photo</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionPillBtn}
                        onPress={() => handleCaptureCamera('avatar')}
                      >
                        <CameraIcon size={13} color="#0F172A" />
                        <Text style={styles.actionPillBtnText}>Camera</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionPillBtn, showAvatarUrlInput && styles.actionPillBtnActive]}
                        onPress={() => setShowAvatarUrlInput(!showAvatarUrlInput)}
                      >
                        <LinkIcon size={13} color={showAvatarUrlInput ? '#FFFFFF' : '#0F172A'} />
                        <Text style={[styles.actionPillBtnText, showAvatarUrlInput && { color: '#FFFFFF' }]}>
                          URL
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.avatarHelperText}>
                      Upload from phone gallery, take a photo, or choose preset.
                    </Text>
                  </View>
                </View>

                {/* Collapsible Avatar URL Input */}
                {showAvatarUrlInput && (
                  <View style={[styles.urlInputBox, { marginTop: 10 }]}>
                    <LinkIcon size={15} color={colors.primary} />
                    <TextInput
                      style={styles.urlTextInput}
                      value={editAvatar}
                      onChangeText={setEditAvatar}
                      placeholder="Paste avatar image URL (https://...)"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {/* Preset Avatars Selector */}
                <Text style={styles.presetsLabel}>Avatar Presets:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
                  {PRESET_AVATARS.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      style={[
                        styles.presetAvatarCard,
                        editAvatar === a.url && styles.presetCardActive,
                      ]}
                      onPress={() => setEditAvatar(a.url)}
                    >
                      <Image source={{ uri: a.url }} style={styles.presetAvatarThumb} />
                      <Text style={styles.presetName} numberOfLines={1}>
                        {a.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 3. Text Fields */}
                <View style={[styles.inputGroup, { marginTop: 18 }]}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter full name"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelCountRow}>
                    <Text style={styles.inputLabel}>Bio</Text>
                    <Text style={styles.charCountText}>{editBio.length}/160</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={editBio}
                    onChangeText={(t) => {
                      if (t.length <= 160) setEditBio(t);
                    }}
                    placeholder="Describe yourself..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editLocation}
                    onChangeText={setEditLocation}
                    placeholder="e.g. Bengaluru, Karnataka"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Website / Social Profile</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editWebsite}
                    onChangeText={setEditWebsite}
                    placeholder="e.g. https://github.com/aarav"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                </View>

                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Info & Live Domain Modal */}
        <Modal
          visible={isInfoModalOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsInfoModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.infoModalCard}>
              <View style={styles.infoModalHeader}>
                <Text style={styles.infoModalTitle}>System & Live API Status</Text>
                <TouchableOpacity onPress={() => setIsInfoModalOpen(false)}>
                  <CloseIcon size={20} />
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Live Domain:</Text>
                <Text style={styles.infoValueHighlight}>{activeDomain}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>API Health:</Text>
                <View style={styles.greenPill}>
                  <View style={styles.greenDot} />
                  <Text style={styles.greenPillText}>200 OK (SSL Active)</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Active User:</Text>
                <Text style={styles.infoValue}>{user?.name} ({user?.handle})</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mobile Framework:</Text>
                <Text style={styles.infoValue}>Expo SDK 58 · React Native</Text>
              </View>

              <TouchableOpacity
                style={styles.infoCloseBtn}
                onPress={() => setIsInfoModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.infoCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Success Toast */}
        {saveSuccessToast && (
          <View style={styles.toastContainer}>
            <Text style={styles.toastText}>{saveSuccessToast}</Text>
          </View>
        )}

        {/* Bottom Navigation */}
        <BottomNav currentScreen="profile" onNavigate={onNavigate} />
      </View>
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
  scroll: {
    flex: 1,
  },
  bannerContainer: {
    height: 140,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerTopBar: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutPillBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoutPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  profileBody: {
    paddingHorizontal: 16,
    position: 'relative',
    paddingBottom: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -38,
    marginBottom: 10,
  },
  avatarWrapper: {},
  actionButtonsCol: {
    flexDirection: 'row',
    gap: 8,
  },
  quickSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 10,
    gap: 6,
  },
  quickSwitchLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  miniPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  miniPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  miniPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
  },
  miniPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  editProfileButton: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  otherUserActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followButton: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  followingButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  followingButtonText: {
    color: '#0F172A',
  },
  messageUserButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nameSection: {
    marginBottom: 8,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  handle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 1,
  },
  bio: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 2,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  tabsRowScroll: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  tabsRowContent: {
    flexDirection: 'row',
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonActive: {},
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  saveProfileBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
  },
  saveProfileBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBody: {
    padding: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  /* Info Modal */
  infoModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoValueHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  greenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  greenPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  infoCloseBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  infoCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  /* Cover & Avatar Editor Styles */
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coverEditorContainer: {
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  coverEditorPreview: {
    width: '100%',
    height: '100%',
  },
  coverEditorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  circleActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  circleActionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: '#FFFFFF',
  },
  urlInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 8,
  },
  urlTextInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  presetsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  presetBannerCard: {
    width: 110,
    marginRight: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F1F5F9',
  },
  presetBannerThumb: {
    width: '100%',
    height: 54,
  },
  presetAvatarCard: {
    width: 80,
    alignItems: 'center',
    marginRight: 10,
    borderRadius: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  presetAvatarThumb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 4,
  },
  presetCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  presetName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    paddingVertical: 2,
  },
  avatarEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 4,
  },
  avatarPreviewWrap: {
    position: 'relative',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarControlsCol: {
    flex: 1,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionPillBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionPillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  avatarHelperText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  labelCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  charCountText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
