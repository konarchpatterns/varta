import React, { useCallback, useEffect, useState } from 'react';
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
import { BackIcon, BookmarkIcon } from '../components/common/Icons';
import { BottomNav } from '../components/common/BottomNav';
import { PostCard } from '../components/feed/PostCard';
import { loadBookmarksPage } from '../api/client';
import { colors } from '../theme/colors';
import { Post, ScreenName } from '../types';
import { usePosts } from '../context/PostsContext';

interface BookmarksScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onBack: () => void;
}

/** Same feature as the website's /bookmarks page (private saved posts). */
export const BookmarksScreen: React.FC<BookmarksScreenProps> = ({ onNavigate, onBack }) => {
  const { likePost, repostPost, bookmarkPost } = usePosts();
  const [items, setItems] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const page = await loadBookmarksPage();
      setItems(page.items);
    } catch (err: any) {
      setError(err?.message || 'Could not load your bookmarks');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <BackIcon size={24} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Bookmarks</Text>
            <Text style={styles.headerSubtitle}>{items.length} saved posts (private to you)</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} />
          }
        >
          {isLoading && (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {!isLoading && !!error && (
            <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 24 }}>
              <Text style={{ color: '#64748B', textAlign: 'center' }}>{error}</Text>
              <TouchableOpacity onPress={() => load('initial')} style={{ marginTop: 10 }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && !error && items.length === 0 && (
            <View style={{ paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 }}>
              <BookmarkIcon size={30} color={colors.primary} active />
              <Text style={{ fontWeight: '800', color: '#0F172A', marginTop: 12 }}>
                Save posts for later
              </Text>
              <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 6 }}>
                Bookmark a post and it will show up here, visible only to you.
              </Text>
            </View>
          )}

          {items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPress={() => onNavigate('post-detail')}
              onPressAuthor={(author) => {
                if (author) onNavigate('profile');
              }}
              onPressHashtag={() => onNavigate('search')}
              onLike={() => likePost(post.id)}
              onRepost={() => repostPost(post.id)}
              onBookmark={() => {
                bookmarkPost(post.id);
                setItems((prev) => prev.filter((p) => p.id !== post.id));
              }}
            />
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>

        <BottomNav currentScreen="bookmarks" onNavigate={onNavigate} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 12, color: '#64748B' },
});
