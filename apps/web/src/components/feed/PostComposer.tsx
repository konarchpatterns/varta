'use client';

import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Video,
  BarChart2,
  Smile,
  Film,
  Calendar,
  MapPin,
  X,
  Send,
  Loader2,
  Plus,
  Globe,
  ChevronDown,
  AlertCircle,
  Link2,
  Lock,
  Users,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { POST_MAX_LENGTH } from '@varta/shared';
import {
  PostInteractionSettingsModal,
  PostInteractionSettings,
  getReplySettingLabel,
} from './PostInteractionSettingsModal';

interface PostComposerProps {
  parentId?: string;
  groupId?: string;
  placeholder?: string;
  onSuccess?: () => void;
  className?: string;
}

interface AttachedMediaItem {
  id: string;
  file?: File;
  previewUrl: string;
  type: 'IMAGE' | 'VIDEO' | 'GIF';
  name: string;
  sizeBytes: number;
}

export const PostComposer: React.FC<PostComposerProps> = ({
  parentId,
  groupId,
  placeholder,
  onSuccess,
  className = '',
}) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [content, setContent] = useState('');
  const [showMediaUrlInput, setShowMediaUrlInput] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<AttachedMediaItem[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [audience, setAudience] = useState<'everyone' | 'followers'>('everyone');
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);

  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionSettings, setInteractionSettings] = useState<PostInteractionSettings>({
    replyMode: 'anyone',
    allowedReplyRules: {
      followers: false,
      following: false,
      mentioned: false,
      lists: [],
    },
    allowQuotePosts: true,
  });

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const defaultPlaceholder = parentId
    ? "Post your reply..."
    : user
    ? `What's on your mind, ${user.profile?.displayName?.split(' ')[0] || user.username}?`
    : "What's on your mind? Share your voice on VARTA #BaatSabki";

  const createPostMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/posts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setContent('');
      setShowMediaUrlInput(false);
      setMediaUrlInput('');
      setAttachedMedia([]);
      setShowPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setComposerError(null);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['replies'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      if (onSuccess) onSuccess();
    },
  });

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setComposerError(null);

    const hasVideo = attachedMedia.some((m) => m.type === 'VIDEO');
    const incomingVideos = files.filter((f) => f.type.startsWith('video/'));

    if (hasVideo || incomingVideos.length > 1 || (attachedMedia.length > 0 && incomingVideos.length > 0)) {
      if (incomingVideos.length > 1 || (hasVideo && incomingVideos.length > 0)) {
        setComposerError('You can attach either 1 video/reel or up to 4 images per post.');
        e.target.value = '';
        return;
      }
    }

    const maxItems = incomingVideos.length > 0 ? 1 : 4;
    const availableSlots = maxItems - attachedMedia.length;
    if (availableSlots <= 0) {
      setComposerError(`You can attach a maximum of ${maxItems} media item${maxItems > 1 ? 's' : ''}.`);
      e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    const newMediaItems: AttachedMediaItem[] = [];

    for (const file of filesToProcess) {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|ogg|3gp)$/i.test(file.name);
      const isGif = file.type === 'image/gif' || /\.gif$/i.test(file.name);
      const type: 'IMAGE' | 'VIDEO' | 'GIF' = isVideo ? 'VIDEO' : isGif ? 'GIF' : 'IMAGE';

      const maxLimit = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxLimit) {
        setComposerError(
          isVideo
            ? `Video "${file.name}" exceeds the 50MB limit.`
            : `Image "${file.name}" exceeds the 10MB limit.`
        );
        continue;
      }

      newMediaItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        type,
        name: file.name,
        sizeBytes: file.size,
      });
    }

    setAttachedMedia((prev) => [...prev, ...newMediaItems]);
    e.target.value = '';
  };

  const handleRemoveMedia = (id: string) => {
    setAttachedMedia((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddMediaUrl = () => {
    const url = mediaUrlInput.trim();
    if (!url) return;

    const isVideo = /\.(mp4|webm|mov|mkv|ogg|3gp)$/i.test(url);
    const isGif = /\.gif$/i.test(url);

    if (isVideo && attachedMedia.length > 0) {
      setComposerError('You can only attach 1 video/reel per post.');
      return;
    }

    if (attachedMedia.length >= 4) {
      setComposerError('Maximum 4 media attachments allowed.');
      return;
    }

    setAttachedMedia((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        previewUrl: url,
        type: isVideo ? 'VIDEO' : isGif ? 'GIF' : 'IMAGE',
        name: 'Web Media',
        sizeBytes: 1024 * 1024,
      },
    ]);
    setMediaUrlInput('');
    setShowMediaUrlInput(false);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handlePollOptionChange = (idx: number, val: string) => {
    const updated = [...pollOptions];
    updated[idx] = val;
    setPollOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && attachedMedia.length === 0 && !showPoll) return;

    setIsUploadingMedia(true);
    setComposerError(null);

    try {
      const finalMediaUrls: Array<{
        url: string;
        thumbnailUrl?: string;
        type: 'IMAGE' | 'VIDEO' | 'GIF';
        mimeType: string;
        sizeBytes: number;
      }> = [];

      const localFiles = attachedMedia.filter((m) => m.file);
      const urlItems = attachedMedia.filter((m) => !m.file);

      // Upload local files to backend
      if (localFiles.length > 0) {
        const formData = new FormData();
        for (const item of localFiles) {
          if (item.file) {
            formData.append('files', item.file);
          }
        }

        const res = await apiRequest<{
          media: Array<{
            url: string;
            thumbnailUrl?: string;
            type: 'IMAGE' | 'VIDEO' | 'GIF';
            mimeType: string;
            sizeBytes: number;
          }>;
        }>('/posts/media', {
          method: 'POST',
          body: formData,
        });

        if (res.media && res.media.length > 0) {
          finalMediaUrls.push(...res.media);
        }
      }

      // Add web URL attachments
      for (const item of urlItems) {
        finalMediaUrls.push({
          url: item.previewUrl,
          thumbnailUrl: item.previewUrl,
          type: item.type,
          mimeType: item.type === 'VIDEO' ? 'video/mp4' : 'image/jpeg',
          sizeBytes: 1024 * 1024,
        });
      }

      const payload: any = {
        content: content.trim(),
        parentId: parentId || null,
        groupId: groupId || null,
        ...(finalMediaUrls.length > 0 && { mediaUrls: finalMediaUrls }),
        // The API expects "anyone" | "nobody" | custom rules as a JSON array
        replySettings:
          interactionSettings.replyMode === 'custom'
            ? JSON.stringify(
                Object.entries(interactionSettings.allowedReplyRules)
                  .filter(([key, value]) => key !== 'lists' && value === true)
                  .map(([key]) => key),
              )
            : interactionSettings.replyMode,
        allowQuotePosts: interactionSettings.allowQuotePosts,
      };

      if (showPoll && pollQuestion.trim()) {
        const validOptions = pollOptions.filter((opt) => opt.trim().length > 0);
        if (validOptions.length >= 2) {
          payload.poll = {
            question: pollQuestion.trim(),
            options: validOptions,
            durationHours: 24,
          };
        }
      }

      await createPostMutation.mutateAsync(payload);
    } catch (err: any) {
      console.error('Failed to publish post:', err);
      setComposerError(err.message || 'Failed to publish post. Please check media and try again.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const remainingChars = POST_MAX_LENGTH - content.length;
  const isOverLimit = remainingChars < 0;

  if (!user) {
    return (
      <div className="p-4 bg-[#0B1422] border border-[#1E293B] rounded-3xl text-center">
        <p className="text-sm text-slate-300">
          Sign in to join the conversation and share your voice on VARTA.
        </p>
      </div>
    );
  }

  const isPosting = createPostMutation.isPending || isUploadingMedia;
  const isVideoAttached = attachedMedia.some((m) => m.type === 'VIDEO');

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white dark:bg-[#0B1422] border border-slate-200 dark:border-[#1E293B] rounded-3xl p-4 flex flex-col gap-3 shadow-sm select-none ${className}`}
    >
      {/* Hidden File Inputs */}
      <input
        ref={mediaInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/x-matroska,video/ogg"
        className="hidden"
        onChange={handleFilesSelect}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/ogg"
        className="hidden"
        onChange={handleFilesSelect}
      />

      <div className="flex gap-3.5">
        {/* User Avatar */}
        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-[#101D2D] flex items-center justify-center text-[#FF9933] font-bold shrink-0 overflow-hidden ring-1 ring-slate-200 dark:ring-[#1E293B]">
          {user.profile?.avatarUrl ? (
            <img
              src={user.profile.avatarUrl}
              alt={user.username}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            user.username ? user.username.charAt(0).toUpperCase() : 'V'
          )}
        </div>

        {/* Text Area & Attachments */}
        <div className="flex-1 flex flex-col pt-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder || defaultPlaceholder}
            rows={3}
            className="w-full bg-transparent resize-none text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none text-base border-none focus:ring-0 leading-relaxed font-normal"
          />

          {/* Composer Error Banner */}
          {composerError && (
            <div className="mt-2 p-2.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={15} className="shrink-0" />
                <span>{composerError}</span>
              </div>
              <button
                type="button"
                onClick={() => setComposerError(null)}
                className="text-red-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Media URL Input Drawer */}
          {showMediaUrlInput && (
            <div className="mt-2 p-2.5 bg-[#101D2D] rounded-2xl border border-[#1E293B] flex items-center gap-2">
              <Link2 size={16} className="text-[#38BDF8] shrink-0" />
              <input
                type="url"
                placeholder="Paste image or video URL (https://...)"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMediaUrl();
                  }
                }}
                className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={handleAddMediaUrl}
                className="px-3 py-1 bg-[#FF9933] hover:bg-[#E68525] text-white rounded-xl text-xs font-bold transition"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMediaUrlInput(false);
                  setMediaUrlInput('');
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Attached Media Previews */}
          {attachedMedia.length > 0 && (
            <div className="mt-3">
              {isVideoAttached ? (
                /* Video / Reel Preview */
                attachedMedia.map((item) => (
                  <div
                    key={item.id}
                    className="relative rounded-2xl overflow-hidden bg-black border border-[#1E293B] max-h-72 flex flex-col group"
                  >
                    <video
                      src={item.previewUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-64 object-contain bg-black rounded-2xl"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5 border border-white/10 shadow-lg pointer-events-none">
                      <Video size={13} className="text-[#FF9933]" />
                      <span>Video / Reel</span>
                      {item.sizeBytes > 0 && (
                        <span className="text-slate-400 font-normal">
                          • {(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(item.id)}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/80 hover:bg-red-600 text-white backdrop-blur-md transition shadow-lg cursor-pointer"
                      title="Remove video"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              ) : (
                /* Image Attachments Grid */
                <div
                  className={`grid gap-2 rounded-2xl overflow-hidden ${
                    attachedMedia.length === 1
                      ? 'grid-cols-1'
                      : attachedMedia.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-2'
                  }`}
                >
                  {attachedMedia.map((item, index) => (
                    <div
                      key={item.id}
                      className={`relative rounded-2xl overflow-hidden border border-[#1E293B] bg-[#101D2D] group ${
                        attachedMedia.length === 3 && index === 0
                          ? 'col-span-2 h-48'
                          : attachedMedia.length >= 2
                          ? 'h-36 sm:h-44'
                          : 'max-h-80'
                      }`}
                    >
                      <img
                        src={item.previewUrl}
                        alt="Attachment preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(item.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/75 hover:bg-red-600 text-white backdrop-blur-md transition shadow-lg cursor-pointer"
                        title="Remove image"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Native Poll Builder */}
          {showPoll && (
            <div className="mt-3 p-3.5 bg-[#101D2D] rounded-2xl border border-[#1E293B] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#FF9933]">
                  Create a Poll
                </span>
                <button
                  type="button"
                  onClick={() => setShowPoll(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              <input
                type="text"
                placeholder="Ask a question..."
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="bg-[#0B1422] border border-[#1E293B] rounded-xl p-2.5 text-sm text-slate-100 placeholder-slate-400 outline-none focus:border-[#FF9933]"
              />

              {pollOptions.map((opt, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                  className="bg-[#0B1422] border border-[#1E293B] rounded-xl p-2 text-sm text-slate-100 placeholder-slate-400 outline-none focus:border-[#FF9933]"
                />
              ))}

              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddPollOption}
                  className="text-xs text-[#FF9933] hover:text-[#E68525] font-semibold flex items-center gap-1 w-fit py-1"
                >
                  <Plus size={14} /> Add another option
                </button>
              )}
            </div>
          )}

          {/* Inline Who can reply button (Twitter style) */}
          {!parentId && (
            <div className="pt-2 pb-0.5">
              <button
                type="button"
                onClick={() => setShowInteractionModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#1D9BF0] hover:bg-[#1D9BF0]/10 border border-[#1D9BF0]/25 transition-colors w-fit cursor-pointer"
                title="Post interaction settings"
              >
                {interactionSettings.replyMode === 'nobody' ? (
                  <Lock size={13} className="text-amber-400" />
                ) : interactionSettings.replyMode === 'custom' ? (
                  <Users size={13} className="text-[#1D9BF0]" />
                ) : (
                  <Globe size={13} className="text-[#1D9BF0]" />
                )}
                <span>{getReplySettingLabel(interactionSettings)}</span>
                {!interactionSettings.allowQuotePosts && (
                  <span className="ml-1 text-[10px] text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded-full font-medium">
                    Quotes off
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#1E293B]">
        {/* Attachment Icons */}
        <div className="flex items-center gap-1 text-slate-400">
          {/* Upload Photos from System */}
          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            disabled={isVideoAttached || attachedMedia.length >= 4}
            className="p-2 hover:bg-[#101D2D] hover:text-[#FF9933] disabled:opacity-40 rounded-xl transition flex items-center gap-1"
            title="Upload Media / Photos from Device"
          >
            <ImageIcon size={18} />
          </button>

          {/* Upload Video / Reel from System */}
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={attachedMedia.length > 0}
            className="p-2 hover:bg-[#101D2D] hover:text-[#38BDF8] disabled:opacity-40 rounded-xl transition flex items-center gap-1"
            title="Upload Video or Reel from Device (up to 50MB)"
          >
            <Video size={18} />
          </button>

          {/* Paste Media URL */}
          <button
            type="button"
            onClick={() => setShowMediaUrlInput(!showMediaUrlInput)}
            className={`p-2 hover:bg-[#101D2D] rounded-xl transition ${
              showMediaUrlInput ? 'text-[#38BDF8] bg-[#101D2D]' : 'hover:text-[#38BDF8]'
            }`}
            title="Paste image or video link"
          >
            <Link2 size={18} />
          </button>

          {/* Add GIF Preset */}
          <button
            type="button"
            onClick={() => {
              setAttachedMedia((prev) => [
                ...prev,
                {
                  id: Math.random().toString(36).substring(2, 9),
                  previewUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjEx/3oEjI6SIIHBdRxXI40/giphy.gif',
                  type: 'GIF',
                  name: 'GIF',
                  sizeBytes: 500 * 1024,
                },
              ]);
            }}
            disabled={isVideoAttached || attachedMedia.length >= 4}
            className="p-2 hover:bg-[#101D2D] hover:text-[#FF9933] disabled:opacity-40 rounded-xl transition"
            title="Add GIF"
          >
            <Film size={18} />
          </button>

          {/* Create Poll */}
          <button
            type="button"
            onClick={() => setShowPoll(!showPoll)}
            className="p-2 hover:bg-[#101D2D] hover:text-[#FF9933] rounded-xl transition"
            title="Create Poll"
          >
            <BarChart2 size={18} />
          </button>

          {/* Emoji */}
          <button
            type="button"
            onClick={() => setContent((c) => c + ' 😊')}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#101D2D] hover:text-[#FF9933] rounded-xl transition"
            title="Emoji"
          >
            <Smile size={18} />
          </button>
        </div>

        {/* Right Controls: Audience Selector & Post Button */}
        <div className="flex items-center gap-3">
          {/* Post Interaction Settings Pill */}
          <button
            type="button"
            onClick={() => setShowInteractionModal(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#1E293B] bg-slate-100 hover:bg-slate-200 dark:bg-[#101D2D] dark:hover:bg-[#152336] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            title="Post interaction settings"
          >
            {interactionSettings.replyMode === 'nobody' ? (
              <Lock size={13} className="text-amber-500" />
            ) : interactionSettings.replyMode === 'custom' ? (
              <Users size={13} className="text-[#1D9BF0]" />
            ) : (
              <Globe size={13} className="text-[#FF9933]" />
            )}
            <span className="capitalize">
              {interactionSettings.replyMode === 'custom'
                ? 'Custom'
                : interactionSettings.replyMode}
            </span>
          </button>

          <span
            className={`text-xs font-mono ${
              isOverLimit
                ? 'text-red-400 font-bold'
                : remainingChars < 50
                ? 'text-yellow-400'
                : 'text-slate-400'
            }`}
          >
            {remainingChars}
          </span>

          {/* Post Action Button */}
          <button
            type="submit"
            disabled={
              isPosting ||
              isOverLimit ||
              (!content.trim() && attachedMedia.length === 0 && !showPoll)
            }
            className="py-2 px-6 bg-[#FF9933] hover:bg-[#E68525] disabled:opacity-40 disabled:pointer-events-none text-white rounded-2xl font-bold text-sm transition flex items-center gap-2 shadow-md shadow-[#FF9933]/25 active:scale-95"
          >
            {isPosting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{isUploadingMedia ? 'Uploading...' : parentId ? 'Replying...' : 'Posting...'}</span>
              </>
            ) : (
              <span>{parentId ? 'Reply' : 'Post'}</span>
            )}
          </button>
        </div>
      </div>
      {/* Post Interaction Settings Modal */}
      <PostInteractionSettingsModal
        isOpen={showInteractionModal}
        onClose={() => setShowInteractionModal(false)}
        settings={interactionSettings}
        onChange={setInteractionSettings}
      />
    </form>
  );
};
