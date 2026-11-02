import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Platform,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ScreenName, Post, PostGroup, CommunityItem, User } from './src/types';

// Screens
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { PostDetailScreen } from './src/screens/PostDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CreatePostScreen } from './src/screens/CreatePostScreen';
import { MessagesScreen } from './src/screens/MessagesScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { CommunitiesScreen } from './src/screens/CommunitiesScreen';
import { CommunityDetailScreen } from './src/screens/CommunityDetailScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BookmarksScreen } from './src/screens/BookmarksScreen';

// Auth Guards
import { AuthRequiredModal } from './src/components/auth/AuthRequiredModal';
import { LoadingScreen } from './src/components/common/LoadingScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { PostsProvider } from './src/context/PostsContext';

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PostsProvider>
          <MainNavigator />
        </PostsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const AUTH_SCREENS: ScreenName[] = ['onboarding', 'signin', 'signup'];
const GUEST_ALLOWED: ScreenName[] = ['home', 'explore', 'search', 'post-detail', 'onboarding', 'signin', 'signup'];
const PROTECTED_SCREENS: ScreenName[] = [
  'messages',
  'profile',
  'create-post',
  'notifications',
  'communities',
  'community-detail',
  'settings',
];

function MainNavigator() {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [history, setHistory] = useState<ScreenName[]>(['home']);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<PostGroup | CommunityItem | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTopic, setSearchTopic] = useState('Varanasi');

  // Auth Guard Modal State
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authModalFeature, setAuthModalFeature] = useState('this feature');

  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && width > 520;

  // Once the stored session has been checked, send signed-out users back to a
  // screen they are allowed to see (previously they landed on a blank profile).
  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated && PROTECTED_SCREENS.includes(currentScreen)) {
      setHistory(['home']);
      setCurrentScreen('home');
    }
  }, [isAuthenticated, isInitializing, currentScreen]);

  // Route Guarded Navigation Function
  const navigateTo = (screen: ScreenName) => {
    // RULE 1: Authenticated users CANNOT go to onboarding, signin, or signup
    if (isAuthenticated && AUTH_SCREENS.includes(screen)) {
      setCurrentScreen('home');
      setHistory(['home']);
      return;
    }

    // RULE 2: Unauthenticated users CANNOT go to messages, user profiles, or community groups
    if (!isAuthenticated && PROTECTED_SCREENS.includes(screen)) {
      let featureLabel = 'this feature';
      if (screen === 'messages') featureLabel = 'Direct & Group Messages';
      else if (screen === 'profile') featureLabel = 'User Profiles';
      else if (screen === 'communities' || screen === 'community-detail') featureLabel = 'Community Groups';
      else if (screen === 'create-post') featureLabel = 'Creating Posts';
      else if (screen === 'notifications') featureLabel = 'Notifications';

      setAuthModalFeature(featureLabel);
      setAuthModalVisible(true);
      return;
    }

    // If navigating to another screen (except profile), clear selectedUser
    if (screen !== 'profile') {
      setSelectedUser(null);
    }

    setHistory((prev) => [...prev, screen]);
    setCurrentScreen(screen);
  };

  // Safe Back Navigation: Never navigates back to auth pages if signed in
  const goBack = () => {
    if (history.length > 1) {
      const nextHistory = [...history];
      nextHistory.pop();

      if (isAuthenticated) {
        // Strip any residual auth screens from history stack
        const cleanHistory = nextHistory.filter((s) => !AUTH_SCREENS.includes(s));
        if (cleanHistory.length > 0) {
          setHistory(cleanHistory);
          setCurrentScreen(cleanHistory[cleanHistory.length - 1]);
          return;
        }
      } else {
        setHistory(nextHistory);
        setCurrentScreen(nextHistory[nextHistory.length - 1]);
        return;
      }
    }

    setCurrentScreen('home');
    setHistory(['home']);
  };

  // Called on successful login: completely clears auth history & routes to home
  const handleLoginSuccess = () => {
    setHistory(['home']);
    setCurrentScreen('home');
    setSelectedUser(null);
  };

  // Called on successful registration: completely clears auth history & routes to home
  const handleSignUpSuccess = () => {
    setHistory(['home']);
    setCurrentScreen('home');
    setSelectedUser(null);
  };

  // Navigate to author profile (or prompt auth if unauthenticated)
  const handleSelectUser = (targetUser: User) => {
    if (!isAuthenticated) {
      setAuthModalFeature("User Profiles & Follows");
      setAuthModalVisible(true);
      return;
    }
    setSelectedUser(targetUser);
    navigateTo('profile');
  };

  // Navigate to community (or prompt auth if unauthenticated)
  const handleSelectCommunity = (community: PostGroup | CommunityItem) => {
    if (!isAuthenticated) {
      setAuthModalFeature("Community Groups & Clubs");
      setAuthModalVisible(true);
      return;
    }
    setSelectedCommunity(community);
    navigateTo('community-detail');
  };

  // Navigate to search screen with hashtag/query prefilled
  const handleSearchHashtag = (hashtagOrTopic: string) => {
    setSearchTopic(hashtagOrTopic);
    navigateTo('search');
  };

  const renderScreen = () => {
    if (!GUEST_ALLOWED.includes(currentScreen) && !isAuthenticated) {
      return (
        <HomeScreen
          onNavigate={navigateTo}
          onSelectPost={(post) => setSelectedPost(post)}
          onSelectCommunity={handleSelectCommunity}
          onSelectUser={handleSelectUser}
          onSearchHashtag={handleSearchHashtag}
        />
      );
    }

    // Double check guard: if signed in user somehow hits auth screen, redirect to home
    if (isAuthenticated && AUTH_SCREENS.includes(currentScreen)) {
      return (
        <HomeScreen
          onNavigate={navigateTo}
          onSelectPost={(post) => setSelectedPost(post)}
          onSelectCommunity={handleSelectCommunity}
          onSelectUser={handleSelectUser}
          onSearchHashtag={handleSearchHashtag}
        />
      );
    }

    switch (currentScreen) {
      case 'onboarding':
        return <OnboardingScreen onNavigate={navigateTo} />;

      case 'signin':
        return (
          <SignInScreen
            onNavigate={navigateTo}
            onLoginSuccess={handleLoginSuccess}
          />
        );

      case 'signup':
        return (
          <SignUpScreen
            onNavigate={navigateTo}
            onSignUpSuccess={handleSignUpSuccess}
          />
        );

      case 'home':
        return (
          <HomeScreen
            onNavigate={navigateTo}
            onSelectPost={(post) => setSelectedPost(post)}
            onSelectCommunity={handleSelectCommunity}
            onSelectUser={handleSelectUser}
            onSearchHashtag={handleSearchHashtag}
          />
        );

      case 'explore':
        return (
          <ExploreScreen
            onNavigate={navigateTo}
            onSearchTopic={handleSearchHashtag}
            onSelectUser={handleSelectUser}
            onSelectPost={(post) => setSelectedPost(post)}
            onSelectCommunity={handleSelectCommunity}
          />
        );

      case 'post-detail':
        return (
          <PostDetailScreen
            post={selectedPost || undefined}
            onNavigate={navigateTo}
            onBack={goBack}
            onSelectCommunity={handleSelectCommunity}
            onSelectUser={handleSelectUser}
            onSearchHashtag={handleSearchHashtag}
          />
        );

      case 'profile':
        return (
          <ProfileScreen
            profileUser={selectedUser}
            onNavigate={navigateTo}
            onBack={() => {
              setSelectedUser(null);
              goBack();
            }}
            onSelectPost={(post) => setSelectedPost(post)}
            onSearchHashtag={handleSearchHashtag}
          />
        );

      case 'create-post':
        return (
          <CreatePostScreen
            onNavigate={navigateTo}
            onBack={goBack}
            onPostCreated={() => navigateTo('home')}
          />
        );

      case 'messages':
        return <MessagesScreen onNavigate={navigateTo} onBack={goBack} />;

      case 'notifications':
        return <NotificationsScreen onNavigate={navigateTo} onBack={goBack} />;

      case 'communities':
        return (
          <CommunitiesScreen
            onNavigate={navigateTo}
            onBack={goBack}
            onSelectCommunity={handleSelectCommunity}
          />
        );

      case 'community-detail':
        return (
          <CommunityDetailScreen
            community={
              selectedCommunity || {
                id: '4cdeeeed-27c8-4daf-8bf7-ccdf229f54de',
                name: 'VARTA | Aapla Maharashtra',
                category: 'India Trends',
              }
            }
            onNavigate={navigateTo}
            onBack={goBack}
            onSelectPost={(post) => setSelectedPost(post)}
            onSelectCommunity={handleSelectCommunity}
            onSelectUser={handleSelectUser}
            onSearchHashtag={handleSearchHashtag}
          />
        );

      case 'search':
        return (
          <SearchScreen
            initialQuery={searchTopic}
            onNavigate={navigateTo}
            onBack={goBack}
            onSelectPost={(post) => setSelectedPost(post)}
            onSelectCommunity={handleSelectCommunity}
            onSelectUser={handleSelectUser}
          />
        );

      case 'bookmarks':
        return <BookmarksScreen onNavigate={navigateTo} onBack={goBack} />;

      case 'settings':
        return <SettingsScreen onNavigate={navigateTo} onBack={goBack} />;

      default:
        return (
          <HomeScreen
            onNavigate={navigateTo}
            onSelectPost={(post) => setSelectedPost(post)}
            onSelectCommunity={handleSelectCommunity}
            onSelectUser={handleSelectUser}
          />
        );
    }
  };

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <View style={isWebDesktop ? styles.desktopBackground : styles.mobileContainer}>
      <StatusBar style="dark" />

      {/* Global Auth Required Modal for Guarded Screens */}
      <AuthRequiredModal
        visible={authModalVisible}
        featureName={authModalFeature}
        onClose={() => setAuthModalVisible(false)}
        onSignIn={() => {
          setAuthModalVisible(false);
          navigateTo('signin');
        }}
        onSignUp={() => {
          setAuthModalVisible(false);
          navigateTo('signup');
        }}
      />

      {isWebDesktop ? (
        <View style={styles.phoneFrame}>
          {/* Subtle phone speaker pill for realistic presentation */}
          <View style={styles.phoneHeaderPill} />
          <View style={styles.phoneScreenWrapper}>{renderScreen()}</View>
        </View>
      ) : (
        <View style={styles.mobileContainer}>{renderScreen()}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  desktopBackground: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  phoneFrame: {
    width: 420,
    height: 860,
    maxHeight: '96%',
    backgroundColor: '#FFFFFF',
    borderRadius: 44,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 36,
    elevation: 20,
    borderWidth: 6,
    borderColor: '#1E293B',
    position: 'relative',
  },
  phoneHeaderPill: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 80,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    zIndex: 999,
  },
  phoneScreenWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
