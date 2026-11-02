import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  CloseIcon,
  CheckIcon,
  QuoteIcon,
  LockIcon,
  GlobeIcon,
  UsersIcon,
} from '../common/Icons';
import { colors } from '../../theme/colors';

export interface PostInteractionSettings {
  replyMode: 'anyone' | 'nobody' | 'custom';
  allowedReplyRules: {
    followers: boolean;
    following: boolean;
    mentioned: boolean;
    lists: string[];
  };
  allowQuotePosts: boolean;
}

export const DEFAULT_INTERACTION_SETTINGS: PostInteractionSettings = {
  replyMode: 'anyone',
  allowedReplyRules: {
    followers: false,
    following: false,
    mentioned: false,
    lists: [],
  },
  allowQuotePosts: true,
};

export function getReplySettingLabel(settings: PostInteractionSettings): string {
  if (settings.replyMode === 'nobody') return 'Nobody can reply';
  if (settings.replyMode === 'anyone') return 'Everyone can reply';

  const rules = settings.allowedReplyRules;
  const parts: string[] = [];
  if (rules.following && rules.followers) {
    parts.push('Followers & Following');
  } else if (rules.following) {
    parts.push('People you follow');
  } else if (rules.followers) {
    parts.push('Your followers');
  }

  if (rules.mentioned) {
    parts.push('People you mention');
  }
  if (rules.lists.length > 0) {
    parts.push(`${rules.lists.length} list${rules.lists.length > 1 ? 's' : ''}`);
  }

  if (parts.length > 0) return `${parts.join(', ')} can reply`;
  return 'Everyone can reply';
}

interface PostInteractionSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: PostInteractionSettings;
  onChange: (settings: PostInteractionSettings) => void;
}

export const AVAILABLE_LISTS = [
  { id: 'close-friends', name: 'Close Circle', count: 12 },
  { id: 'tech-builders', name: 'Tech & Builders Bharat', count: 48 },
  { id: 'favorite-creators', name: 'Favorite Creators', count: 24 },
];

export const PostInteractionSettingsModal: React.FC<PostInteractionSettingsModalProps> = ({
  visible,
  onClose,
  settings,
  onChange,
}) => {
  const [isListsExpanded, setIsListsExpanded] = useState(false);

  const isAnyone = settings.replyMode === 'anyone';
  const isNobody = settings.replyMode === 'nobody';

  const handleSelectAnyone = () => {
    onChange({
      ...settings,
      replyMode: 'anyone',
      allowedReplyRules: {
        followers: false,
        following: false,
        mentioned: false,
        lists: [],
      },
    });
  };

  const handleSelectNobody = () => {
    onChange({
      ...settings,
      replyMode: 'nobody',
      allowedReplyRules: {
        followers: false,
        following: false,
        mentioned: false,
        lists: [],
      },
    });
  };

  const handleToggleRule = (rule: 'followers' | 'following' | 'mentioned') => {
    const nextRules = {
      ...settings.allowedReplyRules,
      [rule]: !settings.allowedReplyRules[rule],
    };

    const hasAnyActive =
      nextRules.followers ||
      nextRules.following ||
      nextRules.mentioned ||
      nextRules.lists.length > 0;

    onChange({
      ...settings,
      replyMode: hasAnyActive ? 'custom' : 'anyone',
      allowedReplyRules: nextRules,
    });
  };

  const handleToggleList = (listId: string) => {
    const currentLists = settings.allowedReplyRules.lists;
    const exists = currentLists.includes(listId);
    const nextLists = exists
      ? currentLists.filter((id) => id !== listId)
      : [...currentLists, listId];

    const nextRules = {
      ...settings.allowedReplyRules,
      lists: nextLists,
    };

    const hasAnyActive =
      nextRules.followers ||
      nextRules.following ||
      nextRules.mentioned ||
      nextRules.lists.length > 0;

    onChange({
      ...settings,
      replyMode: hasAnyActive ? 'custom' : 'anyone',
      allowedReplyRules: nextRules,
    });
  };

  const handleToggleQuotes = (value: boolean) => {
    onChange({
      ...settings,
      allowQuotePosts: value,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.headerRow}>
                <Text style={styles.modalTitle}>Post interaction settings</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                >
                  <CloseIcon size={20} color="#0F1419" />
                </TouchableOpacity>
              </View>

              {/* Who can reply Section */}
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionLabel}>Who can reply</Text>

                {/* Top Two Choices: Anyone & Nobody */}
                <View style={styles.topChoicesRow}>
                  {/* Anyone */}
                  <TouchableOpacity
                    style={[
                      styles.choicePill,
                      isAnyone && styles.choicePillActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={handleSelectAnyone}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        isAnyone && styles.radioCircleActive,
                      ]}
                    >
                      {isAnyone && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.choicePillText}>Anyone</Text>
                  </TouchableOpacity>

                  {/* Nobody */}
                  <TouchableOpacity
                    style={[
                      styles.choicePill,
                      isNobody && styles.choicePillActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={handleSelectNobody}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        isNobody && styles.radioCircleActive,
                      ]}
                    >
                      {isNobody && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.choicePillText}>Nobody</Text>
                  </TouchableOpacity>
                </View>

                {/* Checkbox Options Stack */}
                <View style={styles.rulesStack}>
                  {/* Your followers */}
                  <TouchableOpacity
                    style={[
                      styles.ruleItem,
                      settings.allowedReplyRules.followers && styles.ruleItemActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleToggleRule('followers')}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        settings.allowedReplyRules.followers && styles.checkboxActive,
                      ]}
                    >
                      {settings.allowedReplyRules.followers && (
                        <CheckIcon size={13} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.ruleItemText}>Your followers</Text>
                  </TouchableOpacity>

                  {/* People you follow */}
                  <TouchableOpacity
                    style={[
                      styles.ruleItem,
                      settings.allowedReplyRules.following && styles.ruleItemActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleToggleRule('following')}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        settings.allowedReplyRules.following && styles.checkboxActive,
                      ]}
                    >
                      {settings.allowedReplyRules.following && (
                        <CheckIcon size={13} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.ruleItemText}>People you follow</Text>
                  </TouchableOpacity>

                  {/* People you mention */}
                  <TouchableOpacity
                    style={[
                      styles.ruleItem,
                      settings.allowedReplyRules.mentioned && styles.ruleItemActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleToggleRule('mentioned')}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        settings.allowedReplyRules.mentioned && styles.checkboxActive,
                      ]}
                    >
                      {settings.allowedReplyRules.mentioned && (
                        <CheckIcon size={13} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.ruleItemText}>People you mention</Text>
                  </TouchableOpacity>

                  {/* Select from your lists Dropdown */}
                  <View style={styles.listsContainer}>
                    <TouchableOpacity
                      style={styles.listsDropdownBtn}
                      activeOpacity={0.8}
                      onPress={() => setIsListsExpanded(!isListsExpanded)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.listsDropdownText}>Select from your lists</Text>
                        {settings.allowedReplyRules.lists.length > 0 && (
                          <View style={styles.listsCountBadge}>
                            <Text style={styles.listsCountBadgeText}>
                              {settings.allowedReplyRules.lists.length} selected
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.chevronIcon}>
                        {isListsExpanded ? '▴' : '▾'}
                      </Text>
                    </TouchableOpacity>

                    {isListsExpanded && (
                      <View style={styles.listsSubMenu}>
                        {AVAILABLE_LISTS.map((list) => {
                          const isSelected = settings.allowedReplyRules.lists.includes(list.id);
                          return (
                            <TouchableOpacity
                              key={list.id}
                              style={[
                                styles.listItemRow,
                                isSelected && styles.listItemRowActive,
                              ]}
                              activeOpacity={0.8}
                              onPress={() => handleToggleList(list.id)}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View
                                  style={[
                                    styles.checkboxSmall,
                                    isSelected && styles.checkboxActive,
                                  ]}
                                >
                                  {isSelected && <CheckIcon size={11} color="#FFFFFF" />}
                                </View>
                                <Text style={styles.listNameText}>{list.name}</Text>
                              </View>
                              <Text style={styles.listMembersText}>
                                {list.count} members
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Allow quote posts row */}
              <TouchableOpacity
                style={[
                  styles.quotePostsCard,
                  settings.allowQuotePosts && styles.quotePostsCardActive,
                ]}
                activeOpacity={0.9}
                onPress={() => handleToggleQuotes(!settings.allowQuotePosts)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <QuoteIcon size={20} color="#0F1419" />
                  <Text style={styles.quotePostsText}>Allow quote posts</Text>
                </View>
                <Switch
                  value={settings.allowQuotePosts}
                  onValueChange={handleToggleQuotes}
                  trackColor={{ false: '#CFD9DE', true: '#1D9BF0' }}
                  thumbColor="#FFFFFF"
                />
              </TouchableOpacity>

              {/* Footer */}
              <View style={styles.footerRow}>
                <Text style={styles.footerNoteText}>These are your default settings</Text>
                <TouchableOpacity
                  style={styles.doneBtn}
                  activeOpacity={0.85}
                  onPress={onClose}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F1419',
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 20,
  },
  sectionWrap: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1419',
    marginBottom: 10,
  },
  topChoicesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  choicePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF3F4',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  choicePillActive: {
    backgroundColor: '#E8F5FE',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8B98A5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#1D9BF0',
    backgroundColor: '#1D9BF0',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  choicePillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F1419',
  },
  rulesStack: {
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF3F4',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  ruleItemActive: {
    backgroundColor: '#E8F5FE',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#8B98A5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#1D9BF0',
    borderColor: '#1D9BF0',
  },
  checkboxSmall: {
    width: 17,
    height: 17,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#8B98A5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleItemText: {
    fontSize: 14.5,
    fontWeight: '500',
    color: '#0F1419',
  },
  listsContainer: {
    backgroundColor: '#EFF3F4',
    borderRadius: 16,
    overflow: 'hidden',
  },
  listsDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  listsDropdownText: {
    fontSize: 14.5,
    fontWeight: '500',
    color: '#0F1419',
  },
  listsCountBadge: {
    marginLeft: 8,
    backgroundColor: 'rgba(29, 155, 240, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  listsCountBadgeText: {
    color: '#1D9BF0',
    fontSize: 11,
    fontWeight: '700',
  },
  chevronIcon: {
    fontSize: 16,
    color: '#0F1419',
    fontWeight: '700',
  },
  listsSubMenu: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 6,
    gap: 4,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  listItemRowActive: {
    backgroundColor: '#E8F5FE',
  },
  listNameText: {
    fontSize: 13,
    color: '#0F1419',
    fontWeight: '500',
  },
  listMembersText: {
    fontSize: 11,
    color: '#64748B',
  },
  quotePostsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF3F4',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  quotePostsCardActive: {
    backgroundColor: '#E8F5FE',
  },
  quotePostsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1419',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  footerNoteText: {
    fontSize: 13,
    color: '#536471',
    flex: 1,
    marginRight: 10,
  },
  doneBtn: {
    backgroundColor: '#0F1419',
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 20,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
