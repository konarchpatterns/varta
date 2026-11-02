import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '../components/common/Avatar';
import {
  BackIcon,
  GlobeIcon,
  PhotoIcon,
  CameraIcon,
  VideoIcon,
  PollIcon,
  LocationIcon,
  TopicIcon,
  LinkIcon,
  CloseIcon,
  CheckIcon,
  FilmIcon,
  SmileIcon,
  UsersIcon,
  LockIcon,
  QuoteIcon,
} from '../components/common/Icons';
import { colors } from '../theme/colors';
import { ScreenName, CommunityItem } from '../types';
import { usePosts } from '../context/PostsContext';
import { useAuth } from '../context/AuthContext';
import { uploadMediaApi } from '../api/client';
import { fetchCommunitiesApi } from '../api/client';
import {
  PostInteractionSettingsModal,
  PostInteractionSettings,
  DEFAULT_INTERACTION_SETTINGS,
  getReplySettingLabel,
} from '../components/feed/PostInteractionSettingsModal';

interface CreatePostScreenProps {
  onBack: () => void;
  onPostCreated?: (content: string) => void;
  onNavigate: (screen: ScreenName) => void;
}

interface AttachedMedia {
  id: string;
  uri: string;
  type: 'image' | 'video';
  isLocal?: boolean;
}

const PRESET_ATTACHMENTS = [
  {
    id: 'p1',
    name: 'India Gate',
    url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1000',
    type: 'image' as const,
  },
  {
    id: 'p2',
    name: 'Varanasi Ghats',
    url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1000',
    type: 'image' as const,
  },
  {
    id: 'p3',
    name: 'Bengaluru Tech',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000',
    type: 'image' as const,
  },
  {
    id: 'p4',
    name: 'Himalayas',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000',
    type: 'image' as const,
  },
];

const TRENDING_HASHTAGS = [
  '#DigitalBharat',
  '#Varanasi',
  '#NewIndia',
  '#TechIndia',
  '#IncredibleIndia',
  '#UPI',
  '#StartupIndia',
];

const QUICK_LOCATIONS = [
  'Varanasi, UP',
  'Bengaluru, Karnataka',
  'New Delhi, Bharat',
  'Mumbai, Maharashtra',
  'Hyderabad, Telangana',
  'Ahmedabad, Gujarat',
];

const GIF_PRESETS = [
  { id: 'g1', name: 'Namaste 🙏', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjEx/3oEjI6SIIHBdRxXI40/giphy.gif' },
  { id: 'g2', name: 'Digital Bharat 🇮🇳', url: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif' },
  { id: 'g3', name: 'Celebration 🎉', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: 'g4', name: 'Tech & Code 💻', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif' },
  { id: 'g5', name: 'Vande Mataram ✨', url: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif' },
];

const QUICK_EMOJIS = ['😊', '😂', '🔥', '🇮🇳', '❤️', '👍', '🎉', '🚀', '✨', '🙏', '🕉️', '👏', '🎯', '💯'];

export const CreatePostScreen: React.FC<CreatePostScreenProps> = ({
  onBack,
  onPostCreated,
  onNavigate,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { createPost } = usePosts();

  // Audience / community picker comes from the real communities API
  const [communitiesList, setCommunitiesList] = useState<CommunityItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchCommunitiesApi({ limit: 50 })
      .then((page) => {
        if (!cancelled) setCommunitiesList(page.items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Composer Content
  const [content, setContent] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Post Interaction Settings State (Who can reply, Allow quotes)
  const [interactionSettings, setInteractionSettings] = useState<PostInteractionSettings>(DEFAULT_INTERACTION_SETTINGS);
  const [showInteractionModal, setShowInteractionModal] = useState(false);

  // Emoji and GIF bars
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);

  // Community / Audience Target
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityItem | null>(null);
  const [showAudienceModal, setShowAudienceModal] = useState(false);

  // Collapsible URL Input
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');

  // Interactive Poll State
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDurationHours, setPollDurationHours] = useState(24);

  // Submission & Toast State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Pick from Local Device Gallery / Photos
  const handlePickFromGallery = async () => {
    if (attachedMedia.length >= 4) {
      showToast('Maximum 4 media attachments allowed');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const slotsAvailable = 4 - attachedMedia.length;
        const assetsToAdd = result.assets.slice(0, slotsAvailable);

        const newItems: AttachedMedia[] = assetsToAdd.map((a, idx) => ({
          id: `local-media-${Date.now()}-${idx}`,
          uri: a.base64
            ? `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}`
            : a.uri,
          type: a.type === 'video' ? 'video' : 'image',
          isLocal: true,
        }));

        setAttachedMedia((prev) => [...prev, ...newItems]);
        showToast(`${newItems.length} media attached from device 📷`);
        return;
      }
    } catch (err) {
      console.warn('ImagePicker launch error, trying web fallback:', err);
    }

    // Web Fallback
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,video/*';
      input.multiple = true;
      input.onchange = (e: any) => {
        const files: File[] = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const slotsAvailable = 4 - attachedMedia.length;
        const filesToAdd = files.slice(0, slotsAvailable);

        filesToAdd.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setAttachedMedia((prev) => [
              ...prev,
              {
                id: `web-file-${Date.now()}-${Math.random()}`,
                uri: dataUrl,
                type: file.type.startsWith('video/') ? 'video' : 'image',
                isLocal: true,
              },
            ]);
          };
          reader.readAsDataURL(file);
        });
        showToast(`${filesToAdd.length} media attached from device 📷`);
      };
      input.click();
    }
  };

  // 2. Capture Live Photo with Device Camera
  const handleCaptureWithCamera = async () => {
    if (attachedMedia.length >= 4) {
      showToast('Maximum 4 media attachments allowed');
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showToast('Camera permission required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = asset.base64
          ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
          : asset.uri;

        setAttachedMedia((prev) => [
          ...prev,
          {
            id: `camera-photo-${Date.now()}`,
            uri: dataUri,
            type: 'image',
            isLocal: true,
          },
        ]);
        showToast('Photo captured with camera! 📸');
      }
    } catch (err) {
      console.warn('Camera error:', err);
    }
  };

  // 2b. Pick Video / Reel from Device
  const handlePickVideo = async () => {
    if (attachedMedia.length >= 4) {
      showToast('Maximum 4 media attachments allowed');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachedMedia((prev) => [
          ...prev,
          {
            id: `video-${Date.now()}`,
            uri: asset.uri,
            type: 'video',
            isLocal: true,
          },
        ]);
        showToast('Video attached from device 🎥');
        return;
      }
    } catch (err) {
      console.warn('Video picker error:', err);
    }

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachedMedia((prev) => [
            ...prev,
            {
              id: `web-vid-${Date.now()}`,
              uri: event.target?.result as string,
              type: 'video',
              isLocal: true,
            },
          ]);
          showToast('Video attached from device 🎥');
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
  };

  // 3. Add Web Image / Video URL
  const handleAddMediaUrl = () => {
    const url = urlInputValue.trim();
    if (!url) return;
    if (attachedMedia.length >= 4) {
      showToast('Maximum 4 media attachments allowed');
      return;
    }
    const isVideo = /\.(mp4|webm|mov|mkv|ogg|3gp)$/i.test(url);
    setAttachedMedia((prev) => [
      ...prev,
      {
        id: `url-media-${Date.now()}`,
        uri: url,
        type: isVideo ? 'video' : 'image',
        isLocal: false,
      },
    ]);
    setUrlInputValue('');
    setShowUrlInput(false);
    showToast('Media attachment added 🔗');
  };

  // 4. Attach Preset Sample Media
  const handleAttachPreset = (presetUrl: string, type: 'image' | 'video') => {
    if (attachedMedia.length >= 4) {
      showToast('Maximum 4 media attachments allowed');
      return;
    }
    if (attachedMedia.some((m) => m.uri === presetUrl)) {
      showToast('Already attached');
      return;
    }
    setAttachedMedia((prev) => [
      ...prev,
      {
        id: `preset-${Date.now()}-${Math.random()}`,
        uri: presetUrl,
        type,
        isLocal: false,
      },
    ]);
    showToast('Preset attached');
  };

  const handleRemoveMedia = (id: string) => {
    setAttachedMedia((prev) => prev.filter((m) => m.id !== id));
  };

  // Poll Option Helpers
  const handlePollOptionChange = (idx: number, text: string) => {
    const next = [...pollOptions];
    next[idx] = text;
    setPollOptions(next);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  // Append Hashtag to content
  const handleAddHashtag = (tag: string) => {
    setContent((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${tag} ` : `${tag} `;
    });
  };

  // 5. Submit Post
  const handlePublishPost = async () => {
    const hasText = content.trim().length > 0;
    const hasMedia = attachedMedia.length > 0;
    const validPollOptions = pollOptions.filter((opt) => opt.trim().length > 0);
    const hasValidPoll = showPollBuilder && pollQuestion.trim().length > 0 && validPollOptions.length >= 2;

    if (!hasText && !hasMedia && !hasValidPoll) {
      showToast('Please enter text, attach media, or add a poll');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload local media if needed
      const finalMediaUrls: string[] = [];
      for (const item of attachedMedia) {
        if (item.isLocal) {
          try {
            const uploaded = await uploadMediaApi({ uri: item.uri });
            finalMediaUrls.push(uploaded || item.uri);
          } catch {
            finalMediaUrls.push(item.uri);
          }
        } else {
          finalMediaUrls.push(item.uri);
        }
      }

      // 2. Prepare poll object
      const pollPayload = hasValidPoll
        ? {
            question: pollQuestion.trim(),
            options: validPollOptions,
            durationHours: pollDurationHours,
          }
        : undefined;

      // 3. Prepare group payload
      const groupPayload = selectedCommunity
        ? {
            id: selectedCommunity.id,
            name: selectedCommunity.name,
            category: selectedCommunity.category,
            avatarUrl: selectedCommunity.avatar,
          }
        : undefined;

      // Append location to text if specified
      let finalContent = content.trim();
      if (selectedLocation) {
        finalContent = finalContent ? `${finalContent}\n📍 ${selectedLocation}` : `📍 ${selectedLocation}`;
      }

      // 4. Create post in context and remote backend
      await createPost(
        finalContent,
        finalMediaUrls,
        groupPayload,
        pollPayload,
        interactionSettings,
      );

      if (onPostCreated) {
        onPostCreated(finalContent);
      }
      showToast(
        interactionSettings.replyMode === 'nobody'
          ? 'Post published 🔒 replies off'
          : interactionSettings.replyMode === 'custom'
            ? 'Post published 👥 limited replies'
            : 'Post published to Bharat! 🚀',
      );
      setTimeout(() => {
        onNavigate('home');
      }, 500);
    } catch (err: any) {
      console.warn('Error publishing post:', err);
      showToast(err.message || 'Failed to publish post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingChars = 500 - content.length;
  const isOverLimit = remainingChars < 0;

  const isPostButtonEnabled =
    !isSubmitting &&
    !isOverLimit &&
    (content.trim().length > 0 ||
      attachedMedia.length > 0 ||
      (showPollBuilder && pollQuestion.trim().length > 0 && pollOptions.filter((o) => o.trim()).length >= 2));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          {/* Top Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
              <BackIcon size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Post</Text>
            <TouchableOpacity
              style={[
                styles.publishBtn,
                !isPostButtonEnabled && styles.publishBtnDisabled,
              ]}
              disabled={!isPostButtonEnabled}
              activeOpacity={0.85}
              onPress={handlePublishPost}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.publishBtnText}>Publish</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Composer Body */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* User Row & Target Audience Pill */}
            <View style={styles.userRow}>
              <Avatar uri={user?.avatar} name={user?.name} size={44} />
              <View style={styles.userInfoWrap}>
                <Text style={styles.userNameText}>{user?.name}</Text>
                <TouchableOpacity
                  style={styles.audienceSelectorPill}
                  activeOpacity={0.8}
                  onPress={() => setShowAudienceModal(true)}
                >
                  <GlobeIcon size={12} color={colors.primary} />
                  <Text style={styles.audienceText}>
                    {selectedCommunity ? selectedCommunity.name : 'Everyone (Public)'}
                  </Text>
                  <Text style={styles.audienceChevron}>▾</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Content Input */}
            <TextInput
              style={styles.mainTextInput}
              placeholder={`What's on your mind, ${user?.name ? user.name.split(' ')[0] : 'citizen'}?`}
              placeholderTextColor="#94A3B8"
              multiline
              value={content}
              onChangeText={setContent}
              maxLength={500}
              autoFocus
            />

            {/* Inline Post Interaction Settings Button (matches Screenshot 1) */}
            <View style={styles.inlineInteractionRow}>
              <TouchableOpacity
                style={styles.inlineReplySettingBtn}
                activeOpacity={0.8}
                onPress={() => setShowInteractionModal(true)}
              >
                {interactionSettings.replyMode === 'nobody' ? (
                  <LockIcon size={14} color="#D97706" />
                ) : interactionSettings.replyMode === 'custom' ? (
                  <UsersIcon size={14} color="#1D9BF0" />
                ) : (
                  <GlobeIcon size={14} color="#1D9BF0" />
                )}
                <Text style={styles.inlineReplySettingText}>
                  {getReplySettingLabel(interactionSettings)}
                </Text>
                {!interactionSettings.allowQuotePosts && (
                  <View style={styles.quotesOffBadge}>
                    <Text style={styles.quotesOffBadgeText}>Quotes off</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Chosen interaction rules summary (mirrors the settings modal) */}
            <View style={styles.interactionSummaryRow}>
              <Text style={styles.interactionSummaryText}>
                {interactionSettings.replyMode === 'nobody'
                  ? '🔒 Nobody can reply to this post'
                  : interactionSettings.replyMode === 'custom'
                    ? `👥 ${getReplySettingLabel(interactionSettings)}`
                    : '🌐 Everyone can reply'}
                {interactionSettings.allowQuotePosts ? ' · quotes allowed' : ' · quotes off'}
              </Text>
            </View>

            {/* Quick Emoji Bar (shown when smiley is clicked) */}
            {showEmojiPicker && (
              <View style={styles.quickEmojiBar}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.emojiScrollContainer}
                >
                  {QUICK_EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.emojiChip}
                      activeOpacity={0.7}
                      onPress={() => setContent((c) => c + (c.length > 0 && !c.endsWith(' ') ? ' ' : '') + emoji)}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Quick GIF Presets Bar (shown when GIF is clicked) */}
            {showGifPicker && (
              <View style={styles.quickGifBar}>
                <View style={styles.quickGifHeader}>
                  <Text style={styles.quickGifTitle}>Bharat Trending GIFs:</Text>
                  <TouchableOpacity onPress={() => setShowGifPicker(false)}>
                    <CloseIcon size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.gifScrollContainer}
                >
                  {GIF_PRESETS.map((gif) => (
                    <TouchableOpacity
                      key={gif.id}
                      style={styles.gifChip}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (attachedMedia.length >= 4) {
                          showToast('Maximum 4 media attachments allowed');
                          return;
                        }
                        setAttachedMedia((prev) => [
                          ...prev,
                          {
                            id: `gif-${Date.now()}`,
                            uri: gif.url,
                            type: 'image',
                            isLocal: false,
                          },
                        ]);
                        showToast(`Attached ${gif.name}`);
                        setShowGifPicker(false);
                      }}
                    >
                      <Text style={styles.gifChipText}>{gif.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Character Count & Location Badge */}
            <View style={styles.metaInfoRow}>
              {selectedLocation ? (
                <View style={styles.locationBadge}>
                  <LocationIcon size={13} color={colors.primary} />
                  <Text style={styles.locationBadgeText}>{selectedLocation}</Text>
                  <TouchableOpacity onPress={() => setSelectedLocation(null)}>
                    <CloseIcon size={12} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View />
              )}
              <Text
                style={[
                  styles.charCountText,
                  isOverLimit && { color: '#EF4444', fontWeight: '800' },
                ]}
              >
                {remainingChars} chars remaining
              </Text>
            </View>

            {/* Trending Hashtag Pills */}
            <View style={styles.hashtagChipsRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {TRENDING_HASHTAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.hashtagChip}
                    onPress={() => handleAddHashtag(tag)}
                  >
                    <Text style={styles.hashtagChipText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Attached Media Carousel Preview */}
            {attachedMedia.length > 0 && (
              <View style={styles.attachedMediaBlock}>
                <Text style={styles.attachedMediaHeader}>
                  Attached Media ({attachedMedia.length}/4):
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaCarousel}>
                  {attachedMedia.map((item) => (
                    <View key={item.id} style={styles.mediaPreviewCard}>
                      <Image source={{ uri: item.uri }} style={styles.mediaPreviewThumb} />
                      <View style={styles.mediaTypeBadge}>
                        <Text style={styles.mediaTypeBadgeText}>
                          {item.type.toUpperCase()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeMediaBtn}
                        onPress={() => handleRemoveMedia(item.id)}
                      >
                        <CloseIcon size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Collapsible Web URL Input */}
            {showUrlInput && (
              <View style={styles.urlInputContainer}>
                <View style={styles.urlInputRow}>
                  <LinkIcon size={16} color={colors.primary} />
                  <TextInput
                    style={styles.urlInputBox}
                    placeholder="Paste image or video link (https://...)"
                    placeholderTextColor="#94A3B8"
                    value={urlInputValue}
                    onChangeText={setUrlInputValue}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.urlAddBtn} onPress={handleAddMediaUrl}>
                    <Text style={styles.urlAddBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Interactive Poll Builder Block */}
            {showPollBuilder && (
              <View style={styles.pollBuilderCard}>
                <View style={styles.pollHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <PollIcon size={18} color={colors.primary} />
                    <Text style={styles.pollTitle}>Create a Poll</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowPollBuilder(false)}>
                    <CloseIcon size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Poll Question */}
                <TextInput
                  style={styles.pollQuestionInput}
                  placeholder="Ask a question for citizens to vote on..."
                  placeholderTextColor="#94A3B8"
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                />

                {/* Poll Options */}
                {pollOptions.map((opt, idx) => (
                  <View key={idx} style={styles.pollOptionRow}>
                    <TextInput
                      style={styles.pollOptionInput}
                      placeholder={`Option ${idx + 1}`}
                      placeholderTextColor="#94A3B8"
                      value={opt}
                      onChangeText={(t) => handlePollOptionChange(idx, t)}
                    />
                    {pollOptions.length > 2 && (
                      <TouchableOpacity
                        style={styles.removePollOptionBtn}
                        onPress={() => handleRemovePollOption(idx)}
                      >
                        <CloseIcon size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* Add Option Button */}
                {pollOptions.length < 4 && (
                  <TouchableOpacity style={styles.addOptionBtn} onPress={handleAddPollOption}>
                    <Text style={styles.addOptionBtnText}>+ Add Option ({pollOptions.length}/4)</Text>
                  </TouchableOpacity>
                )}

                {/* Poll Duration Selector */}
                <View style={styles.pollDurationRow}>
                  <Text style={styles.pollDurationLabel}>Poll Duration:</Text>
                  {[
                    { label: '24h', hours: 24 },
                    { label: '3 Days', hours: 72 },
                    { label: '7 Days', hours: 168 },
                  ].map((dur) => (
                    <TouchableOpacity
                      key={dur.label}
                      style={[
                        styles.durChip,
                        pollDurationHours === dur.hours && styles.durChipActive,
                      ]}
                      onPress={() => setPollDurationHours(dur.hours)}
                    >
                      <Text
                        style={[
                          styles.durChipText,
                          pollDurationHours === dur.hours && styles.durChipTextActive,
                        ]}
                      >
                        {dur.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Preset Bharat Sample Media */}
            <View style={styles.presetsSection}>
              <Text style={styles.presetsHeaderTitle}>Quick Sample Bharat Photos:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {PRESET_ATTACHMENTS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.presetThumbCard}
                    onPress={() => handleAttachPreset(p.url, p.type)}
                  >
                    <Image source={{ uri: p.url }} style={styles.presetThumbImg} />
                    <Text style={styles.presetThumbText} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Location Selector Chips */}
            {showLocationPicker && (
              <View style={styles.locationSelectorCard}>
                <Text style={styles.locationSelectorTitle}>Tag Location in Bharat:</Text>
                <View style={styles.locationGrid}>
                  {QUICK_LOCATIONS.map((loc) => (
                    <TouchableOpacity
                      key={loc}
                      style={[
                        styles.locationCityChip,
                        selectedLocation === loc && styles.locationCityChipActive,
                      ]}
                      onPress={() => {
                        setSelectedLocation(loc);
                        setShowLocationPicker(false);
                        showToast(`Location tagged: ${loc} 📍`);
                      }}
                    >
                      <LocationIcon size={13} color={selectedLocation === loc ? '#FFFFFF' : colors.primary} />
                      <Text
                        style={[
                          styles.locationCityText,
                          selectedLocation === loc && { color: '#FFFFFF' },
                        ]}
                      >
                        {loc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Toolbar Dock (matches Screenshot 1) */}
          <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {/* Attachment Icons Group (Left) */}
            <View style={styles.toolbarActionsGroup}>
              {/* Photo / Image from Gallery */}
              <TouchableOpacity
                style={styles.toolIconBtn}
                activeOpacity={0.8}
                onPress={handlePickFromGallery}
              >
                <PhotoIcon size={20} color="#64748B" />
              </TouchableOpacity>

              {/* Video from Device or Camera */}
              <TouchableOpacity
                style={styles.toolIconBtn}
                activeOpacity={0.8}
                onPress={handlePickVideo}
              >
                <VideoIcon size={20} color="#64748B" />
              </TouchableOpacity>

              {/* Paste URL */}
              <TouchableOpacity
                style={[styles.toolIconBtn, showUrlInput && styles.toolIconBtnActive]}
                activeOpacity={0.8}
                onPress={() => setShowUrlInput(!showUrlInput)}
              >
                <LinkIcon size={18} color={showUrlInput ? colors.primary : '#64748B'} />
              </TouchableOpacity>

              {/* Add GIF Preset */}
              <TouchableOpacity
                style={[styles.toolIconBtn, showGifPicker && styles.toolIconBtnActive]}
                activeOpacity={0.8}
                onPress={() => setShowGifPicker(!showGifPicker)}
              >
                <FilmIcon size={20} color={showGifPicker ? colors.primary : '#64748B'} />
              </TouchableOpacity>

              {/* Create Poll */}
              <TouchableOpacity
                style={[styles.toolIconBtn, showPollBuilder && styles.toolIconBtnActive]}
                activeOpacity={0.8}
                onPress={() => setShowPollBuilder(!showPollBuilder)}
              >
                <PollIcon size={20} color={showPollBuilder ? '#F59E0B' : '#64748B'} />
              </TouchableOpacity>

              {/* Emoji Picker Toggle */}
              <TouchableOpacity
                style={[styles.toolIconBtn, showEmojiPicker && styles.toolIconBtnActive]}
                activeOpacity={0.8}
                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <SmileIcon size={20} color={showEmojiPicker ? '#FF9933' : '#64748B'} />
              </TouchableOpacity>
            </View>

            {/* Right Controls: Interaction Pill, Chars Counter, Saffron Post Button */}
            <View style={styles.toolbarRightGroup}>
              {/* Post Interaction Settings Pill */}
              <TouchableOpacity
                style={styles.toolbarInteractionPill}
                activeOpacity={0.8}
                onPress={() => setShowInteractionModal(true)}
              >
                {interactionSettings.replyMode === 'nobody' ? (
                  <LockIcon size={13} color="#D97706" />
                ) : interactionSettings.replyMode === 'custom' ? (
                  <UsersIcon size={13} color="#1D9BF0" />
                ) : (
                  <GlobeIcon size={13} color="#FF9933" />
                )}
                <Text style={styles.toolbarInteractionText}>
                  {interactionSettings.replyMode === 'custom'
                    ? 'Limited'
                    : interactionSettings.replyMode === 'nobody'
                    ? 'Nobody'
                    : 'Anyone'}
                </Text>
                {!interactionSettings.allowQuotePosts && (
                  <Text style={styles.toolbarInteractionText}>· no quotes</Text>
                )}
              </TouchableOpacity>

              {/* Character Limit Counter */}
              <Text
                style={[
                  styles.charCounterText,
                  isOverLimit
                    ? styles.charCounterOver
                    : remainingChars < 50
                    ? styles.charCounterWarn
                    : null,
                ]}
              >
                {remainingChars}
              </Text>

              {/* Saffron Post Button */}
              <TouchableOpacity
                style={[
                  styles.postActionBtn,
                  !isPostButtonEnabled && styles.postActionBtnDisabled,
                ]}
                disabled={!isPostButtonEnabled}
                activeOpacity={0.85}
                onPress={handlePublishPost}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.postActionBtnText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Target Audience / Community Modal */}
      <Modal
        visible={showAudienceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAudienceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.audienceModalCard}>
            <View style={styles.audienceModalHeader}>
              <Text style={styles.audienceModalTitle}>Choose Audience or Community</Text>
              <TouchableOpacity onPress={() => setShowAudienceModal(false)}>
                <CloseIcon size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {/* Option: Public */}
              <TouchableOpacity
                style={[
                  styles.audienceOptionItem,
                  !selectedCommunity && styles.audienceOptionItemActive,
                ]}
                onPress={() => {
                  setSelectedCommunity(null);
                  setShowAudienceModal(false);
                }}
              >
                <View style={styles.audienceOptionLeft}>
                  <View style={[styles.audienceIconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <GlobeIcon size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.audienceOptionTitle}>Everyone (Public Feed)</Text>
                    <Text style={styles.audienceOptionSub}>
                      Anyone across Bharat can see, reply, and quote this post.
                    </Text>
                  </View>
                </View>
                {!selectedCommunity && <CheckIcon size={18} color={colors.primary} />}
              </TouchableOpacity>

              <Text style={styles.communitySubheadTitle}>Or Post Directly into a Community:</Text>

              {/* Communities List */}
              {communitiesList.map((comm) => {
                const isSelected = selectedCommunity?.id === comm.id;
                return (
                  <TouchableOpacity
                    key={comm.id}
                    style={[styles.audienceOptionItem, isSelected && styles.audienceOptionItemActive]}
                    onPress={() => {
                      setSelectedCommunity(comm);
                      setShowAudienceModal(false);
                    }}
                  >
                    <View style={styles.audienceOptionLeft}>
                      <Image source={{ uri: comm.avatar }} style={styles.commModalAvatar} />
                      <View>
                        <Text style={styles.audienceOptionTitle}>{comm.name}</Text>
                        <Text style={styles.audienceOptionSub}>
                          {comm.category} · {comm.members}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <CheckIcon size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Post Interaction Settings Modal (matches Screenshot 2) */}
      <PostInteractionSettingsModal
        visible={showInteractionModal}
        onClose={() => setShowInteractionModal(false)}
        settings={interactionSettings}
        onChange={setInteractionSettings}
      />

      {/* Floating Toast */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
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
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  publishBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 76,
    alignItems: 'center',
  },
  publishBtnDisabled: {
    opacity: 0.5,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  userInfoWrap: {
    flex: 1,
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  audienceSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
  },
  audienceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  audienceChevron: {
    fontSize: 11,
    color: colors.primary,
  },
  mainTextInput: {
    fontSize: 17,
    color: '#0F172A',
    lineHeight: 24,
    minHeight: 110,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  inlineInteractionRow: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  interactionSummaryRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  interactionSummaryText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  inlineReplySettingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5FE',
    borderWidth: 1,
    borderColor: 'rgba(29, 155, 240, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  inlineReplySettingText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1D9BF0',
  },
  quotesOffBadge: {
    marginLeft: 4,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  quotesOffBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  quickEmojiBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emojiScrollContainer: {
    gap: 10,
    paddingHorizontal: 12,
  },
  emojiChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  emojiText: {
    fontSize: 22,
  },
  quickGifBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickGifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quickGifTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  gifScrollContainer: {
    gap: 8,
  },
  gifChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  gifChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  charCountText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  locationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  hashtagChipsRow: {
    marginBottom: 14,
  },
  hashtagChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  hashtagChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  /* Attached Media Preview */
  attachedMediaBlock: {
    marginBottom: 14,
  },
  attachedMediaHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  mediaCarousel: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaPreviewCard: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  mediaPreviewThumb: {
    width: '100%',
    height: '100%',
  },
  mediaTypeBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mediaTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* URL Input */
  urlInputContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 8,
    marginBottom: 14,
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urlInputBox: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 4,
  },
  urlAddBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  urlAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  /* Poll Builder */
  pollBuilderCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  pollHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pollTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  pollQuestionInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 8,
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pollOptionInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    color: '#0F172A',
  },
  removePollOptionBtn: {
    padding: 4,
  },
  addOptionBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    marginBottom: 10,
  },
  addOptionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  pollDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  pollDurationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78350F',
  },
  durChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  durChipActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  durChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
  },
  durChipTextActive: {
    color: '#FFFFFF',
  },
  /* Presets Section */
  presetsSection: {
    marginBottom: 16,
  },
  presetsHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  presetThumbCard: {
    width: 90,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  presetThumbImg: {
    width: '100%',
    height: 55,
  },
  presetThumbText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    paddingVertical: 3,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  /* Location Selector */
  locationSelectorCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  locationSelectorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  locationCityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  locationCityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  locationCityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  /* Bottom Toolbar Dock */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  toolbarActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIconBtnActive: {
    backgroundColor: '#FFF7ED',
  },
  toolbarRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolbarInteractionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF3F4',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },
  toolbarInteractionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F1419',
  },
  charCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minWidth: 26,
    textAlign: 'center',
  },
  charCounterWarn: {
    color: '#F59E0B',
  },
  charCounterOver: {
    color: '#EF4444',
  },
  postActionBtn: {
    backgroundColor: '#FF9933',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
    shadowColor: '#FF9933',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  postActionBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  postActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  audienceModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  audienceModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  audienceModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  audienceOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  audienceOptionItemActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  audienceOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  audienceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commModalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  audienceOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  audienceOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  communitySubheadTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
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
