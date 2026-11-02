import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface IconProps {
  size?: number;
  color?: string;
}

export const HomeIcon: React.FC<IconProps & { active?: boolean }> = ({ size = 24, color = colors.slate700, active }) => (
  <Ionicons name={active ? 'home' : 'home-outline'} size={size} color={active ? colors.primary : color} />
);

export const ExploreIcon: React.FC<IconProps & { active?: boolean }> = ({ size = 24, color = colors.slate700, active }) => (
  <Ionicons name={active ? 'compass' : 'compass-outline'} size={size} color={active ? colors.primary : color} />
);

export const MessagesIcon: React.FC<IconProps & { active?: boolean }> = ({ size = 24, color = colors.slate700, active }) => (
  <Ionicons name={active ? 'mail' : 'mail-outline'} size={size} color={active ? colors.primary : color} />
);

export const ProfileIcon: React.FC<IconProps & { active?: boolean }> = ({ size = 24, color = colors.slate700, active }) => (
  <Ionicons name={active ? 'person' : 'person-outline'} size={size} color={active ? colors.primary : color} />
);

export const SearchIcon: React.FC<IconProps> = ({ size = 20, color = colors.slate400 }) => (
  <Ionicons name="search" size={size} color={color} />
);

export const BellIcon: React.FC<IconProps> = ({ size = 24, color = colors.slate800 }) => (
  <Ionicons name="notifications-outline" size={size} color={color} />
);

export const BackIcon: React.FC<IconProps> = ({ size = 24, color = colors.slate900 }) => (
  <Ionicons name="chevron-back" size={size} color={color} />
);

export const PlusIcon: React.FC<IconProps> = ({ size = 26, color = colors.white }) => (
  <Ionicons name="add" size={size} color={color} />
);

export const HeartIcon: React.FC<IconProps & { active?: boolean }> = ({ size = 18, color = colors.slate500, active }) => (
  <Ionicons name={active ? 'heart' : 'heart-outline'} size={size} color={active ? colors.like : color} />
);

export const RepostIcon: React.FC<IconProps & { active?: boolean }> = ({ size = 18, color = colors.slate500, active }) => (
  <Ionicons name="repeat" size={size} color={active ? colors.retweet : color} />
);

export const CommentIcon: React.FC<IconProps> = ({ size = 18, color = colors.slate500 }) => (
  <Ionicons name="chatbubble-outline" size={size} color={color} />
);

export const BookmarkIcon: React.FC<IconProps & { active?: boolean }> = ({ size = 18, color = colors.slate500, active }) => (
  <Ionicons name={active ? 'bookmark' : 'bookmark-outline'} size={size} color={active ? colors.primary : color} />
);

export const ShareIcon: React.FC<IconProps> = ({ size = 18, color = colors.slate500 }) => (
  <Ionicons name="share-outline" size={size} color={color} />
);

export const DotsIcon: React.FC<IconProps> = ({ size = 20, color = colors.slate500 }) => (
  <Ionicons name="ellipsis-horizontal" size={size} color={color} />
);

export const VerifiedBadge: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <Ionicons name="checkmark-circle" size={size} color={colors.verified} style={{ marginLeft: 4 }} />
);

export const CloseIcon: React.FC<IconProps> = ({ size = 20, color = colors.slate500 }) => (
  <Ionicons name="close" size={size} color={color} />
);

export const PhotoIcon: React.FC<IconProps> = ({ size = 20, color = '#10B981' }) => (
  <Ionicons name="image-outline" size={size} color={color} />
);

export const VideoIcon: React.FC<IconProps> = ({ size = 20, color = '#3B82F6' }) => (
  <Ionicons name="videocam-outline" size={size} color={color} />
);

export const PollIcon: React.FC<IconProps> = ({ size = 20, color = '#F59E0B' }) => (
  <Ionicons name="stats-chart-outline" size={size} color={color} />
);

export const GifIcon: React.FC<IconProps> = ({ size = 18, color = '#8B5CF6' }) => (
  <View style={styles.gifBox}>
    <Text style={styles.gifText}>GIF</Text>
  </View>
);

export const LocationIcon: React.FC<IconProps> = ({ size = 20, color = colors.primary }) => (
  <Ionicons name="location-outline" size={size} color={color} />
);

export const TopicIcon: React.FC<IconProps> = ({ size = 20, color = colors.primary }) => (
  <Ionicons name="pricetag-outline" size={size} color={color} />
);

export const EyeIcon: React.FC<IconProps & { off?: boolean }> = ({ size = 20, color = colors.slate400, off }) => (
  <Ionicons name={off ? 'eye-off-outline' : 'eye-outline'} size={size} color={color} />
);

export const LockIcon: React.FC<IconProps> = ({ size = 20, color = colors.slate400 }) => (
  <Ionicons name="lock-closed-outline" size={size} color={color} />
);

export const MailIcon: React.FC<IconProps> = ({ size = 20, color = colors.slate400 }) => (
  <Ionicons name="mail-outline" size={size} color={color} />
);

export const SendIcon: React.FC<IconProps> = ({ size = 20, color = colors.primary }) => (
  <Ionicons name="send" size={size} color={color} />
);

export const GlobeIcon: React.FC<IconProps> = ({ size = 14, color = colors.primary }) => (
  <Ionicons name="globe-outline" size={size} color={color} />
);

export const GoogleIcon: React.FC<IconProps> = ({ size = 22 }) => (
  <Ionicons name="logo-google" size={size} color="#EA4335" />
);

export const AppleIcon: React.FC<IconProps> = ({ size = 22 }) => (
  <Ionicons name="logo-apple" size={size} color="#000000" />
);

export const PhoneIcon: React.FC<IconProps> = ({ size = 22 }) => (
  <Ionicons name="call-outline" size={size} color="#16A34A" />
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 22, color = colors.slate700 }) => (
  <Ionicons name="settings-outline" size={size} color={color} />
);

export const CameraIcon: React.FC<IconProps> = ({ size = 20, color = '#FFFFFF' }) => (
  <Ionicons name="camera" size={size} color={color} />
);

export const TrashIcon: React.FC<IconProps> = ({ size = 18, color = '#EF4444' }) => (
  <Ionicons name="trash-outline" size={size} color={color} />
);

export const LinkIcon: React.FC<IconProps> = ({ size = 18, color = colors.primary }) => (
  <Ionicons name="link-outline" size={size} color={color} />
);

export const ShieldIcon: React.FC<IconProps> = ({ size = 20, color = colors.primary }) => (
  <Ionicons name="shield-checkmark-outline" size={size} color={color} />
);

export const MoonIcon: React.FC<IconProps> = ({ size = 20, color = '#6366F1' }) => (
  <Ionicons name="moon-outline" size={size} color={color} />
);

export const SunIcon: React.FC<IconProps> = ({ size = 20, color = '#F59E0B' }) => (
  <Ionicons name="sunny-outline" size={size} color={color} />
);

export const CopyIcon: React.FC<IconProps> = ({ size = 18, color = colors.slate500 }) => (
  <Ionicons name="copy-outline" size={size} color={color} />
);

export const CheckIcon: React.FC<IconProps> = ({ size = 18, color = '#10B981' }) => (
  <Ionicons name="checkmark" size={size} color={color} />
);

export const SmileIcon: React.FC<IconProps> = ({ size = 20, color = '#64748B' }) => (
  <Ionicons name="happy-outline" size={size} color={color} />
);

export const UsersIcon: React.FC<IconProps> = ({ size = 20, color = colors.primary }) => (
  <Ionicons name="people-outline" size={size} color={color} />
);

export const QuoteIcon: React.FC<IconProps> = ({ size = 20, color = '#0F1419' }) => (
  <MaterialCommunityIcons name="format-quote-close" size={size} color={color} />
);

export const FilmIcon: React.FC<IconProps> = ({ size = 20, color = '#64748B' }) => (
  <Ionicons name="film-outline" size={size} color={color} />
);

const styles = StyleSheet.create({
  gifBox: {
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
  },
});
