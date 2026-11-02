import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/common/Avatar';
import { BackIcon, SearchIcon, VerifiedBadge, SendIcon } from '../components/common/Icons';
import { BottomNav } from '../components/common/BottomNav';
import { colors } from '../theme/colors';
import { ConversationItem, MessageItem, ScreenName } from '../types';
import {
  createGroupConversationApi,
  fetchConversationsApi,
  fetchMessagesPage,
  fetchWhoToFollow,
  markConversationReadApi,
  searchApi,
  sendMessageApi,
  startConversationApi,
} from '../api/client';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

interface MessagesScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onBack: () => void;
}

/**
 * Real direct messages: conversations, history, live delivery and typing come
 * from the NestJS API + Socket.io gateway (same as apps/web .../messages).
 * The previous version was a hard-coded mock chat with a fake auto-reply bot.
 */
export const MessagesScreen: React.FC<MessagesScreenProps> = ({ onNavigate, onBack }) => {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const socket = getSocket();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // New chat / new group modal
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [people, setPeople] = useState<User[]>([]);
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupSelected, setGroupSelected] = useState<string[]>([]);

  const scrollRef = useRef<any>(null);
  const typingTimer = useRef<any>(null);

  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  // ---- Load conversation list
  const loadConversations = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (!isAuthenticated) {
      setIsLoadingConversations(false);
      return;
    }
    if (mode === 'initial') setIsLoadingConversations(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const list = await fetchConversationsApi();
      setConversations(list);
    } catch (err: any) {
      setError(err?.message || 'Could not load your conversations');
    } finally {
      setIsLoadingConversations(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadConversations('initial');
  }, [loadConversations]);

  // ---- Live socket events
  useEffect(() => {
    if (!isAuthenticated) return;

    const onMessage = (msg: any) => {
      if (!msg?.conversationId) return;
      if (activeConversation && msg.conversationId === activeConversation.id) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id)
            ? prev
            : [
                ...prev,
                {
                  id: msg.id,
                  conversationId: msg.conversationId,
                  senderId: msg.senderId,
                  senderName: msg.sender?.displayName || msg.sender?.username || 'Member',
                  senderUsername: msg.sender?.username,
                  senderAvatar: msg.sender?.avatarUrl || '',
                  content: msg.content || '',
                  mediaUrl: msg.mediaUrl,
                  isRead: Boolean(msg.isRead),
                  createdAt: msg.createdAt,
                  time: msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'now',
                },
              ],
        );
        scrollToEnd();
      }
      loadConversations('refresh');
    };

    const onTyping = (payload: any) => {
      if (!activeConversation || payload?.conversationId !== activeConversation.id) return;
      if (payload?.userId === user?.id) return;
      setTypingUser(payload?.isTyping ? payload?.username || 'Someone' : null);
    };

    const onConversationUpdate = () => loadConversations('refresh');

    socket.on('message:received', onMessage);
    socket.on('typing:user', onTyping);
    socket.on('conversation:update', onConversationUpdate);
    socket.on('conversation:new_group', onConversationUpdate);

    return () => {
      socket.off('message:received', onMessage);
      socket.off('typing:user', onTyping);
      socket.off('conversation:update', onConversationUpdate);
      socket.off('conversation:new_group', onConversationUpdate);
    };
  }, [activeConversation, isAuthenticated, loadConversations, socket, user?.id]);

  // ---- Open a conversation: load history, join room, mark read
  const openConversation = useCallback(
    async (conversation: ConversationItem) => {
      setActiveConversation(conversation);
      setMessages([]);
      setIsLoadingMessages(true);
      setError(null);

      socket.emit('join_conversation', conversation.id);

      try {
        const page = await fetchMessagesPage(conversation.id, undefined, 100);
        setMessages(page.items);
        scrollToEnd();
        await markConversationReadApi(conversation.id);
        setConversations((prev) =>
          prev.map((c) => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c)),
        );
      } catch (err: any) {
        setError(err?.message || 'Could not load this conversation');
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [socket],
  );

  const closeConversation = () => {
    if (activeConversation) socket.emit('leave_conversation', activeConversation.id);
    setActiveConversation(null);
    setMessages([]);
    setTypingUser(null);
  };

  // ---- Send
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !activeConversation || !user) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: MessageItem = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: user.id,
      senderName: user.name,
      senderUsername: user.username,
      senderAvatar: user.avatar,
      content: text,
      isRead: false,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
      isPending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInputText('');
    setIsSending(true);
    socket.emit('typing:stop', { conversationId: activeConversation.id });
    scrollToEnd();

    try {
      const sent = await sendMessageApi(activeConversation.id, text);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, lastMessage: sent.content, time: sent.time }
            : c,
        ),
      );
      scrollToEnd();
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, isPending: false, failed: true } : m)),
      );
      setError(err?.message || 'Message could not be sent');
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (value: string) => {
    setInputText(value);
    if (!activeConversation) return;
    socket.emit('typing:start', {
      conversationId: activeConversation.id,
      username: user?.username || user?.name,
    });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeConversation.id });
    }, 1500);
  };

  // ---- New chat / group
  useEffect(() => {
    if (!isNewChatOpen) return;
    setIsSearchingPeople(true);
    const timer = setTimeout(async () => {
      try {
        if (peopleQuery.trim()) {
          const res = await searchApi(peopleQuery.trim(), 'users', 15);
          setPeople(res.users.filter((u) => u.id !== user?.id));
        } else {
          const suggestions = await fetchWhoToFollow(15);
          setPeople(suggestions.filter((u) => u.id !== user?.id));
        }
      } catch {
        setPeople([]);
      } finally {
        setIsSearchingPeople(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [peopleQuery, isNewChatOpen, user?.id]);

  const startChatWith = async (target: User) => {
    try {
      const res = await startConversationApi(target.username || target.handle);
      setIsNewChatOpen(false);
      setGroupSelected([]);
      const fresh = await fetchConversationsApi();
      setConversations(fresh);
      const conv = fresh.find((c) => c.id === res.conversationId);
      if (conv) openConversation(conv);
    } catch (err: any) {
      setError(err?.message || 'Could not start that conversation');
    }
  };

  const createGroupChat = async () => {
    if (groupSelected.length === 0) return;
    try {
      const res = await createGroupConversationApi(
        groupTitle.trim() || 'New group',
        groupSelected,
      );
      setIsNewChatOpen(false);
      setGroupSelected([]);
      setGroupTitle('');
      const fresh = await fetchConversationsApi();
      setConversations(fresh);
      const conv = fresh.find((c) => c.id === res.conversationId);
      if (conv) openConversation(conv);
    } catch (err: any) {
      setError(err?.message || 'Could not create the group');
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) || (c.lastMessage || '').toLowerCase().includes(q)
    );
  });

  // ------------------------------------------------------------------ chat view
  if (activeConversation) {
    const otherUsername = activeConversation.otherUsername;
    const isMine = (m: MessageItem) => m.senderId === user?.id;

    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={closeConversation} style={styles.backBtn} activeOpacity={0.7}>
              <BackIcon size={24} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatHeaderUser}
              disabled={!otherUsername}
              onPress={() => {
                if (!otherUsername) return;
                closeConversation();
                onNavigate('search');
              }}
            >
              <Avatar uri={activeConversation.avatarUrl} name={activeConversation.title} size={38} />
              <View style={styles.chatHeaderNames}>
                <View style={styles.nameRow}>
                  <Text style={styles.chatHeaderTitle} numberOfLines={1}>
                    {activeConversation.title}
                  </Text>
                  {activeConversation.members.some((m) => m.isVerified) && (
                    <VerifiedBadge size={14} />
                  )}
                </View>
                <Text style={styles.chatHeaderHandle}>
                  {typingUser
                    ? 'typing…'
                    : activeConversation.isGroup
                      ? `${activeConversation.members.length + 1} members`
                      : `@${otherUsername || 'member'}`}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {!!error && (
            <Text style={{ color: '#DC2626', paddingHorizontal: 16, paddingBottom: 6, fontSize: 12 }}>
              {error}
            </Text>
          )}

          <ScrollView
            ref={scrollRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatScrollContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToEnd}
          >
            {isLoadingMessages && (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}

            {!isLoadingMessages && messages.length === 0 && (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <Text style={{ color: '#94A3B8', textAlign: 'center' }}>
                  No messages yet. Say namaste 👋
                </Text>
              </View>
            )}

            {messages.map((m) => {
              const mine = isMine(m);
              return (
                <View
                  key={m.id}
                  style={[
                    styles.messageBubbleWrapper,
                    mine ? styles.bubbleMeWrapper : styles.bubbleThemWrapper,
                  ]}
                >
                  {!mine && activeConversation.isGroup && (
                    <Avatar uri={m.senderAvatar} name={m.senderName} size={26} />
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      mine ? styles.bubbleMe : styles.bubbleThem,
                      m.failed && { backgroundColor: '#FEE2E2' },
                    ]}
                  >
                    {!mine && activeConversation.isGroup && (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7', marginBottom: 2 }}>
                        {m.senderName}
                      </Text>
                    )}
                    <Text
                      style={[styles.messageBubbleText, mine ? styles.bubbleMeText : styles.bubbleThemText]}
                    >
                      {m.content}
                    </Text>
                    <Text
                      style={[styles.messageTime, mine ? styles.messageTimeMe : styles.messageTimeThem]}
                    >
                      {m.isPending ? 'sending…' : m.failed ? 'failed' : m.time}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={[styles.chatInputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <TextInput
              style={styles.chatTextInput}
              placeholder={`Message ${activeConversation.title}...`}
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={handleTyping}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
              activeOpacity={0.8}
              disabled={!inputText.trim() || isSending}
              onPress={handleSendMessage}
            >
              <SendIcon size={18} color={inputText.trim() ? '#FFFFFF' : '#94A3B8'} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------ conversations list
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <BackIcon size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity onPress={() => setIsNewChatOpen(true)} style={{ paddingHorizontal: 8 }}>
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>+ New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <SearchIcon size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          style={styles.threadsScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadConversations('refresh')} />
          }
        >
          {!isAuthenticated && (
            <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 22 }}>🔒</Text>
              <Text style={{ color: '#64748B', marginTop: 8, textAlign: 'center' }}>
                Sign in to see your direct messages.
              </Text>
              <TouchableOpacity onPress={() => onNavigate('signin')} style={{ marginTop: 12 }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign in</Text>
              </TouchableOpacity>
            </View>
          )}

          {isAuthenticated && isLoadingConversations && (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {isAuthenticated && !isLoadingConversations && !!error && (
            <View style={{ paddingVertical: 32, alignItems: 'center', paddingHorizontal: 24 }}>
              <Text style={{ color: '#64748B', textAlign: 'center' }}>{error}</Text>
              <TouchableOpacity onPress={() => loadConversations('initial')} style={{ marginTop: 10 }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {isAuthenticated && !isLoadingConversations && !error && filteredConversations.length === 0 && (
            <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 22 }}>💬</Text>
              <Text style={{ color: '#64748B', marginTop: 8, textAlign: 'center' }}>
                No conversations yet. Tap “+ New” to message someone.
              </Text>
            </View>
          )}

          {filteredConversations.map((thread) => (
            <TouchableOpacity
              key={thread.id}
              style={styles.threadItem}
              activeOpacity={0.7}
              onPress={() => openConversation(thread)}
            >
              <Avatar uri={thread.avatarUrl} name={thread.title} size={48} />

              <View style={styles.threadBody}>
                <View style={styles.threadTopRow}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {thread.title}
                    </Text>
                    {thread.members.some((m) => m.isVerified) && <VerifiedBadge size={15} />}
                  </View>
                  <Text style={styles.timeText}>{thread.time}</Text>
                </View>

                <View style={styles.threadBottomRow}>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {thread.lastMessage || 'Start the conversation'}
                  </Text>
                  {thread.unreadCount > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{thread.unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>

        <BottomNav currentScreen="messages" onNavigate={onNavigate} />
      </View>

      {/* New chat / new group modal */}
      <Modal
        visible={isNewChatOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsNewChatOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 10 }}>
              New message
            </Text>

            <TextInput
              style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, marginBottom: 10 }}
              placeholder="Search people by name or @username"
              placeholderTextColor="#94A3B8"
              value={peopleQuery}
              onChangeText={setPeopleQuery}
            />

            {groupSelected.length > 0 && (
              <TextInput
                style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, marginBottom: 10 }}
                placeholder="Group name"
                placeholderTextColor="#94A3B8"
                value={groupTitle}
                onChangeText={setGroupTitle}
              />
            )}

            <ScrollView style={{ maxHeight: 320 }}>
              {isSearchingPeople && (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}

              {!isSearchingPeople && people.length === 0 && (
                <Text style={{ color: '#94A3B8', textAlign: 'center', paddingVertical: 20 }}>
                  No people found
                </Text>
              )}

              {people.map((person) => {
                const username = person.username || person.handle.replace('@', '');
                const selected = groupSelected.includes(username);
                return (
                  <TouchableOpacity
                    key={person.id}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}
                    onPress={() => {
                      if (groupSelected.length === 0) {
                        startChatWith(person);
                      } else {
                        setGroupSelected((prev) =>
                          selected ? prev.filter((u) => u !== username) : [...prev, username],
                        );
                      }
                    }}
                    onLongPress={() =>
                      setGroupSelected((prev) =>
                        selected ? prev.filter((u) => u !== username) : [...prev, username],
                      )
                    }
                  >
                    <Avatar uri={person.avatar} name={person.name} size={38} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                        {person.name}
                      </Text>
                      <Text style={{ color: '#64748B', fontSize: 12 }}>@{username}</Text>
                    </View>
                    {selected && <Text style={{ color: colors.primary, fontWeight: '800' }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setIsNewChatOpen(false);
                  setGroupSelected([]);
                  setGroupTitle('');
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 14 }}
              >
                <Text style={{ color: '#64748B', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              {groupSelected.length > 0 && (
                <TouchableOpacity
                  onPress={createGroupChat}
                  style={{ backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999 }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                    Create group ({groupSelected.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 6 }}>
              Tip: long-press people to add them to a group chat.
            </Text>
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  threadsScroll: { flex: 1 },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  threadBody: { flex: 1 },
  threadTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  timeText: { fontSize: 12, color: '#94A3B8' },
  threadBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  lastMessage: { flex: 1, fontSize: 13, color: '#64748B' },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  chatHeaderUser: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  chatHeaderNames: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chatHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  chatHeaderHandle: { fontSize: 12, color: '#64748B' },
  chatScroll: { flex: 1 },
  chatScrollContent: { padding: 16, paddingBottom: 20 },
  messageBubbleWrapper: { marginBottom: 12, flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  bubbleMeWrapper: { justifyContent: 'flex-end' },
  bubbleThemWrapper: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  messageBubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleMeText: { color: '#FFFFFF' },
  bubbleThemText: { color: '#0F172A' },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeMe: { color: 'rgba(255,255,255,0.75)' },
  messageTimeThem: { color: '#94A3B8' },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  chatTextInput: {
    flex: 1,
    maxHeight: 110,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#E2E8F0' },
});
