import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/common/Avatar';
import {
  BackIcon,
  HeartIcon,
  CommentIcon,
  RepostIcon,
  ProfileIcon,
} from '../components/common/Icons';
import { BottomNav } from '../components/common/BottomNav';
import {
  fetchNotificationsPage,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '../api/client';
import { useFocusRefresh } from '../hooks/useFocusRefresh';
import { colors } from '../theme/colors';
import { ScreenName, NotificationItem } from '../types';

interface NotificationsScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onBack: () => void;
}

const NOTIF_TABS = ['All', 'Mentions', 'Replies', 'Likes'];

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState('All');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const page = await fetchNotificationsPage(undefined, 50);
      setItems(page.items);
    } catch (err: any) {
      setError(err?.message || 'Could not load notifications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // reload every time the tab is opened (same as React Query on the web)
  useFocusRefresh(() => {
    load('initial');
  });
  // (screen is only mounted while active, so the initial focus fires once)

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    markAllNotificationsReadApi().catch(() => {});
  };

  const handleOpenNotification = (item: NotificationItem) => {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      markNotificationReadApi(item.id).catch(() => {});
    }
    if (item.type === 'follow') {
      onNavigate('search');
      return;
    }
    if (item.entityId) {
      onNavigate('post-detail');
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'Mentions') return item.type === 'reply' || item.actionText.includes('mention');
    if (activeTab === 'Replies') return item.type === 'reply';
    if (activeTab === 'Likes') return item.type === 'like';
    return true;
  });

  const renderBadgeIcon = (type: string) => {
    switch (type) {
      case 'like':
        return (
          <View style={[styles.badgeCircle, { backgroundColor: '#FEE2E2' }]}>
            <HeartIcon size={14} color="#EF4444" active />
          </View>
        );
      case 'follow':
        return (
          <View style={[styles.badgeCircle, { backgroundColor: '#E0F2FE' }]}>
            <ProfileIcon size={14} color="#0284C7" active />
          </View>
        );
      case 'reply':
        return (
          <View style={[styles.badgeCircle, { backgroundColor: '#E0E7FF' }]}>
            <CommentIcon size={14} color="#4F46E5" />
          </View>
        );
      case 'repost':
        return (
          <View style={[styles.badgeCircle, { backgroundColor: '#DCFCE7' }]}>
            <RepostIcon size={14} color="#16A34A" active />
          </View>
        );
      case 'message':
        return (
          <View style={[styles.badgeCircle, { backgroundColor: '#E0F2FE' }]}>
            <CommentIcon size={14} color="#0284C7" />
          </View>
        );
      default:
        return (
          <View style={[styles.badgeCircle, { backgroundColor: '#FFEDD5' }]}>
            <HeartIcon size={14} color={colors.primary} active />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <BackIcon size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.markReadText}>Mark read</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.tabsRow}>
          {NOTIF_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notifications List */}
        <ScrollView
          style={styles.listScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} />
          }
        >
          {isLoading && (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {!isLoading && !!error && (
            <View style={{ paddingVertical: 32, alignItems: 'center', paddingHorizontal: 24 }}>
              <Text style={{ color: '#64748B', textAlign: 'center' }}>{error}</Text>
              <TouchableOpacity onPress={() => load('initial')} style={{ marginTop: 10 }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && !error && filteredItems.length === 0 && (
            <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 22 }}>🔔</Text>
              <Text style={{ color: '#64748B', marginTop: 8, textAlign: 'center' }}>
                No notifications yet. Interactions on your posts will show up here.
              </Text>
            </View>
          )}

          {filteredItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.notifItem, !item.read && styles.notifItemUnread]}
              activeOpacity={0.7}
              onPress={() => handleOpenNotification(item)}
            >
              {/* Colored Action Type Badge */}
              <View style={styles.typeBadgeWrapper}>
                {renderBadgeIcon(item.type)}
              </View>

              {/* Actor Avatar */}
              <Avatar uri={item.actor.avatar} name={item.actor.name} size={42} />

              {/* Content Body */}
              <View style={styles.notifBody}>
                <Text style={styles.notifText}>
                  <Text style={styles.actorName}>{item.actor.name} </Text>
                  <Text style={styles.actionText}>{item.actionText}</Text>
                </Text>
                <Text style={styles.timeText}>{item.time}</Text>

                {item.postSnippet && (
                  <Text style={styles.postSnippet}>"{item.postSnippet}"</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNav currentScreen="notifications" onNavigate={onNavigate} />
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabPillActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listScroll: {
    flex: 1,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  notifItemUnread: {
    backgroundColor: '#FFFBF7',
  },
  typeBadgeWrapper: {
    marginRight: 10,
    marginTop: 2,
  },
  badgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBody: {
    flex: 1,
    marginLeft: 10,
  },
  notifText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1E293B',
  },
  actorName: {
    fontWeight: '700',
    color: '#0F172A',
  },
  actionText: {
    color: '#334155',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
  },
  postSnippet: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
